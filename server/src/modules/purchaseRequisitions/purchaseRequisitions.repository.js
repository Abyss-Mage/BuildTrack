import db from '../../config/database.js';
import { ownScope } from '../../utils/siteScope.js';
import { ApiError } from '../../utils/ApiError.js';

const isDuplicate = (err) => err.code === 'ER_DUP_ENTRY' || err.message?.includes('UNIQUE constraint failed');
const takenError = (prNo) => ApiError.conflict(`PR No. ${prNo} is already used by another requisition.`);

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
      WHERE 1=1 ${ownScope(user, 'pr.created_by')}
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
    const rows = await db.getAll('SELECT pr_no FROM purchase_requisitions WHERE pr_no LIKE ?', [`SSPSPL/PR/${fy}/%`]);
    // Typed PR numbers can share this prefix, so only all-digit endings count
    const tails = rows.map((r) => r.pr_no.split('/').pop()).filter((tail) => /^\d+$/.test(tail));
    const next = String(Math.max(0, ...tails.map(Number)) + 1).padStart(3, '0');
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
      const { prNo, documentNo } = data.pr_no
        ? { prNo: data.pr_no, documentNo: data.pr_no }
        : await this.nextNumbers(data.pr_date);
      try {
        id = await db.insert(
          `INSERT INTO purchase_requisitions (pr_no, document_no, ${HEADER_COLUMNS.join(', ')}, created_by)
           VALUES (?, ?, ${HEADER_COLUMNS.map(() => '?').join(', ')}, ?)`,
          [prNo, documentNo, ...HEADER_COLUMNS.map((c) => data[c] ?? null), createdById]
        );
      } catch (err) {
        if (isDuplicate(err) && data.pr_no) throw takenError(data.pr_no);
        if (!isDuplicate(err) || attempt === 5) throw err;
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
    // Renumber first so a taken number fails before any items change; same number is a no-op
    if (data.pr_no) {
      try {
        await db.execute('UPDATE purchase_requisitions SET pr_no = ?, document_no = ? WHERE id = ? AND pr_no <> ?', [
          data.pr_no, data.pr_no, id, data.pr_no,
        ]);
      } catch (err) {
        throw isDuplicate(err) ? takenError(data.pr_no) : err;
      }
    }
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
