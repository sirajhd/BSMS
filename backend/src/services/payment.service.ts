import { PaymentStatus } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';

export class PaymentService {
  static async getAllPayments(tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to view payments.', 400, 'TENANT_REQUIRED');
    }

    return prisma.payment.findMany({
      where: { tenantId },
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

  static async getPaymentByAppointmentId(appointmentId: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const payment = await prisma.payment.findFirst({
      where: {
        appointmentId,
        tenantId,
      },
      include: { appointment: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }

  static async getPaymentById(id: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        tenantId,
      },
      include: { appointment: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }

  /**
   * Safe State Machine Validation for Payment Status Lifecycle:
   * - PENDING -> PAID, FAILED
   * - PAID -> REFUNDED
   * - FAILED -> PENDING, PAID
   * - REFUNDED -> terminal
   */
  static validatePaymentTransition(current: PaymentStatus, target: PaymentStatus): void {
    if (current === target) {
      return;
    }

    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      PENDING: [PaymentStatus.PAID, PaymentStatus.FAILED],
      PAID: [PaymentStatus.REFUNDED],
      FAILED: [PaymentStatus.PENDING, PaymentStatus.PAID],
      REFUNDED: [],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(target)) {
      throw new AppError(
        `Invalid payment transition from ${current} to ${target}.`,
        400,
        'INVALID_PAYMENT_TRANSITION'
      );
    }
  }

  // Update payment status with strict tenant and transition verification
  static async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionReference?: string,
    tenantId?: string,
    actorUserId?: string
  ) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const payment = await this.getPaymentById(paymentId, tenantId);

    // Validate lifecycle transition
    this.validatePaymentTransition(payment.status, status);

    const result = await prisma.$transaction(async (tx) => {
      const updateRes = await tx.payment.updateMany({
        where: {
          id: paymentId,
          tenantId,
        },
        data: {
          status,
          ...(transactionReference ? { transactionReference } : {}),
        },
      });

      if (updateRes.count === 0) {
        throw new AppError('Payment could not be updated or does not belong to this shop.', 400, 'UPDATE_FAILED');
      }

      const updatedPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { appointment: true },
      });

      if (!updatedPayment) {
        throw new AppError('Payment not found.', 404, 'PAYMENT_NOT_FOUND');
      }

      // Synchronize appointment paymentStatus within tenant boundary
      if (payment.appointmentId) {
        await tx.appointment.updateMany({
          where: {
            id: payment.appointmentId,
            tenantId,
          },
          data: { paymentStatus: status },
        });
      }

      return updatedPayment;
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'PAYMENT_STATUS_UPDATED',
      entity: 'Payment',
      entityId: paymentId,
      metadata: { previousStatus: payment.status, newStatus: status, amount: payment.amount },
    });

    return result;
  }
}
