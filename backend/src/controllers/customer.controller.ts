import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '@prisma/client';

export class CustomerController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await prisma.customerProfile.findMany({
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
      if (user.role === Role.CUSTOMER && user.customerId !== req.params.id) {
        throw new AppError('Forbidden. You can only view your own customer profile.', 403, 'FORBIDDEN');
      }

      const customer = await prisma.customerProfile.findUnique({
        where: { id: req.params.id },
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
