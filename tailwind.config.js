import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

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
        // Brand colors from style guide
        'deep-teal': '#668a84',
        'sage-green': '#89b09f', 
        'muted-gold': '#b09763',
        'sandstone': '#dfd7c6',
        // Legacy lichen colors (keeping for compatibility)
        'lichen-gold': 'var(--aw-color-gold)',
        'lichen-beige': 'var(--aw-color-beige)',
        'lichen-gray': 'var(--aw-color-gray)',
        'lichen-teal': 'var(--aw-color-teal)',
        'lichen-sage': 'var(--aw-color-sage)',
        'lichen-light-green': '#8fbc8f',
      },
      fontFamily: {
        sans: ['Helvetica', ...defaultTheme.fontFamily.sans],
        serif: ['var(--aw-font-serif, ui-serif)', ...defaultTheme.fontFamily.serif],
        heading: ['Raleway', ...defaultTheme.fontFamily.sans],
        raleway: ['Raleway', ...defaultTheme.fontFamily.sans],
      },

      animation: {
        fade: 'fadeInUp 1s both',
        'spin-slow': 'spin 2.5s linear infinite',
        'spin-once': 'spin-once 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
      },

      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(2rem)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'spin-once': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [
    typographyPlugin,
    plugin(({ addVariant }) => {
      addVariant('intersect', '&:not([no-intersect])');
    }),
  ],
  darkMode: 'class',
};
