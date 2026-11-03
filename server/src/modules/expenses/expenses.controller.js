import { ExpensesService } from './expenses.service.js';
import { processReceiptFiles } from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

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
  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: expense,
  });
});

export const submitExpense = asyncHandler(async (req, res) => {
  const expense = await ExpensesService.submitExpense(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: 'Expense submitted for approval',
    data: expense,
  });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const result = await ExpensesService.deleteExpense(req.params.id, req.user);
  res.status(200).json(result);
});

export const removeReceipt = asyncHandler(async (req, res) => {
  const result = await ExpensesService.removeReceipt(req.params.id, req.params.receiptId, req.user);
  res.status(200).json(result);
});
