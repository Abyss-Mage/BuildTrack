import db from '../../config/database.js';
import { siteScope } from '../../utils/siteScope.js';

const HEADER_COLUMNS = [
  'pr_date', 'project_id', 'site_description', 'department', 'required_date', 'priority', 'justification',
  'requested_by', 'verified_by', 'purchase_by', 'accounts_by', 'approved_by',
];
const ITEM_COLUMNS = ['sr_no', 'item', 'description', 'unit', 'quantity', 'required_date', 'vendor', 'rate', 'amount', 'remarks'];

// Numbers follow the company sheet: financial year runs April to March
function financialYear(prDate) {
  const year = Number(prDate.slice(0, 4));
  const start = Number(prDate.slice(5, 7)) >= 4 ? year : year - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

export class PurchaseRequisitionsRepository {
  static async findAll(filters = {}, user) {
    let sql = `
      SELECT
        pr.*,
        p.name as project_name,
        p.code as project_code,
        req.name as requested_by_name,
        (SELECT COUNT(*) FROM purchase_requisition_items i WHERE i.requisition_id = pr.id) as item_count,
        (SELECT COALESCE(SUM(i.amount), 0) FROM purchase_requisition_items i WHERE i.requisition_id = pr.id) as total_cost
      FROM purchase_requisitions pr
      JOIN projects p ON pr.project_id = p.id
      LEFT JOIN users req ON pr.requested_by = req.id
      WHERE 1=1 ${siteScope(user, 'pr.project_id')}
    `;
    const params = [];

    if (filters.projectId) {
      sql += ' AND pr.project_id = ?';
      params.push(Number(filters.projectId));
    }
    if (filters.search) {
      sql += ' AND (pr.pr_no LIKE ? OR pr.site_description LIKE ?)';
      const term = `%${String(filters.search)}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY pr.id DESC';
    return db.getAll(sql, params);
  }

  static async findById(id) {
    const requisition = await db.getOne(
      `SELECT pr.*, p.name as project_name, p.code as project_code
       FROM purchase_requisitions pr
       JOIN projects p ON pr.project_id = p.id
       WHERE pr.id = ?`,
      [id]
    );
    if (!requisition) return null;

    requisition.items = await db.getAll(
      'SELECT * FROM purchase_requisition_items WHERE requisition_id = ? ORDER BY sr_no ASC, id ASC',
      [id]
    );
    return requisition;
  }

  static async nextNumbers(prDate) {
    const fy = financialYear(prDate);
    const latest = await db.getOne('SELECT pr_no FROM purchase_requisitions WHERE pr_no LIKE ? ORDER BY id DESC LIMIT 1', [
      `SSPSPL/PR/${fy}/%`,
    ]);
    const next = String(latest ? Number(latest.pr_no.split('/').pop()) + 1 : 1).padStart(3, '0');
    return { prNo: `SSPSPL/PR/${fy}/${prDate.slice(5, 7)}/${next}`, documentNo: `PR/SPS/${fy}/${next}` };
  }

  static async insertItems(requisitionId, items) {
    const placeholders = items.map(() => `(?, ${ITEM_COLUMNS.map(() => '?').join(', ')})`).join(', ');
    await db.execute(
      `INSERT INTO purchase_requisition_items (requisition_id, ${ITEM_COLUMNS.join(', ')}) VALUES ${placeholders}`,
      items.flatMap((item) => [requisitionId, ...ITEM_COLUMNS.map((c) => item[c] ?? null)])
    );
  }

  static async create(data, items, createdById) {
    let id;
    // Two people saving at the same moment can draw the same number; the loser takes the next one
    for (let attempt = 1; !id; attempt++) {
      const { prNo, documentNo } = await this.nextNumbers(data.pr_date);
      try {
        id = await db.insert(
          `INSERT INTO purchase_requisitions (pr_no, document_no, ${HEADER_COLUMNS.join(', ')}, created_by)
           VALUES (?, ?, ${HEADER_COLUMNS.map(() => '?').join(', ')}, ?)`,
          [prNo, documentNo, ...HEADER_COLUMNS.map((c) => data[c] ?? null), createdById]
        );
      } catch (err) {
        const duplicate = err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE constraint failed');
        if (!duplicate || attempt === 5) throw err;
      }
    }

    try {
      await this.insertItems(id, items);
    } catch (err) {
      await db.execute('DELETE FROM purchase_requisitions WHERE id = ?', [id]);
      throw err;
    }
    return this.findById(id);
  }

  static async update(id, data, items) {
    const { maxId } = await db.getOne('SELECT COALESCE(MAX(id), 0) as maxId FROM purchase_requisition_items WHERE requisition_id = ?', [id]);
    // New items go in before old ones go out, so a failure never leaves a requisition empty
    await this.insertItems(id, items);
    await db.execute('DELETE FROM purchase_requisition_items WHERE requisition_id = ? AND id <= ?', [id, maxId]);
    await db.execute(
      `UPDATE purchase_requisitions SET ${HEADER_COLUMNS.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
      [...HEADER_COLUMNS.map((c) => data[c] ?? null), id]
    );
    return this.findById(id);
  }

  static async delete(id) {
    await db.execute('DELETE FROM purchase_requisitions WHERE id = ?', [id]);
  }
}
