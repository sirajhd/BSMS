import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '../validators/auth.validator.js';

export class AuthService {
  static generateToken(user: { id: string; email: string; role: Role; tenantId?: string }) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  static async register(input: RegisterInput, tenantId?: string) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: Role.CUSTOMER,
          isActive: true,
          customerProfile: {
            create: {
              fullName: input.fullName,
              phone: input.phone,
              profileImage: input.profileImage || null,
              tenantId: tenantId || null,
            },
          },
        },
        include: {
          customerProfile: true,
        },
      });

      // If registered under a specific tenant, create Membership record
      if (tenantId) {
        await tx.membership.create({
          data: {
            userId: user.id,
            tenantId,
            role: Role.CUSTOMER,
            isActive: true,
          },
        });
      }

      // Welcome notification
      await tx.notification.create({
        data: {
          userId: user.id,
          tenantId: tenantId || null,
          title: 'Welcome to the Platform',
          message: 'Your account has been registered successfully. Explore services and book your first cut!',
          type: 'BOOKING_CONFIRMED',
          isRead: false,
        },
      });

      return user;
    });

    await AuditService.log({
      tenantId,
      actorUserId: result.id,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: result.id,
      metadata: { email: result.email, role: 'CUSTOMER' },
    });

    const token = this.generateToken({ ...result, tenantId });

    return {
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        isActive: result.isActive,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      profile: result.customerProfile
        ? {
            id: result.customerProfile.id,
            userId: result.customerProfile.userId,
            fullName: result.customerProfile.fullName,
            phone: result.customerProfile.phone,
            profileImage: result.customerProfile.profileImage || undefined,
            tenantId: result.customerProfile.tenantId || undefined,
            createdAt: result.customerProfile.createdAt.toISOString(),
            updatedAt: result.customerProfile.updatedAt.toISOString(),
          }
        : null,
      token,
    };
  }

  static async login(input: LoginInput, activeTenantId?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        customerProfile: true,
        barberProfile: true,
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Determine effective role & active tenant
    let resolvedTenantId: string | undefined = undefined;
    let effectiveRole: Role = user.role;

    if (user.role === Role.SUPER_ADMIN) {
      effectiveRole = Role.SUPER_ADMIN;
      resolvedTenantId = activeTenantId;
    } else {
      const activeMemberships = user.memberships.filter((m) => m.isActive);

      if (activeTenantId) {
        const activeMembership = activeMemberships.find((m) => m.tenantId === activeTenantId);
        if (!activeMembership) {
          throw new AppError(
            'You do not have an active membership for this tenant.',
            403,
            'NOT_TENANT_MEMBER'
          );
        }
        resolvedTenantId = activeMembership.tenantId;
        effectiveRole = activeMembership.role;
      } else {
        if (activeMemberships.length === 0) {
          throw new AppError(
            'Your tenant membership has been deactivated. Please contact support.',
            403,
            'MEMBERSHIP_INACTIVE'
          );
        }
        resolvedTenantId = activeMemberships[0].tenantId;
        effectiveRole = activeMemberships[0].role;
      }
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: effectiveRole,
      tenantId: resolvedTenantId,
    });

    const profile = user.customerProfile || user.barberProfile;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: effectiveRole,
        platformRole: user.role,
        isActive: user.isActive,
        activeTenantId: resolvedTenantId,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          tenantId: m.tenantId,
          role: m.role,
          isActive: m.isActive,
          tenant: m.tenant,
        })),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      profile: profile
        ? {
            id: profile.id,
            userId: profile.userId,
            fullName: profile.fullName,
            phone: profile.phone,
            profileImage: profile.profileImage || undefined,
            ...('isActive' in profile ? { isActive: profile.isActive } : {}),
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
      token,
    };
  }

  static async getMe(userId: string, activeTenantId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        barberProfile: true,
        memberships: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    let resolvedTenantId: string | undefined = undefined;
    let effectiveRole: Role = user.role;

    if (user.role === Role.SUPER_ADMIN) {
      effectiveRole = Role.SUPER_ADMIN;
      resolvedTenantId = activeTenantId;
    } else {
      const activeMemberships = user.memberships.filter((m) => m.isActive);
      if (activeTenantId) {
        const activeMembership = activeMemberships.find(
          (m) => m.tenantId === activeTenantId
        );
        if (activeMembership) {
          effectiveRole = activeMembership.role;
          resolvedTenantId = activeMembership.tenantId;
        }
      } else if (activeMemberships.length > 0) {
        resolvedTenantId = activeMemberships[0].tenantId;
        effectiveRole = activeMemberships[0].role;
      }
    }

    const profile = user.customerProfile || user.barberProfile;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: effectiveRole,
        platformRole: user.role,
        isActive: user.isActive,
        activeTenantId: resolvedTenantId,
        memberships: user.memberships.map((m) => ({
          id: m.id,
          tenantId: m.tenantId,
          role: m.role,
          isActive: m.isActive,
          tenant: m.tenant,
        })),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      profile: profile
        ? {
            id: profile.id,
            userId: profile.userId,
            fullName: profile.fullName,
            phone: profile.phone,
            profileImage: profile.profileImage || undefined,
            ...('isActive' in profile ? { isActive: profile.isActive } : {}),
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
          }
        : null,
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        barberProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.customerProfile) {
      const updated = await prisma.customerProfile.update({
        where: { id: user.customerProfile.id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          profileImage: input.profileImage !== undefined ? input.profileImage : undefined,
        },
      });
      return updated;
    }

    if (user.barberProfile) {
      const updated = await prisma.barber.update({
        where: { id: user.barberProfile.id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          profileImage: input.profileImage !== undefined ? input.profileImage : undefined,
        },
      });
      return updated;
    }

    throw new AppError('No profile associated with this user account.', 400, 'NO_PROFILE');
  }

  static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password updated successfully.' };
  }
}
