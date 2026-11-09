import { z } from 'zod';

// The form sends '' for a blank date, which MySQL rejects
const optionalDate = z.string().nullable().optional().transform((v) => (v === '' ? null : v));
const poNumber = z.string().max(100).nullable().optional();
const siteInChargeIds = z.array(z.coerce.number().int().positive()).optional();

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    code: z.string().min(2, 'Project code is required'),
    location: z.string().min(2, 'Location is required'),
    description: z.string().optional(),
    total_budget: z.coerce.number().min(0, 'Budget must be a non-negative number'),
    start_date: optionalDate,
    end_date: optionalDate,
    status: z.enum(['active', 'completed', 'on_hold']).default('active'),
    po_number: poNumber,
    po_date: optionalDate,
    site_in_charge_ids: siteInChargeIds,
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    code: z.string().min(2).optional(),
    location: z.string().min(2).optional(),
    description: z.string().optional(),
    total_budget: z.coerce.number().min(0).optional(),
    start_date: optionalDate,
    end_date: optionalDate,
    status: z.enum(['active', 'completed', 'on_hold']).optional(),
    po_number: poNumber,
    po_date: optionalDate,
    site_in_charge_ids: siteInChargeIds,
  }),
});
