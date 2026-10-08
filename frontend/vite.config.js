import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Use VITE_BASE_PATH if provided, or '/Upper-Store/' only when DEPLOY_TARGET is 'gh-pages', otherwise default to '/' for Render, Netlify, Vercel, and local dev
  const base = process.env.VITE_BASE_PATH || (process.env.DEPLOY_TARGET === 'gh-pages' ? '/Upper-Store/' : '/');
  return {
    plugins: [react()],
    base,
  };
})
