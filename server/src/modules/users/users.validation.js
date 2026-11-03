import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'project_manager', 'site_engineer', 'accountant']),
    phone: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['admin', 'project_manager', 'site_engineer', 'accountant']).optional(),
    phone: z.string().optional(),
    is_active: z.number().int().min(0).max(1).optional(),
    password: z.string().min(6).optional(),
  }),
});
