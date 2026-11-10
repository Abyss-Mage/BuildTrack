import { DashboardService } from './dashboard.service.js';
import { AdvancesService } from '../advances/advances.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [summary, categories, projects, monthlyTrends, recentExpenses, advances] = await Promise.all([
    DashboardService.getSummary(req.user, req.query),
    DashboardService.getCategoryBreakdown(req.user, req.query),
    DashboardService.getProjectBreakdown(req.user, req.query),
    DashboardService.getMonthlyTrends(req.user, req.query),
    DashboardService.getRecentExpenses(req.user, req.query),
    AdvancesService.getSummary(req.user, req.query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary,
      categories,
      projects,
      monthlyTrends,
      recentExpenses,
      advances,
    },
  });
});
