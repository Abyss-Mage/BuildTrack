import { WageSheetsService } from './wageSheets.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getSheets = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await WageSheetsService.getSheets(req.query), 'Wage sheets retrieved');
});

export const getRows = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, await WageSheetsService.getRows(req.query), 'Wage records retrieved');
});

export const uploadSheet = asyncHandler(async (req, res) => {
  const result = await WageSheetsService.importSheet(req.file, req.body, req.user);
  await logAudit(req, {
    action: 'WAGE_SHEET_UPLOAD',
    entityType: 'wage_sheet',
    entityId: result.sheetId,
    details: { file: req.file.originalname, project_id: req.body.project_id, employees: result.employees, total_net: result.net },
  });
  return ApiResponse.created(res, result, `${result.employees} employees imported`);
});

export const deleteSheet = asyncHandler(async (req, res) => {
  const sheet = await WageSheetsService.deleteSheet(req.params.id);
  await logAudit(req, { action: 'WAGE_SHEET_DELETE', entityType: 'wage_sheet', entityId: sheet.id, details: { file: sheet.source_file } });
  return ApiResponse.success(res, null, 'Wage sheet deleted');
});

export const markPaid = asyncHandler(async (req, res) => {
  const sheet = await WageSheetsService.markPaid(req.params.id);
  await logAudit(req, { action: 'WAGE_SHEET_PAID', entityType: 'wage_sheet', entityId: sheet.id, details: { file: sheet.source_file } });
  return ApiResponse.success(res, null, 'Wage sheet marked as paid');
});

export const sendWhatsApp = asyncHandler(async (req, res) => {
  const result = await WageSheetsService.sendWhatsApp(req.params.id);
  await logAudit(req, { action: 'WAGE_SHEET_WHATSAPP', entityType: 'wage_sheet', entityId: req.params.id, details: result });
  return ApiResponse.success(res, result, 'WhatsApp send finished');
});

export const updateEmployeePhone = asyncHandler(async (req, res) => {
  await WageSheetsService.setEmployeePhone(req.params.id, req.body.phone);
  await logAudit(req, { action: 'EMPLOYEE_PHONE_UPDATE', entityType: 'employee', entityId: req.params.id });
  return ApiResponse.success(res, null, 'Mobile number saved');
});
