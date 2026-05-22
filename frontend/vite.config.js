import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH env var controls the Vite `base` option (= URL sub-path).
// Set it at build time when deploying to a sub-path (e.g. GitHub Pages):
//   BASE_PATH=/school_uniform/ npm run build
// Leave it empty (or unset) for root deployments (Docker / bare domain):
//   npm run build   →  base defaults to '/'
const base = process.env.BASE_PATH || '/';

// outDir stays `build/` so the production Nginx Dockerfile COPY path
// (`COPY --from=builder /app/build /usr/share/nginx/html`) keeps working.
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5000,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
});
