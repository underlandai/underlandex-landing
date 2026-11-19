import defaultTheme from 'tailwindcss/defaultTheme';
import typographyPlugin from '@tailwindcss/typography';

// "Strata" design tokens. Brand colours come from the Underland Brand Style Guide;
// the ink / sand ramps extend them for dark and light surfaces.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--aw-color-primary)',
        secondary: 'var(--aw-color-secondary)',
        accent: 'var(--aw-color-accent)',
        default: 'var(--aw-color-text-default)',
        muted: 'var(--aw-color-text-muted)',
        // Brand palette
        teal: { DEFAULT: '#668a84', dark: '#4a6963', deep: '#3d5852' },
        sage: '#89b09f',
        gold: { DEFAULT: '#b09763', bright: '#d6bd83', deep: '#7d6734' },
        sand: { DEFAULT: '#dfd7c6', 100: '#ece6d8', 50: '#f5f1e8' },
        // Dark surfaces (deepened teal)
        ink: {
          950: '#060f0d',
          900: '#0b1917',
          800: '#10231f',
          700: '#15302b',
          600: '#1d3a35',
        },
        paper: '#f7f8f6',
        'on-dark': { DEFAULT: '#ece6d8', 2: '#a9b8b1' },
        'on-light': { DEFAULT: '#17302b', 2: '#4b5754' },
        // Style-guide names kept for existing content
        'deep-teal': '#668a84',
        'sage-green': '#89b09f',
        'muted-gold': '#b09763',
        sandstone: '#dfd7c6',
      },
      fontFamily: {
        sans: ['"Underland Body"', 'Helvetica', 'Arial', ...defaultTheme.fontFamily.sans],
        heading: ['Raleway', '"Underland Body"', 'Helvetica', 'Arial', 'sans-serif'],
        raleway: ['Raleway', '"Underland Body"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: {
        wrap: '77rem',
      },
      borderColor: {
        'line-dark': 'rgba(137, 176, 159, 0.18)',
        'line-light': 'rgba(74, 105, 99, 0.22)',
      },
      letterSpacing: {
        label: '0.16em',
      },
      boxShadow: {
        frame: '0 30px 60px -20px rgba(3, 10, 9, 0.55), 0 0 0 1px rgba(137, 176, 159, 0.16)',
        card: '0 1px 2px rgba(23, 48, 43, 0.06), 0 12px 32px -16px rgba(23, 48, 43, 0.22)',
      },
      keyframes: {
        'live-ping': {
          '0%': { boxShadow: '0 0 0 0 rgba(137, 176, 159, 0.6)' },
          '70%': { boxShadow: '0 0 0 8px rgba(137, 176, 159, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(137, 176, 159, 0)' },
        },
      },
      animation: {
        'live-ping': 'live-ping 2s infinite',
      },
    },
  },
  plugins: [typographyPlugin],
  darkMode: 'class',
};
