import { PayrollService } from './payroll.service.js';
import { PayrollRepository } from './payroll.repository.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/auditLogger.js';

export class PayrollController {
  static getAll = asyncHandler(async (req, res) => {
    const list = await PayrollService.getAllPayroll(req.query, req.user);
    return ApiResponse.success(res, list, 'Payroll records retrieved successfully');
  });

  static getSummary = asyncHandler(async (req, res) => {
    const summary = await PayrollService.getMonthlySummary(req.query);
    return ApiResponse.success(res, summary, 'Payroll summary retrieved');
  });

  static getById = asyncHandler(async (req, res) => {
    const item = await PayrollService.getPayrollById(req.params.id, req.user);
    return ApiResponse.success(res, item, 'Payroll record retrieved');
  });

  static create = asyncHandler(async (req, res) => {
    const item = await PayrollService.createPayroll(req.body, req.user.id);

    await logAudit(req, {
      action: 'PAYROLL_CREATE',
      entityType: 'payroll',
      entityId: item.id,
      details: {
        employee: item.employee_name,
        period: item.payroll_period || item.payroll_month,
        net_salary: item.net_salary,
      },
    });

    return ApiResponse.created(res, item, 'Payroll created successfully');
  });

  static update = asyncHandler(async (req, res) => {
    const item = await PayrollService.updatePayroll(req.params.id, req.body);

    await logAudit(req, {
      action: 'PAYROLL_UPDATE',
      entityType: 'payroll',
      entityId: item.id,
      details: req.body,
    });

    return ApiResponse.success(res, item, 'Payroll updated successfully');
  });

  static markAsPaid = asyncHandler(async (req, res) => {
    const item = await PayrollService.markAsPaid(req.params.id, req.body);

    await logAudit(req, {
      action: 'PAYROLL_SETTLE',
      entityType: 'payroll',
      entityId: item.id,
      details: {
        employee: item.employee_name,
        period: item.payroll_period || item.payroll_month,
        net_salary: item.net_salary,
        payment_reference: req.body.payment_reference || 'N/A',
      },
    });

    return ApiResponse.success(res, item, 'Payroll marked as paid');
  });

  static delete = asyncHandler(async (req, res) => {
    const result = await PayrollService.deletePayroll(req.params.id);

    await logAudit(req, {
      action: 'PAYROLL_DELETE',
      entityType: 'payroll',
      entityId: req.params.id,
      details: { id: req.params.id },
    });

    return ApiResponse.success(res, result, 'Payroll deleted successfully');
  });

  static getWhatsAppPayload = asyncHandler(async (req, res) => {
    const item = await PayrollService.getPayrollById(req.params.id, req.user);
    const payload = PayrollService.getWhatsAppPayload(item);
    return ApiResponse.success(res, payload, 'WhatsApp payload generated');
  });

  static getMonthlyBroadcast = asyncHandler(async (req, res) => {
    const broadcast = await PayrollService.getMonthlyBroadcastList(req.query);
    return ApiResponse.success(res, broadcast, 'WhatsApp broadcast list ready');
  });

  static recordBroadcastSent = asyncHandler(async (req, res) => {
    const { period, month, payroll_ids } = req.body;
    const batchKey = period || month || 'BATCH';

    if (payroll_ids && Array.isArray(payroll_ids)) {
      for (const id of payroll_ids) {
        await PayrollRepository.markWhatsAppSent(id);
      }
    }

    await logAudit(req, {
      action: 'PAYROLL_WHATSAPP_BROADCAST',
      entityType: 'payroll',
      entityId: String(batchKey),
      details: {
        period: batchKey,
        recipients_count: payroll_ids?.length || 0,
      },
    });

    return ApiResponse.success(res, { count: payroll_ids?.length || 0 }, 'Broadcast status recorded successfully');
  });
}
