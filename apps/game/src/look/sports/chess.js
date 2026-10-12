import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Chess } from 'chess.js';
import { C, FONT } from '../uikit.js';
import { sfx } from '../audio.js';
import { walletEngine } from '../wallet.js';
import { person, box, mat, signBoard } from './common.js';

// The Chess Corner (Elvis, 10 October 2026): a shaded pavilion with four tables. Two regulars play each
// other all day; three more wait for a challenger, each at their own strength; the fourth table is for
// you and anyone else online, or two people on one keyboard. Every rule of chess is played: castling,
// en passant, promotion, check, checkmate, stalemate, threefold repetition, the fifty-move rule and
// insufficient material (chess.js). The computer players think in a worker so the street never stalls.

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const TXT = '︎'; // text, never emoji
const FILES = 'abcdefgh';
export const CHALLENGERS = [
  { name: 'Baba Tunde', level: 1, kind: 'casual', reward: 150, look: { body: 'm', skin: '#5a3825', hair: 'bald', top: 'kaftan', topColor: '#e8e2d0', bottom: 'trousers', bottomColor: '#e8e2d0', shoes: 'sandals', shoeColor: '#5a3a24', acc: ['glasses'] } },
  { name: 'Aunty Kemi', level: 2, kind: 'club player', reward: 350, look: { body: 'f', skin: '#7a4a2e', hair: 'gele', hairColor: '#2a9d94', top: 'ankara', topColor: '#2a9d94', bottom: 'wrapper', bottomColor: '#f2b33d', shoes: 'sandals', shoeColor: '#3b2a20', acc: ['earrings'] } },
  { name: 'Coach Emeka', level: 3, kind: 'strong', reward: 800, look: { body: 'm', skin: '#4a2e1c', hair: 'low', hairColor: '#1b1714', top: 'tee', topColor: '#22336a', bottom: 'trousers', bottomColor: '#3b3f45', shoes: 'sneakers', shoeColor: '#f4f1ea', acc: ['watch'] } },
];

const CSS = `
#lk-chess { position: fixed; inset: 0; z-index: 40; display: none; align-items: center; justify-content: center; pointer-events: none; }
#lk-chess.on { display: flex; }
#lk-chess .pane { pointer-events: auto; display: flex; gap: 18px; padding: 18px; border-radius: 22px; background: ${C.paper}; color: ${C.ink}; font: 600 14px/1.35 ${FONT};
  box-shadow: 0 6px 0 rgba(59,42,32,.22), 0 24px 60px rgba(10,14,30,.35); max-width: calc(100vw - 24px); max-height: calc(100vh - 24px); }
#lk-chess .board { --sq: min(58px, calc((100vh - 120px) / 8), calc((100vw - 60px) / 8)); display: grid; grid-template-columns: repeat(8, var(--sq)); grid-template-rows: repeat(8, var(--sq));
  border: 6px solid #6b4a2e; border-radius: 8px; box-shadow: inset 0 0 0 2px #3b2a20; position: relative; flex: 0 0 auto; }
#lk-chess .sq { position: relative; display: grid; place-items: center; border: 0; padding: 0; margin: 0; cursor: pointer; font: 400 calc(var(--sq) * 0.78)/1 "Segoe UI Symbol", "Noto Sans Symbols2", "DejaVu Sans", serif; }
#lk-chess .sq.l { background: #eed9b0; } #lk-chess .sq.d { background: #a9784f; }
#lk-chess .sq.last { box-shadow: inset 0 0 0 100px rgba(242,179,61,.38); }
#lk-chess .sq.sel { box-shadow: inset 0 0 0 4px ${C.teal}; }
#lk-chess .sq.chk { box-shadow: inset 0 0 0 100px rgba(228,111,79,.55); }
#lk-chess .sq.can::after { content: ''; position: absolute; width: 28%; height: 28%; border-radius: 50%; background: rgba(42,157,148,.6); }
#lk-chess .sq.can.cap::after { width: 86%; height: 86%; background: none; border: 4px solid rgba(42,157,148,.7); box-sizing: border-box; }
#lk-chess .pc { pointer-events: none; transform: translateY(-2%); }
#lk-chess .pc.w { color: #fffaf0; -webkit-text-stroke: 1.4px #3b2a20; text-shadow: 0 2px 0 rgba(59,42,32,.35); }
#lk-chess .pc.b { color: #2b2018; text-shadow: 0 2px 0 rgba(255,250,240,.25); }
#lk-chess .coord { position: absolute; font: 700 10px/1 ${FONT}; opacity: .7; pointer-events: none; }
#lk-chess .coord.f { right: 3px; bottom: 2px; } #lk-chess .coord.r { left: 3px; top: 2px; }
#lk-chess .sq.l .coord { color: #a9784f; } #lk-chess .sq.d .coord { color: #eed9b0; }
#lk-chess .side { width: 250px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
#lk-chess h3 { margin: 0; font: 800 22px/1.1 ${FONT}; }
#lk-chess .who { display: flex; flex-direction: column; gap: 4px; }
#lk-chess .who div { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 12px; background: ${C.paper2}; }
#lk-chess .who div.turn { background: ${C.teal}; color: #fff; }
#lk-chess .who i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${C.ink}; flex: 0 0 auto; }
#lk-chess .who i.w { background: #fffaf0; } #lk-chess .who i.b { background: #2b2018; }
#lk-chess .who small { margin-left: auto; opacity: .8; }
#lk-chess .st { padding: 8px 10px; border-radius: 12px; background: #fffaf0; border: 2px dashed #e3d4b4; min-height: 40px; }
#lk-chess .moves { flex: 1 1 auto; min-height: 80px; max-height: 210px; overflow: auto; margin: 0; padding: 0 0 0 26px; font: 600 13px/1.5 ${FONT}; color: ${C.ink2}; }
#lk-chess .moves li span { display: inline-block; min-width: 64px; color: ${C.ink}; }
#lk-chess .btns { display: flex; flex-wrap: wrap; gap: 6px; }
#lk-chess .btns button, #lk-chess .opt button, #lk-chess .promo button { border: 0; border-radius: 999px; padding: 7px 12px; background: ${C.ink}; color: ${C.paper}; font: 700 13px/1 ${FONT}; cursor: pointer; }
#lk-chess .btns button.soft, #lk-chess .opt button.soft { background: ${C.paper2}; color: ${C.ink}; }
#lk-chess .opt { display: flex; flex-direction: column; gap: 8px; }
#lk-chess .opt p { margin: 0; color: ${C.ink2}; font-size: 13px; }
#lk-chess .opt .row { display: flex; flex-wrap: wrap; gap: 6px; }
#lk-chess .opt ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow: auto; }
#lk-chess .opt li { display: flex; align-items: center; gap: 8px; } #lk-chess .opt li b { flex: 1; }
#lk-chess .promo { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; gap: 8px; background: rgba(247,239,220,.88); }
#lk-chess .promo.on { display: flex; } #lk-chess .promo button { font-size: 30px; padding: 8px 14px; background: ${C.paper2}; color: ${C.ink}; }
#lk-chess-ask { position: fixed; left: 50%; top: 84px; transform: translateX(-50%); z-index: 41; display: none; gap: 10px; align-items: center; padding: 10px 12px 10px 18px; border-radius: 999px;
  background: ${C.paper}; color: ${C.ink}; font: 700 14px/1.2 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.22), 0 16px 40px rgba(10,14,30,.3); }
#lk-chess-ask.on { display: flex; } #lk-chess-ask button { border: 0; border-radius: 999px; padding: 7px 12px; background: ${C.ink}; color: ${C.paper}; font: 700 13px/1 ${FONT}; cursor: pointer; }
#lk-chess-ask button.soft { background: ${C.paper2}; color: ${C.ink}; }
@media (max-width: 720px) { #lk-chess .pane { flex-direction: column; padding: 10px; gap: 10px; overflow: auto; } #lk-chess .side { width: auto; } #lk-chess .moves { max-height: 90px; } }
`;

