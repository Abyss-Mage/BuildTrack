import React, { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useUiStore } from '../store/uiStore';
import { PERIOD_TYPES, periodEndDate, toLocalDate } from '../utils/dateUtils';
import { CheckCircle2, FileSpreadsheet, Loader2, MessageCircle, Trash2, UploadCloud } from 'lucide-react';

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';
const formatINR = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const emptyUpload = () => ({
  project_id: '',
  period_type: 'monthly',
  start_date: toLocalDate(),
  end_date: periodEndDate('monthly', toLocalDate()),
});
const emptyFilters = { projectId: '', employee: '', designation: '', periodType: '', startDate: '', endDate: '', sheetId: '' };

function PhoneCell({ row, onSaved }) {
  const { showNotification } = useUiStore();
  const [phone, setPhone] = useState(row.phone || '');

  const save = async () => {
    if (phone === (row.phone || '') || !phone) return;
    try {
      await api.put(`/wage-sheets/employees/${row.employee_id}/phone`, { phone });
      showNotification(`Mobile number saved for ${row.employee_name}`);
      onSaved();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save mobile number', 'error');
    }
  };

  return (
    <input
      aria-label={`Mobile number for ${row.employee_name}`}
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      onBlur={save}
      placeholder="Add mobile"
      className="w-28 px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:border-brand-500 outline-none"
    />
  );
}

