import { PayrollRepository } from './payroll.repository.js';
import { ApiError } from '../../utils/ApiError.js';

function formatPeriodLabel(periodStr) {
  if (!periodStr) return '';
  if (periodStr.includes('-W')) {
    const [year, week] = periodStr.split('-W');
    return `Week ${parseInt(week, 10)}, ${year}`;
  }
  if (periodStr.includes('-')) {
    const [year, month] = periodStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  return periodStr;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`; // Standard Indian mobile default
  }
  if (digits.length > 10) {
    return digits;
  }
  return digits;
}

export class PayrollService {
  static async getAllPayroll(filters = {}, user) {
    // Regular employees can only view their own payroll slips
    if (user.role !== 'admin' && user.role !== 'accountant') {
      filters.userId = user.id;
    }
    return PayrollRepository.findAll(filters);
  }

  static async getMonthlySummary(period) {
    return PayrollRepository.getMonthlySummary(period);
  }

  static async getPayrollById(id, user) {
    const item = await PayrollRepository.findById(id);
    if (!item) throw ApiError.notFound('Payroll record not found');

    if (user.role !== 'admin' && user.role !== 'accountant' && item.user_id !== user.id) {
      throw ApiError.forbidden('You are not authorized to view this payroll record');
    }

    return item;
  }

  static async createPayroll(data, createdById) {
    const period = (data.payroll_period || data.payroll_month || '').trim();
    if (!data.user_id || !period) {
      throw ApiError.badRequest('Employee (user_id) and weekly payroll period are required');
    }

    const existing = await PayrollRepository.findByUserAndPeriod(data.user_id, period);
    if (existing) {
      throw ApiError.conflict(`A payroll record for this employee already exists for period ${period}`);
    }

    return PayrollRepository.create(data, createdById);
  }

  static async updatePayroll(id, data) {
    const existing = await PayrollRepository.findById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');

    return PayrollRepository.update(id, data);
  }

  static async markAsPaid(id, data) {
    const existing = await PayrollRepository.findById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');

    const now = new Date().toISOString().slice(0, 10);
    return PayrollRepository.update(id, {
      status: 'paid',
      payment_date: data.payment_date || now,
      payment_reference: data.payment_reference ? data.payment_reference.trim() : null,
      payment_method: data.payment_method || existing.payment_method,
      notes: data.notes || existing.notes,
    });
  }

  static async deletePayroll(id) {
    const existing = await PayrollRepository.findById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');
    await PayrollRepository.delete(id);
    return { success: true, message: 'Payroll record deleted' };
  }

  /**
   * Builds the formatted WhatsApp message for an employee payroll record
   */
  static formatWhatsAppText(item) {
    const periodLabel = item.payroll_period || item.payroll_month;
    const readablePeriod = formatPeriodLabel(periodLabel);
    const dateRangeStr = item.start_date && item.end_date
      ? `(${item.start_date} to ${item.end_date})`
      : '';

    const netFormatted = Number(item.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const baseFormatted = Number(item.base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const allowFormatted = Number(item.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const deductFormatted = Number(item.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const roleTitle = (item.employee_role || 'Staff').replace('_', ' ').toUpperCase();
    const isPaid = item.status === 'paid';

    let msg = `🏗️ *BUILDTRACK CONSTRUCTION ERP*\n`;
    msg += `📄 *WEEKLY WAGES / PAYSLIP*\n`;
    msg += `🗓️ *Period:* ${readablePeriod} ${dateRangeStr}\n\n`;
    msg += `Hello *${item.employee_name}*,\n`;
    msg += `Your site wages for *${readablePeriod}* have been processed:\n\n`;
    msg += `💼 *Designation:* ${roleTitle}\n`;
    msg += `💵 *Weekly Base Wage:* ₹${baseFormatted}\n`;
    if (Number(item.allowances) > 0) {
      msg += `➕ *Site Overtime / Allowances:* ₹${allowFormatted}\n`;
    }
    if (Number(item.deductions) > 0) {
      msg += `➖ *Site Advances / Deductions:* ₹${deductFormatted}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *NET PAYABLE:* *₹${netFormatted}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Status:* ${isPaid ? 'PAID & SETTLED ✅' : 'PENDING DISBURSEMENT ⏳'}\n`;
    msg += `💳 *Disbursement Mode:* ${(item.payment_method || 'bank_transfer').replace('_', ' ').toUpperCase()}\n`;
    if (item.payment_reference) {
      msg += `📌 *Txn / UTR Ref:* ${item.payment_reference}\n`;
    }
    if (item.payment_date) {
      msg += `📅 *Date of Payment:* ${item.payment_date}\n`;
    }
    msg += `\nFor any queries regarding weekly hours or rate calculations, please contact the Site Accounts Office.\n`;
    msg += `_Thank you for your hard work and dedication!_`;

    return msg;
  }

  /**
   * Generate WhatsApp link and payload for an individual employee
   */
  static getWhatsAppPayload(item) {
    const text = this.formatWhatsAppText(item);
    const cleanPhone = cleanPhoneNumber(item.employee_phone);
    const webUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : null;

    return {
      payrollId: item.id,
      employeeId: item.user_id,
      employeeName: item.employee_name,
      employeePhone: item.employee_phone,
      cleanPhone,
      hasPhone: Boolean(cleanPhone),
      messageText: text,
      whatsappUrl: webUrl,
      status: item.status,
      netSalary: item.net_salary,
      period: item.payroll_period || item.payroll_month,
    };
  }

  /**
   * Broadcast WhatsApp messages for all employees in a given period/week
   */
  static async getMonthlyBroadcastList(periodOrMonth) {
    const records = await PayrollRepository.findAll({ period: periodOrMonth });
    const broadcastItems = records.map((r) => this.getWhatsAppPayload(r));

    const totalEmployees = broadcastItems.length;
    const withValidPhone = broadcastItems.filter((i) => i.hasPhone).length;
    const totalAmount = records.reduce((acc, curr) => acc + Number(curr.net_salary), 0);

    return {
      period: periodOrMonth,
      periodLabel: formatPeriodLabel(periodOrMonth),
      totalEmployees,
      withValidPhone,
      missingPhoneCount: totalEmployees - withValidPhone,
      totalNetSalary: totalAmount,
      items: broadcastItems,
    };
  }
}
