import db from '../../config/database.js';

export class ApprovalsRepository {
  static async getPendingForUser(user) {
    let sql = `
      SELECT 
        e.*,
        p.name as project_name,
        p.code as project_code,
        c.name as category_name,
        c.icon as category_icon,
        u.name as submitter_name,
        u.email as submitter_email,
        (SELECT COUNT(*) FROM receipts r WHERE r.expense_id = e.id) as receipt_count
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.submitted_by = u.id
    `;

    const params = [];

    if (user.role === 'accountant') {
      // Accountants see approved expenses ready for payout/processing
      sql += ` WHERE e.status = 'approved'`;
    } else if (user.role === 'project_manager') {
      // PMs see pending expenses for their assigned projects
      sql += `
        WHERE e.status = 'pending'
        AND (
          p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
          OR p.created_by = ?
        )
      `;
      params.push(user.id, user.id);
    } else if (user.role === 'admin') {
      // Admin sees both pending and approved
      sql += ` WHERE e.status IN ('pending', 'approved')`;
    } else {
      return [];
    }

    sql += ' ORDER BY e.expense_date ASC, e.id ASC';

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
