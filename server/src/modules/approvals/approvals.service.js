import { ApprovalsRepository } from './approvals.repository.js';
import { ExpensesRepository } from '../expenses/expenses.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import db from '../../config/database.js';

export class ApprovalsService {
  static async getPendingQueue(user, filters = {}) {
    return ApprovalsRepository.getPendingForUser(user, filters);
  }

  static async approveExpense(expenseId, user, comments = '') {
    const expense = await ExpensesRepository.findById(expenseId);
    if (!expense) throw ApiError.notFound('Expense not found');

    if (expense.status !== 'pending') {
      throw ApiError.badRequest(`Cannot approve expense in '${expense.status}' status. Only pending expenses can be approved.`);
    }

    // Role check: PM or Admin
    if (!['admin', 'project_manager'].includes(user.role)) {
      throw ApiError.forbidden('Only Project Managers or Admins can approve pending expenses.');
    }

    if (user.role !== 'admin' && expense.submitted_by === user.id) {
      throw ApiError.forbidden('You cannot approve your own expense. Another manager or an Admin must approve it.');
    }

    // Per-Account Expenditure Approval Limit Enforcement
    if (user.role !== 'admin') {
      const approver = await db.getOne(
        'SELECT id, name, role, approval_limit FROM users WHERE id = ?',
        [user.id]
      );

      if (approver) {
        if (approver.approval_limit !== null && approver.approval_limit !== undefined) {
          const numericLimit = Number(approver.approval_limit);
          if (numericLimit === 0) {
            throw ApiError.forbidden(
              `Your account (${approver.name}) does not have expenditure approval authorization (Limit: ₹0). Requires approval by an authorized manager or Super Admin.`
            );
          }

          if (Number(expense.amount) > numericLimit) {
            throw ApiError.forbidden(
              `Expense voucher amount of ₹${Number(expense.amount).toLocaleString('en-IN')} exceeds your account's approval limit of ₹${numericLimit.toLocaleString('en-IN')}. Requires authorization by a Super Admin or user with higher approval limit.`
            );
          }
        }
      }
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Update expense status & record approver identity directly
    await ExpensesRepository.update(expenseId, {
      status: 'approved',
      rejection_reason: null,
      approved_by: user.id,
      approved_at: now,
      approval_comments: comments || null,
    });

    // Log in approvals table
    await ApprovalsRepository.logApproval(expenseId, user.id, 'approved', comments, 1);

    return ExpensesRepository.findById(expenseId);
  }

  static async rejectExpense(expenseId, user, reason, comments = '') {
    const expense = await ExpensesRepository.findById(expenseId);
    if (!expense) throw ApiError.notFound('Expense not found');

    if (!['pending', 'approved'].includes(expense.status)) {
      throw ApiError.badRequest(`Cannot reject expense in '${expense.status}' status.`);
    }

    if (!reason || reason.trim().length === 0) {
      throw ApiError.badRequest('Rejection reason is required.');
    }

    // Role check: PM, Admin, Accountant
    if (!['admin', 'project_manager', 'accountant'].includes(user.role)) {
      throw ApiError.forbidden('You do not have permission to reject this expense.');
    }

    await ExpensesRepository.update(expenseId, {
      status: 'rejected',
      rejection_reason: reason.trim(),
    });

    await ApprovalsRepository.logApproval(expenseId, user.id, 'rejected', comments ? `${reason} | ${comments}` : reason, 1);

    return ExpensesRepository.findById(expenseId);
  }

  static async processExpense(expenseId, user, comments = '') {
    const expense = await ExpensesRepository.findById(expenseId);
    if (!expense) throw ApiError.notFound('Expense not found');

    if (expense.status !== 'approved') {
      throw ApiError.badRequest(`Only approved expenses can be processed for payment. Current status: '${expense.status}'`);
    }

    // Role check: Accountant or Admin
    if (!['admin', 'accountant'].includes(user.role)) {
      throw ApiError.forbidden('Only Accountants or Admins can mark expenses as processed.');
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await ExpensesRepository.update(expenseId, {
      status: 'processed',
      processed_by: user.id,
      processed_at: now,
    });

    await ApprovalsRepository.logApproval(expenseId, user.id, 'approved', comments || 'Payment processed and reconciled', 2);

    return ExpensesRepository.findById(expenseId);
  }
}
