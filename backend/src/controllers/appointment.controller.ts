import type { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '@prisma/client';
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
  createWalkInSchema,
} from '../validators/appointment.validator.js';

export class AppointmentController {
  static async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;

      if (user.role === Role.CUSTOMER) {
        if (!user.customerId) {
          throw new AppError('Customer profile not found.', 404, 'NO_PROFILE');
        }
        const appointments = await AppointmentService.getCustomerAppointments(user.customerId);
        return sendSuccess(res, 'Appointments fetched successfully.', appointments);
      }

      if (user.role === Role.BARBER) {
        if (!user.barberId) {
          throw new AppError('Barber profile not found.', 404, 'NO_PROFILE');
        }
        const dateStr = req.query.date as string | undefined;
        const status = req.query.status as any | undefined;
        const appointments = await AppointmentService.getBarberAppointments(user.barberId, dateStr, status);
        return sendSuccess(res, 'Appointments fetched successfully.', appointments);
      }

      // ADMIN
      const appointments = await AppointmentService.getAllAppointments({
        searchQuery: req.query.search as string | undefined,
        dateStr: req.query.date as string | undefined,
        barberId: req.query.barberId as string | undefined,
        status: req.query.status as any | undefined,
      });

      return sendSuccess(res, 'All appointments fetched successfully.', appointments);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const apt = await AppointmentService.getAppointmentById(req.params.id);

      if (user.role === Role.CUSTOMER && apt.customerId !== user.customerId) {
        throw new AppError('Forbidden. You do not have permission to view this appointment.', 403, 'FORBIDDEN');
      }

      if (user.role === Role.BARBER && apt.barberId !== user.barberId) {
        throw new AppError('Forbidden. You do not have permission to view this appointment.', 403, 'FORBIDDEN');
      }

      return sendSuccess(res, 'Appointment fetched successfully.', AppointmentService.formatAppointment(apt));
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      if (!user.customerId) {
        throw new AppError('Only registered customers can book appointments.', 403, 'FORBIDDEN');
      }

      const validated = createAppointmentSchema.parse(req.body);
      const created = await AppointmentService.bookAppointment(user.customerId, validated);
      return sendSuccess(res, 'Appointment booked successfully.', created, 201);
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const cancelled = await AppointmentService.cancelAppointment(
        req.params.id,
        user.id,
        user.role
      );
      return sendSuccess(res, 'Appointment cancelled successfully.', cancelled);
    } catch (err) {
      next(err);
    }
  }

  static async reschedule(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const validated = rescheduleAppointmentSchema.parse(req.body);
      const rescheduled = await AppointmentService.rescheduleAppointment(
        req.params.id,
        validated,
        user.id,
        user.role
      );
      return sendSuccess(res, 'Appointment rescheduled successfully.', rescheduled);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const validated = updateAppointmentStatusSchema.parse(req.body);
      const updated = await AppointmentService.updateStatus(
        req.params.id,
        validated,
        user.id,
        user.role
      );
      return sendSuccess(res, 'Appointment status updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }

  static async createWalkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      if (user.role !== Role.BARBER && user.role !== Role.ADMIN) {
        throw new AppError('Forbidden. Only barbers and admins can create walk-ins.', 403, 'FORBIDDEN');
      }

      const validated = createWalkInSchema.parse(req.body);
      const barberProfileId = user.role === Role.BARBER ? user.barberId! : validated.barberId;

      const created = await AppointmentService.createWalkIn(validated, barberProfileId);
      return sendSuccess(res, 'Walk-in appointment recorded successfully.', created, 201);
    } catch (err) {
      next(err);
    }
  }
}
