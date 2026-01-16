/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs Fluky Boys
        'fluky-bg': '#030913',
        'fluky-primary': '#C10468',
        'fluky-secondary': '#FF36A3',
        'fluky-accent-orange': '#E7632C',
        'fluky-accent-yellow': '#F8EC54',
        'fluky-text': '#F8F6F2',
        // Aliases pour faciliter l'utilisation
        'primary': '#FF36A3',
        'secondary': '#C10468',
        'accent': '#F8EC54',
        'background': '#030913',
        'text': '#F8F6F2',
      },
      fontFamily: {
        'display': ['Shadows Into Light', 'cursive'],
        'body': ['Shadows Into Light', 'cursive'],
        'heading': ['Protest Riot', 'sans-serif'],
      },
      backgroundImage: {
        'dot-pattern': 'radial-gradient(circle, rgba(193, 4, 104, 0.15) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-pattern': '20px 20px',
      },
    },
  },
  plugins: [],
}
