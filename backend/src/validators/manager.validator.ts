import { z } from 'zod';

export const createManagerSchema = z.object({
  fullName: z.string().min(2, 'Manager name must be at least 2 characters').max(100),
  phone: z.string().min(6, 'Valid phone number is required').max(30),
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(6, 'Temporary password must be at least 6 characters').max(128),
  profileImage: z.string().max(3 * 1024 * 1024).optional(),
});

export const updateManagerSchema = z.object({
  fullName: z.string().min(2, 'Manager name must be at least 2 characters').max(100).optional(),
  phone: z.string().min(6, 'Valid phone number is required').max(30).optional(),
  profileImage: z.string().max(3 * 1024 * 1024).optional(),
  isActive: z.boolean().optional(),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;
