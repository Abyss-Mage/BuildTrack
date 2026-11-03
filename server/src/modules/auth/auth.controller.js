import { AuthService } from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
  res.status(200).json(result);
});
