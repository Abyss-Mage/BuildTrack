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
} from 'lucide-react';

export function Payroll() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const isFinanceOrAdmin = ['admin', 'accountant'].includes(user?.role);

  const nowMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(nowMonth);

  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
  });

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    payroll_month: nowMonth,
    base_salary: '',
    allowances: '',
    deductions: '',
    status: 'pending',
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payslip View Modal
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // Pay Modal
  const [payModalItem, setPayModalItem] = useState(null);
  const [payForm, setPayForm] = useState({
    payment_reference: '',
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().slice(0, 10),
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
      const params = { month: selectedMonth };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;

      const [listRes, sumRes] = await Promise.all([
        api.get('/payroll', { params }),
        isFinanceOrAdmin ? api.get('/payroll/summary', { params: { month: selectedMonth } }) : Promise.resolve({ data: { data: null } }),
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
  }, [selectedMonth, filters]);

  const resetFilters = () => {
    setFilters({ search: '', status: '', paymentMethod: '' });
  };

  const openCreate = () => {
    setEditingPayroll(null);
    setFormData({
      user_id: employees[0]?.id || '',
      payroll_month: selectedMonth,
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
      payroll_month: item.payroll_month,
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
    try {
      setIsSubmitting(true);
      if (editingPayroll) {
        await api.put(`/payroll/${editingPayroll.id}`, formData);
        showNotification('Payroll record updated successfully');
      } else {
        await api.post('/payroll', formData);
        showNotification('Payroll record created successfully');
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
      showNotification(`Salary for ${payModalItem.employee_name} marked as Paid!`);
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
        showNotification(`No valid phone number found for ${item.employee_name}. Please edit their profile in Team Users.`, 'error');
        return;
      }
      window.open(payload.whatsappUrl, '_blank');
      showNotification(`Opening WhatsApp for ${item.employee_name}...`);
    } catch (err) {
      showNotification('Failed to generate WhatsApp notification', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-6 h-6 text-brand-500" />
            <span>Workforce Payroll & Salary Processing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage site salaries, allowances, deductions, and instant WhatsApp payslip delivery.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Month Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="outline-none bg-transparent text-slate-900 text-xs font-bold cursor-pointer"
            />
          </div>

          {isFinanceOrAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Payroll Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards (Accountant & Admin only) */}
      {isFinanceOrAdmin && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Net Payroll Liability
            </span>
            <span className="text-xl font-black text-slate-900 block mt-1">
              ₹ {Number(summary.total_net_liability || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              {summary.total_employees || 0} Employees in {selectedMonth}
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
              {summary.paid_count || 0} Salaries Settled
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
              <span className="text-xs text-slate-500 mt-0.5 block">Automated salary breakdowns</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search employee name, phone, ref..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Payout</option>
              <option value="paid">Paid & Settled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Payment Modes</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing <strong>{payrolls.length}</strong> payroll slips for <strong>{selectedMonth}</strong>
          </span>
          {(filters.search || filters.status || filters.paymentMethod) && (
            <button onClick={resetFilters} className="text-brand-600 font-semibold flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Payroll Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Loading payroll slips...</p>
          </div>
        ) : payrolls.length === 0 ? (
          <div className="p-16 text-center">
            <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Payroll Slips Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {isFinanceOrAdmin
                ? `Click "Add Payroll Slip" to record monthly salary for month ${selectedMonth}.`
                : 'No salary slips have been generated for you this month.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Allowances</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
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

                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {item.payroll_month}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
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
                        {item.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click WhatsApp Button */}
                        {isFinanceOrAdmin && (
                          <button
                            onClick={() => openWhatsApp(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Send WhatsApp Payslip to Employee"
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
                          title="View Printable Payslip"
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
                                payment_date: new Date().toISOString().slice(0, 10),
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-slate-950 rounded-lg shadow-sm"
                          >
                            Disburse
                          </button>
                        )}

                        {/* Edit (finance only) */}
                        {isFinanceOrAdmin && (
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

      {/* Add / Edit Payroll Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingPayroll ? 'Edit Employee Payroll' : 'Generate Employee Payroll'}
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
                    {emp.name} ({emp.role.replace('_', ' ')}) {emp.phone ? `- ${emp.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payroll Month *
                </label>
                <input
                  type="month"
                  value={formData.payroll_month}
                  onChange={(e) => setFormData({ ...formData, payroll_month: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Base Salary (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_salary}
                  onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  placeholder="35000"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                  + Site Allowances (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.allowances}
                  onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                  placeholder="5000"
                  className="w-full px-3 py-2 text-sm bg-emerald-50/40 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">
                  - Deductions / Advance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                  placeholder="2000"
                  className="w-full px-3 py-2 text-sm bg-rose-50/40 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            {/* Calculated Net Salary Card */}
            <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                Calculated Net Salary:
              </span>
              <span className="text-lg font-black text-brand-400">
                ₹ {calculateNet().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT)</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Petty Cash</option>
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
                Txn Ref / UTR / Remarks
              </label>
              <input
                type="text"
                value={formData.payment_reference}
                onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                placeholder="e.g. UTR-982103841"
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
                <span>{editingPayroll ? 'Update Payroll' : 'Save Payroll Record'}</span>
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
          title={`Disburse Salary: ${payModalItem.employee_name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleMarkAsPaid} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee:</span>
                <span className="font-bold text-slate-900">{payModalItem.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Month:</span>
                <span className="font-bold text-slate-900">{payModalItem.payroll_month}</span>
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
                <option value="cheque">Cheque</option>
                <option value="cash">Petty Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                UTR / Cheque No / Txn Ref *
              </label>
              <input
                type="text"
                value={payForm.payment_reference}
                onChange={(e) => setPayForm({ ...payForm, payment_reference: e.target.value })}
                placeholder="e.g. UTR-2026110293"
                required
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
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Payment Disbursed</span>
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
          title={`Payslip: ${selectedPayslip.employee_name} (${selectedPayslip.payroll_month})`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 print:p-0">
            {/* Payslip Card */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">BUILDTRACK CONSTRUCTION</h2>
                  <p className="text-[11px] text-slate-500">Official Monthly Salary Statement</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">Period: {selectedPayslip.payroll_month}</span>
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
                  <span className="font-bold text-slate-900 capitalize">{selectedPayslip.employee_role?.replace('_', ' ')}</span>
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
                    <span className="text-slate-600">Base Salary</span>
                    <span className="text-right font-medium">
                      ₹ {Number(selectedPayslip.base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 text-emerald-700">
                    <span>Site & Food Allowances</span>
                    <span className="text-right font-medium">
                      + ₹ {Number(selectedPayslip.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 text-rose-700">
                    <span>Deductions & Advances</span>
                    <span className="text-right font-medium">
                      - ₹ {Number(selectedPayslip.deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 bg-slate-900 text-white p-3 font-bold text-sm">
                  <span>Net Disbursed Salary</span>
                  <span className="text-right text-brand-400 font-black">
                    ₹ {Number(selectedPayslip.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {selectedPayslip.payment_reference && (
                <div className="text-[11px] text-slate-500">
                  <span>Bank / UTR Reference: </span>
                  <strong className="font-mono text-slate-800">{selectedPayslip.payment_reference}</strong>
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
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Payroll;
