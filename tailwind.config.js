/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bw: {
          blue: "#00CBFF", // Botswana sky blue accent
          navy: "#0C1B2A",
          gold: "#D4AF37",
        },
        orangeMoney: {
          DEFAULT: "#FF6600",
          light: "#FFF4EC",
          dark: "#D95700",
        },
        fnb: {
          DEFAULT: "#00A3A6",
          light: "#E6F6F6",
          dark: "#007B7D",
        },
        whatsapp: {
          DEFAULT: "#25D366",
          dark: "#1EBE5D",
          light: "#E9F9EF",
        },
      },
      fontFamily: {
        sans: [
          'var(--font-jakarta)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'soft': '0 2px 10px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glow-orange': '0 0 25px -5px rgba(255, 102, 0, 0.25)',
        'glow-fnb': '0 0 25px -5px rgba(0, 163, 166, 0.25)',
        'glow-whatsapp': '0 0 25px -5px rgba(37, 211, 102, 0.3)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        heroFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        heroPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fadeIn: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        scaleIn: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        heroFadeIn: 'heroFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        heroPulse: 'heroPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
