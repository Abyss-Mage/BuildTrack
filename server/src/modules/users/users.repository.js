import db from '../../config/database.js';

export class UsersRepository {
  static async findAll() {
    return db.getAll(
      'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users ORDER BY id DESC'
    );
  }

  static async findById(id) {
    return db.getOne(
      'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
  }

  static async findByEmail(email) {
    return db.getOne('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async create({ name, email, password_hash, role, phone }) {
    const id = await db.insert(
      'INSERT INTO users (name, email, password_hash, role, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, email, password_hash, role, phone || null]
    );
    return this.findById(id);
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async toggleActive(id, isActive) {
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    return this.findById(id);
  }
}
