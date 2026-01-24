import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/API-Resilience-Wrapper/',
  root: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 3000,
    open: '/index.html'
  }
});