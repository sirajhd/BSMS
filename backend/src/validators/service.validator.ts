import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(100),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500),
  price: z.coerce.number().positive('Price must be greater than 0').max(100000),
  durationMinutes: z.coerce.number().int().min(5, 'Duration must be at least 5 minutes').max(480),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
