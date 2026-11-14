import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Where `npm run dev` in `server/` listens (its `.env.example` sets PORT=8082). */
const API_TARGET = process.env['API_TARGET'] ?? 'http://localhost:8082';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The dev twin of the Vercel rewrite (ADR-M3): the browser only ever talks to its own origin, so the
    // refresh cookie is first-party and no CORS preflight happens. `/api/health` reaches `/health`.
    proxy: {
      '^/api/': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
