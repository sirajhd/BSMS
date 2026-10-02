import { z } from 'zod';

const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const getAvailabilityQuerySchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  barberId: z.string().min(1, 'barberId is required'),
  date: z.string().regex(dateFormatRegex, 'date must be in YYYY-MM-DD format'),
});

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  barberId: z.string().min(1, 'barberId is required'),
  appointmentDate: z.string().regex(dateFormatRegex, 'appointmentDate must be in YYYY-MM-DD format'),
  startTime: z.string().regex(timeFormatRegex, 'startTime must be in HH:mm format'),
  paymentMethod: z.enum(['ONLINE', 'PAY_AT_SHOP']).default('PAY_AT_SHOP'),
  notes: z.string().optional(),
});

export const rescheduleAppointmentSchema = z.object({
  barberId: z.string().optional(),
  newDate: z.string().regex(dateFormatRegex, 'newDate must be in YYYY-MM-DD format'),
  newTime: z.string().regex(timeFormatRegex, 'newTime must be in HH:mm format'),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'LATE',
    'NO_SHOW',
    'RESCHEDULED',
  ]),
});

export const createWalkInSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerPhone: z.string().optional(),
  serviceId: z.string().min(1, 'serviceId is required'),
  barberId: z.string().min(1, 'barberId is required'),
  appointmentDate: z.string().regex(dateFormatRegex, 'appointmentDate must be in YYYY-MM-DD format'),
  startTime: z.string().regex(timeFormatRegex, 'startTime must be in HH:mm format'),
  paymentMethod: z.enum(['ONLINE', 'PAY_AT_SHOP']).default('PAY_AT_SHOP'),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).default('PENDING'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type CreateWalkInInput = z.infer<typeof createWalkInSchema>;
