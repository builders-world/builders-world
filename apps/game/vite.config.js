import { defineConfig, loadEnv } from 'vite';

// The dev server runs the same functions Vercel runs from api/, so online play works locally too.
// Secrets come from .env.local (git-ignored); without them the API answers "offline" and the game
// plays solo, so nothing ever shows an error in the console.
function apiRoutes() {
  return {
    name: 'bw-api',
    configureServer(server) {
      const env = loadEnv('development', process.cwd(), '');
      for (const k of ['MONGODB_URI', 'MONGODB_DB', 'GITHUB_TOKEN']) if (env[k] && !process.env[k]) process.env[k] = env[k];
      server.middlewares.use(async (req, res, next) => {
        const m = req.url && req.url.match(/^\/api\/([a-z-]+)(\?.*)?$/);
        if (!m) return next();
        let body = '';
        for await (const chunk of req) body += chunk;
        const url = new URL(req.url, 'http://local');
        const shim = {
          statusCode: 200,
          setHeader: (k, v) => res.setHeader(k, v),
          status(c) { this.statusCode = c; return this; },
          json(o) { res.statusCode = this.statusCode; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); },
        };
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`);
          await mod.default({ method: req.method, query: Object.fromEntries(url.searchParams), body: body ? JSON.parse(body) : {} }, shim);
        } catch {
          shim.json({ offline: true });
        }
      });
    },
  };
}

export default defineConfig({ base: './', plugins: [apiRoutes()] });
