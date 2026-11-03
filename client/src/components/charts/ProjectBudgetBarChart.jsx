import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function ProjectBudgetBarChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No active projects available for budget comparison.
      </div>
    );
  }

  const formatYAxis = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val}`;
  };

  const formatTooltip = (val) => `₹ ${Number(val).toLocaleString('en-IN')}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#64748b' }} width={55} />
          <Tooltip formatter={formatTooltip} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="budget" name="Total Budget" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="spent" name="Actual Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ProjectBudgetBarChart;
