import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2842B1",
          foreground: "#FFFFFF",
          muted: "#F1F1F1",
        },
        secondary: {
          DEFAULT: "#6E59A5",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#9b87f5",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#8E9196",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1F2C",
        }
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;