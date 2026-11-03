import { ProjectsService } from './projects.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await ProjectsService.getAllProjects(req.user);
  res.status(200).json({ success: true, data: projects });
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await ProjectsService.getProjectById(req.params.id);
  res.status(200).json({ success: true, data: project });
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await ProjectsService.createProject(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Project created successfully', data: project });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await ProjectsService.updateProject(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Project updated successfully', data: project });
});
