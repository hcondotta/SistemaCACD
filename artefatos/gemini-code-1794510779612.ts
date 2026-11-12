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
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-newsreader)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        itamaraty: {
          navy: {
            950: "#08111D",
            900: "#0F1E32",
            800: "#18304E",
            700: "#1B3B61",
            600: "#1E4471",
            500: "#2B5B94",
          },
          emerald: {
            950: "#04221A",
            900: "#07362A",
            700: "#0D5C46",
            500: "#108565",
            400: "#24A17E",
          },
          gold: {
            700: "#8A6409",
            600: "#B8860B",
            500: "#C59B27",
            400: "#D4AF37",
            300: "#E5C76B",
          },
          carmine: {
            900: "#4A1213",
            700: "#9E2A2B",
            500: "#C83E3B",
          },
        },
        travertine: {
          50: "#FBF9F5",
          100: "#F3EFE6",
          200: "#E5DEC9",
          300: "#D2C7A8",
        },
        ink: {
          900: "#121C26",
          700: "#2D3748",
          500: "#64748B",
        },
        econ: {
          is: "#F59E0B",     // Curva IS - Ouro Imperial
          lm: "#38BDF8",     // Curva LM - Azul Rio Branco
          bp: "#10B981",     // Curva BP - Esmeralda Itamaraty
          shock: "#F97316",  // Choque Exógeno
        },
      },
      backgroundImage: {
        "chancery-gradient":
          "linear-gradient(135deg, #08111D 0%, #0F1E32 60%, #18304E 100%)",
        "gold-shimmer":
          "linear-gradient(90deg, #B8860B 0%, #E5C76B 50%, #C59B27 100%)",
      },
      boxShadow: {
        diplomatic: "0 10px 30px -10px rgba(8, 17, 29, 0.45)",
        parchment: "0 4px 20px -2px rgba(18, 28, 38, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;