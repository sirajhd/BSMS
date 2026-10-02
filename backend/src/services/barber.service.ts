
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CreateBarberInput,
  UpdateBarberInput,
} from '../validators/barber.validator.js';
import type { updateBarberAvailabilitySchema } from '../validators/schedule.validator.js';
import { z } from 'zod';

export class BarberService {
  // Public/admin list lookup
  static async getAllBarbers(includeInactive = false) {
    return prisma.barber.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  // Internal/admin lookup: can return active or inactive barber
  static async getBarberById(id: string) {
    const barber = await prisma.barber.findUnique({
      where: { id },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!barber) {
      throw new AppError(
        'Barber not found.',
        404,
        'BARBER_NOT_FOUND'
      );
    }

    return barber;
  }

  // Public lookup: inactive barbers are hidden
  static async getPublicBarberById(id: string) {
    const barber = await prisma.barber.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        availability: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!barber) {
      throw new AppError(
        'Barber not found.',
        404,
        'BARBER_NOT_FOUND'
      );
    }

    return barber;
  }

  // Public availability lookup: inactive barbers are hidden
  static async getPublicBarberAvailability(barberId: string) {
    const barber = await prisma.barber.findFirst({
      where: {
        id: barberId,
        isActive: true,
      },
    });

    if (!barber) {
      throw new AppError(
        'Barber not found.',
        404,
        'BARBER_NOT_FOUND'
      );
    }

    return prisma.barberAvailability.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async createBarber(input: CreateBarberInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError(
        'A user with this email address already exists.',
        409,
        'EMAIL_EXISTS'
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    return prisma.$transaction(async (tx) => {
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
              isActive: true,
            },
          },
        },
        include: {
          barberProfile: true,
        },
      });

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
  }

  static async updateBarber(
    id: string,
    input: UpdateBarberInput
  ) {
    await this.getBarberById(id);

    return prisma.barber.update({
      where: { id },
      data: {
        fullName: input.fullName,
        phone: input.phone,
        profileImage:
          input.profileImage !== undefined
            ? input.profileImage
            : undefined,
        isActive: input.isActive,
      },
      include: {
        availability: true,
      },
    });
  }

  static async toggleBarberStatus(id: string) {
    const current = await this.getBarberById(id);

    return prisma.barber.update({
      where: { id },
      data: {
        isActive: !current.isActive,
      },
    });
  }

  // Internal/admin availability lookup
  static async getBarberAvailability(barberId: string) {
    await this.getBarberById(barberId);

    return prisma.barberAvailability.findMany({
      where: { barberId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async updateBarberAvailability(
    barberId: string,
    windows: z.infer<typeof updateBarberAvailabilitySchema>
  ) {
    await this.getBarberById(barberId);

    return prisma.$transaction(async (tx) => {
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
  }
}
