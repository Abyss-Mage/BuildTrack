import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import StatusBadge from '../components/ui/StatusBadge';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  Calendar,
  Building2,
  Tag,
  Loader2,
  TrendingUp,
} from 'lucide-react';

export function Reports() {
  const { user } = useAuthStore();
  const { showNotification } = useUiStore();

  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    projectId: '',
    categoryId: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const loadOptions = async () => {
    try {
      const [pRes, cRes] = await Promise.all([api.get('/projects'), api.get('/categories')]);
      setProjects(pRes.data.data || []);
      setCategories(cRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const res = await api.get(`/reports/expenses?${queryParams.toString()}`);
      setExpenses(res.data.data || []);
    } catch (err) {
      showNotification('Failed to generate report preview', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [filters]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await api.get(`/reports/expenses/pdf?${queryParams.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Expense_Report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('PDF report generated and downloaded successfully');
    } catch (err) {
      showNotification('Failed to download PDF report', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await api.get(`/reports/expenses/excel?${queryParams.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Expense_Report_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Excel spreadsheet generated and downloaded successfully');
    } catch (err) {
      showNotification('Failed to download Excel report', 'error');
    } finally {
      setDownloadingExcel(false);
    }
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Financial Expense Reports & Exports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter, analyze, and generate audit-ready PDF dossiers and Excel spreadsheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || expenses.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-brand-400" />}
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel || expenses.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50"
          >
            {downloadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-500" />
          <span>Report Filter Criteria</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Project Site
            </label>
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Category
            </label>
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Voucher Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="processed">Processed & Paid</option>
              <option value="rejected">Rejected</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Date Interval
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider block">
            Report Aggregate Total
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono">
            ₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div>
            <span className="block text-slate-400 font-medium">Total Entries</span>
            <span className="text-base font-bold text-white font-mono">{expenses.length}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium">Average / Voucher</span>
            <span className="text-base font-bold text-white font-mono">
              ₹ {expenses.length > 0 ? (totalAmount / expenses.length).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Live Preview Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Generated Report Preview</h3>
          <span className="text-xs text-slate-400 font-mono">{expenses.length} Records</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <p className="text-sm">Compiling financial data...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Records Match Filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Adjust your date range or filters above to preview vouchers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Ref #</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Project</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Title / Vendor</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                      {exp.reference_no}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {exp.expense_date}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      [{exp.project_code}] {exp.project_name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{exp.category_name}</td>
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-slate-900">{exp.title}</p>
                      {exp.vendor_name && (
                        <p className="text-[10px] text-slate-400">Vendor: {exp.vendor_name}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                      ₹ {Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge status={exp.status} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
