/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Modrinth dark theme surfaces
        surface: {
          1: '#16181c',
          2: '#1d1f23',
          3: '#27292e',
          4: '#34363c',
          5: '#42444a',
        },
        // Modrinth accent palette (dark variants)
        brand: {
          DEFAULT: '#1bd96a',
          green: '#1bd96a',
        },
        accent: {
          blue: '#4f9cff',
          purple: '#c78aff',
          red: '#ff496e',
          orange: '#ffa347',
          gray: '#8a8da1',
        },
        // Text colors from Modrinth dark theme
        content: {
          primary: '#ffffff',
          default: '#b0bac5',
          secondary: '#96a2b0',
          link: '#4f9cff',
        },
        divider: '#34363c',
      },
      borderRadius: {
        card: '1rem',
        btn: '0.75rem',
      },
      boxShadow: {
        card: 'rgba(0, 0, 0, 0.25) 0px 4px 12px 0px',
        raised: '0px 2px 4px rgba(0, 0, 0, 0.2)',
        floating: '0px 4px 6px rgba(0, 0, 0, 0.1), 0px 2px 4px rgba(0, 0, 0, 0.1)',
        btn: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
