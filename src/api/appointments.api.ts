import { apiClient } from './client';
import type { Appointment, AppointmentStatus, PaymentMethod, PaymentStatus } from '../types';

export const appointmentsApi = {
  getAppointments: (filters?: {
    search?: string;
    date?: string;
    barberId?: string;
    status?: string;
  }) =>
    apiClient<Appointment[]>('/appointments', {
      params: filters,
    }),

  getAppointmentById: (id: string) =>
    apiClient<Appointment>(`/appointments/${id}`),

  bookAppointment: (data: {
    serviceId: string;
    barberId: string;
    appointmentDate: string;
    startTime: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) =>
    apiClient<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelAppointment: (id: string) =>
    apiClient<Appointment>(`/appointments/${id}/cancel`, {
      method: 'POST',
    }),

  rescheduleAppointment: (
    id: string,
    data: {
      newDate: string;
      newTime: string;
      barberId?: string;
    }
  ) =>
    apiClient<Appointment>(`/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: AppointmentStatus) =>
    apiClient<Appointment>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  createWalkIn: (data: {
    customerName: string;
    customerPhone?: string;
    serviceId: string;
    barberId: string;
    appointmentDate: string;
    startTime: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
  }) =>
    apiClient<Appointment>('/appointments/walk-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
