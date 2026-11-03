import { Router } from 'express';
import { AccountsController } from './accounts.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);

// View-only allowed for admin, accountant, project_manager
router.get('/summary', authorize('admin', 'accountant', 'project_manager'), AccountsController.getSummary);
router.get('/queue', authorize('admin', 'accountant'), AccountsController.getPayoutQueue);
router.get('/settlements', authorize('admin', 'accountant', 'project_manager'), AccountsController.getSettlements);

// Disbursement actions strictly Accountant & Admin
router.post('/process-payout/:id', authorize('admin', 'accountant'), AccountsController.processPayout);
router.post('/bulk-process', authorize('admin', 'accountant'), AccountsController.bulkProcessPayout);

export default router;
