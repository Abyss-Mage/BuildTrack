import { ProjectsService } from './projects.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectsService.getAllProjects(req.user, req.query);
  res.status(200).json({ success: true, data: projects });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await ProjectsService.getProjectById(req.params.id);
  res.status(200).json({ success: true, data: project });
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await ProjectsService.createProject(req.body, req.user.id);

  await logAudit(req, {
    action: 'PROJECT_CREATE',
    entityType: 'project',
    entityId: project.id,
    details: { name: project.name, code: project.code, budget: project.total_budget },
  });

  res.status(201).json({ success: true, message: 'Project created successfully', data: project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await ProjectsService.updateProject(req.params.id, req.body);

  await logAudit(req, {
    action: 'PROJECT_UPDATE',
    entityType: 'project',
    entityId: project.id,
    details: req.body,
  });

  res.status(200).json({ success: true, message: 'Project updated successfully', data: project });
});

export const updateRoleLimits = asyncHandler(async (req, res) => {
  const project = await ProjectsService.updateRoleLimits(req.params.id, req.body.role_limits || req.body);

  await logAudit(req, {
    action: 'ROLE_LIMITS_UPDATE',
    entityType: 'project',
    entityId: req.params.id,
    details: { project_name: project.name, role_limits: project.role_limits },
  });

  res.status(200).json({
    success: true,
    message: 'Expenditure approval limits updated successfully for this project',
    data: project,
  });
});
