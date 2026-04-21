import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral grays for the business-tool backbone
        surface: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
        },
        // Pillar / readiness signal colors — muted, not marketing-bright
        strong: {
          bg: "#dcfce7",
          text: "#166534",
          border: "#86efac",
        },
        moderate: {
          bg: "#fef9c3",
          text: "#854d0e",
          border: "#fde047",
        },
        weak: {
          bg: "#fee2e2",
          text: "#991b1b",
          border: "#fca5a5",
        },
        brand: {
          DEFAULT: "#1e40af",
          hover: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
