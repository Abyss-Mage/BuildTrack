import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class UsersService {
  static async getAllUsers(filters = {}) {
    return UsersRepository.findAll(filters);
  }

  static async getUserById(id) {
    const user = await UsersRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  static async createUser({ name, email, password, role, phone }) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UsersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw ApiError.conflict('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    return UsersRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role,
      phone: phone?.trim(),
    });
  }

  static async updateUser(id, updateData) {
    await this.getUserById(id);

    const updates = { ...updateData };
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(updates.password, salt);
      delete updates.password;
    }

    return UsersRepository.update(id, updates);
  }
}
