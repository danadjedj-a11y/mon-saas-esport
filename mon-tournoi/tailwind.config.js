/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === NEON GLASS DESIGN SYSTEM ===
        // Background
        'dark': {
          DEFAULT: '#0A0A0F',
          '50': '#12121A',
          '100': '#1A1A24',
          '200': '#22222E',
        },
        // Accent Colors
        'violet': {
          DEFAULT: '#8B5CF6',
          'light': '#A78BFA',
          'dark': '#7C3AED',
          'glow': 'rgba(139, 92, 246, 0.4)',
        },
        'cyan': {
          DEFAULT: '#06B6D4',
          'light': '#22D3EE',
          'dark': '#0891B2',
          'glow': 'rgba(6, 182, 212, 0.4)',
        },
        'pink': {
          DEFAULT: '#EC4899',
          'light': '#F472B6',
          'dark': '#DB2777',
          'glow': 'rgba(236, 72, 153, 0.6)',
        },
        // Semantic Colors
        'success': {
          DEFAULT: '#10B981',
          'light': '#34D399',
          'dark': '#059669',
        },
        'danger': {
          DEFAULT: '#EF4444',
          'light': '#F87171',
          'dark': '#DC2626',
        },
        'warning': {
          DEFAULT: '#F59E0B',
          'light': '#FBBF24',
          'dark': '#D97706',
        },
        // Text Colors
        'text': {
          DEFAULT: '#F8FAFC',
          'secondary': '#94A3B8',
          'muted': '#64748B',
        },
        // Glass Effect Colors
        'glass': {
          'white': 'rgba(255, 255, 255, 0.05)',
          'border': 'rgba(255, 255, 255, 0.1)',
          'hover': 'rgba(255, 255, 255, 0.08)',
        },
        // Legacy aliases (backwards compatibility)
        'fluky-bg': '#0A0A0F',
        'fluky-primary': '#8B5CF6',
        'fluky-secondary': '#06B6D4',
        'fluky-accent-orange': '#F59E0B',
        'fluky-accent-yellow': '#FBBF24',
        'fluky-text': '#F8FAFC',
        'primary': '#8B5CF6',
        'secondary': '#06B6D4',
        'accent': '#EC4899',
        'background': '#0A0A0F',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'heading': ['Space Grotesk', 'sans-serif'],
      },
      fontSize: {
        'display': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['clamp(1.25rem, 2vw, 1.5rem)', { lineHeight: '1.3', fontWeight: '600' }],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero': 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #EC4899 100%)',
        'gradient-subtle': 'linear-gradient(180deg, rgba(139,92,246,0.1) 0%, transparent 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-md': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 30px rgba(139, 92, 246, 0.5)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-pink': '0 0 15px rgba(236, 72, 153, 0.6)',
        'elevation-1': '0 1px 3px rgba(0,0,0,0.3)',
        'elevation-2': '0 4px 12px rgba(0,0,0,0.4)',
        'elevation-3': '0 12px 40px rgba(0,0,0,0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '12px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
        'live-pulse': 'live-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6), 0 0 30px rgba(6, 182, 212, 0.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'slideUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideDown': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scaleIn': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 5px rgba(236, 72, 153, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 20px rgba(236, 72, 153, 0.8)' },
        },
      },
      transitionTimingFunction: {
        'bounce-sm': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
