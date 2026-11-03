import { Router } from 'express';
import { getAllProjects, getProjectById, createProject, updateProject, updateRoleLimits } from './projects.controller.js';
import { createProjectSchema, updateProjectSchema } from './projects.validation.js';
import { auth } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

router.use(auth);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', authorize('admin', 'project_manager'), validate(createProjectSchema), createProject);
router.put('/:id', authorize('admin', 'project_manager'), validate(updateProjectSchema), updateProject);
router.put('/:id/role-limits', authorize('admin', 'project_manager'), updateRoleLimits);

export default router;
