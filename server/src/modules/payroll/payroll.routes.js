import { Router } from 'express';
import { PayrollController } from './payroll.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createPayrollSchema, updatePayrollSchema, payPayrollSchema } from './payroll.validation.js';

const router = Router();

router.use(auth);
router.use(authorize('admin', 'accountant'));

router.get('/', PayrollController.getAll);
router.get('/summary', PayrollController.getSummary);
router.get('/broadcast-list', PayrollController.getMonthlyBroadcast);
router.get('/:id/whatsapp', PayrollController.getWhatsAppPayload);
router.get('/:id', PayrollController.getById);

router.post('/', validate(createPayrollSchema), PayrollController.create);
router.put('/:id', validate(updatePayrollSchema), PayrollController.update);
router.post('/:id/pay', validate(payPayrollSchema), PayrollController.markAsPaid);
router.delete('/:id', PayrollController.delete);
router.post('/record-broadcast', PayrollController.recordBroadcastSent);

export default router;
