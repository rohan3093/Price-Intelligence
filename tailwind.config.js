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
    extend: {
      colors: {
        brand: {
          black: 'var(--brand-black, #0c0c0c)',
          gray: 'var(--brand-gray, #bec2c6)',
          white: 'var(--brand-white, #ffffff)',
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
        // Consistent text scale
        'xs': ['12px', { lineHeight: '1.5' }],
        'sm': ['14px', { lineHeight: '1.5' }],
        'base': ['16px', { lineHeight: '1.5' }],
        'lg': ['18px', { lineHeight: '1.4' }],
        'xl': ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.1' }],
      },
      spacing: {
        // Consistent spacing scale
        '18': '4.5rem',
        '22': '5.5rem',
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

