import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

const OPTIONS = {
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
  system: { label: 'System', icon: Monitor },
};

export function ThemeToggle() {
  const { mode, cycleMode } = useThemeStore();
  const { label, icon: Icon } = OPTIONS[mode];

  return (
    <button
      type="button"
      onClick={cycleMode}
      aria-label={`Theme: ${label}. Switch theme`}
      title={`Theme: ${label}`}
      className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100"
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
    </button>
  );
}

export default ThemeToggle;
