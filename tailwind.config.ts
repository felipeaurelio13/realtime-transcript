import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        accentForeground: 'var(--color-accent-foreground)'
      },
      borderRadius: {
        card: '1rem'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(16, 24, 40, 0.06)'
      },
      transitionDuration: {
        smooth: '200ms'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
