/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // Deep dark background (fallback)
        canvas: "#131722",     // TV Main BG
        surface: "#1E222D",    // TV Card BG
        
        // Text
        primary: "#D1D4DC",    // Main Text
        secondary: "#787B86",  // Muted Text
        
        // Borders
        base: "#2A2E39",       // Subtle Border
        
        // Brand & Status
        brand: "#2962FF",      // TV Blue
        up: "#089981",         // TV Green (slightly darker than pure #00B594 for better contrast)
        down: "#F23645",       // TV Red
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Roboto', 'Arial', 'sans-serif'],
      },
      container: {
        center: true,
        padding: '1.5rem',
        screens: {
          '2xl': '1440px',
        },
      },
      animation: {
        'scroll-left': 'scroll-left 40s linear infinite',
      },
      keyframes: {
        'scroll-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
