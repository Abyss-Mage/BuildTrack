import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');

export const createAdvanceSchema = z.object({
  body: z.object({
    project_id: z.coerce.number().int().positive('Select a site'),
    site_in_charge_id: z.coerce.number().int().positive('Select a Site In-Charge'),
    amount: z.coerce.number().positive('Amount must be greater than zero').max(9999999999999),
    allocation_date: date,
    period_type: z.enum(['weekly', 'fortnightly', 'monthly', 'custom']),
    start_date: date,
    end_date: date,
    notes: z.string().max(1000).optional().nullable(),
  }),
});
