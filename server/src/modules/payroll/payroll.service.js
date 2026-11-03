import { PayrollRepository } from './payroll.repository.js';
import { ApiError } from '../../utils/ApiError.js';

function formatMonthLabel(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
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

  static async getMonthlySummary(month) {
    return PayrollRepository.getMonthlySummary(month);
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
    if (!data.user_id || !data.payroll_month) {
      throw ApiError.badRequest('Employee (user_id) and payroll month are required');
    }

    const existing = await PayrollRepository.findByUserAndMonth(data.user_id, data.payroll_month.trim());
    if (existing) {
      throw ApiError.conflict(`A payroll record for this employee already exists for month ${data.payroll_month}`);
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
      payment_reference: data.payment_reference || existing.payment_reference,
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
    const monthLabel = formatMonthLabel(item.payroll_month);
    const netFormatted = Number(item.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const baseFormatted = Number(item.base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const allowFormatted = Number(item.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const deductFormatted = Number(item.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const roleTitle = (item.employee_role || 'Staff').replace('_', ' ').toUpperCase();
    const isPaid = item.status === 'paid';

    let msg = `🏗️ *BUILDTRACK CONSTRUCTION ERP*\n`;
    msg += `📄 *SALARY PAYSLIP - ${monthLabel.toUpperCase()}*\n\n`;
    msg += `Hello *${item.employee_name}*,\n`;
    msg += `Your salary for *${monthLabel}* has been calculated and processed:\n\n`;
    msg += `💼 *Designation:* ${roleTitle}\n`;
    msg += `💵 *Base Salary:* ₹${baseFormatted}\n`;
    if (Number(item.allowances) > 0) {
      msg += `➕ *Site Allowances:* ₹${allowFormatted}\n`;
    }
    if (Number(item.deductions) > 0) {
      msg += `➖ *Deductions / Advances:* ₹${deductFormatted}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *NET DISBURSED:* *₹${netFormatted}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Status:* ${isPaid ? 'PAID & SETTLED ✅' : 'PENDING DISBURSEMENT ⏳'}\n`;
    msg += `💳 *Payment Mode:* ${(item.payment_method || 'bank_transfer').replace('_', ' ').toUpperCase()}\n`;
    if (item.payment_reference) {
      msg += `📌 *Txn / UTR Ref:* ${item.payment_reference}\n`;
    }
    if (item.payment_date) {
      msg += `📅 *Date of Payment:* ${item.payment_date}\n`;
    }
    msg += `\nFor queries or detailed tax breakdown, contact the Accounts Department.\n`;
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
    };
  }

  /**
   * Broadcast WhatsApp messages for all employees in a given month
   */
  static async getMonthlyBroadcastList(month) {
    const records = await PayrollRepository.findAll({ month });
    const broadcastItems = records.map((r) => this.getWhatsAppPayload(r));

    const totalEmployees = broadcastItems.length;
    const withValidPhone = broadcastItems.filter((i) => i.hasPhone).length;
    const totalAmount = records.reduce((acc, curr) => acc + Number(curr.net_salary), 0);

    return {
      month,
      monthLabel: formatMonthLabel(month),
      totalEmployees,
      withValidPhone,
      missingPhoneCount: totalEmployees - withValidPhone,
      totalNetSalary: totalAmount,
      items: broadcastItems,
    };
  }
}
