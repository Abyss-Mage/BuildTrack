import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ExpenseDetailModal from './ExpenseDetailModal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Tag,
  Paperclip,
  Check,
  X,
  CreditCard,
  Loader2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export function Approvals() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection Dialog Modal
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Selected Detail Modal
  const [selectedExpense, setSelectedExpense] = useState(null);

  const isAccountant = user?.role === 'accountant';
  const isPM = user?.role === 'project_manager';
  const isAdmin = user?.role === 'admin';

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      setQueue(res.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load approval queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (expenseId, e) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await api.post(`/approvals/${expenseId}/approve`, { comments: 'Approved on site verification' });
      showNotification('Expense successfully approved');
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

  const handleProcess = async (expenseId, e) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await api.post(`/approvals/${expenseId}/process`, {
        comments: 'Payment disbursed and reconciled in books',
      });
      showNotification('Voucher marked as Processed & Paid');
      loadQueue();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Processing failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Expense Approval & Settlement Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAccountant
              ? 'Review approved vouchers for payment processing and banking reconciliation.'
              : 'Review submitted site vouchers from engineers against deliveries and receipts.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold font-mono">
            {queue.length} Pending Actions
          </span>
        </div>
      </div>

      {/* Queue Listing */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-sm">Loading vouchers for review...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Queue is Clear!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are currently no vouchers pending your approval or settlement.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => {
            const isApprovedForPayout = item.status === 'approved';

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
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      </>
                    )}

                    {/* If item is approved: Accountant/Admin can Process payment */}
                    {isApprovedForPayout && (isAccountant || isAdmin) && (
                      <button
                        onClick={(e) => handleProcess(item.id, e)}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Disburse & Reconcile</span>
                      </button>
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
          isOpen={!!rejectingItem}
          onClose={() => setRejectingItem(null)}
          title="Reject Site Expense"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Rejecting {rejectingItem.reference_no}</p>
                <p className="mt-0.5 text-slate-600">
                  The submitter will receive your comments and can adjust the voucher and resubmit.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Rate for 53 grade cement exceeds agreed vendor contract rate, or missing delivery challan stamp."
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onActionSuccess={loadQueue}
        />
      )}
    </div>
  );
}

export default Approvals;
