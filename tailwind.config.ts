import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#16161A',
          surface: '#1E1E24',
          text: '#F5F0EB',
          muted: '#888888',
          accent: '#E8927C',
          'accent-yellow': '#E8D47C',
          success: '#9CE87C',
          info: '#7C9CE8',
          purple: '#C47CE8',
          teal: '#7CE8D4',
          pink: '#E87CA0',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
