import db from '../../config/database.js';

export const DEFAULT_ROLE_LIMITS = [
  { role: 'site_engineer', can_approve: 0, max_amount_per_expense: 0 },
  { role: 'project_manager', can_approve: 1, max_amount_per_expense: 50000.0 },
  { role: 'accountant', can_approve: 1, max_amount_per_expense: 200000.0 },
  { role: 'admin', can_approve: 1, max_amount_per_expense: null }, // Unlimited
];

export class ProjectsRepository {
  /**
   * Everyone can see all projects in the company.
   * Multi-criteria filtering supported (status, search, budgetMin, budgetMax, utilization, sortBy).
   */
  static async findAll(user, filters = {}) {
    let sql = `
      SELECT 
        p.*,
        u.name as creator_name,
        COALESCE(SUM(CASE WHEN e.status IN ('approved', 'processed') THEN e.amount ELSE 0 END), 0) as total_spent,
        COALESCE(COUNT(DISTINCT e.id), 0) as expense_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN expenses e ON p.id = e.project_id
      WHERE 1=1
    `;

    const params = [];

    // Note: Person allocation removed. Everyone in the company can see every project!

    if (filters.status) {
      sql += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      sql += ' AND (p.name LIKE ? OR p.code LIKE ? OR p.location LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    if (filters.budgetMin !== undefined && filters.budgetMin !== '') {
      sql += ' AND p.total_budget >= ?';
      params.push(Number(filters.budgetMin));
    }

    if (filters.budgetMax !== undefined && filters.budgetMax !== '') {
      sql += ' AND p.total_budget <= ?';
      params.push(Number(filters.budgetMax));
    }

    sql += ` GROUP BY p.id`;

    // Having clause for budget utilization if specified
    if (filters.utilization === 'over') {
      sql += ` HAVING total_spent > p.total_budget AND p.total_budget > 0`;
    } else if (filters.utilization === 'warning') {
      sql += ` HAVING (total_spent / p.total_budget) >= 0.8 AND (total_spent / p.total_budget) <= 1.0 AND p.total_budget > 0`;
    } else if (filters.utilization === 'under') {
      sql += ` HAVING (total_spent / p.total_budget) < 0.8 OR p.total_budget = 0`;
    }

    const sortMap = {
      budget_desc: 'p.total_budget DESC',
      budget_asc: 'p.total_budget ASC',
      spent_desc: 'total_spent DESC',
      name_asc: 'p.name ASC',
      newest: 'p.id DESC',
      oldest: 'p.id ASC',
    };

    const sortClause = sortMap[filters.sortBy] || 'p.id DESC';
    sql += ` ORDER BY ${sortClause}`;

    return db.getAll(sql, params);
  }

  static async findById(id) {
    const project = await db.getOne(
      `SELECT 
        p.*,
        u.name as creator_name,
        COALESCE(SUM(CASE WHEN e.status IN ('approved', 'processed') THEN e.amount ELSE 0 END), 0) as total_spent,
        COALESCE(COUNT(DISTINCT e.id), 0) as expense_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN expenses e ON p.id = e.project_id
      WHERE p.id = ?
      GROUP BY p.id`,
      [id]
    );

    if (!project) return null;

    // Fetch Role Expenditure Approval Allocations
    let roleLimits = await db.getAll(
      'SELECT role, can_approve, max_amount_per_expense FROM project_role_approval_limits WHERE project_id = ?',
      [id]
    );

    // If not seeded yet, initialize with defaults
    if (!roleLimits || roleLimits.length === 0) {
      await this.initDefaultRoleLimits(id);
      roleLimits = await db.getAll(
        'SELECT role, can_approve, max_amount_per_expense FROM project_role_approval_limits WHERE project_id = ?',
        [id]
      );
    }

    project.role_limits = roleLimits;
    return project;
  }

  static async findByCode(code) {
    return db.getOne('SELECT * FROM projects WHERE code = ?', [code]);
  }

  static async initDefaultRoleLimits(projectId) {
    for (const item of DEFAULT_ROLE_LIMITS) {
      const existing = await db.getOne(
        'SELECT id FROM project_role_approval_limits WHERE project_id = ? AND role = ?',
        [projectId, item.role]
      );
      if (!existing) {
        await db.execute(
          `INSERT INTO project_role_approval_limits (project_id, role, can_approve, max_amount_per_expense)
           VALUES (?, ?, ?, ?)`,
          [projectId, item.role, item.can_approve, item.max_amount_per_expense]
        );
      }
    }
  }

  static async setRoleLimits(projectId, roleLimits = []) {
    for (const item of roleLimits) {
      if (!item.role) continue;
      const canApprove = item.can_approve !== undefined ? (item.can_approve ? 1 : 0) : 1;
      const maxAmount = item.max_amount_per_expense === '' || item.max_amount_per_expense === null || item.max_amount_per_expense === undefined
        ? null
        : Number(item.max_amount_per_expense);

      const existing = await db.getOne(
        'SELECT id FROM project_role_approval_limits WHERE project_id = ? AND role = ?',
        [projectId, item.role]
      );

      if (existing) {
        await db.execute(
          `UPDATE project_role_approval_limits
           SET can_approve = ?, max_amount_per_expense = ?
           WHERE project_id = ? AND role = ?`,
          [canApprove, maxAmount, projectId, item.role]
        );
      } else {
        await db.execute(
          `INSERT INTO project_role_approval_limits (project_id, role, can_approve, max_amount_per_expense)
           VALUES (?, ?, ?, ?)`,
          [projectId, item.role, canApprove, maxAmount]
        );
      }
    }
  }

  static async create(data, createdById) {
    const id = await db.insert(
      `INSERT INTO projects (name, code, location, description, total_budget, status, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name.trim(),
        data.code.trim().toUpperCase(),
        data.location.trim(),
        data.description || null,
        data.total_budget || 0,
        data.status || 'active',
        data.start_date || null,
        data.end_date || null,
        createdById,
      ]
    );

    // Initialize or apply Role Expenditure Approval Allocations
    if (data.role_limits && Array.isArray(data.role_limits) && data.role_limits.length > 0) {
      await this.setRoleLimits(id, data.role_limits);
    } else {
      await this.initDefaultRoleLimits(id);
    }

    return this.findById(id);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    const allowed = ['name', 'code', 'location', 'description', 'total_budget', 'status', 'start_date', 'end_date'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'code' ? data[key].trim().toUpperCase() : data[key]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await db.execute(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Update Role Expenditure Approval Allocations if provided
    if (data.role_limits && Array.isArray(data.role_limits)) {
      await this.setRoleLimits(id, data.role_limits);
    }

    return this.findById(id);
  }
}
