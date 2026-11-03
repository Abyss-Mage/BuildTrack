import { DashboardService } from './dashboard.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const [summary, categories, projects, monthlyTrends, recentExpenses] = await Promise.all([
    DashboardService.getSummary(req.user),
    DashboardService.getCategoryBreakdown(req.user),
    DashboardService.getProjectBreakdown(req.user),
    DashboardService.getMonthlyTrends(req.user),
    DashboardService.getRecentExpenses(req.user),
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary,
      categories,
      projects,
      monthlyTrends,
      recentExpenses,
    },
  });
});