// ---------- 3D pieces: turned wood, a few lathe profiles ----------
const lathe = (pts, s) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * s, y * s)), 14);
function pieceGeo(type, s) {
  const base = [[0, 0], [0.42, 0], [0.42, 0.08], [0.34, 0.14], [0.3, 0.2]];
  const P = {
    p: [...base, [0.17, 0.32], [0.14, 0.52], [0.24, 0.56], [0.12, 0.6], [0.2, 0.72], [0.18, 0.84], [0.08, 0.9], [0, 0.91]],
    r: [...base, [0.25, 0.3], [0.24, 0.8], [0.32, 0.84], [0.32, 1.02], [0, 1.02]],
    b: [...base, [0.17, 0.4], [0.14, 0.76], [0.26, 0.8], [0.14, 0.86], [0.22, 1.02], [0.15, 1.16], [0.05, 1.24], [0.07, 1.3], [0, 1.32]],
    q: [...base, [0.2, 0.36], [0.15, 0.96], [0.3, 1.02], [0.17, 1.08], [0.3, 1.32], [0.12, 1.38], [0.07, 1.44], [0, 1.46]],
    k: [...base, [0.21, 0.38], [0.16, 1.04], [0.31, 1.1], [0.18, 1.16], [0.28, 1.4], [0, 1.42]],
    n: [...base, [0.22, 0.3], [0.2, 0.46], [0, 0.46]],
  }[type];
  let g = lathe(P, s);
  if (type === 'n') g = mergeGeometries([g.toNonIndexed(), new THREE.BoxGeometry(0.24 * s, 0.62 * s, 0.5 * s).rotateX(-0.35).translate(0, 0.74 * s, 0.06 * s).toNonIndexed(), new THREE.BoxGeometry(0.2 * s, 0.22 * s, 0.44 * s).translate(0, 0.98 * s, 0.22 * s).toNonIndexed()]);
  else if (type === 'k') g = mergeGeometries([g.toNonIndexed(), new THREE.BoxGeometry(0.08 * s, 0.34 * s, 0.08 * s).translate(0, 1.56 * s, 0).toNonIndexed(), new THREE.BoxGeometry(0.24 * s, 0.08 * s, 0.08 * s).translate(0, 1.58 * s, 0).toNonIndexed()]);
  else g = g.toNonIndexed();
  return g;
}

function boardTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { g.fillStyle = (r + f) % 2 ? '#a9784f' : '#eed9b0'; g.fillRect(32 + f * 56, 32 + r * 56, 56, 56); }
  g.fillStyle = '#eed9b0'; g.font = '700 18px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) { g.fillText(FILES[i], 60 + i * 56, 497); g.fillText(String(8 - i), 16, 60 + i * 56); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createChess({ world, scene, props, used, findSite, toast, avatar, online, getMyName }) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'lk-chess'; document.body.appendChild(root);
  const ask = document.createElement('div'); ask.id = 'lk-chess-ask'; document.body.appendChild(ask);

  // ---------- the pavilion ----------
  const at = findSite(world, used, 16, 12);
  const group = new THREE.Group(); group.name = 'chess-corner'; scene.add(group);
  const tables = [];
  if (at) {
    group.position.set(at.x, 0, at.z);
    const wood = mat(0x8a5a36, 0.6), dark = mat(0x4a3424, 0.7), slab = mat(0xcfc6b4, 0.9), roof = mat(0x2f6b4f, 0.8), post = mat(0xe8e2d0, 0.8);
    group.add(new THREE.Mesh(box(14, 0.12, 10, 0, 0.06, 0), slab));
    group.add(new THREE.Mesh(mergeGeometries([[-6.6, -4.6], [6.6, -4.6], [-6.6, 4.6], [6.6, 4.6]].map(([x, z]) => box(0.25, 3.1, 0.25, x, 1.6, z))), post));
    group.add(new THREE.Mesh(mergeGeometries([box(14.6, 0.16, 5.4, 0, 3.32, -2.45).rotateX(0.12), box(14.6, 0.16, 5.4, 0, 3.32, 2.45).rotateX(-0.12)]), roof));
    const sign = signBoard('CHESS CORNER', 'Play the Yaba regulars, or anyone online', '#2f6b4f');
    sign.position.set(0, 3.0, 5.0); group.add(sign);
    world.claim?.({ kind: 'recreation', cx: at.x, cz: at.z, hx: 7, hz: 5, ry: 0 });
    const tex = boardTexture(), boardMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    const W = new THREE.MeshStandardMaterial({ color: 0xf3e6c8, roughness: 0.45 }), B = new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 0.45 });
    const SQ = 0.06, S = SQ * 0.82, TOP = 0.76;
    const GEO = Object.fromEntries(['p', 'n', 'b', 'r', 'q', 'k'].map((k) => [k, pieceGeo(k, S * 0.62)]));
    [[-3.6, -1.4], [3.6, -1.4], [-3.6, 2.2], [3.6, 2.2]].forEach(([x, z], i) => {
      const t = new THREE.Group(); t.position.set(x, 0, z); group.add(t);
      t.add(new THREE.Mesh(mergeGeometries([box(1.0, 0.06, 1.0, 0, TOP - 0.03, 0), box(0.12, TOP - 0.06, 0.12, 0, (TOP - 0.06) / 2, 0), box(0.6, 0.05, 0.6, 0, 0.025, 0)]), wood));
      const top = new THREE.Mesh(new THREE.PlaneGeometry(SQ * 8 + 0.07, SQ * 8 + 0.07).rotateX(-Math.PI / 2), boardMat); top.position.y = TOP + 0.002; t.add(top);
      // stools: White sits on the +z side
      t.add(new THREE.Mesh(mergeGeometries([0.95, -0.95].map((sz) => box(0.42, 0.46, 0.42, 0, 0.23, sz))), dark));
      const wMesh = new THREE.Mesh(new THREE.BufferGeometry(), W), bMesh = new THREE.Mesh(new THREE.BufferGeometry(), B);
      t.add(wMesh, bMesh);
      world.addColliders?.([{ name: 'chess_table', cx: at.x + x, cz: at.z + z, hx: 0.55, hz: 0.55, ry: 0, h: 0.8 }]);
      const T = { i, g: t, wx: at.x + x, wz: at.z + z, wMesh, bMesh, fen: '', npc: null, game: new Chess(), busy: false, clock: 8 + i * 5 };
      // the pieces as two merged meshes, rebuilt when the position changes
      T.show = (fen) => {
        if (fen === T.fen) return; T.fen = fen;
        const c = new Chess(fen), w = [], b = [];
        c.board().forEach((row, r) => row.forEach((p, f) => { if (!p) return; const gg = GEO[p.type].clone(); if (p.type === 'n') gg.rotateY(p.color === 'w' ? Math.PI : 0); gg.translate((f - 3.5) * SQ, TOP + 0.004, (r - 3.5) * SQ); (p.color === 'w' ? w : b).push(gg); }));
        wMesh.geometry.dispose(); bMesh.geometry.dispose();
        wMesh.geometry = w.length ? mergeGeometries(w) : new THREE.BufferGeometry(); bMesh.geometry = b.length ? mergeGeometries(b) : new THREE.BufferGeometry();
        w.concat(b).forEach((g) => g.dispose());
      };
      T.show(T.game.fen());
      tables.push(T);
    });
    // table 0: two regulars at it all day; tables 1 to 3: a challenger each; the last is yours
    const reg = [{ name: 'Mr Bayo', look: { body: 'm', skin: '#6b4226', hair: 'fila', hairColor: '#7a1f2a', top: 'agbada', topColor: '#d9c9a3', bottom: 'trousers', bottomColor: '#d9c9a3', shoes: 'loafers', shoeColor: '#3b2a20', acc: [] } },
      { name: 'Mama Ngozi', look: { body: 'f', skin: '#8a5a3c', hair: 'braids', hairColor: '#1b1714', top: 'adire', topColor: '#22336a', bottom: 'skirt', bottomColor: '#22336a', shoes: 'sandals', shoeColor: '#5a3a24', acc: ['beads'] } }];
    const seat = (T, side, who) => {
      const p = person(who.look, who.name); p.obj.position.set(T.wx, 0, T.wz + side * 0.95); p.obj.rotation.y = side > 0 ? Math.PI : 0; scene.add(p.obj);
      return { ...p, name: who.name };
    };
    tables[0].regulars = [seat(tables[0], 1, reg[0]), seat(tables[0], -1, reg[1])];
    // one challenger at each of tables 1 to 3
    tables[1].npc = { ...seat(tables[1], -1, CHALLENGERS[0]), ...CHALLENGERS[0] };
    tables[2].npc = { ...seat(tables[2], -1, CHALLENGERS[1]), ...CHALLENGERS[1] };
    tables[3].npc = { ...seat(tables[3], -1, CHALLENGERS[2]), ...CHALLENGERS[2] };
    // the open table for players stands just outside the pavilion
    const open = new THREE.Group(); open.position.set(0, 0, -3.6); group.add(open);
    {
      const x = 0, z = -3.6;
      open.add(new THREE.Mesh(mergeGeometries([box(1.0, 0.06, 1.0, 0, TOP - 0.03, 0), box(0.12, TOP - 0.06, 0.12, 0, (TOP - 0.06) / 2, 0), box(0.6, 0.05, 0.6, 0, 0.025, 0)]), wood));
      const top = new THREE.Mesh(new THREE.PlaneGeometry(SQ * 8 + 0.07, SQ * 8 + 0.07).rotateX(-Math.PI / 2), boardMat); top.position.y = TOP + 0.002; open.add(top);
      open.add(new THREE.Mesh(mergeGeometries([0.95, -0.95].map((sz) => box(0.42, 0.46, 0.42, 0, 0.23, sz))), dark));
      const wMesh = new THREE.Mesh(new THREE.BufferGeometry(), W), bMesh = new THREE.Mesh(new THREE.BufferGeometry(), B); open.add(wMesh, bMesh);
      world.addColliders?.([{ name: 'chess_table', cx: at.x + x, cz: at.z + z, hx: 0.55, hz: 0.55, ry: 0, h: 0.8 }]);
      const T = { i: 4, g: open, wx: at.x + x, wz: at.z + z, wMesh, bMesh, fen: '', npc: null, game: new Chess(), open: true };
      T.show = (fen) => {
        if (fen === T.fen) return; T.fen = fen;
        const c = new Chess(fen), w = [], b = [];
        c.board().forEach((row, r) => row.forEach((p, f) => { if (!p) return; const gg = GEO[p.type].clone(); if (p.type === 'n') gg.rotateY(p.color === 'w' ? Math.PI : 0); gg.translate((f - 3.5) * SQ, TOP + 0.004, (r - 3.5) * SQ); (p.color === 'w' ? w : b).push(gg); }));
        wMesh.geometry.dispose(); bMesh.geometry.dispose();
        wMesh.geometry = w.length ? mergeGeometries(w) : new THREE.BufferGeometry(); bMesh.geometry = b.length ? mergeGeometries(b) : new THREE.BufferGeometry();
        w.concat(b).forEach((g) => g.dispose());
      };
      T.show(T.game.fen());
      tables.push(T);
    }
    tables.forEach((T) => {
      const label = T.npc ? `Play chess with ${T.npc.name} (${T.npc.kind})` : T.regulars ? `Watch ${T.regulars[0].name} and ${T.regulars[1].name} play` : 'Chess table: invite a player online, or play a friend here';
      props.interact.push({ id: `chess:${T.i}`, label, x: T.wx, z: T.wz + (T.npc || T.open ? 1.5 : 1.6), r: 1.4 });
    });
    props.pois?.push({ kind: 'recreation', name: `${world.place?.name ?? 'Yaba'} Chess Corner`, x: at.x, z: at.z });
  }

  // ---------- the computer players ----------
  let worker = null, reqId = 0;
  const waiting = new Map();
  function think(fen, level) {
    if (!worker) {
      worker = new Worker(new URL('./chessai.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const w = waiting.get(e.data.id); if (w) { waiting.delete(e.data.id); w(e.data.move || null); } };
    }
    return new Promise((res) => { const id = ++reqId; waiting.set(id, res); worker.postMessage({ id, fen, level }); });
  }

  // ---------- your game ----------
  // mode: 'ai' (a challenger), 'local' (two on one keyboard), 'online' (another player), 'watch'
  let G = null; // { mode, table, game, you: 'w'|'b'|'both', opp: { name, level, id }, gid, sel, last, over, drawOffer, evalOpp }
  const myId = () => online?.id;

  function statusText() {
    const g = G.game;
    if (G.over) return G.over;
    const side = g.turn() === 'w' ? 'White' : 'Black';
    if (G.mode === 'watch') return `${g.inCheck() ? 'Check! ' : ''}${G.watchNames?.[g.turn() === 'w' ? 0 : 1] || side} (${side}) to move.`;
    const yours = G.you === 'both' || g.turn() === G.you;
    let s = yours ? (G.you === 'both' ? `${side} to move` : 'Your move') : `${G.opp.name} is thinking…`;
    if (G.mode === 'online' && !yours) s = `Waiting for ${G.opp.name}…`;
    if (g.inCheck()) s = `Check! ${s}`;
    if (G.drawOffer === 'them') s = `${G.opp.name} offers a draw. ${s}`;
    return s;
  }
  function endCheck() {
    const g = G.game;
    if (g.isCheckmate()) { const winner = g.turn() === 'w' ? 'b' : 'w'; finish(winner, 'checkmate'); return true; }
    if (g.isStalemate()) { finish(null, 'stalemate'); return true; }
    if (g.isThreefoldRepetition()) { finish(null, 'threefold repetition'); return true; }
    if (g.isInsufficientMaterial()) { finish(null, 'insufficient material'); return true; }
    if (g.isDrawByFiftyMoves()) { finish(null, 'the fifty-move rule'); return true; }
    return false;
  }
  function finish(winner, how) {
    if (G.over) return;
    const name = (c) => (G.you === 'both' ? (c === 'w' ? 'White' : 'Black') : c === G.you ? 'You' : G.opp.name);
    if (!winner) G.over = `Draw by ${how}.`;
    else G.over = `${name(winner)} ${name(winner) === 'You' ? 'win' : 'wins'} by ${how}.`;
    sfx(winner && winner === G.you ? 'arrive' : 'close');
    if (winner && winner === G.you && G.mode === 'ai' && G.opp.reward) {
      walletEngine().earn(G.opp.reward, `Beat ${G.opp.name} at chess`);
      G.over += ` ${G.opp.name} shakes your hand. +${G.opp.reward} Efforts.`;
    }
    render();
  }

  function sqName(r, f) { return FILES[f] + String(8 - r); }
  function render() {
    document.body.classList.toggle('bw-playing', !!G);
    if (!G) { root.classList.remove('on'); return; }
    root.classList.add('on');
    const g = G.game, flip = (G.you === 'b') !== !!G.flip;
    const legal = G.sel ? g.moves({ square: G.sel, verbose: true }) : [];
    const kingSq = g.inCheck() ? g.board().flat().find((p) => p && p.type === 'k' && p.color === g.turn())?.square : null;
    let cells = '';
    for (let i = 0; i < 64; i++) {
      const rr = flip ? 7 - Math.floor(i / 8) : Math.floor(i / 8), ff = flip ? 7 - (i % 8) : i % 8, sq = sqName(rr, ff), p = g.get(sq);
      const can = legal.find((m) => m.to === sq);
      const cls = ['sq', (rr + ff) % 2 ? 'd' : 'l', G.last && (G.last.from === sq || G.last.to === sq) ? 'last' : '', G.sel === sq ? 'sel' : '', can ? 'can' : '', can && (can.captured || can.flags.includes('e')) ? 'cap' : '', kingSq === sq ? 'chk' : ''].filter(Boolean).join(' ');
      const coordF = (flip ? rr === 0 : rr === 7) ? `<span class="coord f">${FILES[ff]}</span>` : '';
      const coordR = (flip ? ff === 7 : ff === 0) ? `<span class="coord r">${8 - rr}</span>` : '';
      cells += `<button class="${cls}" data-sq="${sq}" aria-label="${sq}${p ? ` ${p.color === 'w' ? 'white' : 'black'} ${p.type}` : ''}">${p ? `<span class="pc ${p.color}">${GLYPH[p.type]}${TXT}</span>` : ''}${coordF}${coordR}</button>`;
    }
    const hist = g.history(); let list = '';
    for (let i = 0; i < hist.length; i += 2) list += `<li><span>${hist[i]}</span>${hist[i + 1] || ''}</li>`;
    const names = G.mode === 'watch' ? G.watchNames || ['White', 'Black'] : G.you === 'both' ? ['White', 'Black'] : G.you === 'w' ? ['You', G.opp.name] : [G.opp.name, 'You'];
    const captured = (c) => { const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }; const now = { p: 0, n: 0, b: 0, r: 0, q: 0 }; g.board().flat().forEach((p) => { if (p && p.color === c && now[p.type] !== undefined) now[p.type]++; }); return Object.entries(start).map(([k, n]) => GLYPH[k].repeat(Math.max(0, n - now[k]))).join(''); };
    const opts = G.mode === 'menu' ? menuHTML() : '';
    root.innerHTML = `<div class="pane" role="dialog" aria-label="Chess">
      <div class="board">${cells}<div class="promo">${['q', 'r', 'b', 'n'].map((k) => `<button data-promo="${k}">${GLYPH[k]}${TXT}</button>`).join('')}</div></div>
      <div class="side">
        <h3>${G.mode === 'menu' ? 'Chess table' : G.mode === 'watch' ? 'Watching' : 'Chess'}</h3>
        ${G.mode === 'menu' ? opts : `<div class="who"><div class="${g.turn() === 'b' ? 'turn' : ''}"><i class="b"></i>${names[1]}<small>${captured('w')}</small></div><div class="${g.turn() === 'w' ? 'turn' : ''}"><i class="w"></i>${names[0]}<small>${captured('b')}</small></div></div>
        <div class="st">${statusText()}</div>
        <ol class="moves">${list}</ol>
        <div class="btns">${G.over ? '<button data-act="again">Play again</button>' : G.mode === 'watch' ? '' : `${G.mode !== 'local' ? '<button class="soft" data-act="draw">Offer a draw</button>' : ''}<button class="soft" data-act="resign">Resign</button>${G.drawOffer === 'them' ? '<button data-act="drawok">Accept the draw</button>' : ''}`}<button class="soft" data-act="flip">Turn the board</button><button data-act="leave">Leave · Esc</button></div>`}
      </div></div>`;
    const ml = root.querySelector('.moves'); if (ml) ml.scrollTop = ml.scrollHeight;
    root.querySelectorAll('[data-sq]').forEach((b) => { b.onclick = () => clickSq(b.dataset.sq); });
    root.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => act(b.dataset.act); });
    root.querySelectorAll('[data-start]').forEach((b) => { b.onclick = () => startFromMenu(b.dataset.start, b.dataset.arg); });
    root.querySelectorAll('[data-promo]').forEach((b) => { b.onclick = () => { const m = G.pendingPromo; G.pendingPromo = null; if (m) tryMove(m.from, m.to, b.dataset.promo); }; });
    if (G.pendingPromo) root.querySelector('.promo').classList.add('on');
    if (G.table) G.table.show(g.fen());
  }

  function menuHTML() {
    const others = (online?.players?.() || []).filter((p) => p.id !== myId());
    const me = getMyName?.() || 'You';
    return `<div class="opt">
      <p>Play a friend at this table on one keyboard, or invite a builder who is online. Inviting sends them the board; they can play from wherever they are.</p>
      <div class="row"><button data-start="local">Two players here</button></div>
      <p><b>Online now</b></p>
      ${online?.online ? (others.length ? `<ul>${others.slice(0, 20).map((p) => `<li><b>${String(p.name || 'Builder').replace(/[<>&"]/g, '')}</b><button data-start="invite" data-arg="${p.id}">Invite</button></li>`).join('')}</ul>` : '<p>Nobody else is online in the district right now. Try again later, or play the regulars in the pavilion.</p>') : '<p>You are offline, so there is nobody to invite.</p>'}
      <p>Or play the regulars: ${CHALLENGERS.map((c) => `${c.name} (${c.kind})`).join(', ')}.</p>
      <div class="row"><button class="soft" data-act="leave">Leave · Esc</button></div>
      <p style="font-size:12px">Playing as ${me}.</p></div>`;
  }

  function clickSq(sq) {
    if (!G || G.over || G.mode === 'menu' || G.mode === 'watch') return;
    const g = G.game;
    const mine = G.you === 'both' || g.turn() === G.you;
    if (!mine || G.thinking) return;
    const p = g.get(sq);
    if (G.sel) {
      const m = g.moves({ square: G.sel, verbose: true }).find((x) => x.to === sq);
      if (m) {
        if (m.flags.includes('p')) { G.pendingPromo = { from: G.sel, to: sq }; G.sel = null; render(); return; }
        tryMove(G.sel, sq); return;
      }
    }
    G.sel = p && p.color === g.turn() ? sq : null;
    render();
  }

  function tryMove(from, to, promotion) {
    const g = G.game;
    let m = null;
    try { m = g.move({ from, to, promotion }); } catch { m = null; }
    if (!m) { G.sel = null; render(); return; }
    G.sel = null; G.last = m; G.drawOffer = G.drawOffer === 'me' ? null : G.drawOffer;
    sfx('clack');
    if (G.mode === 'online') sendOnline('move');
    if (!endCheck()) render();
    if (!G.over && G.mode === 'ai' && g.turn() !== G.you) aiMove();
  }

  async function aiMove() {
    const mine = G; mine.thinking = true; render();
    const t0 = performance.now();
    const mv = await think(mine.game.fen(), mine.opp.level);
    // a person takes a moment, even for an obvious move
    const wait = Math.max(0, 700 + Math.random() * 600 - (performance.now() - t0));
    await new Promise((r) => setTimeout(r, wait));
    if (G !== mine || mine.over) return;
    mine.thinking = false;
    if (!mv) { endCheck(); render(); return; }
    mine.evalOpp = mv.eval;
    const m = mine.game.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
    mine.last = m; sfx('clack');
    if (!endCheck()) render();
  }

  function act(a) {
    if (!G) return;
    const g = G.game;
    if (a === 'leave') { leave(); return; }
    if (a === 'flip') { G.flip = !G.flip; render(); return; }
    if (a === 'again') { if (G.mode === 'online') { leave(); return; } start({ ...G, game: new Chess(), over: null, last: null, sel: null, drawOffer: null, you: G.mode === 'ai' ? (G.you === 'w' ? 'b' : 'w') : G.you }); if (G.table) dispatchEvent(new CustomEvent('bw:shot', { detail: camFor(G.table, G.you) })); return; }
    if (G.over) return;
    if (a === 'resign') {
      if (G.mode === 'local') { finish(g.turn() === 'w' ? 'b' : 'w', 'resignation'); return; }
      if (G.mode === 'online') sendOnline('resign');
      finish(G.you === 'w' ? 'b' : 'w', 'resignation');
      return;
    }
    if (a === 'draw') {
      if (G.mode === 'ai') {
        // the computer takes a draw when it is no better off, or the game has gone long and level
        const e = G.evalOpp ?? 0, long = g.history().length > 40;
        if (e < -60 || (long && Math.abs(e) < 40)) finish(null, 'agreement');
        else { toast?.(`${G.opp.name} shakes their head: "Play on."`, 2400); }
        return;
      }
      if (G.mode === 'online') { G.drawOffer = 'me'; sendOnline('draw'); toast?.(`Draw offered to ${G.opp.name}.`, 2200); render(); }
      return;
    }
    if (a === 'drawok' && G.drawOffer === 'them') { if (G.mode === 'online') sendOnline('drawok'); finish(null, 'agreement'); }
  }

  // ---------- starting and leaving ----------
  // a held view over the board, from your side
  function camFor(T, side) {
    if (!T) return null;
    const s = side === 'b' ? -1 : 1;
    return { from: { x: T.wx, y: 1.85, z: T.wz + s * 1.15 }, at: { x: T.wx, y: 0.7, z: T.wz - s * 0.05 } };
  }
  function start(state) {
    G = { sel: null, last: null, over: null, drawOffer: null, ...state };
    if (G.table && G.mode !== 'watch') G.table.show(G.game.fen());
    render();
    if (G.mode === 'ai' && G.game.turn() !== G.you) aiMove();
  }
  function startFromMenu(kind, arg) {
    const T = G?.table;
    if (kind === 'local') { start({ mode: 'local', table: T, game: new Chess(), you: 'both', opp: { name: 'Black' } }); return; }
    if (kind === 'invite') {
      const p = (online?.players?.() || []).find((q) => q.id === arg); if (!p) return;
      const gid = Math.random().toString(36).slice(2, 12);
      pendingInvite = { gid, to: p.id, name: p.name, t: Date.now() };
      online.play({ to: p.id, game: 'chess', gid, act: 'invite', moves: '' });
      toast?.(`Invitation sent to ${p.name}. Waiting for an answer…`, 3000);
    }
  }
  function leave() {
    if (G?.mode === 'online' && !G.over) sendOnline('leave');
    if (G?.table && !G.table.regulars) G.table.show(new Chess().fen());
    G = null; render();
    dispatchEvent(new CustomEvent('bw:shot', { detail: null }));
    sfx('close');
  }

  // the E key at a table
  function use(id) {
    if (!at) return false;
    const T = tables.find((x) => `chess:${x.i}` === id); if (!T) return false;
    if (T.regulars) { start({ mode: 'watch', table: T, game: T.game, you: 'w', opp: { name: T.regulars[1].name } }); G.watchNames = T.regulars.map((r) => r.name); dispatchEvent(new CustomEvent('bw:shot', { detail: camFor(T, 'w') })); return true; }
    if (T.npc) {
      start({ mode: 'ai', table: T, game: new Chess(), you: 'w', opp: { name: T.npc.name, level: T.npc.level, reward: T.npc.reward } });
      dispatchEvent(new CustomEvent('bw:shot', { detail: camFor(T, 'w') }));
      toast?.(`${T.npc.name}: "${['Sit, sit. You play White.', 'Let us see what you have. White moves first.', 'Concentrate. You are White.'][T.npc.level - 1]}"`, 3200);
      return true;
    }
    G = { mode: 'menu', table: T, game: new Chess(), you: 'w', opp: { name: '' } };
    dispatchEvent(new CustomEvent('bw:shot', { detail: camFor(T, 'w') }));
    render();
    return true;
  }

  // ---------- online play over presence ----------
  let pendingInvite = null, incoming = null;
  function sendOnline(actName) {
    if (!online || !G?.gid) return;
    online.play({ to: G.opp.id, game: 'chess', gid: G.gid, act: actName, moves: G.game.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || '')).join(' ') });
  }
  function showAsk(html, onYes, onNo) {
    ask.innerHTML = html; ask.classList.add('on');
    ask.querySelector('[data-y]').onclick = () => { ask.classList.remove('on'); onYes(); };
    ask.querySelector('[data-n]').onclick = () => { ask.classList.remove('on'); onNo?.(); };
  }
  addEventListener('bw:play', (e) => {
    const { from, name, play } = e.detail || {}; if (!play || play.game !== 'chess') return;
    const safe = String(name || 'A builder').replace(/[<>&"]/g, '');
    if (play.act === 'invite') {
      if (G && G.mode === 'online' && !G.over) { online?.play({ to: from, game: 'chess', gid: play.gid, act: 'decline', moves: '' }); return; }
      incoming = { from, name: safe, gid: play.gid };
      sfx('door');
      showAsk(`♟ ${safe} invites you to a game of chess. <button data-y>Play</button><button class="soft" data-n>Not now</button>`, () => {
        online?.play({ to: from, game: 'chess', gid: play.gid, act: 'accept', moves: '' });
        start({ mode: 'online', table: null, game: new Chess(), you: 'b', opp: { name: safe, id: from }, gid: play.gid });
        toast?.(`You play Black against ${safe}. White moves first.`, 3000);
      }, () => online?.play({ to: from, game: 'chess', gid: play.gid, act: 'decline', moves: '' }));
      return;
    }
    if (play.act === 'accept' && pendingInvite && play.gid === pendingInvite.gid) {
      const T = G?.table;
      start({ mode: 'online', table: T, game: new Chess(), you: 'w', opp: { name: safe, id: from }, gid: play.gid });
      pendingInvite = null; sfx('arrive'); toast?.(`${safe} accepted. You play White.`, 2600);
      return;
    }
    if (play.act === 'decline' && pendingInvite && play.gid === pendingInvite.gid) { pendingInvite = null; toast?.(`${safe} cannot play right now.`, 2600); return; }
    if (!G || G.mode !== 'online' || play.gid !== G.gid) return;
    if (play.act === 'move' || play.act === 'draw' || play.act === 'drawno') {
      // their list of moves: apply any we have not seen, checking each against the rules
      const theirs = (play.moves || '').split(' ').filter(Boolean), ours = G.game.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
      if (theirs.length > ours.length && ours.every((m, i) => theirs[i] === m)) {
        for (const u of theirs.slice(ours.length)) {
          let m = null; try { m = G.game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { m = null; }
          if (!m) break; G.last = m; sfx('clack');
        }
        if (G.drawOffer === 'me') G.drawOffer = null;
        endCheck();
      }
      if (play.act === 'draw') G.drawOffer = 'them';
      render();
      return;
    }
    if (play.act === 'resign') { finish(G.you, 'resignation'); return; }
    if (play.act === 'drawok') { finish(null, 'agreement'); return; }
    if (play.act === 'leave') { if (!G.over) { G.over = `${G.opp.name} left the game.`; render(); } }
  });

  // ---------- the regulars play on ----------
  let watchT = 0;
  function update(dt) {
    if (!at) return;
    const T = tables[0];
    T.clock -= dt;
    if (T.clock <= 0 && !T.busy) {
      T.busy = true; T.clock = 9 + Math.random() * 14;
      if (T.game.isGameOver() || T.game.history().length > 160) { T.game = new Chess(); T.show(T.game.fen()); T.busy = false; if (G?.mode === 'watch' && G.table === T) { G.game = T.game; G.over = null; render(); } return; }
      think(T.game.fen(), 1).then((mv) => {
        T.busy = false; if (!mv) return;
        const m = T.game.move({ from: mv.from, to: mv.to, promotion: mv.promotion });
        T.show(T.game.fen());
        const near = Math.hypot(avatar.position.x - T.wx, avatar.position.z - T.wz) < 8;
        if (near) sfx('clack');
        if (G?.mode === 'watch' && G.table === T) { G.last = m; if (!endCheck()) render(); }
      });
    }
    // the players lean over the board and now and then reach to move
    watchT += dt;
    const seated = [...(T.regulars || []), ...tables.map((x) => x.npc).filter(Boolean)];
    seated.forEach((p, k) => { p.rig?.update(dt, { speed: 0, seated: true, t: watchT + k }); p.rig && (p.rig.neck.rotation.x = 0.35); });
  }

  // while you play, you sit on your stool, facing the board
  function seatPose() {
    if (!G || !G.table) return null;
    const T = G.table, s = G.you === 'b' ? -1 : 1;
    return { x: T.wx, z: T.wz + s * 0.95, yaw: s > 0 ? Math.PI : 0, seated: true };
  }

  return {
    use, update, seatPose,
    get isOpen() { return !!G; },
    close: leave,
    get state() { return G ? { mode: G.mode, fen: G.game.fen(), over: G.over, you: G.you, opp: G.opp?.name, thinking: !!G.thinking, history: G.game.history() } : null; },
    // for tests: play a move as if clicked
    test: { move: (from, to, promo) => tryMove(from, to, promo), click: clickSq, act, start: startFromMenu, tables },
    site: at, tables,
  };
}
