import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import type {
  CreateBarberInput,
  UpdateBarberInput,
} from '../validators/barber.validator.js';
import type { updateBarberAvailabilitySchema } from '../validators/schedule.validator.js';
import { z } from 'zod';

export class BarberService {
  // Public/admin list lookup filtered by tenant
  static async getAllBarbers(tenantId?: string, includeInactive = false) {
    if (!tenantId) {
      return [];
    }

    return prisma.barber.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  // Internal/admin lookup: can return active or inactive barber in tenant
  static async getBarberById(id: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const barber = await prisma.barber.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!barber) {
      throw new AppError('Barber not found.', 404, 'BARBER_NOT_FOUND');
    }

    return barber;
  }

  // Public lookup: inactive barbers are hidden
  static async getPublicBarberById(id: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const barber = await prisma.barber.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!barber) {
      throw new AppError('Barber not found.', 404, 'BARBER_NOT_FOUND');
    }

    return barber;
  }

  // Public availability lookup: inactive barbers are hidden
  static async getPublicBarberAvailability(barberId: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const barber = await prisma.barber.findFirst({
      where: {
        id: barberId,
        tenantId,
        isActive: true,
      },
    });

    if (!barber) {
      throw new AppError('Barber not found.', 404, 'BARBER_NOT_FOUND');
    }

    return prisma.barberAvailability.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async createBarber(input: CreateBarberInput, tenantId?: string, actorUserId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to create a barber.', 400, 'TENANT_REQUIRED');
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('A user with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: Role.BARBER,
          isActive: true,
          barberProfile: {
            create: {
              fullName: input.fullName,
              phone: input.phone,
              profileImage: input.profileImage || null,
              tenantId: tenantId || null,
              isActive: true,
            },
          },
        },
        include: {
          barberProfile: true,
        },
      });

      // Create membership in the shop
      if (tenantId) {
        await tx.membership.create({
          data: {
            userId: user.id,
            tenantId,
            role: Role.BARBER,
            isActive: true,
          },
        });
      }

      // Default Mon-Sat availability for new barber
      if (user.barberProfile) {
        const defaultWindows = [1, 2, 3, 4, 5, 6].map((day) => ({
          barberId: user.barberProfile!.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: day === 6 ? '16:00' : '17:00',
        }));

        for (const win of defaultWindows) {
          await tx.barberAvailability.create({
            data: win,
          });
        }
      }

      return user.barberProfile;
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'BARBER_CREATED',
      entity: 'Barber',
      entityId: result?.id,
      metadata: { fullName: input.fullName, email: input.email },
    });

    return result;
  }

  static async updateBarber(
    id: string,
    input: UpdateBarberInput,
    tenantId?: string,
    actorUserId?: string
  ) {
    await this.getBarberById(id, tenantId);

    const updated = await prisma.barber.update({
      where: { id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        profileImage: input.profileImage !== undefined ? input.profileImage : undefined,
        isActive: input.isActive,
      },
      include: {
        availability: true,
      },
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'BARBER_UPDATED',
      entity: 'Barber',
      entityId: updated.id,
      metadata: input,
    });

    return updated;
  }

  static async toggleBarberStatus(id: string, tenantId?: string, actorUserId?: string) {
    const current = await this.getBarberById(id, tenantId);

    const updated = await prisma.barber.update({
      where: { id },
      data: {
        isActive: !current.isActive,
      },
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'BARBER_STATUS_TOGGLED',
      entity: 'Barber',
      entityId: updated.id,
      metadata: { isActive: updated.isActive },
    });

    return updated;
  }

  // Internal/admin availability lookup
  static async getBarberAvailability(barberId: string, tenantId?: string) {
    await this.getBarberById(barberId, tenantId);

    return prisma.barberAvailability.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async updateBarberAvailability(
    barberId: string,
    windows: z.infer<typeof updateBarberAvailabilitySchema>,
    tenantId?: string,
    actorUserId?: string
  ) {
    await this.getBarberById(barberId, tenantId);

    const result = await prisma.$transaction(async (tx) => {
      // Remove previous windows for this barber
      await tx.barberAvailability.deleteMany({
        where: { barberId },
      });

      // Insert new windows
      for (const win of windows) {
        await tx.barberAvailability.create({
          data: {
            barberId,
            dayOfWeek: win.dayOfWeek,
            startTime: win.startTime,
            endTime: win.endTime,
          },
        });
      }

      return tx.barberAvailability.findMany({
        where: { barberId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'BARBER_AVAILABILITY_UPDATED',
      entity: 'BarberAvailability',
      entityId: barberId,
      metadata: { windowCount: windows.length },
    });

    return result;
  }
}
