import { PurchaseRequisitionsService } from './purchaseRequisitions.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { logAudit } from '../../utils/auditLogger.js';
import { sendTable } from '../../utils/tableExport.js';

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

const REQUISITION_COLUMNS = [
  { header: 'PR No.', value: (pr) => pr.pr_no, width: 26 },
  { header: 'PR Date', value: (pr) => pr.pr_date, width: 12 },
  { header: 'Site', value: (pr) => `[${pr.project_code}] ${pr.project_name}`, width: 22 },
  { header: 'Priority', value: (pr) => pr.priority, width: 10 },
  { header: 'Requested By', value: (pr) => pr.requested_by_name, width: 18 },
  { header: 'Items', value: (pr) => pr.item_count, width: 8 },
  { header: 'Total Cost', value: (pr) => pr.total_cost, width: 16, money: true },
];

export const exportRequisitions = asyncHandler(async (req, res) => {
  const requisitions = await PurchaseRequisitionsService.getAll(req.query, req.user);
  await sendTable(res, req.params.format, 'Purchase Requisitions', REQUISITION_COLUMNS, requisitions);
});
