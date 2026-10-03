import type { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validator.js';

export class ServiceController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required to list shop services.', 400, 'TENANT_REQUIRED');
      }
      const includeInactive = req.query.includeInactive === 'true';
      const services = await ServiceService.getAllServices(req.tenantId, includeInactive);
      return sendSuccess(res, 'Services fetched successfully.', services);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required to view service details.', 400, 'TENANT_REQUIRED');
      }
      const service = await ServiceService.getServiceById(req.params.id, req.tenantId);
      return sendSuccess(res, 'Service fetched successfully.', service);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createServiceSchema.parse(req.body);
      const created = await ServiceService.createService(validated, req.tenantId, req.user?.id);
      return sendSuccess(res, 'Service created successfully.', created, 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateServiceSchema.parse(req.body);
      const updated = await ServiceService.updateService(req.params.id, validated, req.tenantId, req.user?.id);
      return sendSuccess(res, 'Service updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  static async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ServiceService.toggleServiceStatus(req.params.id, req.tenantId, req.user?.id);
      return sendSuccess(res, 'Service status toggled successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}
