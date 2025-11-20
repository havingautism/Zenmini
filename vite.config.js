import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/gemini_chat/',  // GitHub Pages 子路径
  plugins: [react()],
  server: {
    host: true
  }
})

