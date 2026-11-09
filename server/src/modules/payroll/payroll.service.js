import { PayrollRepository } from './payroll.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { istNow } from '../../utils/time.js';

// The period must be unique per employee, so a free-text label is always qualified by its dates
function buildPeriod(rawLabel, startDate, endDate) {
  const range = `${startDate} to ${endDate}`;
  // On edit the label comes back with its old dates attached
  const label = rawLabel?.trim().replace(/ ?\(?\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}\)?$/, '');
  // The column holds 50 characters and the qualified form adds 27
  if (label && label.length > 23) {
    throw ApiError.badRequest('Period label must be 23 characters or fewer');
  }
  return label ? `${label} (${range})` : range;
}

function assertChangeable(record, user) {
  if (record.status === 'paid' && user.role !== 'admin') {
    throw ApiError.forbidden('Paid wage records can only be changed by an Admin.');
  }
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

  static async getMonthlySummary(filters = {}) {
    return PayrollRepository.getMonthlySummary(filters);
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
    if (data.start_date > data.end_date) {
      throw ApiError.badRequest('Wages From Date cannot be after To Date');
    }

    const period = buildPeriod(data.payroll_period, data.start_date, data.end_date);
    data.payroll_period = period;

    const existing = await PayrollRepository.findByUserAndPeriod(data.user_id, period);
    if (existing) {
      throw ApiError.conflict(`A wage record for this employee already exists for ${period}`);
    }

    const overlap = await PayrollRepository.findOverlapping(data.user_id, data.start_date, data.end_date);
    if (overlap) {
      throw ApiError.conflict(`This employee already has a wage record overlapping ${overlap.start_date} to ${overlap.end_date}`);
    }

    return PayrollRepository.create(data, createdById);
  }

  static async updatePayroll(id, data, user) {
    const existing = await PayrollRepository.findById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');
    assertChangeable(existing, user);

    const start = data.start_date ?? existing.start_date;
    const end = data.end_date ?? existing.end_date;
    const employee = data.user_id ?? existing.user_id;

    if (start && end) {
      if (start > end) throw ApiError.badRequest('Wages From Date cannot be after To Date');

      data.payroll_period = buildPeriod(data.payroll_period ?? existing.payroll_period, start, end);
      data.payroll_month = start.slice(0, 7);

      // Only when something moved, so old overlapping records can still have notes corrected
      if (start !== existing.start_date || end !== existing.end_date || employee !== existing.user_id) {
        const overlap = await PayrollRepository.findOverlapping(employee, start, end, existing.id);
        if (overlap) {
          throw ApiError.conflict(`This employee already has a wage record overlapping ${overlap.start_date} to ${overlap.end_date}`);
        }
      }
    }

    return PayrollRepository.update(id, data);
  }

  static async markAsPaid(id, data) {
    const existing = await PayrollRepository.findById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');
    if (existing.status === 'paid') throw ApiError.badRequest('These wages are already marked as paid.');

    return PayrollRepository.update(id, {
      status: 'paid',
      payment_date: data.payment_date || istNow().slice(0, 10),
      payment_reference: data.payment_reference ? data.payment_reference.trim() : null,
      payment_method: data.payment_method || existing.payment_method,
      notes: data.notes || existing.notes,
    });
  }

  static async deletePayroll(id, user) {
    const existing = await PayrollRepository.findById(id);
    if (!existing) throw ApiError.notFound('Payroll record not found');
    assertChangeable(existing, user);
    await PayrollRepository.delete(id);
    return { success: true, message: 'Payroll record deleted' };
  }

  /**
   * Builds the formatted WhatsApp message for an employee payroll record
   */
  static formatWhatsAppText(item) {
    const datesStr = item.start_date && item.end_date
      ? `${item.start_date} to ${item.end_date}`
      : item.payroll_period || item.payroll_month || 'Current';

    const netFormatted = Number(item.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const baseFormatted = Number(item.base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const allowFormatted = Number(item.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const deductFormatted = Number(item.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const roleTitle = (item.employee_role || 'Staff').replace('_', ' ').toUpperCase();
    const isPaid = item.status === 'paid';

    let msg = `🏗️ *BUILDTRACK CONSTRUCTION ERP*\n`;
    msg += `📄 *SITE WAGE STATEMENT / PAYSLIP*\n`;
    msg += `🗓️ *Wages Period:* ${datesStr}\n\n`;
    msg += `Hello *${item.employee_name}*,\n`;
    msg += `Your site wages from *${datesStr}* have been processed:\n\n`;
    msg += `💼 *Designation:* ${roleTitle}\n`;
    msg += `💵 *Base Wage:* ₹${baseFormatted}\n`;
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
    msg += `\nFor any queries regarding hours or rate calculations, please contact the Site Accounts Office.\n`;
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
      startDate: item.start_date,
      endDate: item.end_date,
    };
  }

  /**
   * Broadcast WhatsApp messages for all employees in a given period/date range
   */
  static async getMonthlyBroadcastList(query = {}) {
    const filters = { ...query };
    if (!filters.period && !filters.month && !filters.startDate && !filters.endDate) {
      filters.period = istNow().slice(0, 7);
    }

    const records = await PayrollRepository.findAll(filters);
    const broadcastItems = records.map((r) => this.getWhatsAppPayload(r));

    const totalEmployees = broadcastItems.length;
    const withValidPhone = broadcastItems.filter((i) => i.hasPhone).length;
    const totalAmount = records.reduce((acc, curr) => acc + Number(curr.net_salary), 0);

    const rangeLabel = filters.startDate && filters.endDate
      ? `${filters.startDate} to ${filters.endDate}`
      : filters.period || 'All Wages';

    return {
      period: rangeLabel,
      periodLabel: rangeLabel,
      totalEmployees,
      withValidPhone,
      missingPhoneCount: totalEmployees - withValidPhone,
      totalNetSalary: totalAmount,
      items: broadcastItems,
    };
  }
}
