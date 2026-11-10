import { Router } from 'express';
import { AccountsController } from './accounts.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);
router.use(authorize('admin', 'accountant'));

router.get('/summary', AccountsController.getSummary);
router.get('/queue', AccountsController.getPayoutQueue);
router.get('/settlements', AccountsController.getSettlements);
router.post('/process-payout/:id', AccountsController.processPayout);
router.post('/bulk-process', AccountsController.bulkProcessPayout);

export default router;
