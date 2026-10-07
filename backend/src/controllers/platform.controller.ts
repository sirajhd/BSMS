import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from '../services/audit.service.js';
import { AuthService } from '../services/auth.service.js';
import { Role, TenantStatus, SubscriptionStatus, PlanInterval } from '@prisma/client';
import { z } from 'zod';

const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric characters and hyphens'),
  email: z.string().email('Valid business email is required').max(255),
  phone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  address: z
    .string()
    .max(255)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  timezone: z.string().max(50).default('Africa/Addis_Ababa'),
  currency: z.string().max(10).default('ETB'),
  ownerName: z.string().min(2, 'Owner full name is required').max(100),
  ownerEmail: z.string().email('Valid owner email is required').max(255),
  ownerPassword: z
    .string()
    .max(128)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine((v) => !v || v.length >= 8, 'Owner password must be at least 8 characters'),
  planSlug: z
    .string()
    .optional()
    .default('starter')
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : 'starter')),
});

const updateBusinessSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(255).optional(),
  status: z.nativeEnum(TenantStatus).optional(),
  timezone: z.string().max(50).optional(),
  currency: z.string().max(10).optional(),
});

const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  price: z.number().min(0).max(1000000),
  interval: z.nativeEnum(PlanInterval).default(PlanInterval.MONTHLY),
  maxBarbers: z.number().min(1).max(500).default(5),
  maxMonthlyAppointments: z.number().min(1).max(100000).default(500),
  features: z.array(z.string().max(100)).optional(),
  isActive: z.boolean().default(true),
});

