
import type { Request, Response, NextFunction } from 'express';
import { BarberService } from '../services/barber.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createBarberSchema,
  updateBarberSchema,
} from '../validators/barber.validator.js';
import { updateBarberAvailabilitySchema } from '../validators/schedule.validator.js';

export class BarberController {
  // Public: return only active barbers
  static async getAll(
    _req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const barbers = await BarberService.getAllBarbers(false);

      return sendSuccess(
        res,
        'Barbers fetched successfully.',
        barbers
      );
    } catch (err) {
      next(err);
    }
  }

  // Public: return only an active barber
  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const barber = await BarberService.getPublicBarberById(
        req.params.id
      );

      return sendSuccess(
        res,
        'Barber fetched successfully.',
        barber
      );
    } catch (err) {
      next(err);
    }
  }

  // Admin only
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const validated = createBarberSchema.parse(req.body);
      const created = await BarberService.createBarber(validated);

      return sendSuccess(
        res,
        'Barber created successfully.',
        created,
        201
      );
    } catch (err) {
      next(err);
    }
  }

  // Admin can update any barber.
  // Barber can update only their own profile.
  static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = req.user!;

      if (
        user.role === 'BARBER' &&
        user.barberId !== req.params.id
      ) {
        throw new AppError(
          'Forbidden. You can only update your own barber profile.',
          403,
          'FORBIDDEN'
        );
      }

      const validated = updateBarberSchema.parse(req.body);

      // Barbers cannot activate/deactivate themselves.
      if (user.role === 'BARBER') {
        delete validated.isActive;
      }

      const updated = await BarberService.updateBarber(
        req.params.id,
        validated
      );

      return sendSuccess(
        res,
        'Barber updated successfully.',
        updated
      );
    } catch (err) {
      next(err);
    }
  }

  // Admin only
  static async toggleStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const updated = await BarberService.toggleBarberStatus(
        req.params.id
      );

      return sendSuccess(
        res,
        'Barber status toggled successfully.',
        updated
      );
    } catch (err) {
      next(err);
    }
  }

  // Public: only active barber availability
  static async getAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const windows =
        await BarberService.getPublicBarberAvailability(
          req.params.id
        );

      return sendSuccess(
        res,
        'Barber availability fetched successfully.',
        windows
      );
    } catch (err) {
      next(err);
    }
  }

  // Admin only
  static async updateAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const validated =
        updateBarberAvailabilitySchema.parse(req.body);

      const updated =
        await BarberService.updateBarberAvailability(
          req.params.id,
          validated
        );

      return sendSuccess(
        res,
        'Barber availability updated successfully.',
        updated
      );
    } catch (err) {
      next(err);
    }
  }
}
