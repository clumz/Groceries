import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Plate accent palette
        "plate-lime":       "#C8FF3E",
        "plate-lime-deep":  "#9FD41A",
        "plate-coral":      "#FF6B4A",
        "plate-coral-deep": "#E5482A",
        "plate-butter":     "#FFD66B",
        "plate-plum":       "#4A2B5C",
        "plate-leaf":       "#2D5A3D",
        "plate-sky":        "#B8E4F0",
        "plate-ink":        "#1A1410",
        "plate-bg":         "#FFF8EE",
        "plate-line":       "#EDE4D5",
        "plate-surface":    "#FFFFFF",
        // Legacy semantic colors (mapped to plate tokens via CSS vars)
        surface: {
          DEFAULT: "var(--color-surface)",
          secondary: "var(--color-surface-secondary)",
          tertiary: "var(--color-surface-tertiary)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          secondary: "var(--color-ink-secondary)",
          tertiary: "var(--color-ink-tertiary)",
          inverse: "var(--color-ink-inverse)",
        },
      },
      fontFamily: {
        sans:    ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        sticker:    "3px 3px 0 #1A1410",
        "sticker-sm": "2px 2px 0 #1A1410",
        card:       "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 4px 16px -4px rgb(0 0 0 / 0.08)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 8px 32px -8px rgb(0 0 0 / 0.12)",
        elevated:   "0 20px 60px -12px rgb(0 0 0 / 0.18)",
      },
      animation: {
        "fade-in":   "fadeIn 0.3s ease-out",
        "slide-up":  "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-soft":"pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pop-in":    "popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        popIn:     { "0%": { transform: "scale(0.92)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};

export default config;
