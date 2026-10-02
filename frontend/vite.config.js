import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  base: command === 'build' || mode === 'production' ? '/Upper-Official/' : '/',
}))
