import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH env var controls the Vite `base` option (= URL sub-path).
// Set it at build time when deploying to a sub-path (e.g. GitHub Pages):
//   BASE_PATH=/be-fe-db-example/ npm run build
// Leave it empty (or unset) for root deployments (Docker / bare domain):
//   npm run build   →  base defaults to '/'
const base = process.env.BASE_PATH || '/';

// Keep outDir as `build/` so existing Nginx production Dockerfile COPY path
// (`COPY --from=builder /app/build /usr/share/nginx/html`) stays valid.
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
