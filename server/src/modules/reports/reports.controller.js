import { ReportsService } from './reports.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getExpenseReport = asyncHandler(async (req, res) => {
  const data = await ReportsService.getExpenseReportData(req.query, req.user);
  res.status(200).json({ success: true, count: data.length, data });
});

export const getProjectPl = asyncHandler(async (req, res) => {
  const data = await ReportsService.getProjectPlData(req.params.projectId, req.user);
  res.status(200).json({ success: true, data });
});

export const downloadExpensePdf = asyncHandler(async (req, res) => {
  const pdfBuffer = await ReportsService.generatePdf(req.query, req.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Expense_Report_${Date.now()}.pdf"`);
  res.send(pdfBuffer);
});

export const downloadExpenseExcel = asyncHandler(async (req, res) => {
  const buffer = await ReportsService.generateExcel(req.query, req.user);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Expense_Report_${Date.now()}.xlsx"`);
  res.send(buffer);
});

export const downloadProjectPlPdf = asyncHandler(async (req, res) => {
  const pdfBuffer = await ReportsService.generateProjectPlPdf(req.params.projectId, req.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Project_PL_${req.params.projectId}_${Date.now()}.pdf"`);
  res.send(pdfBuffer);
});
