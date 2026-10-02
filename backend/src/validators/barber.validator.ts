import { z } from 'zod';

export const createBarberSchema = z.object({
  fullName: z.string().min(2, 'Barber name must be at least 2 characters'),
  phone: z.string().min(6, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Temporary password must be at least 6 characters'),
  profileImage: z.string().optional(),
});

export const updateBarberSchema = z.object({
  fullName: z.string().min(2, 'Barber name must be at least 2 characters').optional(),
  phone: z.string().min(6, 'Valid phone number is required').optional(),
  profileImage: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBarberInput = z.infer<typeof createBarberSchema>;
export type UpdateBarberInput = z.infer<typeof updateBarberSchema>;
