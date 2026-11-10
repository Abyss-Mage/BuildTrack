import db from '../../config/database.js';
import { ExpensesRepository } from '../expenses/expenses.repository.js';
import { ProjectsRepository } from '../projects/projects.repository.js';
import { AccountsRepository } from '../accounts/accounts.repository.js';
import { generateExpensePdfReport, generateProjectPlPdf } from '../../utils/pdfGenerator.js';
import { generateExpenseExcelReport } from '../../utils/excelGenerator.js';
import { ApiError } from '../../utils/ApiError.js';

export class ReportsService {
  static async getExpenseReportData(filters, user) {
    return ExpensesRepository.findAll(filters, user);
  }

  static async getProjectPlData(projectId, user) {
    const project = await ProjectsRepository.findById(projectId);
    if (!project) throw ApiError.notFound('Project not found');

    const breakdown = await db.getAll(
      `SELECT 
        c.id as category_id,
        c.name as category_name,
        c.icon as category_icon,
        COUNT(e.id) as expense_count,
        COALESCE(SUM(e.amount), 0) as total_spent
       FROM categories c
       LEFT JOIN expenses e ON c.id = e.category_id AND e.project_id = ? AND e.status IN ('approved', 'processed')
       GROUP BY c.id, c.name, c.icon
       HAVING total_spent > 0
       ORDER BY total_spent DESC`,
      [projectId]
    );

    const monthlyTrend = await db.getAll(
      `SELECT 
        SUBSTR(e.expense_date, 1, 7) as month,
        COALESCE(SUM(e.amount), 0) as total_spent
       FROM expenses e
       WHERE e.project_id = ? AND e.status IN ('approved', 'processed')
       GROUP BY SUBSTR(e.expense_date, 1, 7)
       ORDER BY month ASC`,
      [projectId]
    );

    return {
      project,
      breakdown,
      monthlyTrend,
    };
  }

  static async generatePdf(filters, user) {
    const expenses = await this.getExpenseReportData(filters, user);
    let projectName = 'All Projects';
    if (filters.projectId) {
      const proj = await ProjectsRepository.findById(filters.projectId);
      if (proj) projectName = proj.name;
    }

    return generateExpensePdfReport(expenses, {
      projectName,
      status: filters.status,
      dateRange: filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : 'All Time',
    });
  }

  static async generateExcel(filters, user) {
    // The Accounts export must list exactly what the settlements screen shows
    const expenses = filters.ledger === 'settlements'
      ? await AccountsRepository.getSettlements(filters)
      : await this.getExpenseReportData(filters, user);
    let projectName = 'All Projects';
    if (filters.projectId) {
      const proj = await ProjectsRepository.findById(filters.projectId);
      if (proj) projectName = proj.name;
    }

    return generateExpenseExcelReport(expenses, {
      projectName,
      status: filters.status,
    });
  }

  static async generateProjectPlPdf(projectId, user) {
    const { project, breakdown } = await this.getProjectPlData(projectId, user);
    return generateProjectPlPdf(project, breakdown);
  }
}
