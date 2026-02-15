import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // REPLACE 'card-maker' with your actual repository name on GitHub
  base: '/cardsbyhand/', 
})