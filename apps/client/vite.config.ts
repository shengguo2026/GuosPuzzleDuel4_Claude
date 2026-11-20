import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static client build served by the host (apps/host). In `pnpm dev:client`
// the API and WebSocket are proxied to a host started separately on port 3000.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
    },
  },
});
