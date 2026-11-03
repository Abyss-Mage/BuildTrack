import db from '../../config/database.js';

export class CategoriesRepository {
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];

    if (filters.is_active !== undefined && filters.is_active !== '') {
      sql += ' AND is_active = ?';
      params.push(Number(filters.is_active));
    }

    if (filters.search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY name ASC';
    return db.getAll(sql, params);
  }

  static async findActive() {
    return db.getAll('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC');
  }

  static async findById(id) {
    return db.getOne('SELECT * FROM categories WHERE id = ?', [id]);
  }

  static async create({ name, icon, description }) {
    const id = await db.insert(
      'INSERT INTO categories (name, icon, description, is_active) VALUES (?, ?, ?, 1)',
      [name, icon || 'receipt', description || null]
    );
    return this.findById(id);
  }

  static async update(id, { name, icon, description, is_active }) {
    await db.execute(
      'UPDATE categories SET name = ?, icon = ?, description = ?, is_active = ? WHERE id = ?',
      [name, icon, description, is_active, id]
    );
    return this.findById(id);
  }
}
