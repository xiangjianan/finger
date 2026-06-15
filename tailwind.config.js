/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          900: "#05060a",
          800: "#0a0c14",
          700: "#11141f",
          600: "#1a1f2e",
        },
        cyber: {
          cyan: "#37e7ff",
          magenta: "#ff3df0",
          gold: "#ffd166",
          violet: "#8b5cff",
          mint: "#6effb0",
        },
      },
      fontFamily: {
        display: ['"Michroma"', "sans-serif"],
        sans: ['"Rajdhani"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(55,231,255,0.45)",
        "glow-magenta": "0 0 24px rgba(255,61,240,0.45)",
        inset: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "spin-rev": {
          to: { transform: "rotate(-360deg)" },
        },
        "pulse-ring": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.08)", opacity: "1" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        sweep: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 14s linear infinite",
        "spin-rev": "spin-rev 9s linear infinite",
        "pulse-ring": "pulse-ring 3s ease-in-out infinite",
        flicker: "flicker 2.4s ease-in-out infinite",
        floaty: "floaty 4s ease-in-out infinite",
        sweep: "sweep 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
