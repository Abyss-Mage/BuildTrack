import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastNotification() {
  const { notification, clearNotification } = useUiStore();

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border border-black/5 material-thin animate-toast-in">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}

      <p className="text-sm font-medium text-slate-800 pr-2">{notification.message}</p>

      <button
        onClick={clearNotification}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastNotification;
