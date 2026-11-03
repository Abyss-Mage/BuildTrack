const HUES = ['slate', 'brand', 'gray', 'emerald', 'rose', 'amber', 'blue', 'purple', 'sky', 'red'];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const paletteColors = Object.fromEntries(
  HUES.map((hue) => [
    hue,
    Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--${hue}-${shade}) / <alpha-value>)`])),
  ])
);

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // System font first: ships optical sizing and tracking tables
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Palettes come from CSS variables (src/theme.css) so dark mode can swap them
        ...paletteColors,
      },
      boxShadow: {
        // Soft, layered shadows: bigger surfaces read as thicker
        sm: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 1px rgb(0 0 0 / 0.03)',
        DEFAULT: '0 1px 3px rgb(0 0 0 / 0.05), 0 2px 6px rgb(0 0 0 / 0.04)',
        md: '0 2px 4px rgb(0 0 0 / 0.04), 0 8px 20px rgb(0 0 0 / 0.06)',
        lg: '0 4px 8px rgb(0 0 0 / 0.04), 0 16px 36px rgb(0 0 0 / 0.08)',
        xl: '0 8px 16px rgb(0 0 0 / 0.05), 0 28px 56px rgb(0 0 0 / 0.12)',
        '2xl': '0 12px 24px rgb(0 0 0 / 0.06), 0 40px 80px rgb(0 0 0 / 0.2)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      letterSpacing: {
        tight: '-0.022em',
        tighter: '-0.03em',
        wider: '0.04em',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
    },
  },
  plugins: [],
};
