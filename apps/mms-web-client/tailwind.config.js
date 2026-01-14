/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // Deep dark background
        surface: "#111827",    // Card background
        primary: {
          DEFAULT: "#3B82F6",  // Blue-500
          glow: "#60A5FA",     // Blue-400
        },
        accent: {
          DEFAULT: "#F59E0B",  // Amber-500 for AI
          glow: "#FBBF24",     // Amber-400
        },
        glass: {
          border: "rgba(255, 255, 255, 0.1)",
          surface: "rgba(255, 255, 255, 0.05)",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
      }
    },
  },
  plugins: [],
}
