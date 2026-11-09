import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import ReceiptViewerModal from '../components/ui/ReceiptViewerModal';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import {
  Calendar,
  Building2,
  Tag,
  CreditCard,
  User,
  Clock,
  Send,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export function ExpenseDetailModal({ isOpen, onClose, expense: listRow, onActionSuccess }) {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [details, setDetails] = useState(null);

  // List rows carry only a receipt count; the files and approval history come from the full record
  useEffect(() => {
    if (!isOpen || !listRow?.id) return;
    setDetails(null);
    api
      .get(`/expenses/${listRow.id}`)
      .then((res) => setDetails(res.data.data))
      .catch((err) => showNotification(err.response?.data?.message || 'Failed to load attachments', 'error'));
  }, [isOpen, listRow?.id]);

  const expense = details || listRow;

  if (!expense) return null;

  const canSubmit =
    (expense.status === 'draft' || expense.status === 'rejected') &&
    (expense.submitted_by === user?.id || user?.role === 'admin');

  const handleSubmitDraft = async () => {
    try {
      setIsSubmitting(true);
      await api.patch(`/expenses/${expense.id}/submit`);
      showNotification('Expense successfully submitted for approval');
      onActionSuccess?.();
      onClose();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to submit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Expense Details" maxWidth="max-w-2xl">
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="flex items-start justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase block mb-1">
                {expense.reference_no}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{expense.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={expense.status} />
                <span className="text-xs text-slate-500">
                  By {expense.submitter_name} ({expense.submitter_email})
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 font-medium block">Total Amount</span>
              <span className="text-2xl font-black text-slate-950 font-mono">
                ₹ {Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Rejection Alert if rejected */}
          {expense.status === 'rejected' && expense.rejection_reason && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Rejection Reason</p>
                <p className="text-sm mt-0.5">{expense.rejection_reason}</p>
                <p className="text-xs text-rose-600 mt-2 font-medium">
                  You can edit this expense to address the feedback and resubmit.
                </p>
              </div>
            </div>
          )}

          {/* Detail Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                <Building2 className="w-3.5 h-3.5" /> Project
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {expense.project_name || '-'}
              </p>
              <p className="text-[11px] font-mono text-slate-500">{expense.project_code}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                <Tag className="w-3.5 h-3.5" /> Category
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {expense.category_name || '-'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                <Calendar className="w-3.5 h-3.5" /> Date
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {expense.expense_date}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
                <CreditCard className="w-3.5 h-3.5" /> Payment
              </div>
              <p className="text-sm font-semibold text-slate-800 uppercase text-xs">
                {expense.payment_method?.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Vendor & Description */}
          <div className="space-y-3">
            {expense.vendor_name && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Vendor / Supplier
                </span>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{expense.vendor_name}</p>
              </div>
            )}

            {expense.description && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Notes & Details
                </span>
                <p className="text-sm text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {expense.description}
                </p>
              </div>
            )}
          </div>

          {/* Attached Receipts Gallery */}
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Attached Receipts & Bills ({expense.receipts?.length ?? expense.receipt_count ?? 0})
            </span>

            {!details ? (
              <p className="text-xs text-slate-400 italic">Loading attachments...</p>
            ) : expense.receipts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No receipt attachments uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {expense.receipts.map((r) => {
                  const isPdf = r.mime_type === 'application/pdf' || r.file_path?.endsWith('.pdf');
                  return (
                    <div
                      key={r.id}
                      onClick={() => setActiveReceipt(r)}
                      className="cursor-pointer group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 hover:border-brand-500 transition-all p-1"
                    >
                      {isPdf ? (
                        <div className="h-24 w-full flex flex-col items-center justify-center bg-slate-50 rounded-lg group-hover:bg-brand-50/30">
                          <FileText className="w-8 h-8 text-slate-500 group-hover:text-brand-600 mb-1" />
                          <span className="text-[10px] font-bold text-slate-600">VIEW PDF</span>
                        </div>
                      ) : (
                        <img
                          src={r.file_path}
                          alt={r.original_name}
                          className="h-24 w-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                        />
                      )}
                      <p className="text-[10px] text-slate-600 font-medium truncate mt-1 px-1">
                        {r.original_name}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Approval History Audit Trail */}
          {expense.approvals && expense.approvals.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Approval Timeline & Audit Trail
              </span>
              <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                {expense.approvals.map((a) => (
                  <div key={a.id} className="relative text-xs">
                    <span
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                        a.action === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{a.approver_name}</span>
                      <span className="text-slate-400 capitalize">({a.approver_role})</span>
                      <span
                        className={`font-semibold capitalize ${
                          a.action === 'approved' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {a.action}
                      </span>
                      <span className="text-slate-400 text-[10px] ml-auto">{a.acted_at}</span>
                    </div>
                    {a.comments && (
                      <p className="text-slate-600 mt-1 italic">"{a.comments}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>

            {canSubmit && (
              <button
                type="button"
                onClick={handleSubmitDraft}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Submit for Approval</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Fullscreen Receipt Lightbox */}
      {activeReceipt && (
        <ReceiptViewerModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </>
  );
}

export default ExpenseDetailModal;
