import { Router } from 'express';
import { getDashboardSummary } from './dashboard.controller.js';
import { auth } from '../../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/summary', getDashboardSummary);

export default router;
