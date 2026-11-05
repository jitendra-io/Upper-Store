import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Since you are using a custom domain at the root (upperstore.bbroot.com), 
  // the base path should always be '/' regardless of GitHub Actions.
  const base = process.env.VITE_BASE_PATH || '/';
  
  return {
    plugins: [react()],
    base,
    build: {
      sourcemap: false,
    },
    oxc: {
      drop: mode === 'production' ? ['debugger'] : [],
      pure: mode === 'production' ? ['console.log', 'console.debug'] : [],
    },
    server: {
      proxy: {
        '/api/download': {
          target: 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  };
})
