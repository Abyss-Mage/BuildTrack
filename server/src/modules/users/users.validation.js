import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'project_manager', 'site_engineer', 'accountant']),
    phone: z.union([z.string(), z.null()]).optional(),
    approval_limit: z.union([z.number(), z.string(), z.null()]).optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email('Invalid email address').optional(),
    role: z.enum(['admin', 'project_manager', 'site_engineer', 'accountant']).optional(),
    phone: z.union([z.string(), z.null()]).optional(),
    approval_limit: z.union([z.number(), z.string(), z.null()]).optional(),
    is_active: z.union([z.number(), z.string()]).optional(),
    password: z.union([z.string().min(6), z.literal(''), z.null()]).optional(),
  }),
});
