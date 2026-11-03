import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import StatusBadge from '../components/ui/StatusBadge';
import ExpenseDetailModal from './ExpenseDetailModal';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  Download,
  ArrowLeft,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plRes, expRes] = await Promise.all([
        api.get(`/reports/project-pl/${id}`),
        api.get(`/expenses?projectId=${id}`),
      ]);
      setProjectData(plRes.data.data);
      setExpenses(expRes.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const response = await api.get(`/reports/project-pl/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Project_PL_${projectData?.project?.code}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Project P&L Statement downloaded successfully');
    } catch (err) {
      showNotification('Failed to download P&L report', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
        <p className="text-sm">Generating Project P&L Statement...</p>
      </div>
    );
  }

  const project = projectData?.project;
  const breakdown = projectData?.breakdown || [];
  const budget = Number(project?.total_budget || 0);
  const spent = Number(project?.total_spent || 0);
  const variance = budget - spent;
  const isOver = variance < 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
        >
          {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-brand-400" />}
          <span>Download P&L Statement (PDF)</span>
        </button>
      </div>

      {/* Project Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                {project?.code}
              </span>
              <StatusBadge status={project?.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {project?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {project?.location}
              </span>
              {project?.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {project?.start_date} to {project?.end_date || 'Ongoing'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Budget Variance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Allocated Budget</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹ {budget.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase">Actual Expenditure</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              ₹ {spent.toLocaleString('en-IN')}
            </p>
          </div>

          <div className={`p-4 rounded-2xl border ${isOver ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            <span className="text-xs font-semibold uppercase">
              {isOver ? 'Budget Overrun' : 'Remaining Budget'}
            </span>
            <p className="text-xl sm:text-2xl font-black mt-1 font-mono">
              {isOver ? '- ' : ''}₹ {Math.abs(variance).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Cost Breakdown by Category
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Detailed itemized spend across concrete, steel, labor, plant & logistics
        </p>

        {breakdown.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic">
            No approved expenses incurred for this project yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-center">Vouchers</th>
                  <th className="pb-3 text-right">Actual Spent (INR)</th>
                  <th className="pb-3 text-right">% of Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.map((item) => {
                  const pct = budget > 0 ? ((item.total_spent / budget) * 100).toFixed(1) : '0';
                  return (
                    <tr key={item.category_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-medium text-slate-800">{item.category_name}</td>
                      <td className="py-3 text-center text-slate-500 font-mono text-xs">{item.expense_count}</td>
                      <td className="py-3 text-right font-bold text-slate-900 font-mono">
                        ₹ {Number(item.total_spent).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right text-slate-600 font-mono text-xs">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assigned Site Team */}
      {project?.members && project.members.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">Assigned Site Personnel</h3>
          <p className="text-xs text-slate-500 mb-4">Engineers and managers stationed on this site</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {project.members.map((m) => (
              <div key={m.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-600 flex items-center justify-center font-bold text-xs">
                  {m.name.slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{m.role_in_project} ({m.role})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Expenses List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Expense Ledger</h3>
            <p className="text-xs text-slate-500">All vouchers submitted for {project?.name}</p>
          </div>
          <span className="text-xs font-semibold font-mono text-slate-500">
            {expenses.length} Records
          </span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center italic">
            No expenses recorded for this project yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExpense(exp)}
                className="py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {exp.reference_no}
                    </span>
                    <StatusBadge status={exp.status} size="xs" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {exp.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {exp.category_name} • {exp.expense_date} • By {exp.submitter_name}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                    ₹ {Number(exp.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          onActionSuccess={loadData}
        />
      )}
    </div>
  );
}

export default ProjectDetail;
