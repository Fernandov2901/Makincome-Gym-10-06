/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6',
    'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6',
    'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-5', 'mt-6',
    'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-5', 'mb-6',
    'ml-1', 'ml-2', 'ml-3', 'ml-4', 'ml-5', 'ml-6',
    'mr-1', 'mr-2', 'mr-3', 'mr-4', 'mr-5', 'mr-6',
    'h-4', 'h-5', 'h-6', 'h-8', 'h-10', 'h-12',
    'w-4', 'w-5', 'w-6', 'w-8', 'w-10', 'w-12',
    'space-x-1', 'space-x-2', 'space-x-3', 'space-x-4',
    'space-y-1', 'space-y-2', 'space-y-3', 'space-y-4',
    'gap-1', 'gap-2', 'gap-3', 'gap-4',
    'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
    'border', 'shadow-sm', 'shadow-md', 'shadow-lg',
    'odd:bg-muted/5',
    'border-b',
    'border-muted/40',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#157cff",
          50: "#e5f0ff", 
          100: "#c8deff",
          600: "#0566ff",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#6b7280",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      boxShadow: {
        'xl/5': '0 30px 100px -20px rgba(14,22,34,.05)',
        'md/50': '0 8px 20px -6px rgba(14,22,34,.5)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
} 