import { PaymentStatus, PaymentMethod } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export class PaymentService {
  static async getAllPayments() {
    return prisma.payment.findMany({
      include: {
        appointment: {
          include: {
            customer: true,
            barber: true,
            service: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getPaymentByAppointmentId(appointmentId: string) {
    const payment = await prisma.payment.findFirst({
      where: { appointmentId },
      include: { appointment: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }

  static async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { appointment: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }

  // Update payment status (e.g. cash collected in shop, or provider callback verification)
  static async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionReference?: string
  ) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { appointment: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          ...(transactionReference ? { transactionReference } : {}),
        },
      });

      // Synchronize appointment paymentStatus
      await tx.appointment.update({
        where: { id: payment.appointmentId },
        data: { paymentStatus: status },
      });

      return updatedPayment;
    });
  }
}
