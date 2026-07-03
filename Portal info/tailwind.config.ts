import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        legacy: {
          purple: "#6d3fb5",
          plum: "#42255f",
          lavender: "#f4efff",
          silver: "#e7e8ee",
          ink: "#1d1a24",
          muted: "#6f687a"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(66, 37, 95, 0.10)"
      },
      borderRadius: {
        card: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
