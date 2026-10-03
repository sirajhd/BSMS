import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
  phone: z.string().min(6, 'Valid phone number is required').max(30, 'Phone number cannot exceed 30 characters'),
  email: z.string().email('Valid email address is required').max(255, 'Email cannot exceed 255 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password cannot exceed 128 characters'),
  profileImage: z.string().max(3 * 1024 * 1024, 'Profile image payload exceeds size limit').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  phone: z.string().min(6, 'Valid phone number is required').max(30).optional(),
  profileImage: z.string().max(3 * 1024 * 1024, 'Profile image payload exceeds size limit').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
