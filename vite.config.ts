import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'react-vendor': ['react', 'react-dom'],
          'gsap': ['gsap']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: ['three', 'react', 'react-dom', 'gsap']
  }
});
