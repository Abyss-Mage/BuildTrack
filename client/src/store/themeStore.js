import { create } from 'zustand';

const STORAGE_KEY = 'theme';
const MODES = ['light', 'dark', 'system'];

const readStoredMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (mode) => {
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

export const useThemeStore = create((set, get) => ({
  mode: readStoredMode(),

  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage unavailable: the choice lasts for this session only
    }

    const change = () => {
      applyTheme(mode);
      set({ mode });
    };

    // Cross-fade the whole page instead of snapping, unless motion is reduced
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduceMotion) {
      document.startViewTransition(change);
    } else {
      change();
    }
  },

  cycleMode: () => {
    const next = MODES[(MODES.indexOf(get().mode) + 1) % MODES.length];
    get().setMode(next);
  },
}));

// Keep "system" in sync with the OS setting while the app is open
export const initTheme = () => {
  applyTheme(useThemeStore.getState().mode);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') applyTheme('system');
  });
};
