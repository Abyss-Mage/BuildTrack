import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');
const money = z.coerce.number().min(0, 'Amounts cannot be negative');
const paymentMethod = z.enum(['bank_transfer', 'upi', 'cash', 'cheque']);

const fields = {
  user_id: z.coerce.number().int().positive('Employee selection is required'),
  start_date: date,
  end_date: date,
  base_salary: money,
  allowances: money.optional(),
  deductions: money.optional(),
  payroll_period: z.string().optional().nullable(),
  status: z.enum(['draft', 'pending', 'paid']).optional(),
  payment_method: paymentMethod.optional(),
  payment_reference: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
};

export const createPayrollSchema = z.object({ body: z.object(fields) });
export const updatePayrollSchema = z.object({ body: z.object(fields).partial() });

export const payPayrollSchema = z.object({
  body: z.object({
    payment_date: date.optional(),
    payment_method: paymentMethod.optional(),
    payment_reference: z.string().max(100).optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});
