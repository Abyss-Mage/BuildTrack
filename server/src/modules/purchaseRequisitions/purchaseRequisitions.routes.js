import { Router } from 'express';
import {
  getRequisitions,
  getRequisition,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  exportRequisitions,
} from './purchaseRequisitions.controller.js';
import { requisitionSchema } from './purchaseRequisitions.validation.js';
import { auth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(auth);

router.get('/', getRequisitions);
router.get('/export/:format', exportRequisitions);
router.get('/:id', getRequisition);
router.post('/', validate(requisitionSchema), createRequisition);
router.put('/:id', validate(requisitionSchema), updateRequisition);
router.delete('/:id', deleteRequisition);

export default router;
