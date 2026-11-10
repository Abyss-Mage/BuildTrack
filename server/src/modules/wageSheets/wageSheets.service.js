import { WageSheetsRepository } from './wageSheets.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { parseWageSheet } from '../../utils/wageSheetParser.js';
import { cleanPhoneNumber, sendWhatsAppTemplate, whatsappConfigured } from '../../utils/whatsapp.js';

const nameKey = (name, father) => `${name}|${father}`.toLowerCase();

function totalsOf(rows) {
  const net = rows.reduce((sum, r) => sum + Number(r.net_payable), 0);
  const paid = rows.reduce((sum, r) => sum + Number(r.paid), 0);
  return { employees: rows.length, net, paid, balance: Number((net - paid).toFixed(2)) };
}

export class WageSheetsService {
  static getSheets(filters) {
    return WageSheetsRepository.findSheets(filters);
  }

  static async getRows(filters) {
    const rows = await WageSheetsRepository.findRows(filters);
    return { rows, totals: totalsOf(rows) };
  }

  static async importSheet(file, meta, user) {
    if (!file) throw ApiError.badRequest('Choose the Excel wage sheet to upload.');
    if (meta.start_date > meta.end_date) throw ApiError.badRequest('Period start cannot be after period end.');

    const { rows } = await parseWageSheet(file.buffer);

    const overlap = await WageSheetsRepository.findOverlappingSheet(meta.project_id, meta.start_date, meta.end_date);
    if (overlap) {
      throw ApiError.conflict(
        `This site already has a wage sheet for ${overlap.start_date} to ${overlap.end_date}. Delete it first to upload a corrected one.`
      );
    }

    const employeeRows = await this.matchEmployees(rows);
    const sheetId = await WageSheetsRepository.createSheet(meta, file.originalname, user.id);
    try {
      await WageSheetsRepository.insertRows(sheetId, employeeRows);
    } catch (err) {
      await WageSheetsRepository.deleteSheet(sheetId);
      throw err;
    }

    return { sheetId, ...totalsOf(employeeRows) };
  }

  /** The same person across uploads is one employee, matched by UAN, else by name and father's name. */
  static async matchEmployees(rows) {
    const known = await WageSheetsRepository.findAllEmployees();
    const byUan = new Map(known.filter((e) => e.uan).map((e) => [e.uan, e.id]));
    const byName = new Map(known.map((e) => [nameKey(e.name, e.father_name), e.id]));

    const matched = [];
    for (const row of rows) {
      const key = nameKey(row.name, row.father_name);
      let employeeId = (row.uan && byUan.get(row.uan)) || byName.get(key);
      if (employeeId) {
        await WageSheetsRepository.updateEmployeeDetails(employeeId, row);
      } else {
        employeeId = await WageSheetsRepository.createEmployee(row);
        byName.set(key, employeeId);
        if (row.uan) byUan.set(row.uan, employeeId);
      }
      matched.push({ ...row, employee_id: employeeId });
    }
    return matched;
  }

  static async requireSheet(id) {
    const sheet = await WageSheetsRepository.findSheetById(id);
    if (!sheet) throw ApiError.notFound('Wage sheet not found');
    return sheet;
  }

  static async deleteSheet(id) {
    const sheet = await this.requireSheet(id);
    await WageSheetsRepository.deleteSheet(id);
    return sheet;
  }

  static async markPaid(id) {
    const sheet = await this.requireSheet(id);
    await WageSheetsRepository.markSheetPaid(id);
    return sheet;
  }

  static async setEmployeePhone(id, phone) {
    const changed = await WageSheetsRepository.updateEmployeePhone(id, phone);
    if (changed === 0) throw ApiError.notFound('Employee not found');
  }

  /** Sends one template per employee. Already-sent rows are skipped, so pressing the button again only retries failures. */
  static async sendWhatsApp(id) {
    if (!whatsappConfigured()) {
      throw ApiError.badRequest('WhatsApp is not set up yet. Add the WhatsApp API details to the server settings.');
    }
    await this.requireSheet(id);

    const rows = await WageSheetsRepository.findRows({ sheetId: id });
    const result = { sent: 0, failed: 0, alreadySent: 0 };

    for (const row of rows) {
      if (row.whatsapp_sent_at) {
        result.alreadySent++;
        continue;
      }

      const phone = cleanPhoneNumber(row.phone);
      let error = null;
      if (!phone || phone.length < 11) {
        error = 'No valid mobile number';
      } else {
        try {
          await sendWhatsAppTemplate(phone, [
            row.employee_name,
            `${row.start_date} to ${row.end_date}`,
            row.project_name,
            Number(row.net_payable).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          ]);
        } catch (err) {
          error = err.message;
        }
      }

      await WageSheetsRepository.recordWhatsApp(row.id, error);
      result[error ? 'failed' : 'sent']++;
    }

    return result;
  }
}
