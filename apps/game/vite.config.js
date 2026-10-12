import { defineConfig } from 'vite';

// The game's server is the Rust gateway (open-world-backend). In development /api is proxied to it, so the browser sees one address.
// Run it with `cargo run -p gateway` (default :8080), or point API_PROXY at another one. Without it the API is unreachable and the
// game plays solo, so nothing ever shows an error in the console.
// In production the web app is built with VITE_API_URL=https://<gateway domain> (see src/api.js).
const target = process.env.API_PROXY || 'http://127.0.0.1:8080';

export default defineConfig({
  base: './',
  server: { proxy: { '/api': { target, changeOrigin: true } } },
  preview: { proxy: { '/api': { target, changeOrigin: true } } },
});
