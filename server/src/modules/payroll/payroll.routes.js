import { Router } from 'express';
import { PayrollController } from './payroll.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);

// All logged in users can view their payroll slips
router.get('/', PayrollController.getAll);
router.get('/summary', authorize('admin', 'accountant'), PayrollController.getSummary);
router.get('/broadcast-list', authorize('admin', 'accountant'), PayrollController.getMonthlyBroadcast);
router.get('/:id/whatsapp', authorize('admin', 'accountant'), PayrollController.getWhatsAppPayload);
router.get('/:id', PayrollController.getById);

// Management restricted to Accountant and Super Admin
router.post('/', authorize('admin', 'accountant'), PayrollController.create);
router.put('/:id', authorize('admin', 'accountant'), PayrollController.update);
router.post('/:id/pay', authorize('admin', 'accountant'), PayrollController.markAsPaid);
router.delete('/:id', authorize('admin', 'accountant'), PayrollController.delete);
router.post('/record-broadcast', authorize('admin', 'accountant'), PayrollController.recordBroadcastSent);

export default router;
