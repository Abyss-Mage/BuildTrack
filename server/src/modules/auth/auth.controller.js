import { AuthService } from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/auditLogger.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);

  // Set user on req for the audit logger
  req.user = result.user;
  await logAudit(req, {
    action: 'AUTH_LOGIN',
    entityType: 'auth',
    entityId: result.user.id,
    details: { email: result.user.email, role: result.user.role },
  });

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

  await logAudit(req, {
    action: 'AUTH_PASSWORD_CHANGE',
    entityType: 'auth',
    entityId: req.user.id,
    details: { user: req.user.email },
  });

  res.status(200).json(result);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updatedUser = await AuthService.updateProfile(req.user.id, { name, phone });

  await logAudit(req, {
    action: 'AUTH_PROFILE_UPDATE',
    entityType: 'auth',
    entityId: req.user.id,
    details: { name, phone },
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedUser,
  });
});
