import { UsersService } from './users.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UsersService.getAllUsers();
  res.status(200).json({ success: true, data: users });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await UsersService.getUserById(req.params.id);
  res.status(200).json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await UsersService.createUser(req.body);
  res.status(201).json({ success: true, message: 'User created successfully', data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await UsersService.updateUser(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'User updated successfully', data: user });
});
