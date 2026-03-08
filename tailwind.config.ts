import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e5ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#5989ff',
          500: '#3363ff',
          600: '#1b40f5',
          700: '#142ee1',
          800: '#1726b6',
          900: '#19268f',
          950: '#0f1557',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(0,0,0,.03), 0 2px 4px rgba(0,0,0,.02), 0 12px 24px rgba(0,0,0,.03)',
        'card-hover': '0 0 0 1px rgba(0,0,0,.03), 0 4px 8px rgba(0,0,0,.04), 0 24px 48px rgba(0,0,0,.05)',
        'soft': '0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03)',
        'glow': '0 0 32px -8px rgba(27,64,245,.25)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,.04)',
      },
      backgroundImage: {
        'gradient-subtle': 'linear-gradient(135deg, rgba(238,244,255,.5) 0%, rgba(255,255,255,0) 60%)',
      },
      animation: {
        'fade-in': 'fadeIn .4s ease-out both',
        'fade-up': 'fadeUp .5s ease-out both',
        'slide-in': 'slideIn .3s ease-out both',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
