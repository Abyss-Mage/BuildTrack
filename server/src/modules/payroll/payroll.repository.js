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

    if (filters.period) {
      sql += ' AND (pr.payroll_period = ? OR pr.payroll_month = ?)';
      params.push(filters.period, filters.period);
    } else if (filters.month) {
      sql += ' AND (pr.payroll_month = ? OR pr.payroll_period = ? OR pr.payroll_period LIKE ?)';
      params.push(filters.month, filters.month, `${filters.month}%`);
    }

    if (filters.startDate) {
      sql += ' AND pr.end_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND pr.start_date <= ?';
      params.push(filters.endDate);
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

  static async findByUserAndPeriod(userId, period) {
    return db.getOne(
      'SELECT * FROM payroll WHERE user_id = ? AND (payroll_period = ? OR payroll_month = ?)',
      [userId, period, period]
    );
  }

  static async findOverlapping(userId, startDate, endDate) {
    return db.getOne(
      'SELECT * FROM payroll WHERE user_id = ? AND start_date <= ? AND end_date >= ?',
      [userId, endDate, startDate]
    );
  }

  static async findByUserAndMonth(userId, month) {
    return this.findByUserAndPeriod(userId, month);
  }

  static async getMonthlySummary(filters = {}) {
    const { startDate, endDate } = filters;
    const period = filters.period || filters.month;

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
    if (period) {
      sql += ' AND (payroll_period = ? OR payroll_month = ?)';
      params.push(period, period);
    }
    if (startDate) {
      sql += ' AND end_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND start_date <= ?';
      params.push(endDate);
    }

    return db.getOne(sql, params);
  }

  static async create(data, createdById) {
    const base = Number(data.base_salary || 0);
    const allow = Number(data.allowances || 0);
    const deduct = Number(data.deductions || 0);
    const net = Math.max(0, base + allow - deduct);

    const period = data.payroll_period?.trim() || `${data.start_date} to ${data.end_date}`;

    const month = data.payroll_month || (data.start_date ? data.start_date.slice(0, 7) : period.slice(0, 7));

    const id = await db.insert(
      `INSERT INTO payroll (
        user_id, payroll_period, payroll_month, start_date, end_date,
        base_salary, allowances, deductions, net_salary,
        status, payment_method, payment_date, payment_reference, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        period,
        month,
        data.start_date || null,
        data.end_date || null,
        base,
        allow,
        deduct,
        net,
        data.status || 'pending',
        data.payment_method || 'bank_transfer',
        data.payment_date || null,
        data.payment_reference ? data.payment_reference.trim() : null,
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
    const net = Math.max(0, base + allow - deduct);

    const fields = [
      'base_salary = ?',
      'allowances = ?',
      'deductions = ?',
      'net_salary = ?',
    ];
    const values = [base, allow, deduct, net];

    const allowed = [
      'user_id',
      'payroll_period',
      'payroll_month',
      'start_date',
      'end_date',
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
        if (key === 'payment_reference') {
          values.push(data[key] ? String(data[key]).trim() : null);
        } else {
          values.push(data[key]);
        }
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
