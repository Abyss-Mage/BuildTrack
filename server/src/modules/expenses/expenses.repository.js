import db from '../../config/database.js';

export class ExpensesRepository {
  /**
   * Generate sequential reference number per month: EXP-YYYYMM-XXXX
   */
  static async generateReferenceNo() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `EXP-${yearMonth}-`;

    const latest = await db.getOne(
      'SELECT reference_no FROM expenses WHERE reference_no LIKE ? ORDER BY id DESC LIMIT 1',
      [`${prefix}%`]
    );

    let nextNum = 1;
    if (latest && latest.reference_no) {
      const parts = latest.reference_no.split('-');
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) nextNum = parsed + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  static async findAll(filters = {}, user = null) {
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
      WHERE 1=1
    `;

    const params = [];

    // Role-based visibility scoping
    if (user && user.role !== 'admin' && user.role !== 'accountant') {
      if (user.role === 'site_engineer') {
        sql += ` AND (e.submitted_by = ? OR e.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?))`;
        params.push(user.id, user.id);
      } else if (user.role === 'project_manager') {
        sql += ` AND (e.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?) OR p.created_by = ? OR e.submitted_by = ?)`;
        params.push(user.id, user.id, user.id);
      }
    }

    // Filters
    if (filters.projectId) {
      sql += ' AND e.project_id = ?';
      params.push(Number(filters.projectId));
    }

    if (filters.categoryId) {
      sql += ' AND e.category_id = ?';
      params.push(Number(filters.categoryId));
    }

    if (filters.status) {
      sql += ' AND e.status = ?';
      params.push(filters.status);
    }

    if (filters.submittedBy) {
      sql += ' AND e.submitted_by = ?';
      params.push(Number(filters.submittedBy));
    }

    if (filters.startDate) {
      sql += ' AND e.expense_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND e.expense_date <= ?';
      params.push(filters.endDate);
    }

    if (filters.search) {
      sql += ' AND (e.title LIKE ? OR e.vendor_name LIKE ? OR e.reference_no LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY e.expense_date DESC, e.id DESC';

    return db.getAll(sql, params);
  }

  static async findById(id) {
    const expense = await db.getOne(
      `SELECT 
        e.*,
        p.name as project_name,
        p.code as project_code,
        p.total_budget as project_budget,
        c.name as category_name,
        c.icon as category_icon,
        u.name as submitter_name,
        u.email as submitter_email
      FROM expenses e
      JOIN projects p ON e.project_id = p.id
      JOIN categories c ON e.category_id = c.id
      JOIN users u ON e.submitted_by = u.id
      WHERE e.id = ?`,
      [id]
    );

    if (!expense) return null;

    // Attach receipts
    const receipts = await db.getAll('SELECT * FROM receipts WHERE expense_id = ? ORDER BY id ASC', [id]);
    expense.receipts = receipts;

    // Attach approval timeline
    const approvals = await db.getAll(
      `SELECT a.*, u.name as approver_name, u.role as approver_role
       FROM approvals a
       JOIN users u ON a.approver_id = u.id
       WHERE a.expense_id = ?
       ORDER BY a.acted_at ASC`,
      [id]
    );
    expense.approvals = approvals;

    return expense;
  }

  static async create(data, receipts = [], userId) {
    const referenceNo = await this.generateReferenceNo();

    const expenseId = await db.insert(
      `INSERT INTO expenses (
        reference_no, project_id, category_id, submitted_by, title, description,
        amount, expense_date, vendor_name, payment_method, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceNo,
        data.project_id,
        data.category_id,
        userId,
        data.title.trim(),
        data.description || null,
        data.amount,
        data.expense_date,
        data.vendor_name || null,
        data.payment_method || 'cash',
        data.status || 'pending',
      ]
    );

    // Save receipts
    if (receipts && receipts.length > 0) {
      for (const r of receipts) {
        await db.execute(
          `INSERT INTO receipts (expense_id, file_path, original_name, file_size, mime_type)
           VALUES (?, ?, ?, ?, ?)`,
          [expenseId, r.filePath, r.originalName, r.fileSize, r.mimeType]
        );
      }
    }

    return this.findById(expenseId);
  }

  static async update(id, data, newReceipts = []) {
    const fields = [];
    const values = [];

    const allowed = [
      'project_id',
      'category_id',
      'title',
      'description',
      'amount',
      'expense_date',
      'vendor_name',
      'payment_method',
      'status',
      'rejection_reason',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await db.execute(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Attach new receipts if uploaded
    if (newReceipts && newReceipts.length > 0) {
      for (const r of newReceipts) {
        await db.execute(
          `INSERT INTO receipts (expense_id, file_path, original_name, file_size, mime_type)
           VALUES (?, ?, ?, ?, ?)`,
          [id, r.filePath, r.originalName, r.fileSize, r.mimeType]
        );
      }
    }

    return this.findById(id);
  }

  static async delete(id) {
    await db.execute('DELETE FROM expenses WHERE id = ?', [id]);
  }

  static async deleteReceipt(receiptId) {
    const receipt = await db.getOne('SELECT * FROM receipts WHERE id = ?', [receiptId]);
    if (receipt) {
      await db.execute('DELETE FROM receipts WHERE id = ?', [receiptId]);
    }
    return receipt;
  }
}
