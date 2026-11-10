import { Router } from 'express';
import { getAdvances, createAdvance, approveAdvance, rejectAdvance } from './advances.controller.js';
import { createAdvanceSchema } from './advances.validation.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(auth);

router.get('/', getAdvances);
router.post('/', authorize('admin', 'accountant'), validate(createAdvanceSchema), createAdvance);
router.post('/:id/approve', authorize('admin'), approveAdvance);
router.post('/:id/reject', authorize('admin'), rejectAdvance);

export default router;
