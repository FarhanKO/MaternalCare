/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Calm, trustworthy soft-blue system
        brand: {
          50: '#eef4ff',
          100: '#dfeaff',
          200: '#c6d9ff',
          300: '#a3c0ff',
          400: '#7a9dff',
          500: '#5b83fb',
          600: '#3f66f0',
          700: '#3352d4',
          800: '#2c44ab',
          900: '#293e87',
        },
        // Secondary calm cyan/teal — used sparingly for accents & 2nd chart series
        aqua: {
          300: '#7fe3e8',
          400: '#45cdd6',
          500: '#22b8c4',
          600: '#0f97a6',
        },
        // Peach-orange — the doctor / clinician theme
        peach: {
          50: '#fff6f0',
          100: '#ffe9dc',
          200: '#ffd2b8',
          300: '#ffb48a',
          400: '#ff9159',
          500: '#fb7534',
          600: '#ea5c1d',
          700: '#c04a1a',
        },
        ink: {
          DEFAULT: '#0d1526',
          soft: '#3d4763',
          muted: '#6b7590',
          faint: '#9aa3ba',
        },
        surface: {
          base: '#f4f7fe',
          raised: '#fbfcff',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',      // 32px
        '3.5xl': '1.75rem', // 28px
      },
      boxShadow: {
        // Soft, layered, blue-tinted elevation
        glass: '0 1px 1px rgba(255,255,255,0.6) inset, 0 8px 24px -8px rgba(29,54,120,0.16), 0 24px 60px -20px rgba(29,54,120,0.20)',
        'glass-lg': '0 1px 1px rgba(255,255,255,0.7) inset, 0 16px 40px -12px rgba(29,54,120,0.22), 0 40px 90px -28px rgba(29,54,120,0.28)',
        soft: '0 2px 8px -2px rgba(29,54,120,0.08), 0 12px 32px -12px rgba(29,54,120,0.16)',
        glow: '0 0 0 1px rgba(91,131,251,0.15), 0 12px 40px -8px rgba(91,131,251,0.45)',
        // Floating bars (navbar, section dock) — reads clearly against any scrolled content
        float: '0 1px 1px rgba(255,255,255,0.7) inset, 0 2px 6px -1px rgba(29,54,120,0.16), 0 12px 28px -6px rgba(29,54,120,0.30), 0 28px 60px -18px rgba(29,54,120,0.34)',
        'inner-top': 'inset 0 1px 0 0 rgba(255,255,255,0.65)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(30px,-24px) scale(1.06)' },
        },
        aurora: {
          '0%,100%': { transform: 'translate(0,0) rotate(0deg)' },
          '33%': { transform: 'translate(4%,-6%) rotate(6deg)' },
          '66%': { transform: 'translate(-4%,4%) rotate(-6deg)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'glow-pulse': {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        kenburns: {
          '0%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1.09)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 20s ease-in-out infinite alternate',
        aurora: 'aurora 24s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        marquee: 'marquee 32s linear infinite',
        kenburns: 'kenburns 18s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
