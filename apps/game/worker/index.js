// The game on Cloudflare Workers (docs/cloudflare.md). Static files (dist/) are served by Cloudflare without running this
// code; it runs only for /api (wrangler.jsonc, assets.run_worker_first) and forwards those requests to the Rust gateway on
// Railway, the way vercel.json's rewrites did on Vercel: same paths, method, query, body and headers, and the gateway's
// answer comes back untouched (status, redirects, headers, streamed body). The browser sees one address, so no CORS.

// GitHub sends the browser back to the game's own address (the OAuth app's callback, the gateway's GITHUB_REDIRECT_URL);
// the gateway's own name for that route is shorter. Same mapping as vercel.json.
const RENAMED = { '/api/auth/oauth/github/callback': '/api/auth/github/callback' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const target = new URL((RENAMED[url.pathname] || url.pathname) + url.search, env.GATEWAY);
    const headers = new Headers(request.headers);
    // Cloudflare's own request headers and the Host stay here; fetch sets the gateway's Host itself.
    for (const name of [...headers.keys()]) if (name === 'host' || name.startsWith('cf-')) headers.delete(name);
    // Who is asking and where they came in, as Vercel told the gateway: the true client address (Cloudflare's, never one
    // the client sent) and the game's own host.
    const client = request.headers.get('cf-connecting-ip');
    if (client) { headers.set('x-forwarded-for', client); headers.set('x-real-ip', client); }
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

    try {
      // redirect: 'manual' passes the gateway's redirects (to GitHub, back to the game) to the browser as they are
      return await fetch(target, { method: request.method, headers, body: request.body, redirect: 'manual' });
    } catch {
      // the gateway is unreachable: the game sees a failed call and plays solo, as it does with no server at all
      return new Response('The game server could not be reached.', { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  },
};
