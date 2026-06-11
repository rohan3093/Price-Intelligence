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
        // Terminal palette (institutional dark theme). rgb(var(--x-rgb) / <alpha-value>)
        // so Tailwind opacity modifiers (e.g. bg-up/10) render correctly.
        terminal: {
          bg: 'rgb(var(--terminal-bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--terminal-surface-rgb) / <alpha-value>)',
          'surface-raised': 'rgb(var(--terminal-surface-raised-rgb) / <alpha-value>)',
          border: 'rgb(var(--terminal-border-rgb) / <alpha-value>)',
          'border-strong': 'rgb(var(--terminal-border-strong-rgb) / <alpha-value>)',
          text: 'rgb(var(--terminal-text-rgb) / <alpha-value>)',
          'text-dim': 'rgb(var(--terminal-text-dim-rgb) / <alpha-value>)',
          'text-faint': 'rgb(var(--terminal-text-faint-rgb) / <alpha-value>)',
        },
        up: 'rgb(var(--up-rgb) / <alpha-value>)',
        down: 'rgb(var(--down-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        // Legacy brand-* tokens remapped onto the terminal palette so existing
        // class usage (incl. opacity modifiers) inherits the dark theme.
        brand: {
          black: 'rgb(var(--terminal-text-rgb) / <alpha-value>)',            // was near-black; now light text
          'black-light': 'rgb(var(--terminal-surface-raised-rgb) / <alpha-value>)',
          gray: 'rgb(var(--terminal-border-rgb) / <alpha-value>)',
          'gray-dark': 'rgb(var(--terminal-text-dim-rgb) / <alpha-value>)',
          'gray-medium': 'rgb(var(--terminal-text-faint-rgb) / <alpha-value>)',
          'gray-light': 'rgb(var(--terminal-surface-raised-rgb) / <alpha-value>)',
          white: 'rgb(var(--terminal-surface-rgb) / <alpha-value>)',
          background: 'rgb(var(--terminal-bg-rgb) / <alpha-value>)',
          yellow: 'rgb(var(--accent-rgb) / <alpha-value>)',
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
        // Terminals are flat: card-level elevation is replaced by 1px borders.
        // 'soft'/'card' are neutralised so any lingering usage stays flat.
        'soft': 'none',
        'card': 'none',
        // Overlays keep a real (dark) shadow for layering on the dark surface.
        'dropdown': '0 4px 16px 0 rgba(0, 0, 0, 0.55)',
        'modal': '0 12px 40px 0 rgba(0, 0, 0, 0.65)',
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

