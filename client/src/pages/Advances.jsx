import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import ExportButtons from '../components/ui/ExportButtons';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { PERIOD_TYPES, periodEndDate, toLocalDate } from '../utils/dateUtils';
import { Check, Loader2, PlusCircle, Wallet, X } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';
const formatINR = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const emptyForm = () => ({
  project_id: '',
  site_in_charge_id: '',
  amount: '',
  allocation_date: toLocalDate(),
  period_type: 'weekly',
  start_date: toLocalDate(),
  end_date: periodEndDate('weekly', toLocalDate()),
  notes: '',
});

export function Advances() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();
  const canAllocate = ['admin', 'accountant'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  const [advances, setAdvances] = useState([]);
  const [summary, setSummary] = useState({});
  const [projects, setProjects] = useState([]);
  const [siteInCharges, setSiteInCharges] = useState([]);
  const [filters, setFilters] = useState({ projectId: '', status: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadAdvances = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await api.get('/advances', { params });
      setAdvances(res.data.data.advances || []);
      setSummary(res.data.data.summary || {});
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load advances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvances();
  }, [filters]);

  useEffect(() => {
    api
      .get('/projects')
      .then((res) => setProjects(res.data.data || []))
      .catch(() => showNotification('Failed to load sites', 'error'));
    if (canAllocate) {
      api
        .get('/users', { params: { role: 'site_in_charge', is_active: 1 } })
        .then((res) => setSiteInCharges(res.data.data || []))
        .catch(() => showNotification('Failed to load Site In-Charges', 'error'));
    }
  }, []);

  const changePeriod = (changes) => {
    setForm((prev) => {
      const next = { ...prev, ...changes };
      return { ...next, end_date: periodEndDate(next.period_type, next.start_date) || (changes.period_type ? '' : next.end_date) };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.post('/advances', form);
      showNotification(res.data.message);
      setIsModalOpen(false);
      loadAdvances();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to allocate advance', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const decide = async (advance, action) => {
    try {
      const res = await api.post(`/advances/${advance.id}/${action}`);
      showNotification(res.data.message);
      loadAdvances();
    } catch (err) {
      showNotification(err.response?.data?.message || `Failed to ${action} advance`, 'error');
    }
  };

  const cards = [
    { label: 'Total Advance Allocated', value: summary.totalAllocated, tone: 'text-slate-900' },
    { label: 'Total Expenses Submitted', value: summary.totalSubmitted, tone: 'text-amber-600' },
    { label: 'Remaining Available Balance', value: summary.remaining, tone: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-brand-500" />
            <span>Advance Payments</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            The balance falls only when an expense entry is submitted against the advance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons path="/advances" params={filters} fileName="Advances" />
          {canAllocate && (
            <button
              onClick={() => {
                setForm(emptyForm());
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Allocate Advance</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{card.label}</span>
            <span className={`text-2xl font-black mt-1 block ${card.tone}`}>{formatINR(card.value)}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select
          aria-label="Filter by site"
          value={filters.projectId}
          onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
          className={inputClass}
        >
          <option value="">All Sites</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className={inputClass}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="date"
          aria-label="Allocated from date"
          title="Allocated from"
          value={filters.startDate}
          max={filters.endDate || undefined}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className={inputClass}
        />
        <input
          type="date"
          aria-label="Allocated to date"
          title="Allocated to"
          value={filters.endDate}
          min={filters.startDate || undefined}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : advances.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No advances found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Site</th>
                  <th className="py-3 px-4">Site In-Charge</th>
                  <th className="py-3 px-4">Allocated On</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Advance</th>
                  <th className="py-3 px-4 text-right">Submitted</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approved By</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advances.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      [{a.project_code}] {a.project_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{a.site_in_charge_name}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{a.allocation_date}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="capitalize font-medium block">{a.period_type}</span>
                      {a.start_date} to {a.end_date}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(a.amount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-amber-700">{formatINR(a.spent)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{formatINR(a.remaining)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.status} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-slate-600">{a.approved_by_name || '-'}</td>
                    {isAdmin && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status === 'pending' && (
                            <button
                              onClick={() => decide(a, 'approve')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}
                          {a.status !== 'rejected' && a.spent === 0 && (
                            <button
                              onClick={() => decide(a, 'reject')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Allocate Advance" maxWidth="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="adv-project">Project / Site *</label>
                <select
                  id="adv-project"
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value, site_in_charge_id: '' })}
                  className={inputClass}
                >
                  <option value="">Select Site</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="adv-person">Site In-Charge *</label>
                <select
                  id="adv-person"
                  required
                  value={form.site_in_charge_id}
                  onChange={(e) => setForm({ ...form, site_in_charge_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Person</option>
                  {siteInCharges.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="adv-amount">Advance Amount (₹) *</label>
                <input
                  id="adv-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="adv-date">Allocation Date *</label>
                <input
                  id="adv-date"
                  type="date"
                  required
                  value={form.allocation_date}
                  onChange={(e) => setForm({ ...form, allocation_date: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass} htmlFor="adv-type">Period *</label>
                <select
                  id="adv-type"
                  value={form.period_type}
                  onChange={(e) => changePeriod({ period_type: e.target.value })}
                  className={inputClass}
                >
                  {PERIOD_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="adv-start">From *</label>
                <input
                  id="adv-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => changePeriod({ start_date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="adv-end">To *</label>
                <input
                  id="adv-end"
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="adv-notes">Notes</label>
              <textarea
                id="adv-notes"
                rows="2"
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
              />
            </div>

            {!isAdmin && <p className="text-xs text-slate-500">A Super Admin must approve this advance before it can be used.</p>}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Allocate</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Advances;
