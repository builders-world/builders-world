// Recreation (Elvis, 12 October 2026): things to do outdoors "with guides, tutorials and fees". The Outdoors app on the
// phone books them; each activity has a named guide from the city (knowledge.js), a fee in Efforts and a lesson
// before you start. Skydiving is first: a tandem over the open city, then solo once you have done one. The rest of
// the list (archery, hiking, climbing, mountain biking, paragliding, wingsuit, bungee, the beach, a range, a photo
// safari in Kenya) is shown as coming, so the app says what the city will have.
import { createSkydive } from './skydive.js';
import { nameFor } from '../knowledge.js';
import { walletEngine, effortsMark, fmt } from '../wallet.js';
import { sfx } from '../audio.js';
import { C, FONT } from '../uikit.js';

const FEE = { tandem: 1500, solo: 800 };
const SOON = ['Archery', 'Hiking', 'Climbing', 'Mountain biking', 'Paragliding', 'Bungee'];
const LOOK = { body: 'm', skin: '#4a2e1c', hair: 'low', top: 'jacket', topColor: '#d9583f', bottom: 'trousers', bottomColor: '#2b2f36', shoes: 'sneakers', shoeColor: '#1d2028', acc: [] };
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* private window */ } } };

const CSS = `
#lk-out { position: fixed; inset: 0; z-index: 45; display: none; place-items: center; background: rgba(20,16,12,.35); }
#lk-out.on { display: grid; }
#lk-out .sh { width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; box-sizing: border-box; padding: 18px; border-radius: 22px;
  background: ${C.paper}; color: ${C.ink}; font: 600 14px/1.4 ${FONT}; box-shadow: 0 5px 0 rgba(59,42,32,.2), 0 18px 40px rgba(10,14,30,.3); position: relative; }
#lk-out h3 { margin: 0 0 2px; font: 800 22px/1.15 ${FONT}; }
#lk-out .sub { color: ${C.ink2 || '#7a6a58'}; font-size: 12.5px; margin-bottom: 12px; }
#lk-out .act { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 16px; background: #fffaf0; margin-top: 8px; }
#lk-out .act .t { flex: 1; } #lk-out .act b { display: block; font: 800 16px/1.2 ${FONT}; } #lk-out .act small { color: #7a6a58; font-size: 12px; }
#lk-out svg { display: inline-block; vertical-align: -2px; margin-right: 3px; }
#lk-out .act button { flex: none; width: auto; min-width: 96px; }
#lk-out button { border: 0; border-radius: 999px; padding: 10px 14px; font: 800 13.5px/1 ${FONT}; cursor: pointer; background: #efe2c4; color: ${C.ink}; white-space: nowrap; }
#lk-out button.go { background: ${C.amber}; box-shadow: 0 3px 0 #c98f1f; }
#lk-out button:disabled { opacity: .45; cursor: default; box-shadow: none; }
#lk-out .x { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; padding: 0; }
#lk-out .soon { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; } #lk-out .soon span { padding: 4px 10px; border-radius: 999px; background: #efe2c4; font-size: 12px; color: #7a6a58; }
`;

/**
 * @param o { scene, world, openWorld, parks (greenrey.parks), avatar, toast, standAt(x, z), canStart() }
 */
