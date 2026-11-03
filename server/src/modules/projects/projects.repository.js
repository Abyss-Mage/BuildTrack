import db from '../../config/database.js';

export class ProjectsRepository {
  static async findAll(user) {
    let sql = `
      SELECT 
        p.*,
        u.name as creator_name,
        COALESCE(SUM(CASE WHEN e.status IN ('approved', 'processed') THEN e.amount ELSE 0 END), 0) as total_spent,
        COALESCE(COUNT(DISTINCT e.id), 0) as expense_count
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN expenses e ON p.id = e.project_id
    `;

    const params = [];

    // Filter projects if site engineer or project manager
    if (user && user.role !== 'admin' && user.role !== 'accountant') {
      sql += `
        WHERE p.id IN (
          SELECT project_id FROM project_members WHERE user_id = ?
        ) OR p.created_by = ?
      `;
      params.push(user.id, user.id);
    }

    sql += ` GROUP BY p.id ORDER BY p.id DESC`;

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

    // Fetch assigned members
    const members = await db.getAll(
      `SELECT pm.id, pm.user_id, pm.role_in_project, pm.assigned_at, u.name, u.email, u.role, u.phone
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?`,
      [id]
    );

    project.members = members;
    return project;
  }

  static async findByCode(code) {
    return db.getOne('SELECT * FROM projects WHERE code = ?', [code]);
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

    if (data.members && data.members.length > 0) {
      for (const m of data.members) {
        await db.execute(
          'INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)',
          [id, m.user_id, m.role_in_project || 'engineer']
        );
      }
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

    // Update members if provided
    if (data.members !== undefined) {
      await db.execute('DELETE FROM project_members WHERE project_id = ?', [id]);
      for (const m of data.members) {
        await db.execute(
          'INSERT INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)',
          [id, m.user_id, m.role_in_project || 'engineer']
        );
      }
    }

    return this.findById(id);
  }
}
