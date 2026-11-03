import { ApprovalsService } from './approvals.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getPendingQueue = asyncHandler(async (req, res) => {
  const queue = await ApprovalsService.getPendingQueue(req.user);
  res.status(200).json({ success: true, count: queue.length, data: queue });
});

export const approveExpense = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const expense = await ApprovalsService.approveExpense(req.params.expenseId, req.user, comments);
  res.status(200).json({ success: true, message: 'Expense approved successfully', data: expense });
});

export const rejectExpense = asyncHandler(async (req, res) => {
  const { reason, comments } = req.body;
  const expense = await ApprovalsService.rejectExpense(req.params.expenseId, req.user, reason, comments);
  res.status(200).json({ success: true, message: 'Expense rejected', data: expense });
});

export const processExpense = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const expense = await ApprovalsService.processExpense(req.params.expenseId, req.user, comments);
  res.status(200).json({ success: true, message: 'Expense marked as processed', data: expense });
});
