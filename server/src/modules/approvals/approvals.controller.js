import { ApprovalsService } from './approvals.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getPendingQueue = asyncHandler(async (req, res) => {
  const queue = await ApprovalsService.getPendingQueue(req.user, req.query);
  res.status(200).json({ success: true, count: queue.length, data: queue });
});

export const approveExpense = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const expense = await ApprovalsService.approveExpense(req.params.expenseId, req.user, comments);

  await logAudit(req, {
    action: 'EXPENSE_APPROVE',
    entityType: 'expense',
    entityId: expense.id,
    details: {
      reference_no: expense.reference_no,
      amount: expense.amount,
      project: expense.project_name,
      comments: comments || null,
    },
  });

  res.status(200).json({ success: true, message: 'Expense approved successfully', data: expense });
});

export const rejectExpense = asyncHandler(async (req, res) => {
  const { reason, comments } = req.body;
  const expense = await ApprovalsService.rejectExpense(req.params.expenseId, req.user, reason, comments);

  await logAudit(req, {
    action: 'EXPENSE_REJECT',
    entityType: 'expense',
    entityId: expense.id,
    details: {
      reference_no: expense.reference_no,
      amount: expense.amount,
      reason,
      comments: comments || null,
    },
  });

  res.status(200).json({ success: true, message: 'Expense rejected', data: expense });
});
