import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron file protocol loading
  resolve: {
    alias: {
      // Keep icon imports tree-shakable for leaner renderer bundles.
      'lucide-react/icons': path.resolve(__dirname, './node_modules/lucide-react/dist/esm/icons'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }

          return undefined;
        },
      },
    },
  },
});
