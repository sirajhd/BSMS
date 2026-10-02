import type { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service.js';
import { sendSuccess } from '../utils/response.js';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validator.js';

export class ServiceController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const services = await ServiceService.getAllServices(includeInactive);
      return sendSuccess(res, 'Services fetched successfully.', services);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await ServiceService.getServiceById(req.params.id);
      return sendSuccess(res, 'Service fetched successfully.', service);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createServiceSchema.parse(req.body);
      const created = await ServiceService.createService(validated);
      return sendSuccess(res, 'Service created successfully.', created, 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateServiceSchema.parse(req.body);
      const updated = await ServiceService.updateService(req.params.id, validated);
      return sendSuccess(res, 'Service updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  static async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ServiceService.toggleServiceStatus(req.params.id);
      return sendSuccess(res, 'Service status toggled successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}
