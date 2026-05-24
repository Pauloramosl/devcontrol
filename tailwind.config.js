/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ─── DESIGN SYSTEM: DevControl v2 ───────────────────────────
      colors: {
        dn: {
          bg: {
            base: '#050A14',
            primary: '#0A1220',
            card: '#101B30',
            elevated: '#162236',
            hover: '#1E2D44',
            active: '#263548',
          },
          accent: {
            DEFAULT: '#3ABFFF',
            strong: '#1A6FFF',
            10: 'rgba(26,111,255,0.1)',
            20: 'rgba(58,191,255,0.2)',
          },
          border: {
            DEFAULT: 'rgba(58,191,255,0.12)',
            hover: 'rgba(58,191,255,0.35)',
          },
          success: {
            DEFAULT: '#10B981',
            bg: 'rgba(16,185,129,0.1)',
          },
          warning: {
            DEFAULT: '#F59E0B',
            bg: 'rgba(245,158,11,0.1)',
          },
          danger: {
            DEFAULT: '#EF4444',
            bg: 'rgba(239,68,68,0.1)',
          },
          purple: {
            DEFAULT: '#8B5CF6',
            bg: 'rgba(139,92,246,0.1)',
          },
          orange: {
            DEFAULT: '#F97316',
          },
          text: {
            100: '#FFFFFF',
            primary: '#E8EDF5',
            secondary: '#8FA3BF',
            muted: '#4A5F7A',
            accent: '#3ABFFF',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['monospace'],
      },
      fontSize: {
        // MD3 Type Scale replaced by DevControl v2 Scale
        'dn-display': ['32px', { lineHeight: '1.2', letterSpacing: '-0.04em', fontWeight: '700' }],
        'dn-h1':      ['28px', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '700' }],
        'dn-h2':      ['22px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'dn-h3':      ['16px', { lineHeight: '1.4', letterSpacing: '0',       fontWeight: '600' }],
        'dn-body':    ['14px', { lineHeight: '1.6', letterSpacing: '0',       fontWeight: '400' }],
        'dn-label':   ['11px', { lineHeight: '1.4', letterSpacing: '0.08em',  fontWeight: '500' }],
        'dn-mono':    ['13px', { lineHeight: '1.4', letterSpacing: '0',       fontWeight: '400' }],
        'dn-caption': ['10px', { lineHeight: '1.4', letterSpacing: '0',       fontWeight: '400' }],
      },
      borderRadius: {
        'dn-sm':   '6px',
        'dn-md':   '8px',
        'dn-lg':   '12px',
        'dn-xl':   '16px',
        'dn-full': '9999px',
      },
      boxShadow: {
        'dn-ambient': '0px 24px 48px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'dn-ambient-blue':   'radial-gradient(circle, rgba(58,191,255,0.3) 0%, transparent 70%)',
        'dn-ambient-purple': 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
        'dn-ambient-red':    'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)',
        'dn-ambient-amber':  'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
      },
      backdropBlur: {
        'dn-glass': '12px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        rotate: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'dn-shimmer': 'shimmer 1.5s infinite linear',
        'dn-spin': 'rotate 0.8s linear infinite',
        'spin-slow': 'rotate 6s linear infinite',
      },
      transitionDuration: {
        '2000': '2000ms',
        '4000': '4000ms',
      },
    },
  },
  plugins: [],
}
