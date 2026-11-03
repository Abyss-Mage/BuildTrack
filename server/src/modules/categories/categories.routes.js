import { Router } from 'express';
import { getCategories, createCategory, updateCategory } from './categories.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);

router.get('/', getCategories);
router.post('/', authorize('admin'), createCategory);
router.put('/:id', authorize('admin'), updateCategory);

export default router;
