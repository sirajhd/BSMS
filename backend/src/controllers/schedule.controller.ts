import type { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateBusinessScheduleSchema } from '../validators/schedule.validator.js';

export class ScheduleController {
  static async getBusinessSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required to view shop schedule.', 400, 'TENANT_REQUIRED');
      }
      const schedule = await ScheduleService.getBusinessSchedule(req.tenantId);
      return sendSuccess(res, 'Business operating schedule fetched successfully.', schedule);
    } catch (err) {
      next(err);
    }
  }

  static async updateBusinessSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateBusinessScheduleSchema.parse(req.body);
      const updated = await ScheduleService.updateBusinessSchedule(validated, req.tenantId, req.user?.id);
      return sendSuccess(res, 'Business operating schedule updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}
