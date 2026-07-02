/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cobalt: {
          DEFAULT: '#494fdf',
          bright: '#4f55f1',
          deep: '#3a40c4',
        },
        canvas: {
          dark: '#000000',
          light: '#ffffff',
          soft: '#f4f4f4',
          elevated: '#16181a',
          ink: '#191c1f',
        },
        cream: {
          DEFAULT: '#F4EDE4',
          light: '#FFFCF8',
        },
        lavender: {
          DEFAULT: '#F4EDFC',
          mid: '#EAE2F7',
          deep: '#DDD0F0',
        },
        plum: {
          DEFAULT: '#4A154B',
          hover: '#5C1A62',
          active: '#3A0F3C',
          light: '#F4EFF8',
          ink: '#2D1B2E',
        },
        brand: {
          DEFAULT: '#00a87e',
          hover: '#008f6b',
          light: '#e6f7f2',
          soft: '#7fd4bc',
        },
        ink: {
          DEFAULT: '#191c1f',
          muted: '#505a63',
          faint: '#8d969e',
        },
        line: {
          DEFAULT: '#e2e2e7',
          strong: '#c9c9cd',
          dark: 'rgba(255,255,255,0.12)',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(3.25rem,8vw,5.5rem)', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '500' }],
        'hero-lead': ['clamp(2.5rem,6.5vw,4rem)', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '500' }],
        'section-title': ['clamp(2rem,4vw,3rem)', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '500' }],
        stat: ['clamp(2rem,4vw,3.5rem)', { lineHeight: '1.0', letterSpacing: '-0.02em', fontWeight: '500' }],
      },
      maxWidth: {
        site: '75rem',
        demo: '90rem',
        narrow: '42rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(25,28,31,0.04)',
        lift: '0 12px 40px rgba(25,28,31,0.08)',
        card: '0 0 0 1px rgba(25,28,31,0.06)',
        nav: '0 0 0 1px rgba(255,255,255,0.08)',
        elevated: '0 24px 64px rgba(0,0,0,0.35)',
      },
      borderRadius: {
        ui: '0.5rem',
        'ui-lg': '0.75rem',
        'ui-xl': '1.25rem',
        card: '1.25rem',
        pill: '9999px',
      },
      spacing: {
        band: '5.5rem',
        section: '7rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
