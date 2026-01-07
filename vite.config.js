import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'dashboard/index.html')
      }
    }
  },
  server: {
    port: 3000,
    open: '/dashboard/index.html'
  }
});