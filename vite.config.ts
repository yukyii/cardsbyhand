import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /**
   * For Vercel: Use '/' (the root).
   * For GitHub Pages: Use '/your-repo-name/'.
   * Using './' often works for both as a relative path!
   */
  base: '/', 
})