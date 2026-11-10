import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Modal from '../components/ui/Modal';
import {
  Landmark,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Download,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Loader2,
  X,
  RotateCcw,
} from 'lucide-react';
import { toLocalDate } from '../utils/dateUtils';

export function Accounts() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'settlements'
  const [loading, setLoading] = useState(true);

  // Data
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [projects, setProjects] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    projectId: '',
    paymentMethod: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
  });

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isBulkPayout, setIsBulkPayout] = useState(false);
  const [targetExpense, setTargetExpense] = useState(null);
  const [payoutForm, setPayoutForm] = useState({
    payment_method: 'bank_transfer',
    payment_reference: '',
    comments: '',
    payment_date: toLocalDate(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.minAmount) params.minAmount = filters.minAmount;
      if (filters.maxAmount) params.maxAmount = filters.maxAmount;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [sumRes, queueRes, settRes] = await Promise.all([
        api.get('/accounts/summary'),
        api.get('/accounts/queue', { params }),
        api.get('/accounts/settlements', { params }),
      ]);

      setSummary(sumRes.data.data);
      setQueue(queueRes.data.data || []);
      // A tick must never outlive its row: filtered-out or already-paid vouchers would be paid unseen
      setSelectedIds((prev) => prev.filter((id) => queueRes.data.data.some((item) => item.id === id)));
      setSettlements(settRes.data.data || []);
    } catch (err) {
      showNotification('Failed to load accounts data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      projectId: '',
      paymentMethod: '',
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: '',
    });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.projectId ||
      filters.paymentMethod ||
      filters.minAmount ||
      filters.maxAmount ||
      filters.startDate ||
      filters.endDate
  );

  // Selection handlers
  const toggleSelectAllQueue = () => {
    if (selectedIds.length === queue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(queue.map((item) => item.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Open single payout
  const openSinglePayout = (expense) => {
    setTargetExpense(expense);
    setIsBulkPayout(false);
    setPayoutForm({
      payment_method: expense.payment_method || 'bank_transfer',
      payment_reference: '',
      comments: '',
      payment_date: toLocalDate(),
    });
    setIsPayoutModalOpen(true);
  };

  // Open bulk payout
  const openBulkPayout = () => {
    if (selectedIds.length === 0) return;
    setTargetExpense(null);
    setIsBulkPayout(true);
    setPayoutForm({
      payment_method: 'bank_transfer',
      payment_reference: '',
      comments: '',
      payment_date: toLocalDate(),
    });
    setIsPayoutModalOpen(true);
  };

  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (isBulkPayout) {
        const res = await api.post('/accounts/bulk-process', {
          expense_ids: selectedIds,
          ...payoutForm,
        });
        showNotification(`Disbursed ${res.data.data.count} of ${selectedIds.length} vouchers`);
        setSelectedIds([]);
      } else {
        await api.post(`/accounts/process-payout/${targetExpense.id}`, payoutForm);
        showNotification(`Voucher ${targetExpense.reference_no} marked as Paid and Disbursed!`);
      }
      setIsPayoutModalOpen(false);
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Payment processing failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Settlement Sheet to Excel
  const exportSettlementsExcel = async () => {
    try {
      showNotification('Generating Settlement Excel report...', 'info');
      const response = await api.get('/reports/expenses/excel', {
        params: { ledger: 'settlements', status: 'processed', ...filters },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Accounts-Settlement-Ledger-${toLocalDate()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Settlement report downloaded successfully');
    } catch (err) {
      showNotification('Failed to export settlements', 'error');
    }
  };

  const queueTotal = queue.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const settlementsTotal = settlements.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-brand-500" />
            <span>Accounts & Payout Disbursements</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance reconciliation, payment execution (Bank Transfer, UPI, Cheque), and settlement audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'settlements' && (
            <button
              onClick={exportSettlementsExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Settlement Ledger</span>
            </button>
          )}

          {activeTab === 'queue' && selectedIds.length > 0 && (
            <button
              onClick={openBulkPayout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all animate-bounce"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Disburse Batch ({selectedIds.length} Vouchers)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pending Payout Queue
            </span>
            <span className="text-lg font-black text-slate-900">
              ₹ {Number(summary?.pendingDisbursement?.total || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">
              {summary?.pendingDisbursement?.count || 0} approved vouchers
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Disbursed (Paid)
            </span>
            <span className="text-lg font-black text-slate-900">
              ₹ {Number(summary?.totalDisbursed?.total || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
              {summary?.totalDisbursed?.count || 0} reconciled vouchers
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Active Project Sites
            </span>
            <span className="text-lg font-black text-slate-900">{projects.length} Sites</span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Unrestricted Site Access
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Top Payment Mode
            </span>
            <span className="text-base font-bold text-slate-900 capitalize">
              {summary?.methodBreakdown?.[0]?.payment_method?.replace('_', ' ') || 'Bank Transfer'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Standard NEFT / IMPS
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-brand-500 text-slate-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Payout Queue ({queue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settlements'
              ? 'border-brand-500 text-slate-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Settlement Ledger ({settlements.length})</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search ref no, title, vendor, UTR..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Project Sites</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Payment Modes</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI / QR Code</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Petty Cash</option>
            </select>
          </div>

          {/* Amount Min/Max */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              placeholder="Min ₹"
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              placeholder="Max ₹"
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Aggregate Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              {activeTab === 'queue' ? (
                <>
                  Queue Total: <strong>₹ {queueTotal.toLocaleString('en-IN')}</strong> ({queue.length} vouchers)
                </>
              ) : (
                <>
                  Settled Total: <strong>₹ {settlementsTotal.toLocaleString('en-IN')}</strong> ({settlements.length} vouchers)
                </>
              )}
            </span>
          </div>

          {hasActiveFilters && (
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

      {/* Main Content: Tables */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Loading ledger...</p>
          </div>
        ) : activeTab === 'queue' ? (
          /* TAB 1: PENDING PAYOUT QUEUE */
          queue.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Payout Queue Clear!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                There are no approved vouchers waiting for payment disbursement.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <button onClick={toggleSelectAllQueue} className="text-slate-500 hover:text-slate-900">
                        {selectedIds.length === queue.length ? (
                          <CheckSquare className="w-4 h-4 text-brand-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">Ref No & Date</th>
                    <th className="py-3 px-4">Project & Category</th>
                    <th className="py-3 px-4">Title & Vendor</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Amount (INR)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isSelected ? 'bg-brand-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <button onClick={() => toggleSelectOne(item.id)}>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-brand-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">{item.reference_no}</span>
                          <span className="text-[11px] text-slate-400">{item.expense_date}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{item.project_name}</span>
                          <span className="text-xs text-slate-500">{item.category_name}</span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 line-clamp-1">{item.title}</p>
                          <p className="text-xs text-slate-400">Vendor: {item.vendor_name || 'Direct / Site'}</p>
                        </td>

                        {/* Approved By info */}
                        <td className="py-3 px-4">
                          {item.approver_name ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-emerald-800 text-xs">{item.approver_name}</span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {item.approver_role?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Approved</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                            {item.payment_method?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          ₹ {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openSinglePayout(item)}
                            className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-sm transition-all"
                          >
                            Disburse
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB 2: SETTLEMENT LEDGER (PROCESSED) */
          settlements.length === 0 ? (
            <div className="p-16 text-center">
              <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No Settled Payments Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Processed vouchers will appear here once payment has been disbursed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ref No & Settled Date</th>
                    <th className="py-3 px-4">Project & Category</th>
                    <th className="py-3 px-4">Title & Vendor</th>
                    <th className="py-3 px-4">Approved By</th>
                    <th className="py-3 px-4">Disbursed By (Accountant)</th>
                    <th className="py-3 px-4">Txn / UTR Ref</th>
                    <th className="py-3 px-4 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlements.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{item.reference_no}</span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          Paid: {item.processed_at ? item.processed_at.slice(0, 10) : item.expense_date}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{item.project_name}</span>
                        <span className="text-xs text-slate-500">{item.category_name}</span>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900 line-clamp-1">{item.title}</p>
                        <p className="text-xs text-slate-400">Vendor: {item.vendor_name || '-'}</p>
                      </td>

                      {/* Approved By */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block text-xs">
                          {item.approver_name || 'Manager'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {item.approver_role?.replace(/_/g, ' ') || 'Approver'}
                        </span>
                      </td>

                      {/* Disbursed By */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-emerald-800 block text-xs">
                          {item.processor_name || 'Accountant'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">Finance Disbursed</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-mono bg-slate-100 text-slate-800 border border-slate-200 block max-w-fit">
                          {item.payment_reference || 'REF-CASH/DIRECT'}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase mt-0.5 block">
                          {item.payment_method?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        ₹ {Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Process Payout Modal */}
      {isPayoutModalOpen && (
        <Modal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          title={
            isBulkPayout
              ? `Disburse Batch of ${selectedIds.length} Vouchers`
              : `Disburse Payout: ${targetExpense?.reference_no}`
          }
          maxWidth="max-w-md"
        >
          <form onSubmit={handlePayoutSubmit} className="space-y-4">
            {!isBulkPayout && targetExpense && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Project:</span>
                  <span className="font-bold text-slate-800">{targetExpense.project_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vendor:</span>
                  <span className="font-bold text-slate-800">{targetExpense.vendor_name || 'Site Direct'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Approved By:</span>
                  <span className="font-bold text-emerald-800">{targetExpense.approver_name || 'Approver'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Amount Due:</span>
                  <span className="font-black text-slate-950 text-sm">
                    ₹ {Number(targetExpense.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method / Channel *
              </label>
              <select
                value={payoutForm.payment_method}
                onChange={(e) => setPayoutForm({ ...payoutForm, payment_method: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="upi">UPI Payout</option>
                <option value="cheque">Cheque Payment</option>
                <option value="cash">Petty Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                UTR / Transaction Ref / Cheque No (Optional)
              </label>
              <input
                type="text"
                value={payoutForm.payment_reference}
                onChange={(e) => setPayoutForm({ ...payoutForm, payment_reference: e.target.value })}
                placeholder="e.g. UTR492810932 or CHQ-00492 (optional)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Disbursement Date *
              </label>
              <input
                type="date"
                value={payoutForm.payment_date}
                onChange={(e) => setPayoutForm({ ...payoutForm, payment_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Accounts Settlement Notes
              </label>
              <textarea
                rows="2"
                value={payoutForm.comments}
                onChange={(e) => setPayoutForm({ ...payoutForm, comments: e.target.value })}
                placeholder="Debited from HDFC Current Account..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Payment & Disburse</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Accounts;
