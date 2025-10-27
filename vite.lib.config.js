import { defineConfig } from 'vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'NanopubCreator',
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'nanopub-creator.esm.js';
        if (format === 'umd') return 'nanopub-creator.js';
      }
    },
    rollupOptions: {
      external: [], // Bundle everything including WASM
      output: {
        inlineDynamicImports: true, // Important for WASM
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'nanopub-creator.css';
          if (assetInfo.name.endsWith('.wasm')) return 'nanopub-creator.wasm';
          return assetInfo.name;
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@nanopub/sign']
  }
});
