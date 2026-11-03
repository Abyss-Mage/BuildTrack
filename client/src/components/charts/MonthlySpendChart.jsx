import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function MonthlySpendChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No monthly trend data available yet.
      </div>
    );
  }

  const formatYAxis = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  const formatTooltip = (val) => `₹ ${Number(val).toLocaleString('en-IN')}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748b' }} width={55} />
          <Tooltip formatter={formatTooltip} />
          <Area
            type="monotone"
            dataKey="approved"
            name="Approved Spend"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#approvedGradient)"
          />
          <Area
            type="monotone"
            dataKey="pending"
            name="Pending Approval"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#pendingGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlySpendChart;