export function WageSheets() {
  const { showNotification } = useUiStore();
  const fileInput = useRef(null);

  const [projects, setProjects] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [filters, setFilters] = useState(emptyFilters);
  const [upload, setUpload] = useState(emptyUpload);
  const [isUploading, setIsUploading] = useState(false);
  const [busySheet, setBusySheet] = useState(null);

  const paramsFrom = (list) => Object.fromEntries(Object.entries(list).filter(([, value]) => value));

  const loadSheets = () =>
    api
      .get('/wage-sheets', { params: paramsFrom({ projectId: filters.projectId, periodType: filters.periodType, startDate: filters.startDate, endDate: filters.endDate }) })
      .then((res) => setSheets(res.data.data || []))
      .catch(() => showNotification('Failed to load wage sheets', 'error'));

  const loadRows = () =>
    api
      .get('/wage-sheets/rows', { params: paramsFrom(filters) })
      .then((res) => {
        setRows(res.data.data.rows || []);
        setTotals(res.data.data.totals || {});
      })
      .catch(() => showNotification('Failed to load wage records', 'error'));

  const reload = () => Promise.all([loadSheets(), loadRows()]);

  useEffect(() => {
    api
      .get('/projects')
      .then((res) => setProjects(res.data.data || []))
      .catch(() => showNotification('Failed to load sites', 'error'));
  }, []);

  useEffect(() => {
    const timer = setTimeout(reload, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  const changePeriod = (changes) => {
    setUpload((prev) => {
      const next = { ...prev, ...changes };
      return { ...next, end_date: periodEndDate(next.period_type, next.start_date) || (changes.period_type ? '' : next.end_date) };
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInput.current?.files?.[0];
    if (!file) {
      showNotification('Choose the Excel wage sheet to upload', 'error');
      return;
    }

    const data = new FormData();
    Object.entries(upload).forEach(([key, value]) => data.append(key, value));
    data.append('file', file);

    try {
      setIsUploading(true);
      const res = await api.post('/wage-sheets', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 });
      const { employees, net } = res.data.data;
      showNotification(`${employees} employees imported, total payable ${formatINR(net)}`);
      fileInput.current.value = '';
      setFilters({ ...emptyFilters, sheetId: String(res.data.data.sheetId) });
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to upload wage sheet', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const runOnSheet = async (sheet, action) => {
    try {
      setBusySheet(sheet.id);
      await action();
      await reload();
    } finally {
      setBusySheet(null);
    }
  };

  const sendWhatsApp = (sheet) => {
    if (!window.confirm(`Send wage details on WhatsApp to the ${sheet.employee_count} employees on this sheet?`)) return;
    runOnSheet(sheet, async () => {
      try {
        const res = await api.post(`/wage-sheets/${sheet.id}/whatsapp`, {}, { timeout: 0 });
        const { sent, failed, alreadySent } = res.data.data;
        showNotification(`WhatsApp: ${sent} sent, ${failed} failed, ${alreadySent} already sent`, failed ? 'error' : 'success');
      } catch (err) {
        showNotification(err.response?.data?.message || 'WhatsApp send failed', 'error');
      }
    });
  };

  const markPaid = (sheet) => {
    if (!window.confirm(`Mark every employee on this sheet as paid in full (${formatINR(sheet.total_net)})?`)) return;
    runOnSheet(sheet, async () => {
      try {
        await api.post(`/wage-sheets/${sheet.id}/mark-paid`);
        showNotification('Wage sheet marked as paid');
      } catch (err) {
        showNotification(err.response?.data?.message || 'Failed to mark as paid', 'error');
      }
    });
  };

  const deleteSheet = (sheet) => {
    if (!window.confirm(`Delete the wage sheet for ${sheet.start_date} to ${sheet.end_date}? This cannot be undone.`)) return;
    runOnSheet(sheet, async () => {
      try {
        await api.delete(`/wage-sheets/${sheet.id}`);
        showNotification('Wage sheet deleted');
        if (filters.sheetId === String(sheet.id)) setFilters({ ...filters, sheetId: '' });
      } catch (err) {
        showNotification(err.response?.data?.message || 'Failed to delete wage sheet', 'error');
      }
    });
  };

  const cards = [
    { label: 'Employees', value: totals.employees || 0, tone: 'text-slate-900' },
    { label: 'Total Wages Payable', value: formatINR(totals.net), tone: 'text-slate-900' },
    { label: 'Total Disbursed', value: formatINR(totals.paid), tone: 'text-emerald-600' },
    { label: 'Balance to Pay', value: formatINR(totals.balance), tone: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-brand-500" />
          <span>Wage Sheets (Excel)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload the wage sheet for a site and period. Amounts are kept exactly as Excel calculated them.
        </p>
      </div>

      <form onSubmit={handleUpload} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass} htmlFor="wage-project">Project / Site *</label>
            <select id="wage-project" required value={upload.project_id} onChange={(e) => setUpload({ ...upload, project_id: e.target.value })} className={inputClass}>
              <option value="">Select Site</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="wage-type">Period *</label>
            <select id="wage-type" value={upload.period_type} onChange={(e) => changePeriod({ period_type: e.target.value })} className={inputClass}>
              {PERIOD_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="wage-start">From *</label>
            <input id="wage-start" type="date" required value={upload.start_date} onChange={(e) => changePeriod({ start_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="wage-end">To *</label>
            <input id="wage-end" type="date" required value={upload.end_date} onChange={(e) => setUpload({ ...upload, end_date: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            aria-label="Excel wage sheet"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="flex-1 text-xs text-slate-600"
          />
          <button
            type="submit"
            disabled={isUploading}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-950 bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>Upload Wage Sheet</span>
          </button>
        </div>
      </form>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <select aria-label="Filter by site" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value, sheetId: '' })} className={inputClass}>
          <option value="">All Sites</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.code}] {p.name}
            </option>
          ))}
        </select>
        <input aria-label="Filter by employee name" placeholder="Employee name" value={filters.employee} onChange={(e) => setFilters({ ...filters, employee: e.target.value })} className={inputClass} />
        <input aria-label="Filter by designation" placeholder="Designation" value={filters.designation} onChange={(e) => setFilters({ ...filters, designation: e.target.value })} className={inputClass} />
        <select aria-label="Filter by period type" value={filters.periodType} onChange={(e) => setFilters({ ...filters, periodType: e.target.value, sheetId: '' })} className={inputClass}>
          <option value="">All Periods</option>
          {PERIOD_TYPES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input aria-label="From date" type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value, sheetId: '' })} className={inputClass} />
        <input aria-label="To date" type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value, sheetId: '' })} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{card.label}</span>
            <span className={`text-xl sm:text-2xl font-black mt-1 block ${card.tone}`}>{card.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <h2 className="px-5 pt-4 text-sm font-bold text-slate-900">Uploaded Sheets</h2>
        {sheets.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No wage sheets uploaded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {sheets.map((sheet) => (
              <div key={sheet.id} className="px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <button type="button" onClick={() => setFilters({ ...emptyFilters, sheetId: String(sheet.id) })} className="text-left">
                  <span className="text-sm font-bold text-slate-900 block">
                    [{sheet.project_code}] {sheet.project_name} • {sheet.start_date} to {sheet.end_date}
                  </span>
                  <span className="text-xs text-slate-500">
                    <span className="capitalize">{sheet.period_type}</span> • {sheet.employee_count} employees • {formatINR(sheet.total_net)} payable •{' '}
                    {formatINR(sheet.total_paid)} paid • {sheet.whatsapp_sent_count} WhatsApp sent
                  </span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => sendWhatsApp(sheet)}
                    disabled={busySheet === sheet.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {busySheet === sheet.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    <span>Send Payroll Details via WhatsApp</span>
                  </button>
                  {Number(sheet.total_paid) < Number(sheet.total_net) && (
                    <button
                      onClick={() => markPaid(sheet)}
                      disabled={busySheet === sheet.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Paid</span>
                    </button>
                  )}
                  <button
                    aria-label={`Delete wage sheet ${sheet.start_date} to ${sheet.end_date}`}
                    onClick={() => deleteSheet(sheet)}
                    disabled={busySheet === sheet.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No wage records match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1200px]">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3">Site / Period</th>
                  <th className="py-3 px-3">Mobile</th>
                  <th className="py-3 px-3 text-right">Rate</th>
                  <th className="py-3 px-3 text-right">Present</th>
                  <th className="py-3 px-3 text-right">Total Salary</th>
                  <th className="py-3 px-3 text-right">TA Up</th>
                  <th className="py-3 px-3 text-right">TA Down</th>
                  <th className="py-3 px-3 text-right">Advance</th>
                  <th className="py-3 px-3 text-right">PF</th>
                  <th className="py-3 px-3 text-right">Net Payable</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-900 block">{row.employee_name}</span>
                      <span className="text-slate-500 block">S/o {row.father_name}</span>
                      {row.uan && <span className="text-slate-400 block">UAN {row.uan}</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-700">{row.designation}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      <span className="block">{row.project_code}</span>
                      {row.start_date} to {row.end_date}
                    </td>
                    <td className="py-2 px-3">
                      <PhoneCell key={`${row.employee_id}-${row.phone}`} row={row} onSaved={loadRows} />
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(row.rate)}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(row.days_present)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(row.total_salary)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(row.ta_up)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(row.ta_down)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(row.salary_advance)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(row.pf_deduction)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(row.net_payable)}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatINR(row.paid)}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-normal min-w-[120px] max-w-[200px]">
                      {row.whatsapp_sent_at ? 'Sent' : row.whatsapp_error ? <span className="text-rose-600">{row.whatsapp_error}</span> : '-'}
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

export default WageSheets;
