import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'assets',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@game': resolve(__dirname, './src/game'),
      '@physics': resolve(__dirname, './src/physics'),
      '@ui': resolve(__dirname, './src/ui'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
});
