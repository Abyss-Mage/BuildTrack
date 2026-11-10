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
  Filter,
  Calendar,
  X,
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [loading, setLoading] = useState(true);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState({
    summary: {},
    categories: [],
    projects: [],
    monthlyTrends: [],
    recentExpenses: [],
  });
  const [selectedExpense, setSelectedExpense] = useState(null);

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjectsList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedProjectId) params.projectId = selectedProjectId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (!startDate && !endDate && selectedTimeframe) params.timeframe = selectedTimeframe;

      const res = await api.get('/dashboard/summary', { params });
      setData(res.data.data);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 150);
    const handleExpenseAdded = () => loadDashboard();
    window.addEventListener('expense-added', handleExpenseAdded);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('expense-added', handleExpenseAdded);
    };
  }, [selectedProjectId, selectedTimeframe, startDate, endDate]);

  const formatCurrency = (val) =>
    `₹ ${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const summary = data.summary || {};

  const timeframeOptions = [
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'Last 3 Months' },
    { id: 'year', label: 'Last 12 Months' },
    { id: 'all', label: 'All Time' },
  ];

  const resetFilters = () => {
    setSelectedProjectId('');
    setSelectedTimeframe('month');
    setStartDate('');
    setEndDate('');
  };

  const isCustomDateRange = Boolean(startDate || endDate);
  const isFiltered = Boolean(selectedProjectId || selectedTimeframe !== 'month' || startDate || endDate);
  const activeProject = projectsList.find((p) => String(p.id) === String(selectedProjectId));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-light bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
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
          {['admin', 'accountant'].includes(user?.role) && (
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

      {/* Dashboard Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pr-1">
              <Filter className="w-4 h-4 text-brand-500" />
              <span>Dashboard Scope:</span>
            </div>

            {/* Project Filter Dropdown */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option value="">🏢 All Construction Sites</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Filter Pills */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
              {timeframeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedTimeframe(opt.id);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    !isCustomDateRange && selectedTimeframe === opt.id
                      ? 'bg-white text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active scope summary tag */}
          <div className="text-right flex items-center justify-end gap-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Scope: <strong className="text-slate-800">{activeProject ? activeProject.name : 'All Sites'}</strong> (
              {isCustomDateRange
                ? `${startDate || 'Start'} → ${endDate || 'Today'}`
                : timeframeOptions.find((t) => t.id === selectedTimeframe)?.label}
              )
            </span>
          </div>
        </div>

        {/* Custom Date Range Filter Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-600" />
              Custom Date Range:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 pl-1 uppercase">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:border-brand-500"
              />
              <span className="text-[11px] font-bold text-slate-400 uppercase">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium outline-none focus:border-brand-500"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                  title="Clear custom date range"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Advance balance: only entries actually submitted reduce it */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Advance Allocated', value: data.advances?.totalAllocated, tone: 'text-slate-900' },
          { label: 'Total Expenses Submitted', value: data.advances?.totalSubmitted, tone: 'text-amber-600' },
          { label: 'Remaining Available Balance', value: data.advances?.remaining, tone: 'text-emerald-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{card.label}</span>
            <span className={`text-2xl font-black mt-1 block ${card.tone}`}>{formatCurrency(card.value)}</span>
          </div>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Approved Spend / Custom Range Spend */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {isCustomDateRange
                ? 'Spend in Range'
                : selectedTimeframe === 'month'
                ? 'Spend This Month'
                : 'Total Approved Spend'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(
                  isCustomDateRange || selectedTimeframe === 'month'
                    ? summary.monthlySpend
                    : summary.totalSpend
                )}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              {isCustomDateRange
                ? `${startDate || 'Start'} to ${endDate || 'Today'}`
                : 'Reconciled & Authorized'}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Pending Approvals
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-600">
                {summary.pendingCount || 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">vouchers</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium block mt-1">
              Total: {formatCurrency(summary.pendingAmount)}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Approved Waiting Payout */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Ready for Payout
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">
                {summary.approvedCount || 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">vouchers</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium block mt-1">
              Total: {formatCurrency(summary.approvedAmount)}
            </span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Active Projects Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Active Sites
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-600">
                {summary.activeProjects || 0}
              </span>
              <span className="text-xs text-slate-400 font-medium">projects</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">Under Active Execution</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spending Trend Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expense Burn Trend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Approved vs Pending cash outflow</p>
            </div>
          </div>
          <MonthlySpendChart data={data.monthlyTrends || []} />
        </div>

        {/* Category Breakdown Donut (1 col) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Cost Breakdown</h2>
            <p className="text-xs text-slate-500 mt-0.5">By construction category</p>
          </div>
          <CategoryPieChart data={data.categories || []} />
          <div className="text-center mt-2">
            <span className="text-[11px] text-slate-400">
              Highest spend: {data.categories?.[0]?.name || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Second Row: Project Budgets & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Budget Progress (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Project Budget vs Spent</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring expenditure against site allocations
              </p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>All Projects</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ProjectBudgetBarChart data={data.projects || []} />
        </div>

        {/* Recent Submitted Expenses (1 col) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Activity</h2>
                <p className="text-xs text-slate-500 mt-0.5">Latest field vouchers</p>
              </div>
              <button
                onClick={() => navigate('/expenses')}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {(!data.recentExpenses || data.recentExpenses.length === 0) ? (
                <p className="text-xs text-slate-400 py-8 text-center italic">
                  No expenses match the selected scope.
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
                        {exp.approver_name && (
                          <span className="text-emerald-700 ml-1 font-medium">
                            • Appr: {exp.approver_name}
                          </span>
                        )}
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
