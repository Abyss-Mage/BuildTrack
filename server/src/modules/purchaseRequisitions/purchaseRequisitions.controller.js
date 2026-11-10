import { PurchaseRequisitionsService } from './purchaseRequisitions.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { logAudit } from '../../utils/auditLogger.js';

const audit = (req, action, requisition) =>
  logAudit(req, {
    action,
    entityType: 'purchase_requisition',
    entityId: requisition.id,
    details: { pr_no: requisition.pr_no, project_id: requisition.project_id },
  });

export const getRequisitions = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await PurchaseRequisitionsService.getAll(req.query, req.user), 'Requisitions retrieved');
});

export const getRequisition = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await PurchaseRequisitionsService.getById(req.params.id, req.user), 'Requisition retrieved');
});

export const createRequisition = asyncHandler(async (req, res) => {
  const requisition = await PurchaseRequisitionsService.create(req.body, req.user);
  await audit(req, 'PR_CREATE', requisition);
  return ApiResponse.created(res, requisition, `Purchase requisition ${requisition.pr_no} saved`);
});

export const updateRequisition = asyncHandler(async (req, res) => {
  const requisition = await PurchaseRequisitionsService.update(req.params.id, req.body, req.user);
  await audit(req, 'PR_UPDATE', requisition);
  return ApiResponse.success(res, requisition, `Purchase requisition ${requisition.pr_no} updated`);
});

export const deleteRequisition = asyncHandler(async (req, res) => {
  const requisition = await PurchaseRequisitionsService.delete(req.params.id, req.user);
  await audit(req, 'PR_DELETE', requisition);
  return ApiResponse.success(res, null, 'Purchase requisition deleted');
});
