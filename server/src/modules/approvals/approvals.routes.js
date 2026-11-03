import { Router } from 'express';
import { getPendingQueue, approveExpense, rejectExpense, processExpense } from './approvals.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);

router.get('/pending', authorize('admin', 'project_manager', 'accountant'), getPendingQueue);
router.post('/:expenseId/approve', authorize('admin', 'project_manager'), approveExpense);
router.post('/:expenseId/reject', authorize('admin', 'project_manager', 'accountant'), rejectExpense);
router.post('/:expenseId/process', authorize('admin', 'accountant'), processExpense);

export default router;
