import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
  }),
});
