import prisma from '../config/prisma.js';
import type { updateBusinessScheduleSchema } from '../validators/schedule.validator.js';
import { z } from 'zod';

export class ScheduleService {
  static async getBusinessSchedule() {
    return prisma.businessSchedule.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async updateBusinessSchedule(
    items: z.infer<typeof updateBusinessScheduleSchema>
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.businessSchedule.upsert({
          where: { dayOfWeek: item.dayOfWeek },
          update: {
            isOpen: item.isOpen,
            openTime: item.openTime,
            closeTime: item.closeTime,
          },
          create: {
            dayOfWeek: item.dayOfWeek,
            isOpen: item.isOpen,
            openTime: item.openTime,
            closeTime: item.closeTime,
          },
        });
      }

      return tx.businessSchedule.findMany({
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }
}
