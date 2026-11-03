import db from '../../config/database.js';

export class CategoriesRepository {
  static async findAll() {
    return db.getAll('SELECT * FROM categories ORDER BY name ASC');
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
