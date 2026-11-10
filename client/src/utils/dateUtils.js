/**
 * Utilities for Construction Weekly Payroll & Date Ranges
 */

// YYYY-MM-DD in the user's own time zone; toISOString alone gives the UTC day, which is a day behind in India
export function toLocalDate(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const PERIOD_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Date Range' },
];

/** Suggested last day of a period; custom ranges are left for the user to pick. */
export function periodEndDate(type, startDate) {
  if (!startDate || type === 'custom') return '';
  const start = new Date(`${startDate}T00:00:00`);
  if (type === 'monthly') return toLocalDate(new Date(start.getFullYear(), start.getMonth() + 1, 0));
  start.setDate(start.getDate() + (type === 'weekly' ? 6 : 13));
  return toLocalDate(start);
}

export function getISOWeekDetails(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return getISOWeekDetails(new Date());

  const day = d.getDay() === 0 ? 7 : d.getDay(); // 1 (Mon) - 7 (Sun)

  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // ISO 8601 week calculation (Thursday determines the year)
  const target = new Date(monday);
  target.setDate(target.getDate() + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNo = 1 + Math.ceil((firstThursday - target) / 604800000);
  const year = monday.getFullYear();

  const padWeek = String(weekNo).padStart(2, '0');
  const code = `${year}-W${padWeek}`;

  const startStr = monday.toISOString().slice(0, 10);
  const endStr = sunday.toISOString().slice(0, 10);

  const monLabel = monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const sunLabel = sunday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const label = `Week ${weekNo} (${monLabel} - ${sunLabel})`;
  const shortLabel = `Week ${weekNo}`;

  return { code, weekNo, year, startDate: startStr, endDate: endStr, label, shortLabel };
}

export function getRecentWeeks() {
  const weeks = [];
  const now = new Date();
  for (let i = -8; i <= 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + (i * 7));
    const info = getISOWeekDetails(d);
    if (!weeks.some((w) => w.code === info.code)) {
      weeks.push(info);
    }
  }
  return weeks.sort((a, b) => b.code.localeCompare(a.code));
}

export function formatPeriodDisplay(periodStr) {
  if (!periodStr) return '';
  if (periodStr.includes('-W')) {
    const [year, week] = periodStr.split('-W');
    return `Week ${parseInt(week, 10)}, ${year}`;
  }
  if (periodStr.includes('-')) {
    const [year, month] = periodStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  return periodStr;
}
