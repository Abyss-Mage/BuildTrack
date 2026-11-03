import db from '../../config/database.js';

export class ApprovalsRepository {
  static async getPendingForUser(user, filters = {}) {
    let sql = `
      SELECT 
        e.*,
        p.name as project_name,
        p.code as project_code,
        c.name as category_name,
        c.icon as category_icon,
        u.name as submitter_name,
        u.email as submitter_email,
        app.name as approver_name,
        app.role as approver_role,
        rl.max_amount_per_expense as role_max_limit,
        rl.can_approve as role_can_approve,
        (SELECT COUNT(*) FROM receipts r WHERE r.expense_id = e.id) as receipt_count
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.submitted_by = u.id
      LEFT JOIN users app ON e.approved_by = app.id
      LEFT JOIN project_role_approval_limits rl ON (rl.project_id = e.project_id AND rl.role = ?)
    `;

    const params = [user.role];

    if (user.role === 'accountant') {
      sql += ` WHERE e.status = 'approved'`;
    } else if (user.role === 'project_manager') {
      sql += ` WHERE e.status = 'pending'`;
      // Vouchers above the manager's own approval limit are not shown; no limit means unlimited
      if (user.approval_limit !== null && user.approval_limit !== undefined) {
        sql += ' AND e.amount <= ?';
        params.push(Number(user.approval_limit));
      }
    } else if (user.role === 'admin') {
      if (filters.status && ['pending', 'approved'].includes(filters.status)) {
        sql += ` WHERE e.status = ?`;
        params.push(filters.status);
      } else {
        sql += ` WHERE e.status IN ('pending', 'approved')`;
      }
    } else {
      return [];
    }

    if (filters.projectId) {
      sql += ' AND e.project_id = ?';
      params.push(Number(filters.projectId));
    }

    if (filters.categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(Number(filters.categoryId));
    }

    if (filters.minAmount !== undefined && filters.minAmount !== '') {
      sql += ' AND e.amount >= ?';
      params.push(Number(filters.minAmount));
    }

    if (filters.maxAmount !== undefined && filters.maxAmount !== '') {
      sql += ' AND e.amount <= ?';
      params.push(Number(filters.maxAmount));
    }

    if (filters.hasReceipts === 'yes') {
      sql += ' AND (SELECT COUNT(*) FROM receipts r WHERE r.expense_id = e.id) > 0';
    } else if (filters.hasReceipts === 'no') {
      sql += ' AND (SELECT COUNT(*) FROM receipts r WHERE r.expense_id = e.id) = 0';
    }

    if (filters.search) {
      sql += ' AND (e.title LIKE ? OR e.vendor_name LIKE ? OR e.reference_no LIKE ? OR u.name LIKE ? OR p.name LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }

    const sortMap = {
      amount_desc: 'e.amount DESC',
      amount_asc: 'e.amount ASC',
      newest: 'e.expense_date DESC, e.id DESC',
      oldest: 'e.expense_date ASC, e.id ASC',
    };

    const sortClause = sortMap[filters.sortBy] || 'e.expense_date ASC, e.id ASC';
    sql += ` ORDER BY ${sortClause}`;

    return db.getAll(sql, params);
  }

  static async logApproval(expenseId, approverId, action, comments = '', level = 1) {
    return db.insert(
      `INSERT INTO approvals (expense_id, approver_id, action, comments, approval_level)
       VALUES (?, ?, ?, ?, ?)`,
      [expenseId, approverId, action, comments || null, level]
    );
  }
}
