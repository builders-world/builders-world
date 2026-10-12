// The chess players of Yaba think here, off the main thread, so the street keeps its frame rate while
// they consider a move. Rules come from chess.js; this file only chooses a move: a negamax search with
// alpha-beta pruning, captures searched to the end (quiescence), and a material and piece-square score.
import { Chess } from 'chess.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// piece-square tables from White's side, rank 8 first (Tomasz Michniewski's simplified evaluation)
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

// score from the side to move: positive is good for whoever moves next
function evaluate(c) {
  let s = 0;
  const b = c.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = b[r][f]; if (!p) continue;
    const v = VAL[p.type] + PST[p.type][p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f];
    s += p.color === 'w' ? v : -v;
  }
  return c.turn() === 'w' ? s : -s;
}

// most valuable victim, least valuable attacker first; promotions early
const order = (moves) => moves.sort((a, b) => ((b.captured ? VAL[b.captured] * 10 - VAL[b.piece] : 0) + (b.promotion ? 800 : 0)) - ((a.captured ? VAL[a.captured] * 10 - VAL[a.piece] : 0) + (a.promotion ? 800 : 0)));

const MATE = 100000;
let nodes = 0, deadline = 0, stopped = false;

function quiesce(c, alpha, beta, depth) {
  nodes++;
  const stand = evaluate(c);
  if (stand >= beta) return beta;
  if (alpha < stand) alpha = stand;
  if (depth <= 0) return alpha;
  for (const m of order(c.moves({ verbose: true }).filter((x) => x.captured || x.promotion))) {
    c.move(m); const s = -quiesce(c, -beta, -alpha, depth - 1); c.undo();
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

function negamax(c, depth, alpha, beta, ply) {
  nodes++;
  if ((nodes & 255) === 0 && performance.now() > deadline) stopped = true;
  if (stopped) return 0;
  const moves = c.moves({ verbose: true });
  if (!moves.length) return c.inCheck() ? -MATE + ply : 0;
  if (c.isInsufficientMaterial() || c.isDrawByFiftyMoves()) return 0;
  if (depth <= 0) return quiesce(c, alpha, beta, 4);
  for (const m of order(moves)) {
    c.move(m); const s = -negamax(c, depth - 1, -beta, -alpha, ply + 1); c.undo();
    if (stopped) return 0;
    if (s >= beta) return beta;
    if (s > alpha) alpha = s;
  }
  return alpha;
}

// level 1: looks one move ahead and is easily distracted; 2: two moves; 3: three, and thinks longer
function choose(fen, level) {
  const c = new Chess(fen);
  const moves = order(c.moves({ verbose: true }));
  if (!moves.length) return null;
  const depth = level >= 3 ? 3 : level, noise = level === 1 ? 90 : level === 2 ? 25 : 4;
  nodes = 0; stopped = false; deadline = performance.now() + (level >= 3 ? 2500 : 1200);
  let best = moves[0], bestScore = -Infinity;
  const scored = [];
  for (const m of moves) {
    c.move(m); const s = -negamax(c, depth - 1, -MATE - 1, MATE + 1, 1); c.undo();
    if (stopped) break;
    const jitter = (Math.random() - 0.5) * 2 * noise;
    scored.push({ m, s: s + jitter });
    if (s + jitter > bestScore) { bestScore = s + jitter; best = m; }
  }
  // out of time: the best found so far, which is already ordered captures-first
  return { from: best.from, to: best.to, promotion: best.promotion, eval: Math.round(bestScore), nodes };
}

self.onmessage = (e) => {
  const { id, fen, level } = e.data || {};
  try { self.postMessage({ id, move: choose(fen, level || 2) }); } catch (err) { self.postMessage({ id, error: String(err?.message || err) }); }
};
