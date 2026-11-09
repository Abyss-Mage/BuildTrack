import { ExpensesService } from './expenses.service.js';
import { processReceiptFiles } from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getAllExpenses = asyncHandler(async (req, res) => {
  const expenses = await ExpensesService.getAllExpenses(req.query, req.user);
  res.status(200).json({ success: true, count: expenses.length, data: expenses });
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await ExpensesService.getExpenseById(req.params.id, req.user);
  res.status(200).json({ success: true, data: expense });
});

export const createExpense = asyncHandler(async (req, res) => {
  let receipts = [];
  if (req.files && req.files.length > 0) {
    receipts = await processReceiptFiles(req.files);
  }

  const expense = await ExpensesService.createExpense(req.body, receipts, req.user);

  await logAudit(req, {
    action: 'EXPENSE_CREATE',
    entityType: 'expense',
    entityId: expense.id,
    details: {
      reference_no: expense.reference_no,
      title: expense.title,
      amount: expense.amount,
      project_id: expense.project_id,
      payment_method: expense.payment_method,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: expense,
  });
});

export const updateExpense = asyncHandler(async (req, res) => {
  let receipts = [];
  if (req.files && req.files.length > 0) {
    receipts = await processReceiptFiles(req.files);
  }

  const expense = await ExpensesService.updateExpense(req.params.id, req.body, receipts, req.user);

  await logAudit(req, {
    action: 'EXPENSE_UPDATE',
    entityType: 'expense',
    entityId: expense.id,
    details: {
      reference_no: expense.reference_no,
      amount: expense.amount,
      changes: req.body,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: expense,
  });
});

export const submitExpense = asyncHandler(async (req, res) => {
  const expense = await ExpensesService.submitExpense(req.params.id, req.user);

  await logAudit(req, {
    action: 'EXPENSE_SUBMIT_APPROVAL',
    entityType: 'expense',
    entityId: expense.id,
    details: { reference_no: expense.reference_no, amount: expense.amount },
  });

  res.status(200).json({
    success: true,
    message: 'Expense submitted for approval',
    data: expense,
  });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const result = await ExpensesService.deleteExpense(req.params.id, req.user);

  await logAudit(req, {
    action: 'EXPENSE_DELETE',
    entityType: 'expense',
    entityId: req.params.id,
    details: { expense_id: req.params.id },
  });

  res.status(200).json(result);
});
