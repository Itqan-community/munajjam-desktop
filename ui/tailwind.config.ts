import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: "1rem",
        screens: {
          "2xl": "1400px",
        },
      },
      colors: {
        // Balanced Modern Palette - Less Purple, More Professional
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#06B6D4", // Cyan (main brand color)
          light: "#22D3EE",
          dark: "#0891B2",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#3B82F6", // Blue
          light: "#60A5FA",
          dark: "#2563EB",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#8B5CF6", // Purple (accent only, not dominant)
          cyan: "#06B6D4",
          emerald: "#10B981",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          light: "rgba(255, 255, 255, 0.05)",
          dark: "rgba(0, 0, 0, 0.4)",
        },
      },
      borderRadius: {
        sm: "0.25rem",   // 4px — subtle rounding
        md: "0.375rem",  // 6px — small controls
        lg: "0.5rem",    // 8px — buttons, inputs, sidebar items
        xl: "0.75rem",   // 12px — cards, containers, dropdown menus
        "2xl": "1rem",   // 16px — large panels, modals
        "3xl": "1.5rem", // 24px — hero elements
      },
      backgroundImage: {
        "gradient-soft":
          "radial-gradient(1000px 400px at 100% -20%, rgba(6,182,212,0.08), rgba(6,182,212,0) 60%), radial-gradient(800px 300px at 0% -10%, rgba(59,130,246,0.08), rgba(59,130,246,0) 60%)",
        "gradient-dark": "linear-gradient(to bottom, #020617, #0F172A)",
        "gradient-primary": "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
        "gradient-blue": "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)",
        "gradient-mesh":
          "radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.15) 0, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.12) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.15) 0, transparent 50%), radial-gradient(at 0% 100%, rgba(59, 130, 246, 0.12) 0, transparent 50%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(6, 182, 212, 0.2)",
        "glow-sm": "0 0 10px rgba(6, 182, 212, 0.3), 0 0 20px rgba(6, 182, 212, 0.15)",
        "glow-lg": "0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(6, 182, 212, 0.3)",
        "glow-blue": "0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.3)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "fade-up": "fadeUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "spin-slow": "spin 8s linear infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)" },
          "100%": { boxShadow: "0 0 30px rgba(6, 182, 212, 0.6)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    function ({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void }) {
      const newUtilities = {
        ".glass": {
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
        ".glass-light": {
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        },
        ".glass-dark": {
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        },
        ".text-gradient": {
          background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        },
        ".text-gradient-blue": {
          background: "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;
