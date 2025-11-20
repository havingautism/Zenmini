import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Zenmini/',  // 匹配 GitHub Pages 实际URL
  plugins: [react()],
  server: {
    host: true
  }
})

