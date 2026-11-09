import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');

export const uploadWageSheetSchema = z.object({
  body: z.object({
    project_id: z.coerce.number().int().positive('Select a site'),
    period_type: z.enum(['weekly', 'fortnightly', 'monthly', 'custom']),
    start_date: date,
    end_date: date,
  }),
});

export const employeePhoneSchema = z.object({
  body: z.object({
    phone: z.string().trim().regex(/^\+?[\d\s-]{10,16}$/, 'Enter a valid mobile number'),
  }),
});
