import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import Modal from '../components/ui/Modal';
import {
  ShieldAlert,
  Search,
  Filter,
  RotateCcw,
  Clock,
  User,
  Activity,
  Calendar,
  Eye,
  CheckCircle,
  AlertTriangle,
  Lock,
  Loader2,
  FileText,
  Key,
} from 'lucide-react';
import { toLocalDate } from '../utils/dateUtils';

export function AuditLogs() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [logsRes, statsRes] = await Promise.all([
        api.get('/audit-logs', { params }),
        api.get('/audit-logs/stats'),
      ]);

      setLogs(logsRes.data.data.items || []);
      setPagination(logsRes.data.data.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
      setStats(statsRes.data.data);
    } catch (err) {
      showNotification('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  const resetFilters = () => {
    setFilters({
      search: '',
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
    });
  };

  const setDatePreset = (preset) => {
    const today = toLocalDate();
    if (preset === 'today') {
      setFilters((prev) => ({ ...prev, startDate: today, endDate: today }));
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFilters((prev) => ({ ...prev, startDate: toLocalDate(d), endDate: today }));
    } else if (preset === 'month') {
      const d = new Date();
      d.setDate(1);
      setFilters((prev) => ({ ...prev, startDate: toLocalDate(d), endDate: today }));
    }
  };

  const getActionBadge = (action) => {
    if (action.includes('LOGIN')) {
      return { bg: 'bg-blue-50 text-blue-800 border-blue-200', label: 'Auth Login' };
    }
    if (action.includes('APPROVE')) {
      return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'Approved' };
    }
    if (action.includes('REJECT')) {
      return { bg: 'bg-rose-50 text-rose-800 border-rose-200', label: 'Rejected' };
    }
    if (action.includes('PAYOUT') || action.includes('PAYROLL')) {
      return { bg: 'bg-purple-50 text-purple-800 border-purple-200', label: 'Financial / Payout' };
    }
    if (action.includes('CREATE')) {
      return { bg: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Created' };
    }
    if (action.includes('UPDATE')) {
      return { bg: 'bg-sky-50 text-sky-800 border-sky-200', label: 'Modified' };
    }
    if (action.includes('DELETE')) {
      return { bg: 'bg-red-50 text-red-800 border-red-200', label: 'Deleted' };
    }
    return { bg: 'bg-slate-100 text-slate-800 border-slate-200', label: action };
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.action || filters.entityType || filters.startDate || filters.endDate
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand-500" />
            <span>Super Admin Compliance & Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed timeline of user logins, expenditure approvals, payouts, and permission edits.
          </p>
        </div>

        <button
          onClick={() => loadData(pagination.page)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Live Refresh</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Events</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{stats.totalEvents}</span>
            <span className="text-[11px] text-slate-500 font-medium">All logged transactions</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Auth Logins</span>
            <span className="text-xl font-black text-blue-600 mt-1 block">{stats.authEvents}</span>
            <span className="text-[11px] text-slate-500 font-medium">Active sessions logged</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Approval Events</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">{stats.approvalEvents}</span>
            <span className="text-[11px] text-slate-500 font-medium">Vouchers authorized</span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Payouts Disbursed</span>
            <span className="text-xl font-black text-purple-600 mt-1 block">{stats.payoutEvents}</span>
            <span className="text-[11px] text-slate-500 font-medium">Finance disbursements</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search user, action, IP, details, entity..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Action Filter */}
          <div className="sm:col-span-4">
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Action Types</option>
              <option value="AUTH_LOGIN">User Logins (AUTH_LOGIN)</option>
              <option value="EXPENSE_CREATE">Expense Created</option>
              <option value="EXPENSE_APPROVE">Expense Approved</option>
              <option value="EXPENSE_REJECT">Expense Rejected</option>
              <option value="EXPENSE_PAYOUT_PROCESSED">Payout Disbursed</option>
              <option value="PAYROLL_CREATE">Payroll Created</option>
              <option value="PAYROLL_SETTLE">Payroll Settled</option>
              <option value="PAYROLL_WHATSAPP_BROADCAST">WhatsApp Broadcast</option>
              <option value="PROJECT_CREATE">Project Created</option>
              <option value="ROLE_LIMITS_UPDATE">Approval Limits Updated</option>
              <option value="USER_CREATE">User Created</option>
            </select>
          </div>

          {/* Entity Type */}
          <div className="sm:col-span-3">
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Entities</option>
              <option value="expense">Expense</option>
              <option value="payroll">Payroll</option>
              <option value="project">Project</option>
              <option value="user">User</option>
              <option value="auth">Auth</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {/* Date presets & summary strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Quick Range:</span>
            <button
              onClick={() => setDatePreset('today')}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset('7days')}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setDatePreset('month')}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Total: <strong>{pagination.total}</strong> log entries
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Audit Events Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Events will be registered here as workforce members perform actions in the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {log.created_at}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{log.user_name || 'System'}</span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {log.user_role?.replace(/_/g, ' ') || 'Internal'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 capitalize">
                          {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{log.ip_address || '-'}</td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Strip */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadData(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadData(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event #${selectedLog.id}: ${selectedLog.action}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Actor</span>
                <span className="font-bold text-slate-900">{selectedLog.user_name}</span>
                <span className="text-slate-500 block text-[11px]">{selectedLog.user_email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">System Role</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {selectedLog.user_role?.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">IP Address</span>
                <span className="font-mono text-slate-800">{selectedLog.ip_address}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Recorded At</span>
                <span className="font-mono text-slate-800">{selectedLog.created_at}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Event Payload / Modified Changes (JSON)
              </label>
              <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-60 border border-slate-800">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2);
                  } catch (e) {
                    return selectedLog.details || 'No payload recorded';
                  }
                })()}
              </pre>
            </div>

            {selectedLog.user_agent && (
              <div className="text-[11px] text-slate-400 truncate">
                <span>Client User Agent: </span>
                <span className="font-mono">{selectedLog.user_agent}</span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AuditLogs;
