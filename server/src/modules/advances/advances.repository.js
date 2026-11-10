import db from '../../config/database.js';

// Only entries actually submitted reduce the balance: drafts and rejected vouchers do not count
const COUNTED_STATUSES = "('pending', 'approved', 'processed')";

export class AdvancesRepository {
  static async findAll(filters = {}, user) {
    let sql = `
      SELECT
        a.*,
        p.name as project_name,
        p.code as project_code,
        s.name as site_in_charge_name,
        ap.name as approved_by_name,
        c.name as created_by_name,
        (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e
          WHERE e.advance_id = a.id AND e.status IN ${COUNTED_STATUSES}) as spent
      FROM advances a
      JOIN projects p ON a.project_id = p.id
      JOIN users s ON a.site_in_charge_id = s.id
      JOIN users c ON a.created_by = c.id
      LEFT JOIN users ap ON a.approved_by = ap.id
      WHERE 1=1
    `;
    const params = [];

    if (user?.role === 'site_in_charge') {
      sql += ' AND a.site_in_charge_id = ?';
      params.push(user.id);
    }
    if (filters.projectId) {
      sql += ' AND a.project_id = ?';
      params.push(Number(filters.projectId));
    }
    if (filters.siteInChargeId) {
      sql += ' AND a.site_in_charge_id = ?';
      params.push(Number(filters.siteInChargeId));
    }
    if (filters.status) {
      sql += ' AND a.status = ?';
      params.push(String(filters.status));
    }
    if (filters.startDate) {
      sql += ' AND a.allocation_date >= ?';
      params.push(String(filters.startDate));
    }
    if (filters.endDate) {
      sql += ' AND a.allocation_date <= ?';
      params.push(String(filters.endDate));
    }

    sql += ' ORDER BY a.id DESC';

    const rows = await db.getAll(sql, params);
    return rows.map((r) => ({ ...r, spent: Number(r.spent), remaining: Number((r.amount - r.spent).toFixed(2)) }));
  }

  static async findById(id) {
    return db.getOne('SELECT * FROM advances WHERE id = ?', [id]);
  }

  static async spentOn(advanceId, excludeExpenseId = 0) {
    const row = await db.getOne(
      `SELECT COALESCE(SUM(amount), 0) as spent FROM expenses
       WHERE advance_id = ? AND id <> ? AND status IN ${COUNTED_STATUSES}`,
      [advanceId, excludeExpenseId]
    );
    return Number(row.spent);
  }

  static async create(data, status, approverId, approvedAt, createdById) {
    return db.insert(
      `INSERT INTO advances (project_id, site_in_charge_id, amount, allocation_date, period_type, start_date, end_date,
        status, approved_by, approved_at, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.project_id,
        data.site_in_charge_id,
        data.amount,
        data.allocation_date,
        data.period_type,
        data.start_date,
        data.end_date,
        status,
        approverId,
        approvedAt,
        data.notes || null,
        createdById,
      ]
    );
  }

  static async setStatus(id, fromStatus, toStatus, approverId, approvedAt) {
    return db.execute(
      'UPDATE advances SET status = ?, approved_by = ?, approved_at = ? WHERE id = ? AND status = ?',
      [toStatus, approverId, approvedAt, id, fromStatus]
    );
  }
}
