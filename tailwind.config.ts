import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(222, 47%, 8%)',
        foreground: 'hsl(210, 40%, 98%)',
        card: 'hsl(222, 47%, 11%)',
        'card-hover': 'hsl(222, 47%, 14%)',
        border: 'hsl(217, 33%, 17%)',
        primary: 'hsl(142, 71%, 45%)',
        'primary-foreground': 'hsl(144, 61%, 20%)',
        muted: 'hsl(217, 33%, 17%)',
        'muted-foreground': 'hsl(215, 20%, 65%)',
        destructive: 'hsl(0, 84%, 60%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
export default config
