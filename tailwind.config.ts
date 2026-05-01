import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f0c0a",
        panel: "#161210",
        gold: "#c9a227",
        goldMuted: "#8a7420",
      },
      fontFamily: {
        reading: ["var(--font-libre-baskerville)", "Georgia", "serif"],
        ui: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
