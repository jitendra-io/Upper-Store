import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // When running inside GitHub Actions or targeting gh-pages, set base path to '/Upper-Store/'
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.DEPLOY_TARGET === 'gh-pages';
  const base = process.env.VITE_BASE_PATH || (isGitHubPages ? '/Upper-Store/' : '/');
  return {
    plugins: [react()],
    base,
  };
})
