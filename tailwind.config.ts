import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        input: 'var(--bg-input)',
        'border-default': 'var(--border-default)',
        'text-main': 'var(--text-primary)',
        'text-sub': 'var(--text-secondary)',
        steam: {
          dark: '#171a21',
          card: '#1b2838',
          cardHover: '#2a475e',
          accent: '#66c0f4',
          green: '#a4d007',
          orange: '#f39c12',
          red: '#e74c3c',
          text: '#c7d5e0',
          muted: '#8f98a0',
          border: 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
