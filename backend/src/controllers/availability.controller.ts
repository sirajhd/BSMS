import type { Request, Response, NextFunction } from 'express';
import { AvailabilityService } from '../services/availability.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { getAvailabilityQuerySchema } from '../validators/appointment.validator.js';

export class AvailabilityController {
  static async getAvailableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.tenantId) {
        throw new AppError('Tenant context is required to calculate availability.', 400, 'TENANT_REQUIRED');
      }
      const { serviceId, barberId, date } = getAvailabilityQuerySchema.parse(req.query);
      const result = await AvailabilityService.getAvailableSlots(
        serviceId,
        barberId,
        date,
        undefined,
        req.tenantId
      );
      return sendSuccess(res, 'Available appointment slots calculated successfully.', result);
    } catch (err) {
      next(err);
    }
  }
}
