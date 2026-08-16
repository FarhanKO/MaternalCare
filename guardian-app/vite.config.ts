import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The guardian app is its own build so it can ship as an installable PWA
// without dragging the whole clinician/mother bundle onto a phone.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    // reachable from a real phone on the same network, which is the only way
    // to test install, vibration and audio properly
    host: true,
  },
});
