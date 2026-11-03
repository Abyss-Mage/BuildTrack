import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/database.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

export class AuthService {
  static async login(email, password) {
    const user = await db.getOne(
      'SELECT id, name, email, password_hash, role, phone, approval_limit, is_active FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact the administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password_hash, ...safeUser } = user;
    return { token, user: safeUser };
  }

  static async changePassword(userId, currentPassword, newPassword) {
    const user = await db.getOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    return { success: true, message: 'Password changed successfully' };
  }

  static async updateProfile(userId, { name, phone }) {
    const fields = [];
    const values = [];
    if (name) {
      fields.push('name = ?');
      values.push(name.trim());
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      values.push(phone ? phone.trim() : null);
    }
    if (fields.length === 0) {
      return db.getOne('SELECT id, name, email, role, phone, approval_limit, is_active FROM users WHERE id = ?', [userId]);
    }
    values.push(userId);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return db.getOne('SELECT id, name, email, role, phone, approval_limit, is_active FROM users WHERE id = ?', [userId]);
  }
}
