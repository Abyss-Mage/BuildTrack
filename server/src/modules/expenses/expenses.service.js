import { ExpensesRepository } from './expenses.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class ExpensesService {
  static async getAllExpenses(filters, user) {
    return ExpensesRepository.findAll(filters, user);
  }

  static async getExpenseById(id, user) {
    const expense = await ExpensesRepository.findById(id);
    if (!expense) throw ApiError.notFound('Expense record not found');

    // Role verification
    if (user.role === 'site_engineer' && expense.submitted_by !== user.id) {
      // Check if engineer is in project members
      // (Allowed to view project expenses if assigned)
    }

    return expense;
  }

  static async createExpense(data, receipts, user) {
    return ExpensesRepository.create(data, receipts, user.id);
  }

  static async updateExpense(id, data, receipts, user) {
    const existing = await this.getExpenseById(id, user);

    // Business check: Can only edit if status is draft or rejected, or user is admin
    if (user.role !== 'admin' && !['draft', 'rejected'].includes(existing.status)) {
      throw ApiError.badRequest(
        `Cannot modify expense in '${existing.status}' status. Only draft or rejected expenses can be edited.`
      );
    }

    if (user.role !== 'admin' && existing.submitted_by !== user.id) {
      throw ApiError.forbidden('You are not authorized to edit this expense.');
    }

    // If it was rejected and user edits it, clear rejection reason
    if (existing.status === 'rejected' && !data.status) {
      data.status = 'draft';
      data.rejection_reason = null;
    }

    return ExpensesRepository.update(id, data, receipts);
  }

  static async submitExpense(id, user) {
    const existing = await this.getExpenseById(id, user);

    if (user.role !== 'admin' && existing.submitted_by !== user.id) {
      throw ApiError.forbidden('You can only submit your own expenses.');
    }

    if (!['draft', 'rejected'].includes(existing.status)) {
      throw ApiError.badRequest(`Expense is already in '${existing.status}' status.`);
    }

    return ExpensesRepository.update(id, { status: 'pending', rejection_reason: null });
  }

  static async deleteExpense(id, user) {
    const existing = await this.getExpenseById(id, user);

    if (user.role !== 'admin' && existing.submitted_by !== user.id) {
      throw ApiError.forbidden('You can only delete your own draft expenses.');
    }

    if (user.role !== 'admin' && existing.status !== 'draft') {
      throw ApiError.badRequest('Only draft expenses can be deleted.');
    }

    await ExpensesRepository.delete(id);
    return { success: true, message: 'Expense deleted successfully' };
  }
}
