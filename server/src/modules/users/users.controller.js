import { UsersService } from './users.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UsersService.getAllUsers(req.query);
  res.status(200).json({ success: true, data: users });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await UsersService.getUserById(req.params.id);
  res.status(200).json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await UsersService.createUser(req.body);

  await logAudit(req, {
    action: 'USER_CREATE',
    entityType: 'user',
    entityId: user.id,
    details: { name: user.name, email: user.email, role: user.role },
  });

  res.status(201).json({ success: true, message: 'User created successfully', data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await UsersService.updateUser(req.params.id, req.body);
  const { password, ...changes } = req.body;

  await logAudit(req, {
    action: 'USER_UPDATE',
    entityType: 'user',
    entityId: user.id,
    details: { ...changes, password_changed: Boolean(password) },
  });

  res.status(200).json({ success: true, message: 'User updated successfully', data: user });
});
