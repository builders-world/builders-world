// Scoring for the racket sports, kept apart from the physics so it can be tested on its own.
// Tennis and padel share the same count (love, 15, 30, 40, deuce, advantage; games; sets; a tiebreak at
// 6 games all). Table tennis counts to 11, two clear, and the serve passes every two points.

const CALL = ['Love', '15', '30', '40'];

// fmt: { games: games to win a set, sets: sets to win the match, tbTo: points to win a tiebreak, tiebreakOnly }
export class TennisScore {
  constructor(fmt = {}, names = ['You', 'Them'], firstServer = 0) {
    this.fmt = { games: 6, sets: 1, tbTo: 7, tiebreakOnly: false, ...fmt };
    this.names = names;
    this.points = [0, 0]; this.games = [0, 0]; this.sets = [0, 0]; this.history = [];
    this.server = firstServer; this.tiebreak = this.fmt.tiebreakOnly; this.tbFirst = firstServer;
    this.over = null; this.endsChanged = 0;
  }
  // which half the serve goes from: the deuce (right) court on an even point count, the ad (left) on odd
  get deuceCourt() { return (this.points[0] + this.points[1]) % 2 === 0; }
  get totalGames() { return this.games[0] + this.games[1]; }
  // in a tiebreak the first server serves one point, then each player two in turn
  servingInTiebreak() { const n = this.points[0] + this.points[1]; return n === 0 ? this.tbFirst : (Math.floor((n - 1) / 2) % 2 === 0 ? 1 - this.tbFirst : this.tbFirst); }
  // returns { call, game, set, match, ends } for the point just won by team t
  pointTo(t) {
    if (this.over) return { call: this.over };
    const o = 1 - t, out = { call: '', game: false, set: false, match: false, ends: false };
    this.points[t]++;
    if (this.tiebreak) {
      const p = this.points;
      if (p[t] >= this.fmt.tbTo && p[t] - p[o] >= 2) { this.games[t]++; return this.winSet(t, out, true); }
      this.server = this.servingInTiebreak();
      // ends change every six points of a tiebreak
      if ((p[0] + p[1]) % 6 === 0) { out.ends = true; this.endsChanged++; }
      out.call = `${p[0]}–${p[1]}`;
      return out;
    }
    const a = this.points[t], b = this.points[o];
    if (a >= 4 && a - b >= 2) return this.winGame(t, out);
    if (a >= 3 && b >= 3) out.call = a === b ? 'Deuce' : `Advantage ${this.names[a > b ? t : o]}`;
    else {
      const sv = this.server, p = this.points;
      out.call = p[sv] === p[1 - sv] && p[sv] > 0 ? `${CALL[p[sv]]}–all` : `${CALL[p[sv]]}–${CALL[p[1 - sv]]}`;
    }
    return out;
  }
  winGame(t, out) {
    this.games[t]++; this.points = [0, 0];
    out.game = true; out.call = `Game, ${this.names[t]}`;
    const g = this.games, need = this.fmt.games;
    if ((g[t] >= need && g[t] - g[1 - t] >= 2) || (g[t] === need + 1 && g[1 - t] === need)) return this.winSet(t, out, false);
    this.server = 1 - this.server;
    if (g[0] === need && g[1] === need) { this.tiebreak = true; this.tbFirst = this.server; out.call += '. Tiebreak'; }
    // change ends after the first game and every two after it (odd totals)
    if (this.totalGames % 2 === 1) { out.ends = true; this.endsChanged++; }
    return out;
  }
  winSet(t, out, fromTiebreak) {
    this.history.push([...this.games]);
    this.sets[t]++; out.set = true; out.game = true;
    const odd = this.totalGames % 2 === 1;
    this.games = [0, 0]; this.points = [0, 0];
    // after a tiebreak, the player who received first in it serves the next set
    this.server = fromTiebreak ? 1 - this.tbFirst : 1 - this.server;
    this.tiebreak = this.fmt.tiebreakOnly;
    if (this.sets[t] >= this.fmt.sets) { out.match = true; this.over = `Game, set and match, ${this.names[t]}`; out.call = this.over; return out; }
    out.call = `Game and set, ${this.names[t]}`;
    if (odd || fromTiebreak) { out.ends = true; this.endsChanged++; }
    return out;
  }
  // what the scoreboard shows: points as 0/15/30/40/AD, or tiebreak numbers
  pointLabel(t) {
    if (this.tiebreak) return String(this.points[t]);
    const a = this.points[t], b = this.points[1 - t];
    if (a >= 3 && b >= 3) return a > b ? 'AD' : '40';
    return ['0', '15', '30', '40'][Math.min(a, 3)];
  }
}

// table tennis: games to 11, two clear; serve changes every two points, every point from 10-all;
// ends change after each game, and at 5 in the deciding game
export class TableTennisScore {
  constructor(fmt = {}, names = ['You', 'Them'], firstServer = 0) {
    this.fmt = { to: 11, games: 2, ...fmt };
    this.names = names; this.points = [0, 0]; this.games = [0, 0]; this.firstServer = firstServer; this.gameFirst = firstServer; this.server = firstServer; this.over = null;
    this.decidingSwapDone = false;
  }
  get deuceCourt() { return true; }
  pointTo(t) {
    if (this.over) return { call: this.over };
    const out = { call: '', game: false, match: false, ends: false };
    this.points[t]++;
    const p = this.points, to = this.fmt.to;
    if (p[t] >= to && p[t] - p[1 - t] >= 2) {
      this.games[t]++; out.game = true;
      if (this.games[t] >= this.fmt.games) { out.match = true; this.over = `Match, ${this.names[t]} (${this.games[0]}–${this.games[1]})`; out.call = this.over; return out; }
      out.call = `Game, ${this.names[t]}`;
      this.points = [0, 0]; this.gameFirst = 1 - this.gameFirst; this.server = this.gameFirst; out.ends = true; this.decidingSwapDone = false;
      return out;
    }
    const n = p[0] + p[1];
    this.server = n >= 2 * (to - 1) ? (n % 2 === 0 ? this.gameFirst : 1 - this.gameFirst) : (Math.floor(n / 2) % 2 === 0 ? this.gameFirst : 1 - this.gameFirst);
    // in the deciding game, the players change ends when one reaches 5
    const deciding = this.games[0] === this.fmt.games - 1 && this.games[1] === this.fmt.games - 1;
    if (deciding && !this.decidingSwapDone && Math.max(p[0], p[1]) === 5) { this.decidingSwapDone = true; out.ends = true; }
    out.call = `${p[0]}–${p[1]}`;
    return out;
  }
  pointLabel(t) { return String(this.points[t]); }
}
