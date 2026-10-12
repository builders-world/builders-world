// Invented builders (names and figures are illustrative, as in the PRD).
// This is the only input the world needs: numbers in, structure out.
import { loadProfile, homeSeed } from './onboarding/state.js';

export const DISTRICT = { name: 'Yaba', city: 'Lagos', secondary: '#2a9d94' };

export const BUILDERS = [
  {
    id: 'you', handle: 'you', name: 'You', seed: 11,
    tagline: 'Lagos. Drawing the world.',
    repos: 2, stars: 120, forks: 8, prs: 0, votes: 0, mrr: 0, mrrPublic: false,
    lastPush: 0, live: false, streak: 9, consistency: 15,
    verified: ['GitHub'],
    today: '2 commits to you/yaba-scene',
    month: ['+21 stars across 2 repos'],
    repoList: [['you/yaba-scene', '120 stars'], ['you/dotfiles', '14 stars']],
  },
  {
    id: 'ada', handle: 'ada', name: 'Ada Nwosu', seed: 3,
    tagline: 'Lagos. Building bytepipe.',
    repos: 3, stars: 2780, forks: 310, prs: 3, votes: 0, mrr: 4200, mrrPublic: true,
    lastPush: 0, live: true, streak: 214, consistency: 27,
    verified: ['GitHub', 'Stripe'],
    today: '6 commits to ada/bytepipe',
    month: ['1 PR merged to colyseus/colyseus', 'MRR $4,200, Stripe verified', '+312 stars across 3 repos'],
    repoList: [['ada/bytepipe', '2.1k stars'], ['ada/tinyqueue', '640 stars'], ['ada/dotfiles', '38 stars']],
  },
  {
    id: 'femi', handle: 'femi', name: 'Femi Adeyemi', seed: 7,
    tagline: 'Lagos. Maintainer, routing libraries.',
    repos: 4, stars: 900, forks: 120, prs: 6, votes: 0, mrr: 0, mrrPublic: false,
    lastPush: 1, live: false, streak: 61, consistency: 26,
    verified: ['GitHub'],
    today: '3 commits to femi/route-kit',
    month: ['4 PRs merged to vercel/next.js', '+140 stars across 4 repos'],
    repoList: [['femi/route-kit', '610 stars'], ['femi/edge-cache', '210 stars'], ['femi/notes', '40 stars']],
  },
  {
    id: 'sade', handle: 'sade', name: 'Sade Bello', seed: 5,
    tagline: 'Lagos. Just launched Ledgerly.',
    repos: 3, stars: 1500, forks: 90, prs: 0, votes: 410, mrr: 2100, mrrPublic: false,
    lastPush: 0, live: true, streak: 88, consistency: 22,
    verified: ['GitHub', 'Product Hunt', 'Stripe'],
    today: 'Product Hunt launch, 410 votes',
    month: ['Launched on Product Hunt', '+410 stars across 3 repos'],
    repoList: [['sade/ledgerly', '1.2k stars'], ['sade/ui-kit', '240 stars'], ['sade/scripts', '60 stars']],
  },
  {
    id: 'tobi', handle: 'tobi', name: 'Tobi Okafor', seed: 9,
    tagline: 'Lagos. Tools for small teams.',
    repos: 2, stars: 420, forks: 40, prs: 2, votes: 0, mrr: 0, mrrPublic: false,
    lastPush: 3, live: false, streak: 21, consistency: 21,
    verified: ['GitHub'],
    today: 'No push yet today',
    month: ['+88 stars across 2 repos', '2 PRs merged'],
    repoList: [['tobi/standup-bot', '300 stars'], ['tobi/dotfiles', '12 stars']],
  },
  {
    id: 'kemi', handle: 'kemi', name: 'Kemi Salako', seed: 13,
    tagline: 'Lagos. Learning in public.',
    repos: 2, stars: 160, forks: 12, prs: 1, votes: 0, mrr: 0, mrrPublic: false,
    lastPush: 6, live: false, streak: 4, consistency: 19,
    verified: ['GitHub'],
    today: 'No push yet today',
    month: ['1 PR merged'],
    repoList: [['kemi/learn-rust', '90 stars'], ['kemi/blog', '8 stars']],
  },
  {
    id: 'ife', handle: 'ife', name: 'Ife Balogun', seed: 17,
    tagline: 'Lagos. On a break from shipping.',
    repos: 3, stars: 640, forks: 50, prs: 0, votes: 0, mrr: 0, mrrPublic: false,
    lastPush: 24, live: false, streak: 0, consistency: 4,
    verified: ['GitHub'],
    today: 'Last push 24 days ago',
    month: ['Dimmed: no push for 14 days or more'],
    repoList: [['ife/gridkit', '520 stars'], ['ife/dots', '20 stars']],
  },
  {
    id: 'dayo', handle: 'dayo', name: 'Dayo Ajayi', seed: 19,
    tagline: 'Lagos. Gone quiet.',
    repos: 2, stars: 200, forks: 14, prs: 0, votes: 0, mrr: 0, mrrPublic: false,
    lastPush: 90, live: false, streak: 0, consistency: 0,
    verified: ['GitHub'],
    today: 'Last push 90 days ago',
    month: ['Dark: no push for 60 days or more'],
    repoList: [['dayo/bot', '140 stars'], ['dayo/old-site', '6 stars']],
  },
];

// A resident from the local onboarding gets an unverified starter plot. Never
// turn the example account into fabricated GitHub activity or verified metrics.
if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('resident') === '1') {
  const profile = loadProfile();
  if (profile.step === 'home' && profile.city === 'Lagos' && profile.district === 'Yaba') {
    Object.assign(BUILDERS[0], {
      name: profile.name, handle: profile.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'newbuilder',
      seed: homeSeed(profile), tagline: `${profile.role === 'designer' ? 'Designer' : 'Developer'} · Yaba · Local preview`,
      repos: 0, stars: 0, forks: 0, prs: 0, votes: 0, mrr: 0, mrrPublic: false,
      lastPush: 0, live: false, streak: 0, consistency: 0, verified: [], demoResident: true,
      today: 'Arrived in Yaba. No real account connected yet.',
      month: ['Starter plot preview · progress saved on this device'], repoList: [],
    });
  }
}

// Monuments are earned by libraries with 25+ verified contributors.
// They sit on the horizon, placed by angle around the district.
export const MONUMENTS = [
  { id: 'rust', label: 'Rust', angle: 200, height: 78, contributors: 31 },
  { id: 'react', label: 'React', angle: 18, height: 62, contributors: 27 },
];

// Rules: height from outcomes, footprint from breadth, windows from recency.
export const FLOOR_H = 2.7;

export function floorsFor(b) {
  if (b.demoResident) return 1;
  const outcome =
    b.stars * 0.012 + b.forks * 0.04 + (b.mrrPublic ? b.mrr / 700 : 0) + b.prs * 0.6 + b.votes * 0.01;
  return Math.max(3, Math.min(14, Math.round(3 + Math.sqrt(outcome) * 1.9)));
}

export function footprintFor(b) {
  return { w: 9 + 2.2 * b.repos, d: 9 + 1.9 * b.repos };
}

// Share of windows lit. 14 days dims the plot, 60 days darkens it.
export function litProbability(b) {
  const d = b.lastPush;
  if (d <= 1) return 0.66;
  if (d <= 7) return 0.5;
  if (d <= 14) return 0.38;
  if (d <= 30) return 0.14;
  if (d <= 60) return 0.05;
  return 0;
}
