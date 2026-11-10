import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { toLocalDate } from '../../utils/dateUtils';

const FORMATS = [
  { format: 'excel', label: 'Excel', ext: 'xlsx', Icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF', ext: 'pdf', Icon: FileText },
];

/** Downloads the list at `path` with the page's current filters as Excel or PDF. */
export function ExportButtons({ path, params, fileName }) {
  const { showNotification } = useUiStore();
  const [busy, setBusy] = useState(null);

  const download = async ({ format, ext }) => {
    try {
      setBusy(format);
      const query = Object.fromEntries(Object.entries(params || {}).filter(([, value]) => value !== '' && value != null));
      const res = await api.get(`${path}/export/${format}`, { params: query, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${toLocalDate()}.${ext}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showNotification(`Failed to export ${format === 'pdf' ? 'PDF' : 'Excel'} file`, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {FORMATS.map((f) => (
        <button
          key={f.format}
          type="button"
          onClick={() => download(f)}
          disabled={Boolean(busy)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm disabled:opacity-60"
        >
          {busy === f.format ? <Loader2 className="w-4 h-4 animate-spin" /> : <f.Icon className="w-4 h-4" />}
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ExportButtons;
