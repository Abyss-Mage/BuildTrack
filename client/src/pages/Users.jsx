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
  Search,
  Filter,
  X,
  Edit2,
  Lock,
} from 'lucide-react';

export function Users() {
  const { user: currentUser } = useAuthStore();
  const { showNotification } = useUiStore();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    is_active: '',
  });

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'site_in_charge',
    phone: '',
    approval_limit: '',
  });

  // Edit User Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'site_in_charge',
    phone: '',
    approval_limit: '',
    is_active: 1,
    newPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      if (filters.is_active !== '') params.is_active = filters.is_active;

      const res = await api.get('/users', { params });
      setUsers(res.data.data || []);
    } catch (err) {
      showNotification('Failed to fetch team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      role: '',
      is_active: '',
    });
  };

  const isFiltered = Boolean(filters.search || filters.role || filters.is_active !== '');

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
      const payload = {
        ...createFormData,
        approval_limit: createFormData.approval_limit === '' ? null : Number(createFormData.approval_limit),
      };
      await api.post('/users', payload);
      showNotification('New user created successfully');
      setIsCreateOpen(false);
      setCreateFormData({
        name: '',
        email: '',
        password: '',
        role: 'site_in_charge',
        phone: '',
        approval_limit: '',
      });
      loadUsers();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'site_in_charge',
      phone: user.phone || '',
      approval_limit: user.approval_limit !== null && user.approval_limit !== undefined ? String(user.approval_limit) : '',
      is_active: user.is_active ? 1 : 0,
      newPassword: '',
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSubmitting(true);
      const payload = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role,
        phone: editFormData.phone?.trim() || null,
        approval_limit: editFormData.approval_limit === '' ? null : Number(editFormData.approval_limit),
        is_active: editFormData.is_active,
      };

      if (editFormData.newPassword && editFormData.newPassword.trim().length > 0) {
        if (editFormData.newPassword.length < 6) {
          showNotification('New password must be at least 6 characters', 'error');
          setIsSubmitting(false);
          return;
        }
        payload.password = editFormData.newPassword.trim();
      }

      await api.put(`/users/${editingUser.id}`, payload);
      showNotification(`User ${editFormData.name} updated successfully`);
      setIsEditOpen(false);
      loadUsers();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = users.filter((u) => u.is_active).length;
  const deactivatedCount = users.length - activeCount;

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
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin / Owner</option>
              <option value="site_in_charge">Site In-Charge</option>
              <option value="accountant">Accountant / Finance</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Account Statuses</option>
              <option value="1">Active Only</option>
              <option value="0">Deactivated Only</option>
            </select>
          </div>
        </div>

        {/* Aggregate Strip & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              Showing <strong className="text-slate-900">{users.length}</strong> Users
            </span>
            <span>•</span>
            <span className="text-emerald-700">
              Active: <strong>{activeCount}</strong>
            </span>
            {deactivatedCount > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-700">
                  Deactivated: <strong>{deactivatedCount}</strong>
                </span>
              </>
            )}
          </div>

          {isFiltered && (
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

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Loading team directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Matching Users</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No team members match the search and filter criteria.
            </p>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Approval Authority</th>
                  <th className="py-3 px-4">Phone (WhatsApp)</th>
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
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Unlimited (Admin)
                        </span>
                      ) : u.approval_limit === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          ₹0 (Submission Only)
                        </span>
                      ) : u.approval_limit !== null && u.approval_limit !== undefined ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          Max ₹ {Number(u.approval_limit).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Unlimited
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                      {u.phone ? (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{u.phone}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No phone set</span>
                      )}
                    </td>

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
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Edit member details and password"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        {/* Toggle Active Button */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                              u.is_active
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Add User Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
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
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
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
                value={createFormData.email}
                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                placeholder="name@construction.com"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Initial Password *
              </label>
              <input
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role *
              </label>
              <select
                value={createFormData.role}
                onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="site_in_charge">Site In-Charge (Assigned Site Expenses)</option>
                <option value="accountant">CA / Accountant (Accounts & Payroll)</option>
                <option value="admin">Super Admin (Full Company Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expenditure Approval Limit (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={createFormData.approval_limit}
                  onChange={(e) => setCreateFormData({ ...createFormData, approval_limit: e.target.value })}
                  placeholder="e.g. 50000 (leave blank for Unlimited)"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Approval authority cap per single expense. Enter 0 for submission-only accounts. Leave blank for Unlimited.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number (for WhatsApp Payroll Slips)
              </label>
              <input
                type="tel"
                value={createFormData.phone}
                onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
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

      {/* Edit User Modal */}
      {isEditOpen && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Team Member: ${editingUser?.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                System Role *
              </label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value="site_in_charge">Site In-Charge (Assigned Site Expenses)</option>
                <option value="accountant">CA / Accountant (Accounts & Payroll)</option>
                <option value="admin">Super Admin (Full Company Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expenditure Approval Limit (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editFormData.approval_limit}
                  onChange={(e) => setEditFormData({ ...editFormData, approval_limit: e.target.value })}
                  placeholder="e.g. 50000 (leave blank for Unlimited)"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Approval authority cap per single expense. Enter 0 for submission-only accounts. Leave blank for Unlimited.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number (for WhatsApp Payroll Slips)
              </label>
              <input
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
              >
                <option value={1}>Active</option>
                <option value={0}>Deactivated (Access Revoked)</option>
              </select>
            </div>

            {/* Admin Password Reset Section */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Admin Password Reset (Optional)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                Leave blank if you do not want to alter this user's password.
              </p>
              <input
                type="password"
                value={editFormData.newPassword}
                onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
                placeholder="Set new password (min. 6 characters)"
                minLength={6}
                className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
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
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Users;
