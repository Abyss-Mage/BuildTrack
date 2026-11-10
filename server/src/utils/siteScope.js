import { ApiError } from './ApiError.js';

// SQL fragment limiting a Site In-Charge to records they created; other roles see everything
export function ownScope(user, ownerColumn) {
  if (user?.role !== 'site_in_charge') return '';
  return ` AND ${ownerColumn} = ${Number(user.id)}`;
}

export function assertOwnRecord(user, ownerId) {
  if (user?.role === 'site_in_charge' && Number(ownerId) !== Number(user.id)) {
    throw ApiError.forbidden('You can only open records you created.');
  }
}
