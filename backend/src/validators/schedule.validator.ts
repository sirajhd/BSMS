import { z } from 'zod';

const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const businessScheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:mm)'),
  closeTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:mm)'),
}).refine((data) => {
  if (!data.isOpen) return true;
  return data.openTime < data.closeTime;
}, {
  message: 'openTime must be earlier than closeTime on open days',
  path: ['closeTime'],
});

export const updateBusinessScheduleSchema = z.array(businessScheduleItemSchema);

export const barberAvailabilityItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(timeFormatRegex, 'Invalid time format (HH:mm)'),
}).refine((data) => data.startTime < data.endTime, {
  message: 'startTime must be earlier than endTime',
  path: ['endTime'],
});

export const updateBarberAvailabilitySchema = z.array(barberAvailabilityItemSchema);
