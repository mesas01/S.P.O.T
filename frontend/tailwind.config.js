/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stellar Brand Colors
        // Primary Colors
        'stellar-gold': '#FDDA24',      // Generous Gold - Primary brand color
        'stellar-black': '#0F0F0F',     // Process Black
        'stellar-white': '#F6F7F8',     // White foundation
        
        // Secondary Colors
        'stellar-lilac': '#B7ACE8',     // Lilac - connects with DeFi roots
        'stellar-teal': '#00A7B5',      // Teal - perfect contrast to gold
        'stellar-warm-grey': '#D6D2C4', // Warm Grey - attention alternative
        'stellar-navy': '#002E5D',      // Navy Blue - "adult in the room"
        
        // Legacy SPOT colors (maintain for compatibility)
        'spot-yellow': '#FDDA24',       // Same as stellar-gold
        'spot-purple': '#B7ACE8',       // Updated to stellar-lilac
        'spot-white': '#F6F7F8',
        'spot-black': '#0F0F0F',
      },
      fontFamily: {
        // Stellar Typography
        'headline': ['Anton', 'sans-serif'],    // Headlines (Anton for web, Schabo for print)
        'subhead': ['Lora', 'serif'],           // Subheads and longer headlines
        'body': ['Inter', 'sans-serif'],        // Body copy (digital)
        'body-print': ['Lora', 'serif'],        // Body copy (print)
      },
      gridTemplateColumns: {
        24: 'repeat(24, minmax(0, 1fr))',       // Brand manual 24-column grid
      },
      boxShadow: {
        'brand-card': '0 35px 80px rgba(15, 15, 15, 0.1)',
        'brand-soft': '0 20px 45px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        'stellar-highlight': 'linear-gradient(120deg, rgba(253, 218, 36, 0.25) 0%, rgba(183, 172, 232, 0.25) 50%, rgba(0, 167, 181, 0.25) 100%)',
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

