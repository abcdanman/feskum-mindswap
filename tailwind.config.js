/** @type {import('tailwind-merge').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        ink: '#0f172a',
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#e63946',
          600: '#d9232e',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        cream: {
          50: '#FAF8F5',
          100: '#F7F5F0',
          200: '#EFECE6',
          300: '#E5E0D8',
        },
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        brut: '3px 3px 0 0 #0f172a',
        'brut-lg': '5px 5px 0 0 #0f172a',
        'brut-red': '3px 3px 0 0 #e63946',
        'brut-gold': '3px 3px 0 0 #f59e0b',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        float: 'float 4s ease-in-out infinite',
        'stamp-bump': 'stampBump 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        fadeIn: 'fadeIn 0.35s ease-out forwards',
        marquee: 'marquee 22s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.8', filter: 'drop-shadow(0 0 8px rgba(230, 57, 70, 0.2))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 16px rgba(230, 57, 70, 0.4))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        stampBump: {
          '0%': { transform: 'scale(2.2) rotate(-15deg)', opacity: '0' },
          '60%': { transform: 'scale(0.95) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};
