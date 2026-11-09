import type { Config } from "tailwindcss";

// Brand palette — single source of truth for the whole app.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#461F1A",   // page background
        card: "#5B2F26",   // cards / containers
        line: "#7A564C",   // borders / dividers
        cream: "#F7ECD0",  // primary light / selected / main text
        muted: "#C4AD8E",  // secondary text
        well: "#34140F",   // input fields: darker than the page, so fields read as "type here"
        pos: "#9ED8A7",    // positive score (on dark)
        neg: "#FF9288",    // negative score / destructive (on dark)
        posdark: "#1D6B3C",// positive score (on cream)
        negdark: "#B3261E",// negative score (on cream)
        warn: "#F0C070",   // paused / attention
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
