import db from '../../config/database.js';

export class DashboardService {
  static async getSummary(user) {
    const isRestricted = user.role !== 'admin' && user.role !== 'accountant';
    const userParams = isRestricted ? [user.id, user.id] : [];

    // Base scoping condition
    const projectScope = isRestricted
      ? `AND (e.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR e.submitted_by = ?)`
      : '';

    // Total spent this month (approved or processed)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}%`;

    const monthlySpendResult = await db.getOne(
      `SELECT COALESCE(SUM(e.amount), 0) as total_month
       FROM expenses e
       WHERE e.status IN ('approved', 'processed')
       AND e.expense_date LIKE ?
       ${projectScope}`,
      [currentMonth, ...userParams]
    );

    // Total spend all time
    const totalSpendResult = await db.getOne(
      `SELECT COALESCE(SUM(e.amount), 0) as total_all
       FROM expenses e
       WHERE e.status IN ('approved', 'processed')
       ${projectScope}`,
      userParams
    );

    // Pending count
    const pendingResult = await db.getOne(
      `SELECT COUNT(*) as pending_count, COALESCE(SUM(e.amount), 0) as pending_amount
       FROM expenses e
       WHERE e.status = 'pending'
       ${projectScope}`,
      userParams
    );

    // Approved (waiting for accountant processing)
    const approvedResult = await db.getOne(
      `SELECT COUNT(*) as approved_count, COALESCE(SUM(e.amount), 0) as approved_amount
       FROM expenses e
       WHERE e.status = 'approved'
       ${projectScope}`,
      userParams
    );

    // Active projects count
    let activeProjectsSql = `SELECT COUNT(*) as active_count FROM projects WHERE status = 'active'`;
    let activeParams = [];
    if (isRestricted) {
      activeProjectsSql += ` AND (id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR created_by = ?)`;
      activeParams = [user.id, user.id];
    }
    const projectsResult = await db.getOne(activeProjectsSql, activeParams);

    return {
      monthlySpend: Number(monthlySpendResult?.total_month || 0),
      totalSpend: Number(totalSpendResult?.total_all || 0),
      pendingCount: Number(pendingResult?.pending_count || 0),
      pendingAmount: Number(pendingResult?.pending_amount || 0),
      approvedCount: Number(approvedResult?.approved_count || 0),
      approvedAmount: Number(approvedResult?.approved_amount || 0),
      activeProjects: Number(projectsResult?.active_count || 0),
    };
  }

  static async getCategoryBreakdown(user) {
    const isRestricted = user.role !== 'admin' && user.role !== 'accountant';
    const userParams = isRestricted ? [user.id, user.id] : [];
    const projectScope = isRestricted
      ? `AND (e.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR e.submitted_by = ?)`
      : '';

    const sql = `
      SELECT 
        c.id,
        c.name,
        c.icon,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COUNT(e.id) as expense_count
      FROM categories c
      JOIN expenses e ON c.id = e.category_id
      WHERE e.status IN ('approved', 'processed')
      ${projectScope}
      GROUP BY c.id, c.name, c.icon
      HAVING total_amount > 0
      ORDER BY total_amount DESC
    `;

    const rows = await db.getAll(sql, userParams);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      value: Number(r.total_amount),
      count: Number(r.expense_count),
    }));
  }

  static async getProjectBreakdown(user) {
    const isRestricted = user.role !== 'admin' && user.role !== 'accountant';
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.code,
        p.total_budget,
        COALESCE(SUM(CASE WHEN e.status IN ('approved', 'processed') THEN e.amount ELSE 0 END), 0) as total_spent
      FROM projects p
      LEFT JOIN expenses e ON p.id = e.project_id
    `;

    const params = [];
    if (isRestricted) {
      sql += ` WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR p.created_by = ?`;
      params.push(user.id, user.id);
    }

    sql += ` GROUP BY p.id, p.name, p.code, p.total_budget ORDER BY total_spent DESC LIMIT 10`;

    const rows = await db.getAll(sql, params);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      budget: Number(r.total_budget),
      spent: Number(r.total_spent),
      utilization: r.total_budget > 0 ? Math.round((r.total_spent / r.total_budget) * 100) : 0,
    }));
  }

  static async getMonthlyTrends(user) {
    const isRestricted = user.role !== 'admin' && user.role !== 'accountant';
    const userParams = isRestricted ? [user.id, user.id] : [];
    const projectScope = isRestricted
      ? `AND (e.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR e.submitted_by = ?)`
      : '';

    // Last 6 months spend trend
    const sql = `
      SELECT 
        SUBSTR(e.expense_date, 1, 7) as month,
        COALESCE(SUM(CASE WHEN e.status IN ('approved', 'processed') THEN e.amount ELSE 0 END), 0) as approved_amount,
        COALESCE(SUM(CASE WHEN e.status = 'pending' THEN e.amount ELSE 0 END), 0) as pending_amount
      FROM expenses e
      WHERE e.expense_date >= date('now', '-6 month')
      ${projectScope}
      GROUP BY SUBSTR(e.expense_date, 1, 7)
      ORDER BY month ASC
    `;

    const rows = await db.getAll(sql, userParams);
    return rows.map((r) => ({
      month: r.month,
      approved: Number(r.approved_amount),
      pending: Number(r.pending_amount),
    }));
  }

  static async getRecentExpenses(user) {
    const isRestricted = user.role !== 'admin' && user.role !== 'accountant';
    const userParams = isRestricted ? [user.id, user.id] : [];
    const projectScope = isRestricted
      ? `AND (e.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR e.submitted_by = ?)`
      : '';

    const sql = `
      SELECT 
        e.id,
        e.reference_no,
        e.title,
        e.amount,
        e.status,
        e.expense_date,
        p.name as project_name,
        c.name as category_name,
        c.icon as category_icon,
        u.name as submitter_name
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.submitted_by = u.id
      WHERE 1=1
      ${projectScope}
      ORDER BY e.created_at DESC
      LIMIT 6
    `;

    return db.getAll(sql, userParams);
  }
}
