import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import ExportButtons from '../components/ui/ExportButtons';
import Modal from '../components/ui/Modal';
import { toLocalDate } from '../utils/dateUtils';
import { ClipboardList, Eye, Loader2, Pencil, PlusCircle, Search, Trash2 } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none';
const cellInput =
  'w-full min-w-[80px] px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-brand-500 outline-none';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';
const formatINR = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const SIGN_OFFS = [
  { key: 'requested_by', label: 'Requested By' },
  { key: 'verified_by', label: 'Verified By' },
  { key: 'purchase_by', label: 'Purchase' },
  { key: 'accounts_by', label: 'Accounts' },
  { key: 'approved_by', label: 'Approved By' },
];

const blankItem = () => ({ item: '', description: '', unit: '', quantity: '', required_date: '', vendor: '', rate: '', remarks: '' });

const emptyForm = (userId) => ({
  pr_no: '',
  pr_date: toLocalDate(),
  project_id: '',
  site_description: '',
  department: 'Purchase',
  required_date: '',
  priority: 'Normal',
  justification: '',
  requested_by: userId || '',
  verified_by: '',
  purchase_by: '',
  accounts_by: '',
  approved_by: '',
  items: [blankItem()],
});

const lineAmount = (item) => Number(item.quantity || 0) * Number(item.rate || 0);

