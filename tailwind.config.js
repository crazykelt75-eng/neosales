/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /** Ultra-deep midnight canvas + layered glass surfaces. */
        midnight: '#07080c',
        surface: {
          DEFAULT: '#0e1118',
          elevated: '#131722',
          subtle: '#181d2a',
        },
        /** Botswana Mobile Money orange — primary conversion accent. */
        orangeMoney: {
          DEFAULT: '#ff6600',
          light: '#ff8a3d',
          dark: '#d95700',
        },
        /** WhatsApp rail. */
        whatsapp: {
          DEFAULT: '#25D366',
          dark: '#1ebe5d',
        },
        /** FNB Pay2Cell rail. */
        fnb: {
          DEFAULT: '#00a3a6',
          dark: '#007b7d',
        },
        /** Legacy Botswana palette retained for accents. */
        bw: {
          blue: '#00cbff',
          gold: '#d4af37',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 45px -25px rgba(0,0,0,0.95)',
        elevated: '0 24px 70px -30px rgba(0,0,0,0.95)',
        'glow-orange': '0 0 0 1px rgba(255,102,0,0.35), 0 12px 35px -12px rgba(255,102,0,0.45)',
        'glow-amber': '0 0 25px -8px rgba(245,158,11,0.5)',
        'glow-emerald': '0 0 25px -8px rgba(16,185,129,0.45)',
      },
      backgroundImage: {
        'luxe-radial':
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,102,0,0.15), transparent 70%), radial-gradient(ellipse 60% 60% at 100% 10%, rgba(245,158,11,0.07), transparent 65%)',
        'gold-sheen': 'linear-gradient(135deg, #f59e0b 0%, #ff6600 55%, #d95700 100%)',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.97) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        heroProgress: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        confirmed: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(0.94)' },
          '70%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        slideInRight: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        slideOutRight: 'slideOutRight 0.22s cubic-bezier(0.4, 0, 1, 1)',
        fadeIn: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        scaleIn: 'scaleIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        confirmed: 'confirmed 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pulseRing: 'pulseRing 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
};
