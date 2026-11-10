import { Router } from 'express';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  submitExpense,
  deleteExpense,
  exportExpenses,
} from './expenses.controller.js';
import { createExpenseSchema, updateExpenseSchema } from './expenses.validation.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadMiddleware } from '../../middleware/upload.js';

const router = Router();

router.use(auth);

router.get('/', getAllExpenses);
router.get('/export/:format', exportExpenses);
router.get('/:id', getExpenseById);

router.post(
  '/',
  authorize('admin', 'site_in_charge'),
  uploadMiddleware.array('receipts', 5),
  validate(createExpenseSchema),
  createExpense
);

router.put(
  '/:id',
  uploadMiddleware.array('receipts', 5),
  validate(updateExpenseSchema),
  updateExpense
);

router.patch('/:id/submit', submitExpense);
router.delete('/:id', deleteExpense);

export default router;
