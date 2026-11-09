import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository.js';
import { ApiError } from '../../utils/ApiError.js';

export class UsersService {
  static async getAllUsers(filters = {}, user) {
    if (['admin', 'accountant'].includes(user.role)) {
      return UsersRepository.findAll(filters);
    }
    // Everyone else only needs names for filter dropdowns
    const users = await UsersRepository.findAll();
    return users.map(({ id, name, role }) => ({ id, name, role }));
  }

  static async getUserById(id) {
    const user = await UsersRepository.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  static async createUser({ name, email, password, role, phone, approval_limit }) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UsersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw ApiError.conflict('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const limit = (approval_limit !== undefined && approval_limit !== '' && approval_limit !== null)
      ? Number(approval_limit)
      : null;

    return UsersRepository.create({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role,
      phone: phone?.trim(),
      approval_limit: limit,
    });
  }

  static async updateUser(id, updateData, actor) {
    await this.getUserById(id);

    if (Number(id) === actor.id && (updateData.is_active === 0 || (updateData.role && updateData.role !== actor.role))) {
      throw ApiError.badRequest('You cannot deactivate your own account or change your own role.');
    }

    const updates = { ...updateData };
    if (updates.password && updates.password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(updates.password, salt);
    }
    delete updates.password;

    if (updates.phone !== undefined) {
      updates.phone = updates.phone ? updates.phone.trim() : null;
    }

    if (updates.approval_limit !== undefined) {
      updates.approval_limit = (updates.approval_limit !== '' && updates.approval_limit !== null)
        ? Number(updates.approval_limit)
        : null;
    }

    return UsersRepository.update(id, updates);
  }
}
