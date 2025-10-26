import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        react: resolve(__dirname, 'src/react.js')
      },
      name: 'NanopubCreator',
      fileName: (format, entryName) => {
        if (format === 'es') {
          return `${entryName}.esm.js`;
        }
        return `${entryName}.js`;
      },
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@nanopub/sign'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@nanopub/sign': 'NanopubSign'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'creator.css';
          }
          return assetInfo.name;
        }
      }
    },
    sourcemap: true,
    minify: 'esbuild'
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    fs: {
      strict: false
    }
  },
  // CRITICAL: Exclude @nanopub/sign from optimization
  optimizeDeps: {
    exclude: ['@nanopub/sign'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  // CRITICAL: Add WASM MIME type plugin
  plugins: [
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      }
    }
  ]
});