export function createRecreation(o) {
  const { toast } = o;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const panel = document.createElement('div'); panel.id = 'lk-out'; document.body.appendChild(panel);
  let jump = null;

  // the guide: one instructor per city, named as people there are named
  const who = nameFor('skydive-instructor', 'm');
  const guide = { name: who?.full || 'Captain Ade', first: who?.first || 'Ade', look: LOOK };
  // the drop zone: the largest park in the district (greenrey.js), the nearest the middle of those, and clear of
  // anything taller than a bench for 18 m round (at the district's edge the open city's buildings can reach in)
  const rects = (o.parks?.rects || []).slice().sort((a, b) => b.w * b.d - a.w * a.d || Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const clear = (x, z) => { for (let dx = -18; dx <= 18; dx += 6) for (let dz = -18; dz <= 18; dz += 6) if (Math.hypot(dx, dz) <= 18 && o.world.solidAt?.(x + dx, 3, z + dz)) return false; return true; };
  const target = { x: 0, z: 0, name: 'the square' };
  const pickTarget = () => { const r = rects.find((q) => clear(q.x, q.z)) || rects[0]; if (r) Object.assign(target, { x: r.x, z: r.z, name: 'the park' }); };
  pickTarget();
  const tandems = () => +(store.get('bw:skydive:tandems') || 0);

  function open() {
    sfx('tap');
    const city = o.world.place?.city || 'the city', bal = walletEngine().balance();
    const can = !!o.openWorld?.active, solo = tandems() > 0;
    panel.innerHTML = `<div class="sh"><button class="x" aria-label="Close">✕</button><h3>Outdoors</h3>
      <div class="sub">Guided, with a lesson first. You have ${effortsMark(13)}${fmt(bal)}.</div>
      <div class="act"><div class="t"><b>Tandem skydive</b><small>${can ? `3,000 m over ${city}, strapped to ${guide.name}. Lands in ${target.name}.` : `Over the open cities only: Lagos, Nairobi, Abuja, Port Harcourt, Accra and Uyo.`}</small></div>
        <button class="go" data-k="tandem" ${can ? '' : 'disabled'}>${effortsMark(12)}${fmt(FEE.tandem)}</button></div>
      <div class="act"><div class="t"><b>Solo jump</b><small>${solo ? `Your own canopy. ${guide.first} watches from the ground; the automatic opener is the last resort.` : 'After your first tandem.'}</small></div>
        <button class="go" data-k="solo" ${can && solo ? '' : 'disabled'}>${effortsMark(12)}${fmt(FEE.solo)}</button></div>
      <div class="soon">${SOON.map((s) => `<span>${s}: coming</span>`).join('')}</div></div>`;
    panel.querySelector('.x').onclick = close;
    panel.onclick = (e) => { if (e.target === panel) close(); };
    panel.querySelectorAll('button[data-k]').forEach((b) => { b.onclick = () => book(b.dataset.k); });
    panel.classList.add('on');
  }
  function close() { panel.classList.remove('on'); }

  function book(kind) {
    if (jump) return;
    if (o.canStart && !o.canStart()) { toast('Step outside onto the street first.', 2200); return; }
    pickTarget(); // again now: the open city round the district has loaded since the street was built
    const fee = FEE[kind];
    if (!walletEngine().spend(fee, kind === 'solo' ? 'Solo skydive' : 'Tandem skydive')) { toast('Not enough Efforts for this jump. Push some commits and come back.', 2600); return; }
    close();
    const start = o.getPlayer?.() || { x: target.x, z: target.z };
    jump = createSkydive({ scene: o.scene, world: o.world, openWorld: o.openWorld, target, guide, solo: kind === 'solo', look: o.avatar?.userData.look, toast, start,
      onEnd: (r, at) => {
        jump = null;
        if (!r || r.aborted) { walletEngine().earn?.(fee, 'Skydive refunded'); o.standAt?.(start.x, start.z); toast(`You ride the plane back down with ${guide.first}. Fee refunded.`, 2600); return; }
        if (!r.solo) store.set('bw:skydive:tandems', String(tandems() + 1));
        // off a roof the guide meets you at the target; otherwise you stand where you landed
        if (r.landing === 'roof' || r.landing === 'wall') o.standAt?.(target.x, target.z); else o.standAt?.(at.x, at.z);
        dispatchEvent(new CustomEvent('bw:me', { detail: { played: 0.3, skill: 'fitness', n: 1 } }));
        toast(`${r.solo ? 'Solo' : 'Tandem'}: ${r.points} points. Pulled at ${(r.pullAlt || 0).toLocaleString()} m${r.autoPull ? ' (not by you)' : ''}, ${r.freefall} s of freefall, ${r.peak} km/h at the fastest, ${r.distance} m from the target.`, 6000);
      } });
    toast(`${guide.name} meets you at the plane. Listen to the briefing on the climb.`, 3000);
  }

  addEventListener('bw:outdoors', open);
  return {
    update: (dt) => jump?.update(dt),
    pose: () => jump?.pose() || null,
    get playing() { return jump?.phase || null; },
    get jump() { return jump; },
    get isOpen() { return panel.classList.contains('on'); },
    open, close, book, target, guide,
    dispose() { removeEventListener('bw:outdoors', open); jump?.finish({ aborted: true }); panel.remove(); style.remove(); },
  };
}
