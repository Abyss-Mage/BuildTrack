import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Modal from '../components/ui/Modal';
import {
  Banknote,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  Calendar,
  Loader2,
  RotateCcw,
  Check,
  Edit2,
  Trash2,
  CreditCard,
  User,
  ArrowUpRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { toLocalDate } from '../utils/dateUtils';

export function Payroll() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const isFinanceOrAdmin = ['admin', 'accountant'].includes(user?.role);

  // Default dates: current week (Monday to Sunday)
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - (day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  const defaultStart = toLocalDate(mon);
  const defaultEnd = toLocalDate(sun);

  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  });

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    start_date: defaultStart,
    end_date: defaultEnd,
    payroll_period: '',
    base_salary: '',
    allowances: '0',
    deductions: '0',
    status: 'pending',
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payslip View Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // Disburse Modal State
  const [payModalItem, setPayModalItem] = useState(null);
  const [payForm, setPayForm] = useState({
    payment_reference: '',
    payment_method: 'bank_transfer',
    payment_date: toLocalDate(),
  });

  const loadEmployees = async () => {
    if (!isFinanceOrAdmin) return;
    try {
      const res = await api.get('/users?is_active=1');
      setEmployees(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [listRes, sumRes] = await Promise.all([
        api.get('/payroll', { params }),
        isFinanceOrAdmin
          ? api.get('/payroll/summary', { params })
          : Promise.resolve({ data: { data: null } }),
      ]);

      setPayrolls(listRes.data.data || []);
      setSummary(sumRes.data.data);
    } catch (err) {
      showNotification('Failed to load payroll data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      paymentMethod: '',
      startDate: '',
      endDate: '',
    });
  };

  const applyThisWeek = () => {
    setFilters((prev) => ({
      ...prev,
      startDate: defaultStart,
      endDate: defaultEnd,
    }));
  };

  const applyThisMonth = () => {
    const firstDay = toLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const lastDay = toLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    setFilters((prev) => ({
      ...prev,
      startDate: firstDay,
      endDate: lastDay,
    }));
  };

  const openCreate = () => {
    setEditingPayroll(null);
    setFormData({
      user_id: employees[0]?.id || '',
      start_date: defaultStart,
      end_date: defaultEnd,
      payroll_period: '',
      base_salary: '',
      allowances: '0',
      deductions: '0',
      status: 'pending',
      payment_method: 'bank_transfer',
      payment_reference: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingPayroll(item);
    setFormData({
      user_id: item.user_id,
      start_date: item.start_date || item.expense_date || defaultStart,
      end_date: item.end_date || item.start_date || defaultEnd,
      payroll_period: item.payroll_period || item.payroll_month || '',
      base_salary: item.base_salary,
      allowances: item.allowances,
      deductions: item.deductions,
      status: item.status,
      payment_method: item.payment_method,
      payment_reference: item.payment_reference || '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const calculateNet = () => {
    const base = Number(formData.base_salary || 0);
    const allow = Number(formData.allowances || 0);
    const deduct = Number(formData.deductions || 0);
    return Math.max(0, base + allow - deduct);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date) {
      showNotification('Please select both Wages From Date and To Date', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        payroll_period: formData.payroll_period?.trim() || `${formData.start_date} to ${formData.end_date}`,
      };

      if (editingPayroll) {
        await api.put(`/payroll/${editingPayroll.id}`, payload);
        showNotification('Wage record updated successfully');
      } else {
        await api.post('/payroll', payload);
        showNotification('Wage slip created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save payroll record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (e) => {
    e.preventDefault();
    if (!payModalItem) return;
    try {
      setIsSubmitting(true);
      await api.post(`/payroll/${payModalItem.id}/pay`, payForm);
      showNotification(`Wages for ${payModalItem.employee_name} marked as Paid!`);
      setPayModalItem(null);
      loadData();
    } catch (err) {
      showNotification('Failed to mark payroll as paid', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = async (item) => {
    try {
      const res = await api.get(`/payroll/${item.id}/whatsapp`);
      const payload = res.data.data;
      if (!payload.hasPhone) {
        showNotification(`No valid phone number for ${item.employee_name}. Please edit their profile in Team Users.`, 'error');
        return;
      }
      window.open(payload.whatsappUrl, '_blank');
      showNotification(`Opening WhatsApp for ${item.employee_name}...`);
    } catch (err) {
      showNotification('Failed to generate WhatsApp notification', 'error');
    }
  };

  const isFiltered = Boolean(filters.search || filters.status || filters.paymentMethod || filters.startDate || filters.endDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-brand-500" />
            <span>Workforce Payroll & Wage Processing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage site labor wages, attendance periods, site overtime allowances, and instant WhatsApp payslips.
          </p>
        </div>

        {isFinanceOrAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Wage Slip</span>
          </button>
        )}
      </div>

      {/* KPI Cards (Accountant & Admin only) */}
      {isFinanceOrAdmin && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Wage Liability
            </span>
            <span className="text-xl font-black text-slate-900 block mt-1">
              ₹ {Number(summary.total_net_liability || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              {summary.total_employees || 0} Staff Members in Scope
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Disbursed / Paid
            </span>
            <span className="text-xl font-black text-emerald-600 block mt-1">
              ₹ {Number(summary.total_paid || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-emerald-700 font-semibold mt-1 block">
              {summary.paid_count || 0} Wages Settled
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pending Payout
            </span>
            <span className="text-xl font-black text-amber-600 block mt-1">
              ₹ {Number(summary.total_pending || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-amber-700 font-semibold mt-1 block">
              {summary.pending_count || 0} Slips Awaiting Payout
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                WhatsApp Delivery
              </span>
              <span className="text-base font-bold text-slate-900 block mt-1">1-Click Dispatch</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Delivers wage breakdown directly</span>
            </div>
          </div>
        </div>
      )}

      {/* Date Range & Full Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">From:</span>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="text-xs bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-600 ml-1">To:</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="text-xs bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={applyThisWeek}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:text-slate-950 font-medium hover:bg-white transition-all"
              >
                This Week
              </button>
              <button
                onClick={applyThisMonth}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:text-slate-950 font-medium hover:bg-white transition-all"
              >
                This Month
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, startDate: '', endDate: '' }))}
                className="px-2.5 py-1 rounded-lg text-slate-700 hover:text-slate-950 font-medium hover:bg-white transition-all"
              >
                All Dates
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search employee name, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Secondary Filters Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Payment Statuses</option>
              <option value="pending">Pending Payout</option>
              <option value="paid">Paid & Settled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Payment Modes</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="upi">UPI</option>
              <option value="cash">Petty Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        {/* Active scope count & Reset */}
        <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
          <span>
            Showing <strong>{payrolls.length}</strong> wage records
            {filters.startDate && filters.endDate ? ` for ${filters.startDate} to ${filters.endDate}` : ''}
          </span>
          {isFiltered && (
            <button onClick={resetFilters} className="text-brand-600 font-semibold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Loading wage records...</p>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="p-16 text-center">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Wage Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {isFinanceOrAdmin
                ? 'Click "Add Wage Slip" above to record wages for any custom date range.'
                : 'No wage slips found matching this period.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Wages Period (From → To)</th>
                  <th className="py-3 px-4">Base Wage</th>
                  <th className="py-3 px-4">Site OT / Allowances</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrolls.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.employee_name}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {item.employee_phone || 'No phone'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 block text-xs">
                        {item.start_date && item.end_date
                          ? `${item.start_date} → ${item.end_date}`
                          : item.payroll_period || item.payroll_month}
                      </span>
                      {item.payroll_period && item.payroll_period !== `${item.start_date} to ${item.end_date}` && (
                        <span className="text-[10px] text-slate-400 block">
                          {item.payroll_period}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      ₹ {Number(item.base_salary).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-emerald-600 font-medium">
                      + ₹ {Number(item.allowances || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-rose-600 font-medium">
                      - ₹ {Number(item.deductions || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 font-black text-slate-950 text-sm">
                      ₹ {Number(item.net_salary).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.status === 'paid' ? 'Paid & Settled' : 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click WhatsApp Button */}
                        {isFinanceOrAdmin && (
                          <button
                            onClick={() => openWhatsApp(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Send WhatsApp Wage Slip"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                          </button>
                        )}

                        {/* View Payslip */}
                        <button
                          onClick={() => {
                            setSelectedPayslip(item);
                            setIsPayslipOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="View Printable Wage Slip"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Mark as Paid (if pending) */}
                        {isFinanceOrAdmin && item.status !== 'paid' && (
                          <button
                            onClick={() => {
                              setPayModalItem(item);
                              setPayForm({
                                payment_reference: '',
                                payment_method: item.payment_method || 'bank_transfer',
                                payment_date: toLocalDate(),
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-slate-950 rounded-lg shadow-sm"
                          >
                            Disburse
                          </button>
                        )}

                        {/* Edit (finance only; paid records are Admin only) */}
                        {isFinanceOrAdmin && (item.status !== 'paid' || user?.role === 'admin') && (
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Wages Modal - Direct From & To Date */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingPayroll ? 'Edit Wage Slip' : 'Create Wage Slip'}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Employee *
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                required
                disabled={Boolean(editingPayroll)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none disabled:bg-slate-100"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Start and End Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Wages From Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Wages To Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Period Remark / Label (Optional)
              </label>
              <input
                type="text"
                value={formData.payroll_period}
                maxLength={editingPayroll ? 50 : 23}
                onChange={(e) => setFormData({ ...formData, payroll_period: e.target.value })}
                placeholder="e.g. Site A Week 1 or Nov 1st Week (optional)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Wage *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Site OT / Allowances
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.allowances}
                  onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Deductions / Adv.
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Live Net Calculation Strip */}
            <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Net Payable Wages:</span>
              <span className="text-base font-black text-brand-400">
                ₹ {calculateNet().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Mode
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI Payout</option>
                  <option value="cash">Petty Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  <option value="pending">Pending Payout</option>
                  <option value="paid">Paid & Settled</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Txn Ref / UTR / Remarks (Optional)
              </label>
              <input
                type="text"
                value={formData.payment_reference}
                onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                placeholder="e.g. UTR-982103841 (optional)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{editingPayroll ? 'Update Wage Slip' : 'Save Wage Record'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Disburse / Pay Modal */}
      {payModalItem && (
        <Modal
          isOpen={Boolean(payModalItem)}
          onClose={() => setPayModalItem(null)}
          title={`Disburse Wages: ${payModalItem.employee_name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleMarkAsPaid} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee:</span>
                <span className="font-bold text-slate-900">{payModalItem.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Wages Period:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {payModalItem.start_date && payModalItem.end_date
                    ? `${payModalItem.start_date} to ${payModalItem.end_date}`
                    : payModalItem.payroll_period || payModalItem.payroll_month}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Net Payable:</span>
                <span className="font-black text-slate-950 text-sm">
                  ₹ {Number(payModalItem.net_salary).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Disbursement Channel *
              </label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI Payout</option>
                <option value="cash">Petty Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                UTR / Cheque No / Txn Ref (Optional)
              </label>
              <input
                type="text"
                value={payForm.payment_reference}
                onChange={(e) => setPayForm({ ...payForm, payment_reference: e.target.value })}
                placeholder="e.g. UTR-2026110293 (optional)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={payForm.payment_date}
                onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayModalItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Disbursement</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Payslip Modal */}
      {isPayslipOpen && selectedPayslip && (
        <Modal
          isOpen={isPayslipOpen}
          onClose={() => setIsPayslipOpen(false)}
          title={`Wage Slip: ${selectedPayslip.employee_name}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 print:p-0">
            {/* Payslip Card */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">BUILDTRACK CONSTRUCTION ERP</h2>
                  <p className="text-[11px] text-slate-500">Official Site Wage Statement</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block font-mono">
                    {selectedPayslip.start_date && selectedPayslip.end_date
                      ? `${selectedPayslip.start_date} → ${selectedPayslip.end_date}`
                      : selectedPayslip.payroll_period || selectedPayslip.payroll_month}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${
                      selectedPayslip.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedPayslip.status}
                  </span>
                </div>
              </div>

              {/* Employee Bio */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Employee Name</span>
                  <span className="font-bold text-slate-900">{selectedPayslip.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Designation</span>
                  <span className="font-bold text-slate-900 capitalize">{selectedPayslip.employee_role?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Contact Phone</span>
                  <span className="text-slate-800 font-mono">{selectedPayslip.employee_phone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Payment Mode</span>
                  <span className="text-slate-800 uppercase">{selectedPayslip.payment_method?.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="grid grid-cols-2 bg-slate-100 p-2 font-bold text-slate-700 text-[11px]">
                  <span>Component</span>
                  <span className="text-right">Amount (INR)</span>
                </div>
                <div className="divide-y divide-slate-100 p-2 space-y-1">
                  <div className="grid grid-cols-2">
                    <span className="text-slate-600">Base Wage</span>
                    <span className="text-right font-medium">
                      ₹ {Number(selectedPayslip.base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 text-emerald-700">
                    <span>Site OT / Allowances</span>
                    <span className="text-right font-medium">
                      + ₹ {Number(selectedPayslip.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 text-rose-700">
                    <span>Advances & Deductions</span>
                    <span className="text-right font-medium">
                      - ₹ {Number(selectedPayslip.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 bg-slate-900 text-white p-3 font-bold text-sm">
                  <span>Net Payable Wages</span>
                  <span className="text-right text-brand-400 font-black">
                    ₹ {Number(selectedPayslip.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {selectedPayslip.payment_reference ? (
                <div className="text-[11px] text-slate-500">
                  <span>Bank / UTR Reference: </span>
                  <strong className="font-mono text-slate-800">{selectedPayslip.payment_reference}</strong>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Payment Reference: Direct Cash / Advance Settlement
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => openWhatsApp(selectedPayslip)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Wage Slip</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Payroll;
