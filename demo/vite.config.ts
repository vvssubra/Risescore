import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Builds the real client with the API swapped for demo/api.ts, as a single IIFE script + one CSS file.
export default defineConfig({
  root: resolve(__dirname, '../src/client'),
  publicDir: false,
  resolve: {
    alias: [
      { find: /^@fontsource\/.*$/, replacement: resolve(__dirname, 'empty.css') },
      { find: /^\.{1,2}\/lib\/api\.ts$/, replacement: resolve(__dirname, 'api.ts') },
    ],
  },
  build: {
    outDir: resolve(__dirname, '../dist-demo'),
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: true,
    lib: { entry: resolve(__dirname, 'entry.ts'), formats: ['iife'], name: 'RiseDemo', fileName: () => 'demo.js', cssFileName: 'demo' },
  },
});
