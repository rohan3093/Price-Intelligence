/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      none: '0px',
      sm: '0px',
      DEFAULT: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      full: '9999px',
    },
    // Extend screens for larger displays
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px', // Full HD and above
    },
    extend: {
      colors: {
        brand: {
          black: 'var(--brand-black, #111111)',      // Softer black for less eye strain
          'black-light': '#1a1a1a',                  // For hover states
          gray: 'var(--brand-gray, #e5e7eb)',        // Lighter gray for softer borders
          'gray-dark': '#6b7280',                    // For secondary text
          'gray-medium': '#9ca3af',                  // For tertiary text
          'gray-light': '#f3f4f6',                   // For subtle backgrounds
          white: 'var(--brand-white, #ffffff)',
          background: '#fafafa',                     // Subtle off-white for page background
          yellow: 'var(--brand-yellow, #f7f126)',
        },
      },
      fontFamily: {
        heading: ['"Bebas Neue Pro"', 'Bebas Neue', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        decorative: ['Baskervville', 'serif'],
        mono: ['"SF Mono"', 'Monaco', 'Inconsolata', '"Roboto Mono"', '"Source Code Pro"', 'Menlo', 'Consolas', '"DejaVu Sans Mono"', 'monospace'],
      },
      fontSize: {
        // Refined text scale for better readability
        'xs': ['13px', { lineHeight: '1.6' }],    // Increased from 12px for better legibility
        'sm': ['14px', { lineHeight: '1.6' }],    // Better line height for readability
        'base': ['16px', { lineHeight: '1.6' }],  // Improved line spacing
        'lg': ['18px', { lineHeight: '1.5' }],
        'xl': ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.1' }],
      },
      spacing: {
        // Enhanced spacing scale for better breathing room
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        // Subtle shadows for depth
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.06)',
        'dropdown': '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
        'modal': '0 8px 24px 0 rgba(0, 0, 0, 0.12)',
      },
      maxWidth: {
        '8xl': '90rem', // 1440px - wider for better screen utilization
      },
      gridTemplateColumns: {
        6: 'repeat(6, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        6: 'repeat(6, minmax(0, 1fr))',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.font-mono-numeric': {
          'font-family': 'var(--font-mono, "SF Mono", Monaco, Inconsolata, "Roboto Mono", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace)',
          'font-variant-numeric': 'tabular-nums',
          'letter-spacing': '-0.01em',
        },
      })
    },
  ],
}

