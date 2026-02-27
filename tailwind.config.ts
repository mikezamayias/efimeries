import type { Config } from 'tailwindcss'
import tailwindAnimate from 'tailwindcss-animate'

export default {
  content: [
    './app/**/*.{vue,ts,tsx}',
    './components/**/*.{vue,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-text-secondary)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
        },
        border: 'var(--color-border)',
        weekend: {
          bg: 'var(--color-weekend-bg)',
          text: 'var(--color-weekend-text)',
        },
        danger: 'var(--color-danger)',
        positive: 'var(--color-positive)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config
