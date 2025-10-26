import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  base: '/nanopub-create/',
  build: {
    rollupOptions: {
      input: './demo/index.html'
    }
  },
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  server: {
    port: 3000,
    fs: {
      strict: false
    }
  },
  optimizeDeps: {
    exclude: ['@nanopub/sign']
  }
});
