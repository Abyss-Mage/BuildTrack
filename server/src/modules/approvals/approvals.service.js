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

    // Requirement 2: Check Per-Role Expenditure Approval Allocation for this Project
    if (user.role !== 'admin') {
      const limit = await db.getOne(
        'SELECT can_approve, max_amount_per_expense FROM project_role_approval_limits WHERE project_id = ? AND role = ?',
        [expense.project_id, user.role]
      );

      if (limit) {
        if (!limit.can_approve) {
          throw ApiError.forbidden(`Your role (${user.role.replace('_', ' ')}) is not authorized to approve expenditures for ${expense.project_name}.`);
        }

        if (limit.max_amount_per_expense !== null && Number(expense.amount) > Number(limit.max_amount_per_expense)) {
          throw ApiError.forbidden(
            `Expense amount of ₹${Number(expense.amount).toLocaleString('en-IN')} exceeds your role's approval limit of ₹${Number(limit.max_amount_per_expense).toLocaleString('en-IN')} for ${expense.project_name}. Requires authorization by a Super Admin.`
          );
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
