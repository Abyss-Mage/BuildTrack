import { AdvancesService } from './advances.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getAdvances = asyncHandler(async (req, res) => {
  const [advances, summary] = await Promise.all([
    AdvancesService.getAdvances(req.query, req.user),
    AdvancesService.getSummary(req.user, req.query),
  ]);
  return ApiResponse.success(res, { advances, summary }, 'Advances retrieved');
});

export const createAdvance = asyncHandler(async (req, res) => {
  const advance = await AdvancesService.createAdvance(req.body, req.user);
  await logAudit(req, {
    action: 'ADVANCE_CREATE',
    entityType: 'advance',
    entityId: advance.id,
    details: { project_id: advance.project_id, site_in_charge_id: advance.site_in_charge_id, amount: advance.amount, status: advance.status },
  });
  return ApiResponse.created(
    res,
    advance,
    advance.status === 'approved' ? 'Advance allocated' : 'Advance sent to Super Admin for approval'
  );
});

export const approveAdvance = asyncHandler(async (req, res) => {
  const advance = await AdvancesService.approveAdvance(req.params.id, req.user);
  await logAudit(req, { action: 'ADVANCE_APPROVE', entityType: 'advance', entityId: advance.id, details: { amount: advance.amount } });
  return ApiResponse.success(res, advance, 'Advance approved');
});

export const rejectAdvance = asyncHandler(async (req, res) => {
  const advance = await AdvancesService.rejectAdvance(req.params.id);
  await logAudit(req, { action: 'ADVANCE_REJECT', entityType: 'advance', entityId: advance.id, details: { amount: advance.amount } });
  return ApiResponse.success(res, advance, 'Advance rejected');
});
