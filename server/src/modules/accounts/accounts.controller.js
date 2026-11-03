import { AccountsRepository } from './accounts.repository.js';
import { ExpensesRepository } from '../expenses/expenses.repository.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { logAudit } from '../../utils/auditLogger.js';

export class AccountsController {
  static async getSummary(req, res, next) {
    try {
      const summary = await AccountsRepository.getSummary();
      return ApiResponse.success(res, summary, 'Accounts summary retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getPayoutQueue(req, res, next) {
    try {
      const queue = await AccountsRepository.getPayoutQueue(req.query);
      return ApiResponse.success(res, queue, 'Pending payout queue retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async getSettlements(req, res, next) {
    try {
      const settlements = await AccountsRepository.getSettlements(req.query);
      return ApiResponse.success(res, settlements, 'Settlement ledger retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async processPayout(req, res, next) {
    try {
      const { id } = req.params;
      const expense = await ExpensesRepository.findById(id);
      if (!expense) throw ApiError.notFound('Expense not found');

      if (expense.status !== 'approved') {
        throw ApiError.badRequest(`Cannot disburse funds for voucher in '${expense.status}' status. Only 'approved' expenses can be paid.`);
      }

      const updated = await AccountsRepository.processPayout(id, req.user.id, req.body);

      // Audit Log
      await logAudit(req, {
        action: 'EXPENSE_PAYOUT_PROCESSED',
        entityType: 'expense',
        entityId: id,
        details: {
          reference_no: expense.reference_no,
          amount: expense.amount,
          vendor: expense.vendor_name,
          payment_method: req.body.payment_method || expense.payment_method,
          payment_reference: req.body.payment_reference || null,
          comments: req.body.comments || null,
        },
      });

      return ApiResponse.success(res, updated, 'Payment disbursed and reconciled successfully');
    } catch (err) {
      next(err);
    }
  }

  static async bulkProcessPayout(req, res, next) {
    try {
      const { expense_ids, payment_method, payment_reference, comments } = req.body;

      if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
        throw ApiError.badRequest('Must provide an array of expense IDs to process');
      }

      const processed = [];
      for (const id of expense_ids) {
        const exp = await ExpensesRepository.findById(id);
        if (exp && exp.status === 'approved') {
          const item = await AccountsRepository.processPayout(id, req.user.id, {
            payment_method,
            payment_reference,
            comments,
          });
          processed.push(item);

          await logAudit(req, {
            action: 'EXPENSE_PAYOUT_PROCESSED',
            entityType: 'expense',
            entityId: id,
            details: {
              reference_no: exp.reference_no,
              amount: exp.amount,
              batch_ref: payment_reference,
              payment_method,
            },
          });
        }
      }

      return ApiResponse.success(res, { count: processed.length }, `Successfully disbursed ${processed.length} vouchers`);
    } catch (err) {
      next(err);
    }
  }
}
