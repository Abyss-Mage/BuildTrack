import { AuditRepository } from './audit.repository.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export class AuditController {
  static async getLogs(req, res, next) {
    try {
      const result = await AuditRepository.findAll(req.query);
      return ApiResponse.success(res, result, 'Audit logs retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req, res, next) {
    try {
      const stats = await AuditRepository.getStats();
      return ApiResponse.success(res, stats, 'Audit stats retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}
