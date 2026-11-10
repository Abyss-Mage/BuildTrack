import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');
const optionalDate = date.or(z.literal('')).nullable().optional().transform((v) => v || null);
const optionalText = (max) => z.string().max(max).nullable().optional();
const blankToNull = (schema) => z.preprocess((v) => (v === '' || v === undefined ? null : v), schema);
const signOff = blankToNull(z.coerce.number().int().positive().nullable());

const item = z.object({
  item: z.string().trim().min(1, 'Item is required').max(200),
  description: optionalText(255),
  unit: z.string().trim().min(1, 'Unit is required').max(30),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  required_date: optionalDate,
  vendor: optionalText(150),
  rate: blankToNull(z.coerce.number().min(0, 'Rate cannot be negative').nullable()),
  remarks: optionalText(255),
});

export const requisitionSchema = z.object({
  body: z.object({
    pr_no: z.string().trim().max(50).nullable().optional().transform((v) => v || null),
    pr_date: date,
    project_id: z.coerce.number().int().positive('Select a site'),
    site_description: optionalText(255),
    department: optionalText(100),
    required_date: optionalDate,
    priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).default('Normal'),
    justification: optionalText(2000),
    requested_by: signOff,
    verified_by: signOff,
    purchase_by: signOff,
    accounts_by: signOff,
    approved_by: signOff,
    items: z.array(item).min(1, 'Add at least one item').max(200),
  }),
});
