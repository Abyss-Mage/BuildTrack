import React from 'react';

const STATUS_CONFIGS = {
  draft: {
    label: 'Draft',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  },
  pending: {
    label: 'Pending Approval',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500 animate-pulse',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-blue-50 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
  },
  processed: {
    label: 'Processed & Paid',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-rose-50 text-rose-800 border-rose-300',
    dot: 'bg-rose-500',
  },
  active: {
    label: 'Active',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
  },
  on_hold: {
    label: 'On Hold',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
  },
};

export function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIGS[status] || {
    label: status,
    bg: 'bg-gray-100 text-gray-700 border-gray-300',
    dot: 'bg-gray-400',
  };

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-xs'
      : size === 'md'
      ? 'px-3 py-1 text-sm'
      : 'px-2.5 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}

export default StatusBadge;
