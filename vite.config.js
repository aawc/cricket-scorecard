import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.html'
    }
  }
});
