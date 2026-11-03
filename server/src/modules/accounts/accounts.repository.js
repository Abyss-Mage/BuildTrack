import db from '../../config/database.js';

export class AccountsRepository {
  static async getSummary() {
    // Total pending disbursement (approved expenses awaiting payment)
    const pendingRow = await db.getOne(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE status = 'approved'`
    );

    // Total disbursed / processed
    const processedRow = await db.getOne(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE status = 'processed'`
    );

    // Method breakdown of pending approved
    const methodBreakdown = await db.getAll(
      `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE status = 'approved'
       GROUP BY payment_method`
    );

    // Recent 5 processed payouts
    const recentPayouts = await db.getAll(
      `SELECT e.id, e.reference_no, e.title, e.amount, e.payment_method, e.payment_reference, e.processed_at,
              p.name as project_name, u.name as processor_name
       FROM expenses e
       JOIN projects p ON e.project_id = p.id
       LEFT JOIN users u ON e.processed_by = u.id
       WHERE e.status = 'processed'
       ORDER BY e.processed_at DESC, e.id DESC
       LIMIT 5`
    );

    return {
      pendingDisbursement: {
        count: pendingRow ? pendingRow.count : 0,
        total: pendingRow ? pendingRow.total : 0,
      },
      totalDisbursed: {
        count: processedRow ? processedRow.count : 0,
        total: processedRow ? processedRow.total : 0,
      },
      methodBreakdown,
      recentPayouts,
    };
  }

  static async getPayoutQueue(filters = {}) {
    let sql = `
      SELECT 
        e.*,
        p.name as project_name,
        p.code as project_code,
        c.name as category_name,
        c.icon as category_icon,
        sub.name as submitter_name,
        sub.email as submitter_email,
        app.name as approver_name,
        app.role as approver_role,
        (SELECT COUNT(*) FROM receipts r WHERE r.expense_id = e.id) as receipt_count
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN categories c ON e.category_id = c.id
      JOIN users sub ON e.submitted_by = sub.id
      LEFT JOIN users app ON e.approved_by = app.id
      WHERE e.status = 'approved'
    `;

    const params = [];

    if (filters.projectId) {
      sql += ' AND e.project_id = ?';
      params.push(Number(filters.projectId));
    }

    if (filters.paymentMethod) {
      sql += ' AND e.payment_method = ?';
      params.push(filters.paymentMethod);
    }

    if (filters.minAmount !== undefined && filters.minAmount !== '') {
      sql += ' AND e.amount >= ?';
      params.push(Number(filters.minAmount));
    }

    if (filters.maxAmount !== undefined && filters.maxAmount !== '') {
      sql += ' AND e.amount <= ?';
      params.push(Number(filters.maxAmount));
    }

    if (filters.search) {
      sql += ` AND (
        e.title LIKE ? OR 
        e.vendor_name LIKE ? OR 
        e.reference_no LIKE ? OR 
        sub.name LIKE ? OR
        p.name LIKE ?
      )`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY e.approved_at ASC, e.id ASC';

    return db.getAll(sql, params);
  }

  static async getSettlements(filters = {}) {
    let sql = `
      SELECT 
        e.*,
        p.name as project_name,
        p.code as project_code,
        c.name as category_name,
        c.icon as category_icon,
        sub.name as submitter_name,
        app.name as approver_name,
        app.role as approver_role,
        proc.name as processor_name,
        proc.role as processor_role,
        (SELECT COUNT(*) FROM receipts r WHERE r.expense_id = e.id) as receipt_count
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN categories c ON e.category_id = c.id
      JOIN users sub ON e.submitted_by = sub.id
      LEFT JOIN users app ON e.approved_by = app.id
      LEFT JOIN users proc ON e.processed_by = proc.id
      WHERE e.status = 'processed'
    `;

    const params = [];

    if (filters.projectId) {
      sql += ' AND e.project_id = ?';
      params.push(Number(filters.projectId));
    }

    if (filters.paymentMethod) {
      sql += ' AND e.payment_method = ?';
      params.push(filters.paymentMethod);
    }

    if (filters.startDate) {
      sql += ' AND e.processed_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND e.processed_at <= ?';
      params.push(`${filters.endDate} 23:59:59`);
    }

    if (filters.minAmount !== undefined && filters.minAmount !== '') {
      sql += ' AND e.amount >= ?';
      params.push(Number(filters.minAmount));
    }

    if (filters.maxAmount !== undefined && filters.maxAmount !== '') {
      sql += ' AND e.amount <= ?';
      params.push(Number(filters.maxAmount));
    }

    if (filters.search) {
      sql += ` AND (
        e.title LIKE ? OR 
        e.vendor_name LIKE ? OR 
        e.reference_no LIKE ? OR 
        e.payment_reference LIKE ? OR 
        sub.name LIKE ? OR
        p.name LIKE ?
      )`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term, term);
    }

    sql += ' ORDER BY e.processed_at DESC, e.id DESC';

    return db.getAll(sql, params);
  }

  static async processPayout(expenseId, userId, data) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const updates = [
      "status = 'processed'",
      'processed_by = ?',
      'processed_at = ?',
    ];
    const params = [userId, now];

    if (data.payment_reference) {
      updates.push('payment_reference = ?');
      params.push(data.payment_reference.trim());
    }

    if (data.payment_method) {
      updates.push('payment_method = ?');
      params.push(data.payment_method);
    }

    params.push(expenseId);

    await db.execute(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);

    // Record in approvals audit log
    await db.insert(
      `INSERT INTO approvals (expense_id, approver_id, action, comments, approval_level, acted_at)
       VALUES (?, ?, 'approved', ?, 2, ?)`,
      [
        expenseId,
        userId,
        data.comments ? `Payment Disbursed (Ref: ${data.payment_reference || 'N/A'}) - ${data.comments}` : `Payment Disbursed (Ref: ${data.payment_reference || 'N/A'})`,
        now,
      ]
    );

    return db.getOne('SELECT * FROM expenses WHERE id = ?', [expenseId]);
  }
}
