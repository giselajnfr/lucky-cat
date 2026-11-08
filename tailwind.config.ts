import type { Config } from "tailwindcss";

// Brand palette — single source of truth for the whole app.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#461F1A",   // page background
        card: "#5B2F26",   // cards / containers
        line: "#7A564C",   // borders / dividers
        cream: "#F7ECD0",  // primary light / selected / main text
        muted: "#C4AD8E",  // secondary text
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "ui-rounded", "system-ui", "sans-serif"],
        display: ["var(--font-nunito)", "ui-rounded", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
