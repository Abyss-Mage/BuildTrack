import { ExpensesRepository } from './expenses.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { removeReceiptFiles } from '../../middleware/upload.js';
import { assertSiteAccess } from '../../utils/siteScope.js';
import { AdvancesService } from '../advances/advances.service.js';

export class ExpensesService {
  static async getAllExpenses(filters, user) {
    return ExpensesRepository.findAll(filters, user);
  }

  static async getExpenseById(id, user) {
    const expense = await ExpensesRepository.findById(id);
    if (!expense) throw ApiError.notFound('Expense record not found');
    await assertSiteAccess(user, expense.project_id);
    return expense;
  }

  static async createExpense(data, receipts, user) {
    await AdvancesService.assertExpenseAllowed(
      { projectId: data.project_id, advanceId: data.advance_id, amount: data.amount, status: data.status },
      user
    );
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

    await AdvancesService.assertExpenseAllowed(
      {
        projectId: data.project_id ?? existing.project_id,
        advanceId: data.advance_id ?? existing.advance_id,
        amount: data.amount ?? existing.amount,
        status: data.status ?? existing.status,
        excludeExpenseId: existing.id,
      },
      user
    );

    return ExpensesRepository.update(id, data, receipts, existing.status);
  }

  static async submitExpense(id, user) {
    const existing = await this.getExpenseById(id, user);

    if (user.role !== 'admin' && existing.submitted_by !== user.id) {
      throw ApiError.forbidden('You can only submit your own expenses.');
    }

    if (!['draft', 'rejected'].includes(existing.status)) {
      throw ApiError.badRequest(`Expense is already in '${existing.status}' status.`);
    }

    await AdvancesService.assertExpenseAllowed(
      {
        projectId: existing.project_id,
        advanceId: existing.advance_id,
        amount: existing.amount,
        status: 'pending',
        excludeExpenseId: existing.id,
      },
      user
    );

    return ExpensesRepository.update(id, { status: 'pending', rejection_reason: null }, [], existing.status);
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
    removeReceiptFiles(existing.receipts.map((r) => r.file_path));
    return { success: true, message: 'Expense deleted successfully' };
  }
}
