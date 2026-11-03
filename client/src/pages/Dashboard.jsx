import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import MonthlySpendChart from '../components/charts/MonthlySpendChart';
import ProjectBudgetBarChart from '../components/charts/ProjectBudgetBarChart';
import StatusBadge from '../components/ui/StatusBadge';
import ExpenseDetailModal from './ExpenseDetailModal';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Building2,
  PlusCircle,
  Receipt,
  ArrowUpRight,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {},
    categories: [],
    projects: [],
    monthlyTrends: [],
    recentExpenses: [],
  });
  const [selectedExpense, setSelectedExpense] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      setData(res.data.data);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const handleExpenseAdded = () => loadDashboard();
    window.addEventListener('expense-added', handleExpenseAdded);
    return () => window.removeEventListener('expense-added', handleExpenseAdded);
  }, []);

  const formatCurrency = (val) =>
    `₹ ${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
            Site Cost Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time financial visibility across construction sites, field receipts, and multi-tier approval flows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {['admin', 'project_manager', 'accountant'].includes(user?.role) && (
            <button
              onClick={() => navigate('/approvals')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs sm:text-sm border border-slate-700 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Review Queue</span>
            </button>
          )}

          <button
            onClick={() => navigate('/expenses')}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>View All Bills</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Spend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              This Month Spend
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatCurrency(summary.monthlySpend)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Approved & processed vouchers
          </span>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-slate-900 font-mono">
              {summary.pendingCount || 0}
            </p>
            <span className="text-xs font-semibold text-amber-600 font-mono">
              ({formatCurrency(summary.pendingAmount)})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Awaiting Project Manager review
          </span>
        </div>

        {/* Ready for Payment / Processing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved / For Payout
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black text-slate-900 font-mono">
              {summary.approvedCount || 0}
            </p>
            <span className="text-xs font-semibold text-blue-600 font-mono">
              ({formatCurrency(summary.approvedAmount)})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Approved, pending finance release
          </span>
        </div>

        {/* Active Projects */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Sites
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {summary.activeProjects || 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Total active construction projects
          </span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Expenditure Trajectory</h3>
              <p className="text-xs text-slate-500">
                Monthly approved site spend vs pending commitments
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Last 6 Months
            </span>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : (
            <MonthlySpendChart data={data.monthlyTrends} />
          )}
        </div>

        {/* Category Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cost by Category</h3>
              <p className="text-xs text-slate-500">Distribution across major materials & labor</p>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : (
            <CategoryPieChart data={data.categories} />
          )}
        </div>
      </div>

      {/* Bottom Grid: Project Budget vs Actual & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Budget Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Project Budget Utilization</h3>
              <p className="text-xs text-slate-500">Total allocated budget vs actual spend</p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>All Projects</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : (
            <ProjectBudgetBarChart data={data.projects} />
          )}
        </div>

        {/* Recent Site Expenses */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Field Expenses</h3>
                <p className="text-xs text-slate-500">Latest voucher entries submitted from sites</p>
              </div>
              <button
                onClick={() => navigate('/expenses')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {(!data.recentExpenses || data.recentExpenses.length === 0) ? (
                <p className="text-xs text-slate-400 py-8 text-center italic">
                  No recent expenses recorded.
                </p>
              ) : (
                data.recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedExpense(exp)}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {exp.reference_no}
                        </span>
                        <StatusBadge status={exp.status} size="xs" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                        {exp.title}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {exp.project_name} • {exp.expense_date}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-slate-900 font-mono block">
                        ₹ {Number(exp.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onActionSuccess={loadDashboard}
        />
      )}
    </div>
  );
}

export default Dashboard;
