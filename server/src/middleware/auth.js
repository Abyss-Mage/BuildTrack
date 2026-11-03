import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import db from '../config/database.js';

export async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await db.getOne(
      'SELECT id, name, email, role, phone, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('User account is deactivated. Contact administrator.');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
