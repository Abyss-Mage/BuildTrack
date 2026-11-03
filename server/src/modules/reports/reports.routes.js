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

// All roles except site_engineer can view reports and exports
router.get('/expenses', authorize('admin', 'project_manager', 'accountant'), getExpenseReport);
router.get('/expenses/pdf', authorize('admin', 'project_manager', 'accountant'), downloadExpensePdf);
router.get('/expenses/excel', authorize('admin', 'project_manager', 'accountant'), downloadExpenseExcel);
router.get('/project-pl/:projectId', authorize('admin', 'project_manager', 'accountant'), getProjectPl);
router.get('/project-pl/:projectId/pdf', authorize('admin', 'project_manager', 'accountant'), downloadProjectPlPdf);

export default router;
