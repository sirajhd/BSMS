import type { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { sendSuccess } from '../utils/response.js';
import { PaymentStatus, Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const updatePaymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']),
  transactionReference: z.string().optional(),
});

export class PaymentController {
  static async getAllPayments(_req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await PaymentService.getAllPayments();
      return sendSuccess(res, 'Payments ledger fetched successfully.', payments);
    } catch (err) {
      next(err);
    }
  }

  static async getByAppointmentId(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const payment = await PaymentService.getPaymentByAppointmentId(req.params.appointmentId);

      if (user.role === Role.CUSTOMER && payment.appointment.customerId !== user.customerId) {
        throw new AppError('Forbidden. You do not have permission to view this payment record.', 403, 'FORBIDDEN');
      }

      if (user.role === Role.BARBER && payment.appointment.barberId !== user.barberId) {
        throw new AppError('Forbidden. You do not have permission to view this payment record.', 403, 'FORBIDDEN');
      }

      return sendSuccess(res, 'Payment details fetched successfully.', payment);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!;
      const { status, transactionReference } = updatePaymentStatusSchema.parse(req.body);

      // Verify ownership if caller is BARBER
      if (user.role === Role.BARBER) {
        const payment = await PaymentService.getPaymentById(req.params.id);
        if (payment.appointment.barberId !== user.barberId) {
          throw new AppError('Forbidden. You can only update payments for your assigned appointments.', 403, 'FORBIDDEN');
        }
      }

      const updated = await PaymentService.updatePaymentStatus(
        req.params.id,
        status as PaymentStatus,
        transactionReference
      );
      return sendSuccess(res, 'Payment status updated successfully.', updated);
    } catch (err) {
      next(err);
    }
  }
}
