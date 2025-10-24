import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx']
    })
  ],
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
      // Externalize deps that shouldn't be bundled
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        // Separate CSS file
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'creator.css';
          }
          return assetInfo.name;
        }
      }
    },
    // Generate sourcemaps
    sourcemap: true,
    // Minify in production
    minify: 'esbuild'
  },
  css: {
    modules: {
      // Don't use CSS modules, keep class names as-is
      localsConvention: 'camelCase'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
