import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        areia: "#f4e7d3",
        grafite: "#1f2937",
        terracota: "#cc6b49",
        musgo: "#5e7d5a"
      },
      boxShadow: {
        suave: "0 18px 45px rgba(31, 41, 55, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