export function PurchaseRequisitions() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [requisitions, setRequisitions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [filters, setFilters] = useState({ projectId: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user?.id));

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.search) params.search = filters.search;
      const res = await api.get('/purchase-requisitions', { params });
      setRequisitions(res.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load requisitions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    Promise.all([api.get('/projects'), api.get('/users', { params: { is_active: 1 } })])
      .then(([projectRes, userRes]) => {
        setProjects(projectRes.data.data || []);
        setPeople(userRes.data.data || []);
      })
      .catch(() => showNotification('Failed to load form options', 'error'));
  }, []);

  const canChange = (requisition) => user?.role !== 'site_in_charge' || requisition.created_by === user?.id;
  const readOnly = viewing || (Boolean(editing) && !canChange(editing));

  const openNew = () => {
    setEditing(null);
    setViewing(false);
    setForm(emptyForm(user?.id));
    setIsModalOpen(true);
  };

  const openExisting = async (id, view) => {
    try {
      const { data } = await api.get(`/purchase-requisitions/${id}`);
      const pr = data.data;
      setEditing(pr);
      setViewing(view);
      const text = (value) => value ?? '';
      setForm({
        pr_no: pr.pr_no,
        pr_date: pr.pr_date,
        project_id: pr.project_id,
        site_description: text(pr.site_description),
        department: text(pr.department),
        required_date: text(pr.required_date),
        priority: pr.priority,
        justification: text(pr.justification),
        requested_by: text(pr.requested_by),
        verified_by: text(pr.verified_by),
        purchase_by: text(pr.purchase_by),
        accounts_by: text(pr.accounts_by),
        approved_by: text(pr.approved_by),
        items: pr.items.map((i) => ({
          item: i.item,
          description: text(i.description),
          unit: i.unit,
          quantity: i.quantity,
          required_date: text(i.required_date),
          vendor: text(i.vendor),
          rate: text(i.rate),
          remarks: text(i.remarks),
        })),
      });
      setIsModalOpen(true);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to open requisition', 'error');
    }
  };

  const setItem = (index, changes) => {
    setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, ...changes } : item)) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = editing
        ? await api.put(`/purchase-requisitions/${editing.id}`, form)
        : await api.post('/purchase-requisitions', form);
      showNotification(res.data.message);
      setIsModalOpen(false);
      load();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save requisition', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pr) => {
    if (!window.confirm(`Delete purchase requisition ${pr.pr_no}? This cannot be undone.`)) return;
    try {
      await api.delete(`/purchase-requisitions/${pr.id}`);
      showNotification('Purchase requisition deleted');
      load();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete requisition', 'error');
    }
  };

  const totalCost = form.items.reduce((sum, item) => sum + lineAmount(item), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-brand-500" />
            <span>Purchase Requisitions</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Create and record purchase requirements for each site.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons path="/purchase-requisitions" params={filters} fileName="Purchase_Requisitions" />
          <button
            onClick={openNew}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Requisition</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            aria-label="Search requisitions"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search PR number or site description..."
            className={`${inputClass} pl-9`}
          />
        </div>
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
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : requisitions.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No purchase requisitions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">PR No.</th>
                  <th className="py-3 px-4">PR Date</th>
                  <th className="py-3 px-4">Project / Site</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requisitions.map((pr) => (
                  <tr key={pr.id} onClick={() => openExisting(pr.id, true)} className="cursor-pointer hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{pr.pr_no}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pr.pr_date}</td>
                    <td className="py-3 px-4 text-slate-700">
                      [{pr.project_code}] {pr.project_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{pr.requested_by_name || '-'}</td>
                    <td className="py-3 px-4 text-right text-slate-700">{pr.item_count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(pr.total_cost)}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        title="View details"
                        aria-label={`View ${pr.pr_no}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openExisting(pr.id, true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canChange(pr) && (
                        <button
                          title="Edit"
                          aria-label={`Edit ${pr.pr_no}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openExisting(pr.id, false);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canChange(pr) && (
                        <button
                          title="Delete"
                          aria-label={`Delete ${pr.pr_no}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pr);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `${readOnly ? 'View' : 'Edit'} Purchase Requisition ${editing.pr_no}` : 'New Purchase Requisition'}
          maxWidth="max-w-6xl"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset disabled={readOnly} className="space-y-5 min-w-0">
              <div className="text-center border-b border-slate-100 pb-3">
                <p className="text-sm font-black text-slate-900">SINGHSAAB POWER SERVICES PRIVATE LIMITED</p>
                <p className="text-xs font-bold text-slate-700">PURCHASE REQUISITION (PR)</p>
                <p className="text-[11px] text-slate-500">GST No.: 03ABOCS5252N1ZV</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass} htmlFor="pr-no">Document No. / PR No.</label>
                  <input
                    id="pr-no"
                    type="text"
                    maxLength={50}
                    value={form.pr_no}
                    onChange={(e) => setForm({ ...form, pr_no: e.target.value })}
                    placeholder="Leave blank to auto-generate"
                    className={`${inputClass} font-mono`}
                  />
                  {editing && editing.document_no !== editing.pr_no && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">Doc No. {editing.document_no}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass} htmlFor="pr-date">PR Date *</label>
                  <input id="pr-date" type="date" required value={form.pr_date} onChange={(e) => setForm({ ...form, pr_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pr-project">Project / Site Name *</label>
                  <select id="pr-project" required value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputClass}>
                    <option value="">Select Site</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="pr-site-desc">Site Description</label>
                  <input id="pr-site-desc" type="text" maxLength={255} value={form.site_description} onChange={(e) => setForm({ ...form, site_description: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pr-dept">Department</label>
                  <input id="pr-dept" type="text" maxLength={100} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="pr-required">Required Date</label>
                    <input id="pr-required" type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="pr-priority">Priority</label>
                    <select id="pr-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                      {['Low', 'Normal', 'High', 'Urgent'].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs min-w-[1200px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2 w-10">Sr. No</th>
                      <th className="py-2 px-2 min-w-[180px]">Items *</th>
                      <th className="py-2 px-2 min-w-[180px]">Item Description</th>
                      <th className="py-2 px-2">Unit *</th>
                      <th className="py-2 px-2">Qty *</th>
                      <th className="py-2 px-2">Required Date</th>
                      <th className="py-2 px-2">Vendor</th>
                      <th className="py-2 px-2">Rate</th>
                      <th className="py-2 px-2 text-right">Amount</th>
                      <th className="py-2 px-2">Remarks</th>
                      <th className="py-2 px-2 w-8" aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.items.map((item, index) => (
                      <tr key={index}>
                        <td className="py-1.5 px-2 text-slate-500 font-mono">{index + 1}</td>
                        <td className="py-1.5 px-2"><input aria-label={`Item ${index + 1}`} required maxLength={200} value={item.item} onChange={(e) => setItem(index, { item: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2"><input aria-label={`Description ${index + 1}`} maxLength={255} value={item.description} onChange={(e) => setItem(index, { description: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2"><input aria-label={`Unit ${index + 1}`} required maxLength={30} value={item.unit} onChange={(e) => setItem(index, { unit: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2"><input aria-label={`Quantity ${index + 1}`} type="number" min="0.001" step="0.001" required value={item.quantity} onChange={(e) => setItem(index, { quantity: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2"><input aria-label={`Required date ${index + 1}`} type="date" value={item.required_date} onChange={(e) => setItem(index, { required_date: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2"><input aria-label={`Vendor ${index + 1}`} maxLength={150} value={item.vendor} onChange={(e) => setItem(index, { vendor: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2"><input aria-label={`Rate ${index + 1}`} type="number" min="0" step="0.01" value={item.rate} onChange={(e) => setItem(index, { rate: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">{formatINR(lineAmount(item))}</td>
                        <td className="py-1.5 px-2"><input aria-label={`Remarks ${index + 1}`} maxLength={255} value={item.remarks} onChange={(e) => setItem(index, { remarks: e.target.value })} className={cellInput} /></td>
                        <td className="py-1.5 px-2">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, items: [...form.items, blankItem()] })}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
                <p className="text-sm font-bold text-slate-900">
                  Total Cost: <span className="font-mono">{formatINR(totalCost)}</span>
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="pr-justification">Justification / Purpose of Purchase</label>
                <textarea id="pr-justification" rows="2" maxLength={2000} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {SIGN_OFFS.map(({ key, label }) => (
                  <div key={key}>
                    <label className={labelClass} htmlFor={`pr-${key}`}>{label}</label>
                    <select id={`pr-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass}>
                      <option value="">Select Name</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editing ? 'Update Requisition' : 'Save Requisition'}</span>
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default PurchaseRequisitions;
