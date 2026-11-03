import db from '../../config/database.js';

export class PayrollRepository {
  static async findAll(filters = {}) {
    let sql = `
      SELECT 
        pr.*,
        u.name as employee_name,
        u.email as employee_email,
        u.phone as employee_phone,
        u.role as employee_role,
        creator.name as created_by_name
      FROM payroll pr
      JOIN users u ON pr.user_id = u.id
      LEFT JOIN users creator ON pr.created_by = creator.id
      WHERE 1=1
    `;

    const params = [];

    if (filters.month) {
      sql += ' AND pr.payroll_month = ?';
      params.push(filters.month);
    }

    if (filters.userId) {
      sql += ' AND pr.user_id = ?';
      params.push(Number(filters.userId));
    }

    if (filters.status) {
      sql += ' AND pr.status = ?';
      params.push(filters.status);
    }

    if (filters.paymentMethod) {
      sql += ' AND pr.payment_method = ?';
      params.push(filters.paymentMethod);
    }

    if (filters.search) {
      sql += ` AND (
        u.name LIKE ? OR 
        u.email LIKE ? OR 
        u.phone LIKE ? OR 
        pr.payment_reference LIKE ?
      )`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY pr.payroll_month DESC, u.name ASC';

    return db.getAll(sql, params);
  }

  static async findById(id) {
    const sql = `
      SELECT 
        pr.*,
        u.name as employee_name,
        u.email as employee_email,
        u.phone as employee_phone,
        u.role as employee_role,
        creator.name as created_by_name
      FROM payroll pr
      JOIN users u ON pr.user_id = u.id
      LEFT JOIN users creator ON pr.created_by = creator.id
      WHERE pr.id = ?
    `;
    return db.getOne(sql, [id]);
  }

  static async findByUserAndMonth(userId, month) {
    return db.getOne(
      'SELECT * FROM payroll WHERE user_id = ? AND payroll_month = ?',
      [userId, month]
    );
  }

  static async getMonthlySummary(month) {
    let sql = `
      SELECT 
        COUNT(*) as total_employees,
        COALESCE(SUM(net_salary), 0) as total_net_liability,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_salary ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status != 'paid' THEN net_salary ELSE 0 END), 0) as total_pending,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status != 'paid' THEN 1 END) as pending_count
      FROM payroll
      WHERE 1=1
    `;
    const params = [];
    if (month) {
      sql += ' AND payroll_month = ?';
      params.push(month);
    }

    return db.getOne(sql, params);
  }

  static async create(data, createdById) {
    const base = Number(data.base_salary || 0);
    const allow = Number(data.allowances || 0);
    const deduct = Number(data.deductions || 0);
    const net = base + allow - deduct;

    const id = await db.insert(
      `INSERT INTO payroll (
        user_id, payroll_month, base_salary, allowances, deductions, net_salary,
        status, payment_method, payment_date, payment_reference, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.payroll_month.trim(),
        base,
        allow,
        deduct,
        net,
        data.status || 'pending',
        data.payment_method || 'bank_transfer',
        data.payment_date || null,
        data.payment_reference || null,
        data.notes || null,
        createdById,
      ]
    );

    return this.findById(id);
  }

  static async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const base = data.base_salary !== undefined ? Number(data.base_salary) : Number(existing.base_salary);
    const allow = data.allowances !== undefined ? Number(data.allowances) : Number(existing.allowances);
    const deduct = data.deductions !== undefined ? Number(data.deductions) : Number(existing.deductions);
    const net = base + allow - deduct;

    const fields = [
      'base_salary = ?',
      'allowances = ?',
      'deductions = ?',
      'net_salary = ?',
    ];
    const values = [base, allow, deduct, net];

    const allowed = [
      'status',
      'payment_method',
      'payment_date',
      'payment_reference',
      'notes',
      'whatsapp_sent_at',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    values.push(id);
    await db.execute(`UPDATE payroll SET ${fields.join(', ')} WHERE id = ?`, values);

    return this.findById(id);
  }

  static async markWhatsAppSent(id) {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await db.execute('UPDATE payroll SET whatsapp_sent_at = ? WHERE id = ?', [now, id]);
  }

  static async delete(id) {
    await db.execute('DELETE FROM payroll WHERE id = ?', [id]);
  }
}
