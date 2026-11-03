import { Router } from 'express';
import { login, getCurrentUser, changePassword } from './auth.controller.js';
import { loginSchema, changePasswordSchema } from './auth.validation.js';
import { validate } from '../../middleware/validate.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', auth, getCurrentUser);
router.post('/change-password', auth, validate(changePasswordSchema), changePassword);

export default router;
