import { z } from 'zod';

// The form sends '' for a blank date, which MySQL rejects
const optionalDate = z.string().nullable().optional().transform((v) => (v === '' ? null : v));

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
    members: z.array(
      z.object({
        user_id: z.number().int(),
        role_in_project: z.enum(['manager', 'engineer', 'viewer']).default('engineer'),
      })
    ).optional(),
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
    members: z.array(
      z.object({
        user_id: z.number().int(),
        role_in_project: z.enum(['manager', 'engineer', 'viewer']).default('engineer'),
      })
    ).optional(),
  }),
});
