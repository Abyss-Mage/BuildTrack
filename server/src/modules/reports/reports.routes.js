import { Router } from 'express';
import {
  getExpenseReport,
  getProjectPl,
  downloadExpensePdf,
  downloadExpenseExcel,
  downloadProjectPlPdf,
} from './reports.controller.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(auth);
router.use(authorize('admin', 'accountant'));

router.get('/expenses', getExpenseReport);
router.get('/expenses/pdf', downloadExpensePdf);
router.get('/expenses/excel', downloadExpenseExcel);
router.get('/project-pl/:projectId', getProjectPl);
router.get('/project-pl/:projectId/pdf', downloadProjectPlPdf);

export default router;
