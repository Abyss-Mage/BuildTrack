import { Router } from 'express';
import { getDashboardSummary } from './dashboard.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);

router.get('/summary', authorize('admin', 'accountant'), getDashboardSummary);

export default router;
