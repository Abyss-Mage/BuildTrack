import db from '../../config/database.js';

export class UsersRepository {
  static async findAll(filters = {}) {
    let sql = 'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (filters.role) {
      sql += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.is_active !== undefined && filters.is_active !== '') {
      sql += ' AND is_active = ?';
      params.push(Number(filters.is_active));
    }

    if (filters.search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    const sortMap = {
      name_asc: 'name ASC',
      name_desc: 'name DESC',
      role: 'role ASC, name ASC',
      oldest: 'id ASC',
      newest: 'id DESC',
    };

    const sortClause = sortMap[filters.sortBy] || 'id DESC';
    sql += ` ORDER BY ${sortClause}`;

    return db.getAll(sql, params);
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
