import { z } from 'zod';

const role = z.enum(['admin', 'site_in_charge', 'accountant']);

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role,
    phone: z.union([z.string(), z.null()]).optional(),
    approval_limit: z.union([z.number(), z.string(), z.null()]).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email('Invalid email address').optional(),
    role: role.optional(),
    phone: z.union([z.string(), z.null()]).optional(),
    approval_limit: z.union([z.number(), z.string(), z.null()]).optional(),
    is_active: z.coerce.number().int().min(0).max(1).optional(),
    password: z.union([z.string().min(6), z.literal(''), z.null()]).optional(),
  }),
});
