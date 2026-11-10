import db from '../../config/database.js';
import { istNow } from '../../utils/time.js';

const ROW_COLUMNS = [
  'designation', 'rate', 'monthly_salary', 'joining_date', 'departure_date', 'days_present',
  'total_salary', 'ta_up', 'ta_down', 'salary_advance', 'pf_deduction', 'net_payable', 'paid',
];

function periodFilters(filters, sql, params) {
  if (filters.projectId) {
    sql += ' AND s.project_id = ?';
    params.push(Number(filters.projectId));
  }
  if (filters.periodType) {
    sql += ' AND s.period_type = ?';
    params.push(String(filters.periodType));
  }
  if (filters.startDate) {
    sql += ' AND s.end_date >= ?';
    params.push(String(filters.startDate));
  }
  if (filters.endDate) {
    sql += ' AND s.start_date <= ?';
    params.push(String(filters.endDate));
  }
  return sql;
}

export class WageSheetsRepository {
  static findSheets(filters = {}) {
    const params = [];
    let sql = periodFilters(
      filters,
      `SELECT s.*, p.name as project_name, p.code as project_code,
         COUNT(r.id) as employee_count,
         COALESCE(SUM(r.net_payable), 0) as total_net,
         COALESCE(SUM(r.paid), 0) as total_paid,
         COUNT(r.whatsapp_sent_at) as whatsapp_sent_count
       FROM wage_sheets s
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN wage_rows r ON r.sheet_id = s.id
       WHERE 1=1`,
      params
    );
    sql += ' GROUP BY s.id ORDER BY s.start_date DESC, s.id DESC';
    return db.getAll(sql, params);
  }

  static findRows(filters = {}) {
    const params = [];
    let sql = periodFilters(
      filters,
      `SELECT r.*, e.name as employee_name, e.father_name, e.uan, e.phone,
         s.start_date, s.end_date, s.period_type, s.project_id, p.name as project_name, p.code as project_code
       FROM wage_rows r
       JOIN employees e ON r.employee_id = e.id
       JOIN wage_sheets s ON r.sheet_id = s.id
       JOIN projects p ON s.project_id = p.id
       WHERE 1=1`,
      params
    );
    if (filters.sheetId) {
      sql += ' AND r.sheet_id = ?';
      params.push(Number(filters.sheetId));
    }
    if (filters.employee) {
      sql += ' AND e.name LIKE ?';
      params.push(`%${String(filters.employee)}%`);
    }
    if (filters.designation) {
      sql += ' AND r.designation LIKE ?';
      params.push(`%${String(filters.designation)}%`);
    }
    sql += ' ORDER BY s.start_date DESC, r.id ASC';
    return db.getAll(sql, params);
  }

  static findSheetById(id) {
    return db.getOne('SELECT * FROM wage_sheets WHERE id = ?', [id]);
  }

  static findOverlappingSheet(projectId, startDate, endDate) {
    return db.getOne('SELECT * FROM wage_sheets WHERE project_id = ? AND start_date <= ? AND end_date >= ?', [
      projectId,
      endDate,
      startDate,
    ]);
  }

  static findAllEmployees() {
    return db.getAll('SELECT * FROM employees');
  }

  static createEmployee({ name, father_name, designation, uan, phone }) {
    return db.insert('INSERT INTO employees (name, father_name, designation, uan, phone) VALUES (?, ?, ?, ?, ?)', [
      name,
      father_name,
      designation || null,
      uan || null,
      phone || null,
    ]);
  }

  static updateEmployeeDetails(id, { designation, uan, phone }) {
    return db.execute(
      'UPDATE employees SET designation = ?, uan = COALESCE(uan, ?), phone = COALESCE(?, phone) WHERE id = ?',
      [designation || null, uan || null, phone || null, id]
    );
  }

  static updateEmployeePhone(id, phone) {
    return db.execute('UPDATE employees SET phone = ? WHERE id = ?', [phone, id]);
  }

  static createSheet(meta, sourceFile, createdById) {
    return db.insert(
      'INSERT INTO wage_sheets (project_id, period_type, start_date, end_date, source_file, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [meta.project_id, meta.period_type, meta.start_date, meta.end_date, sourceFile.slice(0, 255), createdById]
    );
  }

  /** One statement, so a sheet's rows are either all saved or none are. */
  static insertRows(sheetId, rows) {
    const placeholders = rows.map(() => `(?, ?, ${ROW_COLUMNS.map(() => '?').join(', ')})`).join(', ');
    return db.execute(
      `INSERT INTO wage_rows (sheet_id, employee_id, ${ROW_COLUMNS.join(', ')}) VALUES ${placeholders}`,
      rows.flatMap((row) => [sheetId, row.employee_id, ...ROW_COLUMNS.map((c) => row[c] ?? null)])
    );
  }

  static deleteSheet(id) {
    return db.execute('DELETE FROM wage_sheets WHERE id = ?', [id]);
  }

  static markSheetPaid(id) {
    return db.execute('UPDATE wage_rows SET paid = net_payable WHERE sheet_id = ?', [id]);
  }

  static recordWhatsApp(rowId, error) {
    return db.execute('UPDATE wage_rows SET whatsapp_sent_at = ?, whatsapp_error = ? WHERE id = ?', [
      error ? null : istNow(),
      error ? error.slice(0, 255) : null,
      rowId,
    ]);
  }
}
