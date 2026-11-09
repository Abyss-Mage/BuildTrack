import { ProjectsRepository } from './projects.repository.js';
import { ApiError } from '../../utils/ApiError.js';
import { assertSiteAccess } from '../../utils/siteScope.js';

export class ProjectsService {
  static async getAllProjects(user, filters = {}) {
    return ProjectsRepository.findAll(user, filters);
  }

  static async getProjectById(id, user) {
    await assertSiteAccess(user, id);
    const project = await ProjectsRepository.findById(id);
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  }

  static async createProject(data, userId) {
    const existing = await ProjectsRepository.findByCode(data.code.trim().toUpperCase());
    if (existing) {
      throw ApiError.conflict(`A project with code '${data.code}' already exists`);
    }
    return ProjectsRepository.create(data, userId);
  }

  static async updateProject(id, data) {
    await this.getProjectById(id);

    if (data.code) {
      const existing = await ProjectsRepository.findByCode(data.code.trim().toUpperCase());
      if (existing && existing.id !== Number(id)) {
        throw ApiError.conflict(`Project code '${data.code}' is already in use by another project`);
      }
    }

    return ProjectsRepository.update(id, data);
  }
}
