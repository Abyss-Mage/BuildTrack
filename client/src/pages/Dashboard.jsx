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
import Modal from '../components/ui/Modal';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Building2,
  PlusCircle,
  Receipt,
  ArrowUpRight,
  Loader2,
  Filter,
  Calendar,
  X,
  MessageCircle,
  Phone,
  AlertTriangle,
  ExternalLink,
  Check,
} from 'lucide-react';
import { toLocalDate } from '../utils/dateUtils';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const isFinanceOrAdmin = ['admin', 'accountant'].includes(user?.role);

  // Default Monday-Sunday of current week
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - (day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const defaultWeekStart = toLocalDate(mon);
  const defaultWeekEnd = toLocalDate(sun);

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

  // WhatsApp Wages Broadcast State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastStartDate, setBroadcastStartDate] = useState(defaultWeekStart);
  const [broadcastEndDate, setBroadcastEndDate] = useState(defaultWeekEnd);
  const [broadcastData, setBroadcastData] = useState(null);
  const [loadingBroadcast, setLoadingBroadcast] = useState(false);

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

  const loadBroadcastData = async (start = broadcastStartDate, end = broadcastEndDate) => {
    try {
      setLoadingBroadcast(true);
      const params = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      const res = await api.get('/payroll/broadcast-list', { params });
      setBroadcastData(res.data.data);
    } catch (err) {
      showNotification('Failed to load payroll broadcast data', 'error');
    } finally {
      setLoadingBroadcast(false);
    }
  };

  const openBroadcastModal = () => {
    setIsBroadcastOpen(true);
    loadBroadcastData(broadcastStartDate, broadcastEndDate);
  };

  const handleSendSingleWhatsApp = (item) => {
    if (!item.hasPhone) {
      showNotification(`No valid phone for ${item.employeeName}. Edit their profile in Team Users.`, 'error');
      return;
    }
    window.open(item.whatsappUrl, '_blank');
  };

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
          {/* WhatsApp Payroll Broadcast button directly on Dashboard */}
          {isFinanceOrAdmin && (
            <button
              onClick={openBroadcastModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              title="Broadcast Wages WhatsApp message to all employees"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200" />
              <span>WhatsApp Payroll</span>
            </button>
          )}

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

      {/* WhatsApp Broadcast Modal */}
      {isBroadcastOpen && (
        <Modal
          isOpen={isBroadcastOpen}
          onClose={() => setIsBroadcastOpen(false)}
          title="Broadcast Wages on WhatsApp"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Simple Date-to-Date Wage Period Selector */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-950">Wages Date Range:</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastStartDate(defaultWeekStart);
                      setBroadcastEndDate(defaultWeekEnd);
                      loadBroadcastData(defaultWeekStart, defaultWeekEnd);
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold bg-white text-emerald-900 rounded-md border border-emerald-200 hover:bg-emerald-100"
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const first = toLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      const last = toLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                      setBroadcastStartDate(first);
                      setBroadcastEndDate(last);
                      loadBroadcastData(first, last);
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold bg-white text-emerald-900 rounded-md border border-emerald-200 hover:bg-emerald-100"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastStartDate('');
                      setBroadcastEndDate('');
                      loadBroadcastData('', '');
                    }}
                    className="px-2 py-0.5 text-[11px] font-bold bg-white text-emerald-900 rounded-md border border-emerald-200 hover:bg-emerald-100"
                  >
                    All Records
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                    Wages From Date
                  </label>
                  <input
                    type="date"
                    value={broadcastStartDate}
                    onChange={(e) => {
                      setBroadcastStartDate(e.target.value);
                      loadBroadcastData(e.target.value, broadcastEndDate);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl text-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                    Wages To Date
                  </label>
                  <input
                    type="date"
                    value={broadcastEndDate}
                    onChange={(e) => {
                      setBroadcastEndDate(e.target.value);
                      loadBroadcastData(broadcastStartDate, e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl text-slate-900 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {broadcastData && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-900 pt-1 border-t border-emerald-200/60">
                  <span>Selected Wage Period: {broadcastData.periodLabel}</span>
                  <span>Total Disbursed: ₹ {Number(broadcastData.totalNetSalary || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {loadingBroadcast ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mb-2" />
                <p className="text-xs">Preparing WhatsApp broadcast...</p>
              </div>
            ) : !broadcastData || broadcastData.items.length === 0 ? (
              <div className="py-10 text-center bg-white rounded-2xl border border-slate-200 p-6">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">
                  No Wage Records Found for {broadcastStartDate && broadcastEndDate ? `${broadcastStartDate} to ${broadcastEndDate}` : 'Selected Range'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Please generate wage records for this period in the Payroll module before sending WhatsApp notifications.
                </p>
                <button
                  onClick={() => {
                    setIsBroadcastOpen(false);
                    navigate('/payroll');
                  }}
                  className="mt-4 px-4 py-2 bg-brand-500 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Go to Payroll Module
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Broadcast Readiness Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Employees</span>
                    <strong className="text-sm text-slate-900">{broadcastData.totalEmployees}</strong>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Ready (WhatsApp)</span>
                    <strong className="text-sm text-emerald-800">{broadcastData.withValidPhone}</strong>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-700 uppercase font-semibold block">Missing Phone</span>
                    <strong className="text-sm text-amber-800">{broadcastData.missingPhoneCount}</strong>
                  </div>
                </div>

                {/* Employee Roster */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Individual WhatsApp Dispatch
                  </span>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {broadcastData.items.map((emp) => (
                      <div
                        key={emp.payrollId}
                        className="pt-1.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{emp.employeeName}</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {emp.employeePhone || <span className="text-rose-500 italic">No phone</span>}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            ₹ {Number(emp.netSalary).toLocaleString('en-IN')}
                          </span>

                          <button
                            onClick={() => handleSendSingleWhatsApp(emp)}
                            disabled={!emp.hasPhone}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] disabled:opacity-40 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsBroadcastOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Dashboard;
