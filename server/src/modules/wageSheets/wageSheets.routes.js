import { Router } from 'express';
import { getSheets, getRows, uploadSheet, deleteSheet, markPaid, sendWhatsApp, updateEmployeePhone } from './wageSheets.controller.js';
import { uploadWageSheetSchema, employeePhoneSchema } from './wageSheets.validation.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { excelUpload } from '../../middleware/upload.js';

const router = Router();

router.use(auth);
router.use(authorize('admin', 'accountant'));

router.get('/', getSheets);
router.get('/rows', getRows);
router.post('/', excelUpload.single('file'), validate(uploadWageSheetSchema), uploadSheet);
router.put('/employees/:id/phone', validate(employeePhoneSchema), updateEmployeePhone);
router.delete('/:id', deleteSheet);
router.post('/:id/mark-paid', markPaid);
router.post('/:id/whatsapp', sendWhatsApp);

export default router;
