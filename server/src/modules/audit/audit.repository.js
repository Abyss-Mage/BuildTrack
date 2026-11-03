import db from '../../config/database.js';

export class AuditRepository {
  static async findAll(filters = {}) {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (filters.action) {
      sql += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.entityType) {
      sql += ' AND entity_type = ?';
      params.push(filters.entityType);
    }

    if (filters.userId) {
      sql += ' AND user_id = ?';
      params.push(Number(filters.userId));
    }

    if (filters.startDate) {
      sql += ' AND created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND created_at <= ?';
      params.push(`${filters.endDate} 23:59:59`);
    }

    if (filters.search) {
      sql += ` AND (
        user_name LIKE ? OR 
        user_email LIKE ? OR 
        action LIKE ? OR 
        entity_id LIKE ? OR 
        ip_address LIKE ? OR 
        details LIKE ?
      )`;
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term, term);
    }

    // Count total matching
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countRow = await db.getOne(countSql, params);
    const total = countRow ? countRow.total : 0;

    // Sorting
    sql += ' ORDER BY created_at DESC, id DESC';

    // Pagination
    const page = Math.max(1, parseInt(filters.page || 1, 10));
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit || 50, 10)));
    const offset = (page - 1) * limit;

    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const items = await db.getAll(sql, params);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getStats() {
    const totalRow = await db.getOne('SELECT COUNT(*) as total FROM audit_logs');
    const authRow = await db.getOne("SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE 'AUTH_%'");
    const expenseRow = await db.getOne("SELECT COUNT(*) as count FROM audit_logs WHERE action LIKE 'EXPENSE_%'");
    const approvalRow = await db.getOne("SELECT COUNT(*) as count FROM audit_logs WHERE action IN ('EXPENSE_APPROVE', 'EXPENSE_REJECT')");
    const payoutRow = await db.getOne("SELECT COUNT(*) as count FROM audit_logs WHERE action = 'EXPENSE_PAYOUT_PROCESSED'");

    return {
      totalEvents: totalRow?.total || 0,
      authEvents: authRow?.count || 0,
      expenseEvents: expenseRow?.count || 0,
      approvalEvents: approvalRow?.count || 0,
      payoutEvents: payoutRow?.count || 0,
    };
  }
}
