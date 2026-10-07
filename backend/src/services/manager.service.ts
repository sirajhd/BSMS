import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import type {
  CreateManagerInput,
  UpdateManagerInput,
} from '../validators/manager.validator.js';

export interface ManagerDto {
  id: string; // The manager's userId
  userId: string;
  membershipId: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage: string | null;
  role: Role;
  isActive: boolean; // Membership.isActive in this tenant
  isUserActive: boolean; // User.isActive
  createdAt: string;
  updatedAt: string;
}

export function formatManager(membership: any): ManagerDto {
  const user = membership.user;
  const profile = user?.customerProfile;
  return {
    id: user?.id || membership.userId,
    userId: user?.id || membership.userId,
    membershipId: membership.id,
    tenantId: membership.tenantId,
    fullName: profile?.fullName || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    profileImage: profile?.profileImage || null,
    role: membership.role,
    isActive: membership.isActive,
    isUserActive: user?.isActive ?? true,
    createdAt:
      membership.createdAt instanceof Date
        ? membership.createdAt.toISOString()
        : membership.createdAt,
    updatedAt:
      membership.updatedAt instanceof Date
        ? membership.updatedAt.toISOString()
        : membership.updatedAt,
  };
}

export class ManagerService {
  /**
   * List all managers for the tenant
   */
  static async getAllManagers(
    tenantId?: string,
    includeInactive = false
  ): Promise<ManagerDto[]> {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const memberships = await prisma.membership.findMany({
      where: {
        tenantId,
        role: Role.MANAGER,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        user: {
          include: {
            customerProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map(formatManager);
  }

  /**
   * Get single manager by ID (userId or membershipId) strictly scoped to tenant
   */
  static async getManagerById(
    id: string,
    tenantId?: string
  ): Promise<ManagerDto> {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const membership = await prisma.membership.findFirst({
      where: {
        OR: [{ userId: id }, { id }],
        tenantId,
        role: Role.MANAGER,
      },
      include: {
        user: {
          include: {
            customerProfile: true,
          },
        },
      },
    });

    if (!membership) {
      throw new AppError('Manager not found.', 404, 'MANAGER_NOT_FOUND');
    }

    return formatManager(membership);
  }

  /**
   * Atomically create manager User, CustomerProfile, and Membership
   */
  static async createManager(
    input: CreateManagerInput,
    tenantId?: string,
    actorUserId?: string
  ): Promise<ManagerDto> {
    if (!tenantId) {
      throw new AppError(
        'Tenant context is required to create a manager.',
        400,
        'TENANT_REQUIRED'
      );
    }

    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check global email uniqueness across platform
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError(
        'An account with this email address already exists.',
        409,
        'EMAIL_EXISTS'
      );
    }

    // 2. Hash temporary password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. Atomic creation in transaction
    const createdMembership = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: Role.MANAGER,
          isActive: true,
          customerProfile: {
            create: {
              fullName: input.fullName.trim(),
              phone: input.phone.trim(),
              profileImage: input.profileImage || null,
              tenantId,
            },
          },
          memberships: {
            create: {
              tenantId,
              role: Role.MANAGER,
              isActive: true,
            },
          },
        },
        include: {
          customerProfile: true,
          memberships: {
            where: { tenantId },
          },
        },
      });

      const membership = user.memberships[0];
      return {
        ...membership,
        user,
      };
    });

    // 4. Audit log
    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'MANAGER_CREATED',
      entity: 'Manager',
      entityId: createdMembership.userId,
      metadata: { fullName: input.fullName, email: normalizedEmail },
    });

    return formatManager(createdMembership);
  }

  /**
   * Update manager details strictly scoped to tenant
   */
  static async updateManager(
    id: string,
    input: UpdateManagerInput,
    tenantId?: string,
    actorUserId?: string
  ): Promise<ManagerDto> {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const existing = await prisma.membership.findFirst({
      where: {
        OR: [{ userId: id }, { id }],
        tenantId,
        role: Role.MANAGER,
      },
      include: {
        user: {
          include: {
            customerProfile: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError('Manager not found.', 404, 'MANAGER_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      // Update CustomerProfile if fullName, phone, or profileImage provided
      if (
        input.fullName !== undefined ||
        input.phone !== undefined ||
        input.profileImage !== undefined
      ) {
        if (existing.user.customerProfile) {
          await tx.customerProfile.update({
            where: { id: existing.user.customerProfile.id },
            data: {
              ...(input.fullName !== undefined
                ? { fullName: input.fullName.trim() }
                : {}),
              ...(input.phone !== undefined
                ? { phone: input.phone.trim() }
                : {}),
              ...(input.profileImage !== undefined
                ? { profileImage: input.profileImage }
                : {}),
            },
          });
        } else {
          await tx.customerProfile.create({
            data: {
              userId: existing.userId,
              tenantId,
              fullName: input.fullName?.trim() || 'Manager',
              phone: input.phone?.trim() || '',
              profileImage: input.profileImage || null,
            },
          });
        }
      }

      // Update Membership.isActive if provided
      if (input.isActive !== undefined) {
        await tx.membership.update({
          where: { id: existing.id },
          data: { isActive: input.isActive },
        });
      }
    });

    const updatedMembership = await prisma.membership.findUnique({
      where: { id: existing.id },
      include: {
        user: {
          include: {
            customerProfile: true,
          },
        },
      },
    });

    if (!updatedMembership) {
      throw new AppError('Manager not found.', 404, 'MANAGER_NOT_FOUND');
    }

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'MANAGER_UPDATED',
      entity: 'Manager',
      entityId: existing.userId,
      metadata: input,
    });

    return formatManager(updatedMembership);
  }

  /**
   * Toggle manager active status within tenant
   */
  static async toggleManagerStatus(
    id: string,
    tenantId?: string,
    actorUserId?: string
  ): Promise<ManagerDto> {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const existing = await prisma.membership.findFirst({
      where: {
        OR: [{ userId: id }, { id }],
        tenantId,
        role: Role.MANAGER,
      },
      include: {
        user: {
          include: {
            customerProfile: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError('Manager not found.', 404, 'MANAGER_NOT_FOUND');
    }

    if (actorUserId && actorUserId === existing.userId) {
      throw new AppError(
        'Cannot toggle your own manager status.',
        400,
        'CANNOT_TOGGLE_SELF'
      );
    }

    const nextStatus = !existing.isActive;

    const updated = await prisma.membership.update({
      where: { id: existing.id },
      data: { isActive: nextStatus },
      include: {
        user: {
          include: {
            customerProfile: true,
          },
        },
      },
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'MANAGER_STATUS_TOGGLED',
      entity: 'Manager',
      entityId: existing.userId,
      metadata: { isActive: nextStatus },
    });

    return formatManager(updated);
  }
}
