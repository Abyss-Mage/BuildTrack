import { Router } from 'express';
import { getPendingQueue, approveExpense, rejectExpense } from './approvals.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);

router.get('/pending', authorize('admin', 'accountant'), getPendingQueue);
router.post('/:expenseId/approve', authorize('admin', 'accountant'), approveExpense);
router.post('/:expenseId/reject', authorize('admin', 'accountant'), rejectExpense);

export default router;
