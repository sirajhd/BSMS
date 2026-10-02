import { apiClient } from './client';
import type { Payment, PaymentStatus } from '../types';

export const paymentsApi = {
  getAllPayments: () =>
    apiClient<Payment[]>('/payments'),

  getPaymentByAppointmentId: (appointmentId: string) =>
    apiClient<Payment>(`/payments/appointment/${appointmentId}`),

  updatePaymentStatus: (id: string, status: PaymentStatus, transactionReference?: string) =>
    apiClient<Payment>(`/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, transactionReference }),
    }),
};
