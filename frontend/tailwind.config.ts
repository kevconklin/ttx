import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Locked dark consultant palette
        bg: "#0b1220",
        surface: "#111827",
        surface2: "#0f172a",
        elevated: "#1a2333",
        border: "#1f2937",
        divider: "#1e293b",
        ink: {
          DEFAULT: "#e5e7eb",
          muted: "#94a3b8",
          dim: "#64748b",
        },
        accent: {
          50: "#ecfdf5",
          200: "#a7f3d0",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          soft: "#064e3b",
          glow: "rgba(16, 185, 129, 0.15)",
        },
        info: "#3b82f6",
        warn: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "Helvetica Neue",
          "Arial",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "JetBrains Mono",
          "Cascadia Code",
          "Roboto Mono",
          "monospace",
        ],
      },
      backgroundImage: {
        // Subtle dot grid for hero sections — 24px spacing, ~5% opacity
        "dot-grid":
          "radial-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "24px 24px",
      },
      boxShadow: {
        "glow-emerald": "0 0 0 1px rgba(16, 185, 129, 0.35), 0 0 18px rgba(16, 185, 129, 0.15)",
        "glow-amber": "0 0 0 1px rgba(245, 158, 11, 0.35), 0 0 14px rgba(245, 158, 11, 0.15)",
        "glow-red": "0 0 0 1px rgba(239, 68, 68, 0.35), 0 0 14px rgba(239, 68, 68, 0.15)",
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "soft-pulse": "soft-pulse 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
