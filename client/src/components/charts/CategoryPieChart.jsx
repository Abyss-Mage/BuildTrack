import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#64748b', // Slate
  '#84cc16', // Lime
];

export function CategoryPieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No approved expenses recorded yet for category breakdown.
      </div>
    );
  }

  const formatTooltipValue = (val) => `₹ ${Number(val).toLocaleString('en-IN')}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltipValue} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryPieChart;
