import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '@prisma/client';

export class CustomerController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const tenantId = req.tenantId;

      if (!tenantId && user.platformRole !== Role.SUPER_ADMIN) {
        throw new AppError('Tenant context is required to list shop customers.', 400, 'TENANT_REQUIRED');
      }

      const whereClause =
        user.platformRole === Role.SUPER_ADMIN && !tenantId
          ? {}
          : {
              OR: [
                { tenantId },
                { appointments: { some: { tenantId } } },
                { user: { memberships: { some: { tenantId, isActive: true } } } },
              ],
            };

      const customers = await prisma.customerProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, email: true, isActive: true, createdAt: true },
          },
        },
        orderBy: { fullName: 'asc' },
      });

      return sendSuccess(res, 'Customers fetched successfully.', customers);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const tenantId = req.tenantId;

      if (user.role === Role.CUSTOMER) {
        if (user.customerId !== req.params.id) {
          throw new AppError('Forbidden. You can only view your own customer profile.', 403, 'FORBIDDEN');
        }
      } else if (user.platformRole !== Role.SUPER_ADMIN) {
        if (!tenantId) {
          throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
        }
      }

      const whereClause =
        user.platformRole === Role.SUPER_ADMIN
          ? { id: req.params.id }
          : user.role === Role.CUSTOMER
          ? { id: req.params.id, userId: user.id }
          : {
              id: req.params.id,
              OR: [
                { tenantId },
                { appointments: { some: { tenantId } } },
                { user: { memberships: { some: { tenantId, isActive: true } } } },
              ],
            };

      const customer = await prisma.customerProfile.findFirst({
        where: whereClause,
        include: {
          user: {
            select: { id: true, email: true, isActive: true, createdAt: true },
          },
        },
      });

      if (!customer) {
        throw new AppError('Customer profile not found.', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, 'Customer profile fetched successfully.', customer);
    } catch (err) {
      next(err);
    }
  }
}
