import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import StatusBadge from '../components/ui/StatusBadge';
import ExpenseDetailModal from './ExpenseDetailModal';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  Download,
  ArrowLeft,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Receipt,
  FileText,
  Search,
  Filter,
  X,
  CreditCard,
} from 'lucide-react';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Expense Ledger Filters for this Project
  const [expFilters, setExpFilters] = useState({
    search: '',
    categoryId: '',
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
    sortBy: 'date_desc',
  });

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjectInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/project-pl/${id}`);
      setProjectData(res.data.data);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectExpenses = async () => {
    try {
      const params = new URLSearchParams({ projectId: id });
      if (expFilters.search) params.append('search', expFilters.search);
      if (expFilters.categoryId) params.append('categoryId', expFilters.categoryId);
      if (expFilters.status) params.append('status', expFilters.status);
      if (expFilters.paymentMethod) params.append('paymentMethod', expFilters.paymentMethod);
      if (expFilters.startDate) params.append('startDate', expFilters.startDate);
      if (expFilters.endDate) params.append('endDate', expFilters.endDate);
      if (expFilters.sortBy) params.append('sortBy', expFilters.sortBy);

      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCategories();
    loadProjectInfo();
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjectExpenses();
    }, 200);
    return () => clearTimeout(timer);
  }, [id, expFilters]);

  const resetFilters = () => {
    setExpFilters({
      search: '',
      categoryId: '',
      status: '',
      paymentMethod: '',
      startDate: '',
      endDate: '',
      sortBy: 'date_desc',
    });
  };

  const isFiltered = Boolean(
    expFilters.search ||
      expFilters.categoryId ||
      expFilters.status ||
      expFilters.paymentMethod ||
      expFilters.startDate ||
      expFilters.endDate ||
      expFilters.sortBy !== 'date_desc'
  );

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const response = await api.get(`/reports/project-pl/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Project_PL_${projectData?.project?.code}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Project P&L Statement downloaded successfully');
    } catch (err) {
      showNotification('Failed to download P&L report', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
        <p className="text-sm">Generating Project P&L Statement...</p>
      </div>
    );
  }

  const project = projectData?.project;
  const breakdown = projectData?.breakdown || [];
  const budget = Number(project?.total_budget || 0);
  const spent = Number(project?.total_spent || 0);
  const variance = budget - spent;
  const isOver = variance < 0;

  const totalFilteredExpenseAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
        >
          {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-brand-400" />}
          <span>Download P&L Statement (PDF)</span>
        </button>
      </div>

      {/* Project Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                {project?.code}
              </span>
              <StatusBadge status={project?.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {project?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {project?.location}
              </span>
              {project?.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {project?.start_date} to {project?.end_date || 'Ongoing'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Budget Variance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Allocated Budget</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹ {budget.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Actual Expenditure</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹ {spent.toLocaleString('en-IN')}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border ${isOver ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            <span className="text-xs font-semibold uppercase">
              {isOver ? 'Budget Overrun' : 'Remaining Budget'}
            </span>
            <p className="text-xl sm:text-2xl font-black mt-1 font-mono">
              {isOver ? '- ' : ''}₹ {Math.abs(variance).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Cost Breakdown by Category
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Detailed itemized spend across concrete, steel, labor, plant & logistics
        </p>

        {breakdown.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic">
            No approved expenses incurred for this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-center">Vouchers</th>
                  <th className="pb-3 text-right">Actual Spent (INR)</th>
                  <th className="pb-3 text-right">% of Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.map((item) => {
                  const pct = budget > 0 ? ((item.total_spent / budget) * 100).toFixed(1) : '0';
                  return (
                    <tr key={item.category_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-medium text-slate-800">{item.category_name}</td>
                      <td className="py-3 text-center text-slate-500 font-mono text-xs">{item.expense_count}</td>
                      <td className="py-3 text-right font-bold text-slate-900 font-mono">
                        ₹ {Number(item.total_spent).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right text-slate-600 font-mono text-xs">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Expenditure Approval Allocations */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-500" />
              <span>Role Expenditure Approval Allocations</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured authorization limits and spending caps for this construction site
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Project Manager
            </span>
            <span className="text-base font-black text-slate-900 mt-1 block">
              {project?.role_limits?.find((r) => r.role === 'project_manager')?.max_amount_per_expense !== null &&
              project?.role_limits?.find((r) => r.role === 'project_manager')?.max_amount_per_expense !== undefined
                ? `Max ₹ ${Number(project.role_limits.find((r) => r.role === 'project_manager').max_amount_per_expense).toLocaleString('en-IN')}`
                : '₹ 50,000 (Default)'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Single voucher approval limit
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Accountant / Finance
            </span>
            <span className="text-base font-black text-slate-900 mt-1 block">
              {project?.role_limits?.find((r) => r.role === 'accountant')?.max_amount_per_expense !== null &&
              project?.role_limits?.find((r) => r.role === 'accountant')?.max_amount_per_expense !== undefined
                ? `Max ₹ ${Number(project.role_limits.find((r) => r.role === 'accountant').max_amount_per_expense).toLocaleString('en-IN')}`
                : '₹ 2,00,000 (Default)'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Disbursement settlement limit
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Super Admin
            </span>
            <span className="text-base font-black text-emerald-950 mt-1 block">Unlimited</span>
            <span className="text-[11px] text-emerald-800 mt-0.5 block">
              Authorizes all budget levels
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Site Engineer
            </span>
            <span className="text-base font-black text-slate-700 mt-1 block">Submission Only</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Zero approval authority
            </span>
          </div>
        </div>
      </div>

      {/* Project Expenses Ledger with Full Filters */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Expense Ledger</h3>
            <p className="text-xs text-slate-500">Filter vouchers specifically for {project?.name}</p>
          </div>
          <span className="text-xs font-semibold font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {expenses.length} Records • ₹ {totalFilteredExpenseAmount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Ledger Filter Toolbar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={expFilters.search}
                onChange={(e) => setExpFilters({ ...expFilters, search: e.target.value })}
                placeholder="Search voucher, vendor..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={expFilters.categoryId}
                onChange={(e) => setExpFilters({ ...expFilters, categoryId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={expFilters.status}
                onChange={(e) => setExpFilters({ ...expFilters, status: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="processed">Processed & Paid</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Sort by */}
            <div>
              <select
                value={expFilters.sortBy}
                onChange={(e) => setExpFilters({ ...expFilters, sortBy: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="amount_desc">Amount: High to Low</option>
                <option value="amount_asc">Amount: Low to High</option>
              </select>
            </div>
          </div>

          {/* Date range & Reset row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>Date:</span>
              <input
                type="date"
                value={expFilters.startDate}
                onChange={(e) => setExpFilters({ ...expFilters, startDate: e.target.value })}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={expFilters.endDate}
                onChange={(e) => setExpFilters({ ...expFilters, endDate: e.target.value })}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {isFiltered && (
              <button
                onClick={resetFilters}
                className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center italic">
            No expenses match the filter criteria.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {exp.reference_no}
                    </span>
                    <StatusBadge status={exp.status} size="xs" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {exp.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {exp.category_name} • {exp.expense_date} • By {exp.submitter_name}
                    {exp.approver_name && (
                      <span className="text-emerald-700 font-semibold ml-1">
                        • Approved by {exp.approver_name} ({exp.approver_role?.replace('_', ' ')})
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                    ₹ {Number(exp.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onActionSuccess={() => {
            loadProjectInfo();
            loadProjectExpenses();
          }}
        />
      )}
    </div>
  );
}

export default ProjectDetail;
