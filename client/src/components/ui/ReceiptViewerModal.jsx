import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export function ReceiptViewerModal({ receipt, onClose }) {
  if (!receipt) return null;

  const isPdf = receipt.mime_type === 'application/pdf' || receipt.file_path?.endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-brand-400" />
            <div>
              <p className="font-medium text-sm text-slate-200 truncate max-w-md">
                {receipt.original_name}
              </p>
              <p className="text-xs text-slate-400">
                {(receipt.file_size / 1024).toFixed(1)} KB • {receipt.mime_type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={receipt.file_path}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <a
              href={receipt.file_path}
              download={receipt.original_name}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
          {isPdf ? (
            <iframe
              src={receipt.file_path}
              title={receipt.original_name}
              className="w-full h-[70vh] rounded-lg border-0"
            />
          ) : (
            <img
              src={receipt.file_path}
              alt={receipt.original_name}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ReceiptViewerModal;
