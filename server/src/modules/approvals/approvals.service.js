import { ApprovalsRepository } from './approvals.repository.js';
import { ExpensesRepository } from '../expenses/expenses.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class ApprovalsService {
  static async getPendingQueue(user) {
    return ApprovalsRepository.getPendingForUser(user);
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

    // Update expense status to approved
    await ExpensesRepository.update(expenseId, { status: 'approved', rejection_reason: null });

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

    await ExpensesRepository.update(expenseId, { status: 'processed' });
    await ApprovalsRepository.logApproval(expenseId, user.id, 'approved', comments || 'Payment processed and reconciled', 2);

    return ExpensesRepository.findById(expenseId);
  }
}
