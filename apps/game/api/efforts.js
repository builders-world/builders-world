// GET /api/efforts?user=<github username>  ->  { user, commits, source }
// Efforts are earned by shipping (world bible 12.1). With a GITHUB_TOKEN (read-only, no scopes needed)
// this counts commit contributions over the last year exactly; without one it reads the public
// contribution calendar, which also counts pull requests and issues. Cached for ten minutes.
export default async function handler(req, res) {
  const user = String(req.query.user || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 39);
  if (!user) return res.status(400).json({ error: 'user required' });
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  try {
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      const r = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'builders-world' },
        body: JSON.stringify({ query: 'query($u:String!){ user(login:$u){ contributionsCollection { totalCommitContributions } } }', variables: { u: user } }),
      });
      const j = await r.json();
      if (j.data && j.data.user === null) return res.status(404).json({ error: 'no such user' });
      const n = j.data?.user?.contributionsCollection?.totalCommitContributions;
      if (typeof n === 'number') return res.json({ user, commits: n, source: 'commits' });
    }
    const page = await fetch(`https://github.com/users/${user}/contributions`, { headers: { 'User-Agent': 'builders-world' } });
    if (page.status === 404) return res.status(404).json({ error: 'no such user' });
    const html = await page.text();
    let n = 0;
    for (const m of html.matchAll(/>(\d+) contributions? on /g)) n += +m[1];
    return res.json({ user, commits: n, source: 'contributions' });
  } catch (e) {
    return res.status(502).json({ error: 'GitHub did not answer' });
  }
}
