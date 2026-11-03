import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

// Full Audit Log is strictly Super Admin only
router.use(auth);
router.use(authorize('admin'));

router.get('/', AuditController.getLogs);
router.get('/stats', AuditController.getStats);

export default router;
