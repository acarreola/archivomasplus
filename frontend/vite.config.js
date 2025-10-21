import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure a single React instance across the app and all deps
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    force: true
  }
})
