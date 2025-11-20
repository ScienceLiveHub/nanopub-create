import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  optimizeDeps: {
    exclude: [
      '@nanopub/sign',
      '@nanopub/sign/web.js'
    ]
  },
  resolve: {
    alias: {
      '@nanopub/sign/web_bg.wasm': false
    }
  },
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
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'nanopub-creator.css';
          return assetInfo.name;
        }
      }
    }
  }
});
