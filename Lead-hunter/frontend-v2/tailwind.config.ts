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
        paper: "#F6F6F7",
        ink: {
          DEFAULT: "#0D0D0D",
          soft: "#3F3F46",
          muted: "#71717A",
          faint: "#A1A1AA",
        },
        line: {
          DEFAULT: "#E4E4E7",
          soft: "#EEEEF0",
        },
        carbon: {
          DEFAULT: "#0D0D0D",
          raised: "#1A1A1A",
          line: "#2A2A2E",
          muted: "#8E8E96",
        },
        violet: {
          50: "#F5F1FE",
          100: "#EDE4FD",
          200: "#DCC9FB",
          300: "#C084FC",
          400: "#A855F7",
          500: "#7C3AED",
          600: "#6D28D9",
          700: "#5B21B6",
        },
        ok: { DEFAULT: "#15803D", bg: "#F0FDF4", line: "#BBF7D0" },
        warn: { DEFAULT: "#B45309", bg: "#FFFBEB", line: "#FDE68A" },
        bad: { DEFAULT: "#B91C1C", bg: "#FEF2F2", line: "#FECACA" },
        sky2: { DEFAULT: "#0369A1", bg: "#F0F9FF", line: "#BAE6FD" },
        rose2: { DEFAULT: "#BE185D", bg: "#FDF2F8", line: "#FBCFE8" },
        teal2: { DEFAULT: "#0F766E", bg: "#F0FDFA", line: "#99F6E4" },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
      },
      borderRadius: {
        card: "12px",
        ctrl: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,13,13,0.04), 0 1px 3px rgba(13,13,13,0.03)",
        pop: "0 4px 6px -1px rgba(13,13,13,0.08), 0 10px 24px -6px rgba(13,13,13,0.12)",
        glow: "0 0 0 1px rgba(124,58,237,0.25), 0 0 18px rgba(168,85,247,0.18)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease both",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
