import type { Request, Response, NextFunction } from 'express';
import { ManagerService } from '../services/manager.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createManagerSchema,
  updateManagerSchema,
} from '../validators/manager.validator.js';

export class ManagerController {
  /**
   * List all managers in the current tenant
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
      }
      const includeInactive = req.query.includeInactive === 'true';
      const managers = await ManagerService.getAllManagers(
        req.tenantId,
        includeInactive
      );
      return sendSuccess(res, 'Managers fetched successfully.', managers);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single manager details by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
      }
      const manager = await ManagerService.getManagerById(
        req.params.id,
        req.tenantId
      );
      return sendSuccess(res, 'Manager fetched successfully.', manager);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new manager in the current tenant
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
      }
      const validated = createManagerSchema.parse(req.body);
      const created = await ManagerService.createManager(
        validated,
        req.tenantId,
        req.user?.id
      );
      return sendSuccess(res, 'Manager created successfully.', created, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update manager details
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
      }
      const validated = updateManagerSchema.parse(req.body);
      const updated = await ManagerService.updateManager(
        req.params.id,
        validated,
        req.tenantId,
        req.user?.id
      );
      return sendSuccess(res, 'Manager updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggle manager active membership status
   */
  static async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
      }
      const updated = await ManagerService.toggleManagerStatus(
        req.params.id,
        req.tenantId,
        req.user?.id
      );
      return sendSuccess(res, 'Manager status toggled successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}
