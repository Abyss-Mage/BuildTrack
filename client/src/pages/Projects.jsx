import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  PlusCircle,
  FileSpreadsheet,
  Edit2,
  Loader2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export function Projects() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

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
    members: [],
  });

  const canManageProjects = ['admin', 'project_manager'].includes(user?.role);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsersList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
    if (canManageProjects) {
      loadUsers();
    }
  }, []);

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
      members: [],
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
        members: full.members?.map((m) => ({
          user_id: m.user_id,
          role_in_project: m.role_in_project,
        })) || [],
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
        showNotification('New project created successfully');
      }
      setIsModalOpen(false);
      loadProjects();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMemberSelection = (userId, defaultRole = 'engineer') => {
    setFormData((prev) => {
      const exists = prev.members.find((m) => m.user_id === userId);
      if (exists) {
        return { ...prev, members: prev.members.filter((m) => m.user_id !== userId) };
      } else {
        return { ...prev, members: [...prev.members, { user_id: userId, role_in_project: defaultRole }] };
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Construction Projects & Sites
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage site budgets, active workforce allocations, and real-time expense drawdowns.
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Site</span>
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
          <p className="text-sm">Loading construction projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            You don't have access to any projects yet or none have been created.
          </p>
          {canManageProjects && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs"
            >
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => {
            const budget = Number(proj.total_budget || 0);
            const spent = Number(proj.total_spent || 0);
            const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
            const isOver = spent > budget;

            return (
              <div
                key={proj.id}
                onClick={() => navigate(`/projects/${proj.id}`)}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-brand-500/40 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      {proj.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={proj.status} size="xs" />
                      {canManageProjects && (
                        <button
                          onClick={(e) => openEditModal(proj, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mt-3 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {proj.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{proj.location}</span>
                  </div>

                  {proj.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  {/* Budget Utilization Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500">Budget Spent</span>
                      <span className={`font-bold font-mono ${isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                        {pct}% ({`₹ ${spent.toLocaleString('en-IN')}`})
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver
                            ? 'bg-rose-500'
                            : pct > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Spent: ₹ {spent.toLocaleString('en-IN')}</span>
                      <span>Total: ₹ {budget.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">
                      {proj.expense_count || 0} Vouchers Recorded
                    </span>
                    <span className="text-brand-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Site P&L</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Create/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProject ? 'Update Construction Project' : 'Register New Construction Project'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Commercial Complex - Phase 1"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. PRJ-SKY-01"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none uppercase font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Site Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Sector 62, Noida, UP"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Total Allocated Budget (INR ₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder="e.g. 25000000"
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-semibold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  Project Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project Scope & Description
              </label>
              <textarea
                rows="2"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the construction scope..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Member Allocation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Assign Site Team (Project Managers & Engineers)
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50/50">
                {usersList.map((u) => {
                  const isAssigned = formData.members.some((m) => m.user_id === u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleMemberSelection(u.id, u.role === 'project_manager' ? 'manager' : 'engineer')}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isAssigned
                          ? 'bg-brand-50 border border-brand-200 text-slate-900 font-medium'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          readOnly
                          className="rounded text-brand-500 focus:ring-brand-500"
                        />
                        <span>{u.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">({u.role.replace('_', ' ')})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingProject ? 'Save Changes' : 'Create Project'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Projects;
