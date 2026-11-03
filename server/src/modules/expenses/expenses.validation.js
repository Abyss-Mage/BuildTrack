import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    project_id: z.coerce.number().int({ message: 'Project ID is required' }),
    category_id: z.coerce.number().int({ message: 'Category ID is required' }),
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    amount: z.coerce.number().positive('Amount must be greater than zero'),
    expense_date: z.string().min(1, 'Expense date is required'),
    vendor_name: z.string().optional().nullable(),
    payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'credit_card']).default('cash'),
    status: z.enum(['draft', 'pending']).default('pending'),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    project_id: z.coerce.number().int().optional(),
    category_id: z.coerce.number().int().optional(),
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    amount: z.coerce.number().positive().optional(),
    expense_date: z.string().optional(),
    vendor_name: z.string().optional().nullable(),
    payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'credit_card']).optional(),
    status: z.enum(['draft', 'pending']).optional(),
  }),
});
