import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Modal from '../components/ui/Modal';
import {
  Users as UsersIcon,
  PlusCircle,
  Shield,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Loader2,
  Check,
  Key,
} from 'lucide-react';

export function Users() {
  const { user: currentUser } = useAuthStore();
  const { showNotification } = useUiStore();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'site_engineer',
    phone: '',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (err) {
      showNotification('Failed to fetch team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleActive = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      showNotification('You cannot deactivate your own account', 'error');
      return;
    }
    const newStatus = targetUser.is_active ? 0 : 1;
    try {
      await api.put(`/users/${targetUser.id}`, { is_active: newStatus });
      showNotification(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (err) {
      showNotification('Failed to update user status', 'error');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post('/users', formData);
      showNotification('New user created successfully');
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'site_engineer',
        phone: '',
      });
      loadUsers();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Team & Workforce Access Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based permissions for site engineers, project managers, and finance officers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Loading team directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 capitalize border border-slate-200">
                        <Shield className="w-3 h-3 text-brand-600" />
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500">{u.phone || '-'}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${
                            u.is_active
                              ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Add User Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add New Workforce User"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Chandra"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@construction.com"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 6 characters"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Role & Permission Tier *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="site_engineer">Site Engineer / Foreman (Submits field bills)</option>
                <option value="project_manager">Project Manager (Reviews & approves site spend)</option>
                <option value="accountant">Accountant / Finance (Reconciles & exports)</option>
                <option value="admin">Admin / Company Owner (Full control)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 00000"
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
                <span>Create User</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Users;
