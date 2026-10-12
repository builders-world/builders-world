// Where the game's server lives. In development Vite proxies /api to the Rust gateway (vite.config.js), so the base is empty.
// In production the web app and the API are separate services: build with VITE_API_URL=https://<gateway domain>.
const base = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const apiUrl = (path) => base + path;
