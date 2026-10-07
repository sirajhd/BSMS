import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from '../services/audit.service.js';
import { SubscriptionService } from '../services/subscription.service.js';
import { z } from 'zod';

const updateTenantSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  bookingNoticeHours: z.number().min(0).optional(),
  maxAdvanceBookingDays: z.number().min(1).max(365).optional(),
  cancellationCutoffHours: z.number().min(0).optional(),
  allowWalkIns: z.boolean().optional(),
});

export class TenantController {
  /**
   * Public: Get currently resolved tenant info & branding
   */
  static async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId || !req.tenant) {
        throw new AppError('No active tenant context resolved.', 404, 'TENANT_NOT_FOUND');
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        include: {
          settings: true,
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'TRIAL'] } },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!tenant) {
        throw new AppError('Tenant not found.', 404, 'TENANT_NOT_FOUND');
      }

      const activeSub = tenant.subscriptions[0];

      const publicInfo = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        logo: tenant.logo,
        status: tenant.status,
        timezone: tenant.timezone,
        currency: tenant.currency,
        settings: tenant.settings || {
          primaryColor: '#d97706',
          secondaryColor: '#0f172a',
          bookingNoticeHours: 1,
          maxAdvanceBookingDays: 30,
          cancellationCutoffHours: 2,
          allowWalkIns: true,
        },
        plan: activeSub?.plan
          ? {
              id: activeSub.plan.id,
              name: activeSub.plan.name,
              slug: activeSub.plan.slug,
              features: activeSub.plan.features,
              maxBarbers: activeSub.plan.maxBarbers,
              maxMonthlyAppointments: activeSub.plan.maxMonthlyAppointments,
              price: activeSub.plan.price,
              interval: activeSub.plan.interval,
            }
          : null,
      };

      return sendSuccess(res, 'Tenant context fetched successfully.', publicInfo);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Owner/Manager: Get tenant subscription usage & plan limits
   */
  static async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant context required.', 400, 'TENANT_REQUIRED');
      }

      const usage = await SubscriptionService.getTenantUsage(tenantId);
      return sendSuccess(res, 'Tenant subscription usage retrieved.', usage);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Owner/Manager: Update tenant settings & branding
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant context required.', 400, 'TENANT_REQUIRED');
      }

      const validated = updateTenantSettingsSchema.parse(req.body);

      const result = await prisma.$transaction(async (tx) => {
        // Update Tenant basic info
        if (
          validated.name ||
          validated.phone ||
          validated.email ||
          validated.address ||
          validated.logo !== undefined
        ) {
          await tx.tenant.update({
            where: { id: tenantId },
            data: {
              ...(validated.name ? { name: validated.name } : {}),
              ...(validated.phone !== undefined ? { phone: validated.phone } : {}),
              ...(validated.email !== undefined ? { email: validated.email } : {}),
              ...(validated.address !== undefined ? { address: validated.address } : {}),
              ...(validated.logo !== undefined ? { logo: validated.logo } : {}),
            },
          });
        }

        // Upsert TenantSettings
        const settings = await tx.tenantSettings.upsert({
          where: { tenantId },
          update: {
            ...(validated.primaryColor ? { primaryColor: validated.primaryColor } : {}),
            ...(validated.secondaryColor ? { secondaryColor: validated.secondaryColor } : {}),
            ...(validated.bookingNoticeHours !== undefined
              ? { bookingNoticeHours: validated.bookingNoticeHours }
              : {}),
            ...(validated.maxAdvanceBookingDays !== undefined
              ? { maxAdvanceBookingDays: validated.maxAdvanceBookingDays }
              : {}),
            ...(validated.cancellationCutoffHours !== undefined
              ? { cancellationCutoffHours: validated.cancellationCutoffHours }
              : {}),
            ...(validated.allowWalkIns !== undefined
              ? { allowWalkIns: validated.allowWalkIns }
              : {}),
          },
          create: {
            tenantId,
            primaryColor: validated.primaryColor || '#d97706',
            secondaryColor: validated.secondaryColor || '#0f172a',
            bookingNoticeHours: validated.bookingNoticeHours ?? 1,
            maxAdvanceBookingDays: validated.maxAdvanceBookingDays ?? 30,
            cancellationCutoffHours: validated.cancellationCutoffHours ?? 2,
            allowWalkIns: validated.allowWalkIns ?? true,
          },
        });

        return settings;
      });

      await AuditService.log({
        tenantId,
        actorUserId: req.user?.id,
        action: 'TENANT_SETTINGS_UPDATED',
        entity: 'TenantSettings',
        entityId: tenantId,
        metadata: validated,
      });

      return sendSuccess(res, 'Tenant settings updated successfully.', result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Owner/Manager: Get tenant audit logs
   */
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        throw new AppError('Tenant context required.', 400, 'TENANT_REQUIRED');
      }

      const logs = await AuditService.getTenantAuditLogs(tenantId);
      return sendSuccess(res, 'Audit logs retrieved successfully.', logs);
    } catch (err) {
      next(err);
    }
  }
}
