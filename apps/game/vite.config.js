import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { fileURLToPath } from 'node:url';

// The game's server is the Rust gateway (open-world-backend). In development /api is proxied to it, so the browser sees one address.
// Run it with `cargo run -p gateway` (default :8080), or point API_PROXY at another one. Without it the API is unreachable and the
// game plays solo, so nothing ever shows an error in the console.
// In production the web app is built with VITE_API_URL=https://<gateway domain> (see src/api.js).
const target = process.env.API_PROXY || 'http://127.0.0.1:8080';
// The countries and cities live at the top of the repository (cities/<country>/<city>/), so their owners can look after
// them without touching the game; the game reads them through the @cities alias.
const cities = fileURLToPath(new URL('../../cities', import.meta.url));

export default defineConfig({
  base: './',
  resolve: { alias: { '@cities': cities } },
  server: { proxy: { '/api': { target, changeOrigin: true } }, fs: { allow: [searchForWorkspaceRoot(process.cwd()), cities] } },
  preview: { proxy: { '/api': { target, changeOrigin: true } } },
});
