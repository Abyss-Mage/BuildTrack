import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import ExpenseDetailModal from './ExpenseDetailModal';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import {
  CheckSquare,
  Check,
  X,
  FileCheck,
  Search,
  Filter,
  DollarSign,
  Paperclip,
  Clock,
  ArrowUpDown,
  Building2,
  Calendar,
  Layers,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Shield,
  AlertCircle,
} from 'lucide-react';

export function Approvals() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);

  // Multi-criteria filter state
  const [filters, setFilters] = useState({
    projectId: '',
    categoryId: '',
    minAmount: '',
    maxAmount: '',
    hasReceipts: '',
    status: '',
    search: '',
    sortBy: 'newest',
  });

  // Modal / Detail State
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isAccountant = user?.role === 'accountant';
  const isPM = user?.role === 'project_manager';
  const isAdmin = user?.role === 'admin';

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;
      if (filters.hasReceipts) params.hasReceipts = filters.hasReceipts;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.sortBy) params.sortBy = filters.sortBy;

      const res = await api.get('/approvals/pending', { params });
      setQueue(res.data.data || []);
    } catch (err) {
      showNotification('Failed to load approvals queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadQueue();
    }, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      projectId: '',
      categoryId: '',
      minAmount: '',
      maxAmount: '',
      hasReceipts: '',
      status: '',
      search: '',
      sortBy: 'newest',
    });
  };

  const hasActiveFilters = Boolean(
    filters.projectId ||
      filters.categoryId ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.hasReceipts ||
      filters.status ||
      filters.search ||
      filters.sortBy !== 'newest'
  );

  const handleApprove = async (expenseId, e) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await api.post(`/approvals/${expenseId}/approve`, {});
      showNotification('Expense successfully approved!');
      loadQueue();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (expense, e) => {
    e.stopPropagation();
    setRejectingItem(expense);
    setRejectionReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showNotification('Please enter a rejection reason', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/approvals/${rejectingItem.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      showNotification('Expense rejected and returned to submitter');
      setRejectingItem(null);
      loadQueue();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalQueueAmount = queue.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brand-500" />
            <span>Expense Approval & Settlement Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAccountant
              ? 'Review approved vouchers for payment processing and banking reconciliation.'
              : 'Review submitted site vouchers from engineers against deliveries, receipts, and role expenditure caps.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'accountant' && (
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              Your Approval Authority:{' '}
              <strong className="text-slate-900">
                {isAdmin
                  ? 'Unlimited'
                  : user?.approval_limit !== null && user?.approval_limit !== undefined
                  ? Number(user.approval_limit) === 0
                    ? '₹0 (Submission Only)'
                    : `₹ ${Number(user.approval_limit).toLocaleString('en-IN')}`
                  : 'Unlimited'}
              </strong>
            </span>
          )}
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold font-mono">
            {queue.length} Pending Actions • ₹ {totalQueueAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search ref #, title, vendor, engineer..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Project Site Filter */}
          <div>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Project Sites</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="newest">Submission Date: Newest First</option>
              <option value="oldest">Submission Date: Oldest First</option>
              <option value="amount_desc">Amount: Highest First</option>
              <option value="amount_asc">Amount: Lowest First</option>
            </select>
          </div>
        </div>

        {/* Aggregate Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Queue: <strong>{queue.length}</strong> vouchers
            </span>
            <span>•</span>
            <span>
              Total: <strong>₹ {totalQueueAmount.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Queue List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-sm">Refreshing review queue...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Review Queue Clear</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {hasActiveFilters
              ? 'No vouchers match your filter criteria.'
              : 'All submitted site expenditures have been reviewed and acted upon.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => {
            const isApprovedForPayout = item.status === 'approved';

            // Check if expense exceeds user account's approval limit
            const hasExceededAccountLimit =
              !isAdmin &&
              user?.approval_limit !== null &&
              user?.approval_limit !== undefined &&
              Number(item.amount) > Number(user.approval_limit);

            const isUnauthorizedAccount =
              !isAdmin &&
              user?.approval_limit !== null &&
              user?.approval_limit !== undefined &&
              Number(user.approval_limit) === 0;

            const cannotApproveDueToLimit = hasExceededAccountLimit || isUnauthorizedAccount;

            // Per-project role limit (set on the project) that the voucher exceeds
            const hasExceededRoleLimit =
              item.role_max_limit !== null &&
              item.role_max_limit !== undefined &&
              Number(item.amount) > Number(item.role_max_limit);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedExpense(item)}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 overflow-hidden flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg">
                      {item.reference_no}
                    </span>
                    <StatusBadge status={item.status} size="xs" />

                    {/* Show Approver info if already approved */}
                    {item.approver_name && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Approved by: {item.approver_name} ({item.approver_role?.replace('_', ' ') || 'PM'})
                      </span>
                    )}

                    {/* Expenditure Allocation Limit Badge */}
                    {item.status === 'pending' && hasExceededRoleLimit && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Exceeds PM limit (₹{Number(item.role_max_limit).toLocaleString('en-IN')}) - Requires Admin Approval
                      </span>
                    )}

                    {item.status === 'pending' && !hasExceededRoleLimit && item.role_max_limit && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Within Role Limit (Max ₹{Number(item.role_max_limit).toLocaleString('en-IN')})
                      </span>
                    )}

                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{item.expense_date}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-600 font-medium">
                      Submitted by {item.submitter_name}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      [{item.project_code}] {item.project_name} • {item.category_name}
                      {item.vendor_name && ` • Vendor: ${item.vendor_name}`}
                    </p>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{item.description}"
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-brand-600" />
                      <strong>{item.receipt_count}</strong> receipts attached
                    </span>
                    <span>•</span>
                    <span className="capitalize">Payment: {item.payment_method?.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Amount and Action Buttons */}
                <div
                  className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
                      Voucher Total
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950 font-mono">
                      ₹ {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* If item is pending: PM/Admin can Approve or Reject */}
                    {item.status === 'pending' && (isPM || isAdmin) && (
                      <>
                        <button
                          onClick={(e) => handleOpenReject(item, e)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          onClick={(e) => handleApprove(item.id, e)}
                          disabled={actionLoading || (!isAdmin && cannotApproveDueToLimit)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            cannotApproveDueToLimit && !isAdmin
                              ? `Voucher amount exceeds your account approval authority (₹${Number(user?.approval_limit || 0).toLocaleString('en-IN')}). Super Admin approval required.`
                              : 'Approve this expenditure'
                          }
                        >
                          <Check className="w-4 h-4" />
                          <span>{cannotApproveDueToLimit && !isAdmin ? 'Higher Approval Req.' : 'Approve'}</span>
                        </button>
                      </>
                    )}

                    {/* Approved vouchers are paid from Accounts, where the date and bank reference are recorded */}
                    {isApprovedForPayout && (isAccountant || isAdmin) && (
                      <Link
                        to="/accounts"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Disburse in Accounts</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingItem && (
        <Modal
          isOpen={Boolean(rejectingItem)}
          onClose={() => setRejectingItem(null)}
          title={`Reject Expense: ${rejectingItem.reference_no}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Receipt is blurred, bill amount does not match challan..."
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={Boolean(selectedExpense)}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onActionSuccess={loadQueue}
        />
      )}
    </div>
  );
}

export default Approvals;
