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
  Send,
  Phone,
  AlertTriangle,
  ExternalLink,
  Check,
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const isFinanceOrAdmin = ['admin', 'accountant'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  const [data, setData] = useState({
    summary: {},
    categories: [],
    projects: [],
    monthlyTrends: [],
    recentExpenses: [],
  });
  const [selectedExpense, setSelectedExpense] = useState(null);

  // WhatsApp Broadcast State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastMonth, setBroadcastMonth] = useState(new Date().toISOString().slice(0, 7));
  const [broadcastData, setBroadcastData] = useState(null);
  const [loadingBroadcast, setLoadingBroadcast] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

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
      if (selectedTimeframe) params.timeframe = selectedTimeframe;

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
    loadDashboard();
    const handleExpenseAdded = () => loadDashboard();
    window.addEventListener('expense-added', handleExpenseAdded);
    return () => window.removeEventListener('expense-added', handleExpenseAdded);
  }, [selectedProjectId, selectedTimeframe]);

  const loadBroadcastData = async (month) => {
    try {
      setLoadingBroadcast(true);
      const res = await api.get(`/payroll/broadcast-list?month=${month}`);
      setBroadcastData(res.data.data);
    } catch (err) {
      showNotification('Failed to load payroll broadcast data', 'error');
    } finally {
      setLoadingBroadcast(false);
    }
  };

  const openBroadcastModal = () => {
    setIsBroadcastOpen(true);
    loadBroadcastData(broadcastMonth);
  };

  const handleSendSingleWhatsApp = (item) => {
    if (!item.hasPhone) {
      showNotification(`No valid phone for ${item.employeeName}. Edit their profile in Team Users.`, 'error');
      return;
    }
    window.open(item.whatsappUrl, '_blank');
  };

  const handleBroadcastAll = async () => {
    if (!broadcastData || !broadcastData.items || broadcastData.items.length === 0) return;
    try {
      setIsBroadcasting(true);
      const validItems = broadcastData.items.filter((i) => i.hasPhone);
      const payrollIds = validItems.map((i) => i.payrollId);

      // Record in audit log and database
      await api.post('/payroll/record-broadcast', {
        month: broadcastMonth,
        payroll_ids: payrollIds,
      });

      showNotification(`Broadcast logged! Opening WhatsApp for ${validItems.length} employees...`);

      // Open the first WhatsApp immediately, and provide direct quick links
      if (validItems.length > 0) {
        window.open(validItems[0].whatsappUrl, '_blank');
      }

      // Reload broadcast state
      loadBroadcastData(broadcastMonth);
    } catch (err) {
      showNotification('Broadcast recording failed', 'error');
    } finally {
      setIsBroadcasting(false);
    }
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
  };

  const isFiltered = Boolean(selectedProjectId || selectedTimeframe !== 'month');
  const activeProject = projectsList.find((p) => String(p.id) === String(selectedProjectId));

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
          {/* WhatsApp Payroll Broadcast button directly on Dashboard */}
          {isFinanceOrAdmin && (
            <button
              onClick={openBroadcastModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              title="Broadcast Monthly Payroll WhatsApp message to all employees"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200" />
              <span>WhatsApp Payroll</span>
            </button>
          )}

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

      {/* Dashboard Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
                onClick={() => setSelectedTimeframe(opt.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedTimeframe === opt.id
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Reset Filters button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Reset to all projects and current month"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active scope summary tag */}
        <div className="text-right flex items-center justify-end gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Scope: <strong className="text-slate-800">{activeProject ? activeProject.name : 'All Sites'}</strong> (
            {timeframeOptions.find((t) => t.id === selectedTimeframe)?.label})
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Approved Spend */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {selectedTimeframe === 'month' ? 'Spend This Month' : 'Total Approved Spend'}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(selectedTimeframe === 'month' ? summary.monthlySpend : summary.totalSpend)}
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              Reconciled & Authorized
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
          title="Broadcast Monthly Payroll on WhatsApp"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Month selector & stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950">Payroll Month:</span>
                <input
                  type="month"
                  value={broadcastMonth}
                  onChange={(e) => {
                    setBroadcastMonth(e.target.value);
                    loadBroadcastData(e.target.value);
                  }}
                  className="px-2 py-1 text-xs bg-white border border-emerald-300 rounded-lg font-bold text-slate-900 outline-none"
                />
              </div>

              {broadcastData && (
                <div className="text-xs font-bold text-emerald-900">
                  Total Disbursed: ₹ {Number(broadcastData.totalNetSalary || 0).toLocaleString('en-IN')}
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
                <h4 className="text-sm font-bold text-slate-800">No Payroll Slips for {broadcastMonth}</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Please generate payroll records for this month in the Payroll module before sending WhatsApp notifications.
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

                {/* Primary Broadcast 1-Click Button */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div>
                    <span className="text-xs font-bold block text-white">One-Click Payroll Broadcast</span>
                    <span className="text-[11px] text-slate-300">
                      Dispatches official salary slips to all {broadcastData.withValidPhone} employees.
                    </span>
                  </div>

                  <button
                    onClick={handleBroadcastAll}
                    disabled={isBroadcasting || broadcastData.withValidPhone === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    {isBroadcasting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Broadcast to All Employees</span>
                  </button>
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
