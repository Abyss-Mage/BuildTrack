import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Modal from '../components/ui/Modal';
import {
  Building2,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  Calendar,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users as UsersIcon,
  RotateCcw,
  Shield,
  Layers,
  ArrowUpDown,
  Loader2,
  Edit2,
  ArrowUpRight,
} from 'lucide-react';

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Multi-criteria filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    utilization: '',
    sortBy: 'newest',
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    description: '',
    total_budget: '',
    start_date: '',
    end_date: '',
    status: 'active',
    po_number: '',
    po_date: '',
  });

  const canManageProjects = ['admin'].includes(user?.role);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.utilization) params.utilization = filters.utilization;
      if (filters.sortBy) params.sortBy = filters.sortBy;

      const res = await api.get('/projects', { params });
      setProjects(res.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProjects();
    }, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      status: '',
      utilization: '',
      sortBy: 'newest',
    });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.utilization || filters.sortBy !== 'newest'
  );

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      code: '',
      location: '',
      description: '',
      total_budget: '',
      start_date: '',
      end_date: '',
      status: 'active',
      po_number: '',
      po_date: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (project, e) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/projects/${project.id}`);
      const full = res.data.data;
      setEditingProject(full);
      setFormData({
        name: full.name,
        code: full.code,
        location: full.location,
        description: full.description || '',
        total_budget: full.total_budget,
        start_date: full.start_date || '',
        end_date: full.end_date || '',
        status: full.status,
        po_number: full.po_number || '',
        po_date: full.po_date || '',
      });

      setIsModalOpen(true);
    } catch (err) {
      showNotification('Failed to load project details', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, formData);
        showNotification('Project updated successfully');
      } else {
        await api.post('/projects', formData);
        showNotification('New project site created successfully');
      }
      setIsModalOpen(false);
      loadProjects();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated totals of filtered projects
  const totalFilteredBudget = projects.reduce((acc, curr) => acc + Number(curr.total_budget || 0), 0);
  const totalFilteredSpent = projects.reduce((acc, curr) => acc + Number(curr.total_spent || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-brand-500" />
            <span>Construction Project Sites</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Company-wide visibility for all sites with per-role expenditure approval allocations.
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        )}
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
              placeholder="Search by name, site code, location..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Execution</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed / Handed Over</option>
            </select>
          </div>

          {/* Budget Health / Utilization Filter */}
          <div>
            <select
              value={filters.utilization}
              onChange={(e) => setFilters({ ...filters, utilization: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Budget Health</option>
              <option value="under">Within Budget (&lt; 80%)</option>
              <option value="warning">Budget Warning (80% - 100%)</option>
              <option value="over">Budget Overrun (&gt; 100%)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="newest">Recently Added</option>
              <option value="oldest">Oldest First</option>
              <option value="budget_desc">Budget: Highest First</option>
              <option value="budget_asc">Budget: Lowest First</option>
              <option value="spent_desc">Spend: Highest First</option>
              <option value="name_asc">Alphabetical (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Aggregate Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              Showing <strong className="text-slate-900">{projects.length}</strong> Sites
            </span>
            <span>•</span>
            <span>
              Total Budget: <strong className="text-slate-900">₹ {totalFilteredBudget.toLocaleString('en-IN')}</strong>
            </span>
            <span>•</span>
            <span>
              Total Spent: <strong className="text-emerald-700">₹ {totalFilteredSpent.toLocaleString('en-IN')}</strong>
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

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-sm">Loading construction sites...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {hasActiveFilters
              ? 'Try clearing your filters to see more results.'
              : 'Get started by creating your first construction project site.'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const spent = Number(p.total_spent || 0);
            const budget = Number(p.total_budget || 0);
            const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
            const isOverBudget = utilization > 100;
            const isWarning = utilization >= 80 && utilization <= 100;

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-500/40 transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {p.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : p.status === 'on_hold'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.status.replace('_', ' ')}
                      </span>

                      {canManageProjects && (
                        <button
                          onClick={(e) => openEditModal(p, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Project & Approval Limits"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2 line-clamp-1">{p.name}</h3>

                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{p.location}</span>
                  </p>

                  {/* Budget & Utilization */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 font-medium">Spent:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹ {spent.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 font-medium">Budget:</span>
                      <span className="font-bold text-slate-700 font-mono">
                        ₹ {budget.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverBudget
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-semibold">
                      <span
                        className={
                          isOverBudget
                            ? 'text-rose-600 font-bold'
                            : isWarning
                            ? 'text-amber-600 font-bold'
                            : 'text-emerald-700 font-medium'
                        }
                      >
                        {utilization}% Utilized
                      </span>
                      <span className="text-slate-400 font-normal">
                        {p.expense_count || 0} Vouchers Recorded
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Shield className="w-3 h-3 text-brand-600" />
                    <span>Role Caps Configured</span>
                  </span>
                  <span className="text-brand-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Ledger</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProject ? 'Edit Construction Site' : 'Create New Construction Site'}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Site / Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Skyline Residency Phase 2"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Site Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. SRP-02"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none uppercase font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Site Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Sector 62, Noida"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Allocated Total Budget (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="e.g. 5000000"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Expected Completion
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
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
                  <option value="active">Active Execution</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Purchase Order (PO) Number
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.po_number}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  placeholder="e.g. 4500123456"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Purchase Order (PO) Date
                </label>
                <input
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Site Description / Scope Notes
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the construction scope..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

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
                <span>{editingProject ? 'Update Project' : 'Create Site'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Projects;
