import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist/frontend'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/servers': {
        target: 'http://localhost:28888',
        changeOrigin: true,
      },
      '/call': {
        target: 'http://localhost:28888',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:28888',
        changeOrigin: true,
      },
      '/scripts': {
        target: 'http://localhost:28888',
        changeOrigin: true,
      },
      '/skills': {
        target: 'http://localhost:28888',
        changeOrigin: true,
      },
      '/versions': {
        target: 'http://localhost:28888',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/frontend'),
    },
  },
});
