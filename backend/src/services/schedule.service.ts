import prisma from '../config/prisma.js';
import type { updateBusinessScheduleSchema } from '../validators/schedule.validator.js';
import { AuditService } from './audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

export class ScheduleService {
  static async getBusinessSchedule(tenantId?: string) {
    if (!tenantId) {
      return [];
    }

    return prisma.businessSchedule.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async updateBusinessSchedule(
    items: z.infer<typeof updateBusinessScheduleSchema>,
    tenantId?: string,
    actorUserId?: string
  ) {
    if (!tenantId) {
      throw new AppError(
        'Tenant context is required to update shop schedules.',
        400,
        'TENANT_REQUIRED'
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.businessSchedule.upsert({
          where: {
            tenantId_dayOfWeek: {
              tenantId,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            isOpen: item.isOpen,
            openTime: item.openTime,
            closeTime: item.closeTime,
          },
          create: {
            tenantId,
            dayOfWeek: item.dayOfWeek,
            isOpen: item.isOpen,
            openTime: item.openTime,
            closeTime: item.closeTime,
          },
        });
      }

      return tx.businessSchedule.findMany({
        where: { tenantId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'BUSINESS_SCHEDULE_UPDATED',
      entity: 'BusinessSchedule',
      metadata: { count: items.length },
    });

    return result;
  }
}
