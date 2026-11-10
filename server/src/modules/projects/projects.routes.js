import { Router } from 'express';
import { getAllProjects, getProjectById, createProject, updateProject } from './projects.controller.js';
import { createProjectSchema, updateProjectSchema } from './projects.validation.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(auth);

router.get('/', getAllProjects);
// The list stays open: site forms need it for their dropdowns
router.get('/:id', authorize('admin', 'accountant'), getProjectById);
router.post('/', authorize('admin'), validate(createProjectSchema), createProject);
router.put('/:id', authorize('admin'), validate(updateProjectSchema), updateProject);

export default router;
