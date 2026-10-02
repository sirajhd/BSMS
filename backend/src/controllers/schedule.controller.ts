import type { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/schedule.service.js';
import { sendSuccess } from '../utils/response.js';
import { updateBusinessScheduleSchema } from '../validators/schedule.validator.js';

export class ScheduleController {
  static async getBusinessSchedule(_req: Request, res: Response, next: NextFunction) {
    try {
      const schedule = await ScheduleService.getBusinessSchedule();
      return sendSuccess(res, 'Business operating schedule fetched successfully.', schedule);
    } catch (err) {
      next(err);
    }
  }

  static async updateBusinessSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateBusinessScheduleSchema.parse(req.body);
      const updated = await ScheduleService.updateBusinessSchedule(validated);
      return sendSuccess(res, 'Business operating schedule updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}