export class PlatformController {
  /**
   * Platform Overview Metrics
   */
  static async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalUsers,
        totalAppointments,
        totalRevenue,
        recentTenants,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { status: TenantStatus.ACTIVE } }),
        prisma.tenant.count({ where: { status: TenantStatus.SUSPENDED } }),
        prisma.user.count(),
        prisma.appointment.count(),
        prisma.payment.aggregate({
          where: { status: 'PAID' },
          _sum: { amount: true },
        }),
        prisma.tenant.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            memberships: {
              where: { role: Role.SHOP_OWNER },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                  },
                },
              },
            },
            subscriptions: {
              include: { plan: true },
              take: 1,
            },
          },
        }),
      ]);

      return sendSuccess(res, 'Platform overview statistics retrieved.', {
        totalTenants,
        activeTenants,
        suspendedTenants,
        totalUsers,
        totalAppointments,
        totalRevenue: totalRevenue._sum.amount || 0,
        recentTenants,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all businesses (with members, subscription, and appointment counts)
   */
  static async getBusinesses(_req: Request, res: Response, next: NextFunction) {
    try {
      const businesses = await prisma.tenant.findMany({
        include: {
          settings: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  isActive: true,
                  createdAt: true,
                },
              },
            },
          },
          subscriptions: {
            include: { plan: true },
            take: 1,
          },
          _count: {
            select: {
              appointments: true,
              barbers: true,
              services: true,
              customerProfiles: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, 'Businesses retrieved successfully.', businesses);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single business details
   */
  static async getBusinessById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: {
          settings: true,
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  isActive: true,
                  createdAt: true,
                  customerProfile: true,
                  barberProfile: true,
                },
              },
            },
          },
          services: true,
          barbers: true,
          businessSchedules: true,
          subscriptions: {
            include: { plan: true },
          },
          _count: {
            select: {
              appointments: true,
              payments: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new AppError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
      }

      return sendSuccess(res, 'Business details retrieved.', tenant);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new business with initial shop owner & default schedule
   */
  static async createBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createBusinessSchema.parse(req.body);

      // Check slug uniqueness
      const existingSlug = await prisma.tenant.findUnique({
        where: { slug: validated.slug.toLowerCase() },
      });
      if (existingSlug) {
        throw new AppError('A business with this slug already exists.', 409, 'SLUG_EXISTS');
      }

      // Check owner email
      const existingUser = await prisma.user.findUnique({
        where: { email: validated.ownerEmail.toLowerCase() },
      });
      if (existingUser && existingUser.role === Role.SUPER_ADMIN) {
        throw new AppError('Cannot assign platform SUPER_ADMIN as shop owner.', 400, 'INVALID_OWNER');
      }

      // Secure password handling: use provided password or generate high-entropy temporary credential
      const rawPassword =
        validated.ownerPassword || `${crypto.randomBytes(12).toString('base64url')}!1Aa`;
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Explicit plan verification: fail closed if plan does not exist
      const plan = await prisma.plan.findUnique({
        where: { slug: validated.planSlug },
      });
      if (!plan) {
        throw new AppError(
          `Requested subscription plan '${validated.planSlug}' was not found.`,
          400,
          'INVALID_PLAN'
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const tenant = await tx.tenant.create({
          data: {
            name: validated.name,
            slug: validated.slug.toLowerCase(),
            email: validated.email,
            phone: validated.phone || null,
            address: validated.address || null,
            timezone: validated.timezone,
            currency: validated.currency,
            status: TenantStatus.ACTIVE,
            settings: {
              create: {
                primaryColor: '#d97706',
                secondaryColor: '#0f172a',
                bookingNoticeHours: 1,
                maxAdvanceBookingDays: 30,
                cancellationCutoffHours: 2,
                allowWalkIns: true,
              },
            },
            subscriptions: {
              create: {
                planId: plan.id,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
        });

        // 2. Create or link Owner User
        let ownerUser = existingUser;
        if (!ownerUser) {
          ownerUser = await tx.user.create({
            data: {
              email: validated.ownerEmail.toLowerCase(),
              passwordHash,
              role: Role.SHOP_OWNER,
              isActive: true,
              customerProfile: {
                create: {
                  fullName: validated.ownerName,
                  phone: validated.phone || '+251900000000',
                  tenantId: tenant.id,
                },
              },
            },
          });
        }

        // 3. Create Owner Membership
        await tx.membership.create({
          data: {
            userId: ownerUser.id,
            tenantId: tenant.id,
            role: Role.SHOP_OWNER,
            isActive: true,
          },
        });

        // 4. Default 7-day schedule
        const defaultSchedule = [
          { dayOfWeek: 0, isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { dayOfWeek: 1, isOpen: true, openTime: '08:30', closeTime: '19:30' },
          { dayOfWeek: 2, isOpen: true, openTime: '08:30', closeTime: '19:30' },
          { dayOfWeek: 3, isOpen: true, openTime: '08:30', closeTime: '19:30' },
          { dayOfWeek: 4, isOpen: true, openTime: '08:30', closeTime: '19:30' },
          { dayOfWeek: 5, isOpen: true, openTime: '08:30', closeTime: '20:00' },
          { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '20:00' },
        ];

        for (const item of defaultSchedule) {
          await tx.businessSchedule.create({
            data: {
              tenantId: tenant.id,
              ...item,
            },
          });
        }

        // 5. Default Starter Service
        await tx.service.create({
          data: {
            tenantId: tenant.id,
            name: 'Standard Haircut',
            description: 'Professional precision haircut and styling.',
            price: 300.0,
            durationMinutes: 30,
            isActive: true,
          },
        });

        return { tenant, owner: AuthService.sanitizeUser(ownerUser) };
      });

      await AuditService.log({
        tenantId: result.tenant.id,
        actorUserId: req.user?.id,
        action: 'TENANT_CREATED',
        entity: 'Tenant',
        entityId: result.tenant.id,
        metadata: { name: result.tenant.name, slug: result.tenant.slug, owner: validated.ownerEmail },
      });

      return sendSuccess(res, 'New barber business created successfully.', result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update business details or status
   */
  static async updateBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateBusinessSchema.parse(req.body);

      const updated = await prisma.tenant.update({
        where: { id: req.params.id },
        data: validated,
      });

      await AuditService.log({
        tenantId: updated.id,
        actorUserId: req.user?.id,
        action: 'TENANT_UPDATED',
        entity: 'Tenant',
        entityId: updated.id,
        metadata: validated,
      });

      return sendSuccess(res, 'Business updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Suspend business
   */
  static async suspendBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await prisma.tenant.update({
        where: { id: req.params.id },
        data: { status: TenantStatus.SUSPENDED },
      });

      await AuditService.log({
        tenantId: updated.id,
        actorUserId: req.user?.id,
        action: 'TENANT_SUSPENDED',
        entity: 'Tenant',
        entityId: updated.id,
        metadata: { reason: req.body.reason || 'Admin action' },
      });

      return sendSuccess(res, 'Business suspended successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Activate business
   */
  static async activateBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await prisma.tenant.update({
        where: { id: req.params.id },
        data: { status: TenantStatus.ACTIVE },
      });

      await AuditService.log({
        tenantId: updated.id,
        actorUserId: req.user?.id,
        action: 'TENANT_ACTIVATED',
        entity: 'Tenant',
        entityId: updated.id,
      });

      return sendSuccess(res, 'Business activated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Archive business
   */
  static async archiveBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await prisma.tenant.update({
        where: { id: req.params.id },
        data: { status: TenantStatus.ARCHIVED },
      });

      await AuditService.log({
        tenantId: updated.id,
        actorUserId: req.user?.id,
        action: 'TENANT_ARCHIVED',
        entity: 'Tenant',
        entityId: updated.id,
      });

      return sendSuccess(res, 'Business archived successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all platform users with memberships
   */
  static async getUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          customerProfile: true,
          barberProfile: true,
          memberships: {
            include: {
              tenant: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(
        res,
        'Users retrieved successfully.',
        users
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * List and create subscription plans
   */
  static async getPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await prisma.plan.findMany({
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
        orderBy: { price: 'asc' },
      });

      return sendSuccess(res, 'Plans retrieved successfully.', plans);
    } catch (err) {
      next(err);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createPlanSchema.parse(req.body);

      const plan = await prisma.plan.create({
        data: {
          name: validated.name,
          slug: validated.slug.toLowerCase(),
          description: validated.description,
          price: validated.price,
          interval: validated.interval,
          maxBarbers: validated.maxBarbers,
          maxMonthlyAppointments: validated.maxMonthlyAppointments,
          features: validated.features ? JSON.stringify(validated.features) : null,
          isActive: validated.isActive,
        },
      });

      return sendSuccess(res, 'Plan created successfully.', plan, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List platform subscriptions
   */
  static async getSubscriptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const subscriptions = await prisma.subscription.findMany({
        include: {
          tenant: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, 'Subscriptions retrieved successfully.', subscriptions);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Platform Audit Logs
   */
  static async getAuditLogs(_req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await AuditService.getPlatformAuditLogs(300);
      return sendSuccess(res, 'Platform audit logs retrieved.', logs);
    } catch (err) {
      next(err);
    }
  }

  /**
   * SUPER_ADMIN: Change or upgrade/downgrade a tenant's subscription plan
   */
  static async changeTenantPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { planSlug } = z
        .object({
          planSlug: z.string().min(2, 'Plan slug is required').max(50),
        })
        .parse(req.body);

      const tenantId = req.params.id;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        throw new AppError('Business not found.', 404, 'BUSINESS_NOT_FOUND');
      }

      const plan = await prisma.plan.findUnique({
        where: { slug: planSlug.toLowerCase() },
      });
      if (!plan || !plan.isActive) {
        throw new AppError(
          `Requested subscription plan '${planSlug}' was not found or is inactive.`,
          400,
          'INVALID_PLAN'
        );
      }

      const updatedSubscription = await prisma.$transaction(async (tx) => {
        const existingSub = await tx.subscription.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        });

        if (existingSub) {
          return tx.subscription.update({
            where: { id: existingSub.id },
            data: {
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            include: { plan: true },
          });
        } else {
          return tx.subscription.create({
            data: {
              tenantId,
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            include: { plan: true },
          });
        }
      });

      await AuditService.log({
        tenantId,
        actorUserId: req.user?.id,
        action: 'PLAN_CHANGED',
        entity: 'Subscription',
        entityId: updatedSubscription.id,
        metadata: {
          newPlan: plan.name,
          newPlanSlug: plan.slug,
          maxBarbers: plan.maxBarbers,
          maxMonthlyAppointments: plan.maxMonthlyAppointments,
        },
      });

      return sendSuccess(
        res,
        `Business subscription successfully updated to ${plan.name}.`,
        updatedSubscription
      );
    } catch (err) {
      next(err);
    }
  }
}
