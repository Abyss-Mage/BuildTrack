import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import StatusBadge from '../components/ui/StatusBadge';
import ExpenseFormModal from './ExpenseFormModal';
import ExpenseDetailModal from './ExpenseDetailModal';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  Download,
  Trash2,
  Edit2,
  Paperclip,
  Loader2,
  X,
} from 'lucide-react';

export function Expenses() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    projectId: '',
    categoryId: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const canCreate = ['admin', 'project_manager', 'site_engineer'].includes(user?.role);

  const loadFilterOptions = async () => {
    try {
      const [pRes, cRes] = await Promise.all([api.get('/projects'), api.get('/categories')]);
      setProjects(pRes.data.data || []);
      setCategories(cRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const res = await api.get(`/expenses?${queryParams.toString()}`);
      setExpenses(res.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to fetch expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadExpenses();
    }, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this draft expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      showNotification('Expense draft deleted successfully');
      loadExpenses();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete expense', 'error');
    }
  };

  const openEdit = (exp, e) => {
    e.stopPropagation();
    setEditingExpense(exp);
    setIsFormModalOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      projectId: '',
      categoryId: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  const totalFilteredAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Site Expenses & Vouchers Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete audit trail of all construction expenses, material deliveries, and contractor bills.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setEditingExpense(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search ref #, title, vendor..."
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
              <option value="">All Projects</option>
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

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved (Awaiting Payout)</option>
              <option value="processed">Processed & Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Date range & Reset row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Date Range:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-900">{expenses.length}</strong> vouchers • Total:{' '}
              <strong className="text-slate-900 font-mono">
                ₹ {totalFilteredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </span>

            {(filters.search || filters.projectId || filters.categoryId || filters.status || filters.startDate || filters.endDate) && (
              <button
                onClick={resetFilters}
                className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Fetching expense records...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Expenses Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No matching expense vouchers found for the selected criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Title & Vendor</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Receipts</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => {
                  const canEdit =
                    ['draft', 'rejected'].includes(exp.status) &&
                    (exp.submitted_by === user?.id || user?.role === 'admin');
                  const canDelete =
                    exp.status === 'draft' &&
                    (exp.submitted_by === user?.id || user?.role === 'admin');

                  return (
                    <tr
                      key={exp.id}
                      onClick={() => setSelectedExpense(exp)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {exp.reference_no}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {exp.expense_date}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <span className="font-mono text-[10px] text-slate-500 block">
                          {exp.project_code}
                        </span>
                        <span className="truncate max-w-[150px] block">{exp.project_name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]">
                        {exp.category_name}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {exp.title}
                        </p>
                        {exp.vendor_name && (
                          <span className="text-[11px] text-slate-400 block truncate">
                            Vendor: {exp.vendor_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        ₹ {Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {exp.receipt_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                            <Paperclip className="w-3 h-3 text-brand-600" />
                            {exp.receipt_count}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={exp.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={(e) => openEdit(exp, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => handleDelete(exp.id, e)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormModalOpen && (
        <ExpenseFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={() => {
            setIsFormModalOpen(false);
            loadExpenses();
          }}
          initialExpense={editingExpense}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onActionSuccess={loadExpenses}
        />
      )}
    </div>
  );
}

export default Expenses;
