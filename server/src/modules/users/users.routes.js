import { Router } from 'express';
import { getAllUsers, getUserById, createUser, updateUser } from './users.controller.js';
import { createUserSchema, updateUserSchema } from './users.validation.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(auth);

router.get('/', getAllUsers);
router.get('/:id', authorize('admin'), getUserById);
router.post('/', authorize('admin'), validate(createUserSchema), createUser);
router.put('/:id', authorize('admin'), validate(updateUserSchema), updateUser);

export default router;
