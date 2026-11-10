import db from '../config/database.js';
import { ApiError } from './ApiError.js';

// SQL fragment limiting a query to a Site In-Charge's assigned sites; other roles see every site
export function siteScope(user, column) {
  if (user?.role !== 'site_in_charge') return '';
  return ` AND ${column} IN (SELECT project_id FROM project_assignments WHERE user_id = ${Number(user.id)})`;
}

export async function isAssigned(userId, projectId) {
  return Boolean(
    await db.getOne('SELECT 1 AS ok FROM project_assignments WHERE user_id = ? AND project_id = ?', [userId, projectId])
  );
}

export async function assertSiteAccess(user, projectId) {
  if (user?.role === 'site_in_charge' && !(await isAssigned(user.id, projectId))) {
    throw ApiError.forbidden('This site is not assigned to you.');
  }
}
