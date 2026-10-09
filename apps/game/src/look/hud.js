import * as THREE from 'three';

// The in-world overlay from the reference screenshot: district and objective,
// minimap, a route on the ground, a contextual prompt, name tags and the board.

const CSS = `
#lk { position: fixed; inset: 0; pointer-events: none; z-index: 15; font-family: inherit; }
body.nohud #lk { display: none; }
#lk .pane { background: rgba(9, 14, 28, 0.72); border: 1px solid rgba(255,255,255,.09); border-radius: 14px;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); color: #eef2ff; box-shadow: 0 10px 40px rgba(0,0,0,.4); }
#lk-obj { position: absolute; top: 74px; left: 14px; padding: 12px 16px 12px 14px; min-width: 250px; }
#lk-obj .d { display: flex; align-items: center; gap: 9px; font: 800 19px/1 "Arial Narrow", "Roboto Condensed", system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase; }
#lk-obj .d svg { width: 20px; height: 20px; flex: none; }
#lk-obj ul { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 6px; }
#lk-obj li { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: #dfe5f7; }
#lk-obj li i { width: 15px; height: 15px; border-radius: 50%; border: 2px solid #f2b33d; flex: none; display: grid; place-items: center; font-style: normal; font-size: 10px; color: #10131c; }
#lk-obj li.done { color: #8d97b3; text-decoration: line-through; }
#lk-obj li.done i { background: #f2b33d; }
#lk-obj li.todo i { border-color: #6f7ca3; }
#lk-obj li em { margin-left: auto; padding-left: 12px; font-style: normal; color: #f2b33d; font-variant-numeric: tabular-nums; font-size: 12px; }
#lk-map { position: absolute; top: 68px; right: 14px; width: 156px; height: 156px; border-radius: 50%; overflow: hidden;
  border: 2px solid rgba(255,255,255,.18); box-shadow: 0 10px 40px rgba(0,0,0,.45); background: rgba(9,14,28,.8); }
#lk-map canvas { width: 100%; height: 100%; display: block; }
#lk-prompt { position: absolute; left: 50%; bottom: 96px; transform: translate(-50%, 8px); opacity: 0; transition: opacity .2s ease, transform .2s ease;
  display: flex; align-items: center; gap: 12px; padding: 10px 18px 10px 10px; font-size: 15px; font-weight: 560; }
#lk-prompt.on { opacity: 1; transform: translate(-50%, 0); }
#lk kbd { display: inline-grid; place-items: center; min-width: 28px; height: 28px; padding: 0 6px; border-radius: 7px; background: #eef2ff; color: #0d1326;
  font: 700 13px/1 ui-sans-serif, system-ui, sans-serif; box-shadow: 0 2px 0 rgba(0,0,0,.35); }
#lk-keys { position: absolute; right: 66px; bottom: 14px; padding: 12px 16px; display: grid; grid-template-columns: auto auto; gap: 10px 14px; align-items: center;
  font-size: 13.5px; transition: opacity .6s ease; }
#lk-keys .wasd { display: grid; grid-template-columns: repeat(3, 24px); gap: 3px; }
#lk-keys .wasd kbd { min-width: 24px; height: 24px; font-size: 11px; }
#lk-keys.fade { opacity: 0; }
#lk-tags { position: absolute; inset: 0; }
#lk-tags div { position: absolute; transform: translate(-50%, -100%); display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
  background: rgba(9,14,28,.62); color: #fff; font-size: 13px; font-weight: 600; white-space: nowrap; }
#lk-tags div b { width: 7px; height: 7px; border-radius: 50%; background: #5fe08d; box-shadow: 0 0 8px #5fe08d; }
#lk-board { position: absolute; right: 186px; top: 74px; width: min(420px, calc(100vw - 32px)); max-height: calc(100vh - 250px); overflow: auto; padding: 18px;
  pointer-events: auto; display: none; }
#lk-board.on { display: block; }
#lk-board h2 { margin: 0 0 2px; font: 800 22px/1.1 "Arial Narrow", system-ui, sans-serif; letter-spacing: .03em; text-transform: uppercase; }
#lk-board .sub { color: #a3afd0; font-size: 12.5px; margin-bottom: 14px; }
#lk-board h3 { margin: 16px 0 8px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #a3afd0; }
#lk-board .who { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,.07); }
#lk-board .who .av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 12px; color: #10131c; }
#lk-board .who .n { font-weight: 650; }
#lk-board .who .s { color: #a3afd0; font-size: 12px; }
#lk-board .who svg { margin-left: auto; width: 18px; height: 18px; color: #a3afd0; }
#lk-board .note { padding: 10px 12px; border-radius: 10px; margin-bottom: 8px; color: #2b241d; font-size: 13px; }
#lk-board textarea { width: 100%; box-sizing: border-box; min-height: 64px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05);
  color: #eef2ff; padding: 10px; font: inherit; resize: vertical; }
#lk-board .row { display: flex; gap: 8px; margin-top: 8px; }
#lk-board button { border: 0; border-radius: 10px; padding: 9px 14px; font: 600 13px/1 inherit; cursor: pointer; background: rgba(255,255,255,.08); color: #eef2ff; }
#lk-board button.p { background: #f2b33d; color: #2a1a02; }
#lk-board .x { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; padding: 0; }
#lk-board .tag { display: inline-block; font-size: 10.5px; color: #10131c; background: #a3afd0; border-radius: 6px; padding: 2px 6px; margin-left: 6px; vertical-align: 2px; }
#lk-wx { position: absolute; top: 234px; right: 14px; width: 156px; box-sizing: border-box; padding: 10px 12px; pointer-events: auto; font-size: 12px; }
#lk-wx .t { display: flex; align-items: baseline; gap: 6px; font-size: 20px; font-weight: 700; }
#lk-wx .t span { font-size: 12.5px; font-weight: 560; color: #dfe5f7; }
#lk-wx .p { color: #a3afd0; margin-top: 2px; }
#lk-wx button { margin-top: 8px; width: 100%; border: 0; border-radius: 8px; padding: 6px 8px; background: rgba(255,255,255,.08); color: #eef2ff; font: 600 11.5px/1.2 inherit; cursor: pointer; }
#lk-wx .src { display: block; margin-top: 6px; color: #6f7ca3; font-size: 10.5px; }
#lk-wx .src a { color: inherit; }
@media (max-width: 700px) { #lk-wx { top: 172px; width: 120px; padding: 8px 10px; } #lk-wx .t { font-size: 16px; } #lk-wx button { display: none; } }
#lk-osm { position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%); font-size: 10.5px; color: rgba(238,242,255,.6); pointer-events: auto; }
#lk-osm a { color: inherit; }
#lk-toast { position: absolute; left: 50%; top: 22px; transform: translateX(-50%); padding: 10px 16px; font-size: 13.5px; opacity: 0; transition: opacity .3s; }
#lk-toast.on { opacity: 1; }
@media (max-width: 700px) {
  #lk-obj { top: 70px; min-width: 0; right: 120px; padding: 10px 12px; }
  #lk-obj .d { font-size: 16px; }
  #lk-map { width: 96px; height: 96px; top: 68px; }
  #lk-keys { display: none; }
  #lk-board { right: 16px; top: 70px; }
}
@media (prefers-reduced-motion: reduce) { #lk-prompt, #lk-keys, #lk-toast { transition: none; } }
`;

const PIN = '<svg viewBox="0 0 24 24"><path fill="#f2b33d" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#10131c"/></svg>';
const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>';

const NEARBY = [
  ['Kemi', 'Designing a park nook', '#7fd3b0', true],
  ['Tunde', 'Fixing the stairway', '#9cb3ff', true],
  ['Nara', 'Adding more plants', '#f6a8a0', false],
  ['Ada', 'Sketching wall art', '#f7e27a', false],
];
const NOTES = [
  ['#f7e27a', 'Code and chops at the hub, Friday 7pm. Bring a laptop.'],
  ['#a8e0d0', 'Fixed the waste bin by the danfo stop.'],
  ['#f6a8a0', 'Who wants to fix the stairway lights with me?'],
];

export function createHud({ world, props, camera, reduced, onInteract, weatherFeed }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.id = 'lk';
  el.innerHTML = `
    <div id="lk-obj" class="pane" aria-live="polite"><div class="d">${PIN}<span>Yaba District</span></div><ul></ul></div>
    <div id="lk-map"><canvas width="312" height="312" aria-label="Minimap"></canvas></div>
    <div id="lk-prompt" class="pane"><kbd>E</kbd><span></span></div>
    <div id="lk-keys" class="pane">
      <div class="wasd"><span></span><kbd>W</kbd><span></span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><span>Move</span>
      <kbd>Drag</kbd><span>Look around</span>
      <kbd>E</kbd><span>Interact</span>
    </div>
    <div id="lk-tags"></div>
    <div id="lk-board" class="pane" role="dialog" aria-label="Community board"></div>
    <div id="lk-toast" class="pane" role="status"></div>
    ${weatherFeed ? '<div id="lk-wx" class="pane" aria-live="polite"></div>' : ''}
    ${world.via === 'sample' ? '' : '<div id="lk-osm">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a></div>'}`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const objList = $('#lk-obj ul'), prompt = $('#lk-prompt'), promptText = $('#lk-prompt span');
  const boardEl = $('#lk-board'), toastEl = $('#lk-toast'), keysEl = $('#lk-keys');
  const map = $('#lk-map canvas').getContext('2d');
  setTimeout(() => keysEl.classList.add('fade'), 16000);

  // ---------- objectives ----------
  const steps = [
    { text: 'Meet the builders at the community board', target: props.interact.find((i) => i.id === 'board'), done: false },
    { text: 'Find the community build area', target: props.area, done: false, near: true },
    { text: 'Add a bench for Yaba', target: props.area, done: false },
  ].filter((s) => s.target);
  let current = 0;
  function renderSteps(dist) {
    objList.innerHTML = steps.map((s, i) => {
      if (i > current + 1) return '';
      const cls = s.done ? 'done' : i === current ? '' : 'todo';
      const d = i === current && dist != null ? `<em>${Math.round(dist)} m</em>` : '';
      return `<li class="${cls}"><i>${s.done ? '✓' : ''}</i><span>${s.text}</span>${d}</li>`;
    }).join('');
  }
  function complete(i) {
    if (!steps[i] || steps[i].done) return;
    steps[i].done = true;
    if (i === current) current++;
    renderSteps();
  }

  let toastTimer = 0;
  function toast(msg, ms = 3600) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
  }

  // ---------- the board ----------
  const posted = [];
  function openBoard() {
    const notes = [...posted.map((t) => ['#f9f3e3', t]), ...NOTES];
    boardEl.innerHTML = `
      <button class="x" aria-label="Close">✕</button>
      <h2>Yaba Builders</h2>
      <div class="sub">Ideas, people and places. Sample residents for this preview.</div>
      <h3>Builders nearby</h3>
      ${NEARBY.map(([n, s, c, talking]) => `<div class="who"><div class="av" style="background:${c}">${n[0]}</div>
        <div><div class="n">${n}</div><div class="s">${s}</div></div>${talking ? SPEAKER : ''}</div>`).join('')}
      <h3>Notes</h3>
      ${notes.map(([c, t]) => `<div class="note" style="background:${c}">${t}</div>`).join('')}
      <h3>Leave a note</h3>
      <textarea maxlength="200" placeholder="Say hello, share an idea, ask for help"></textarea>
      <div class="row"><button class="p" data-a="post">Pin note</button><button data-a="close">Close</button></div>`;
    boardEl.classList.add('on');
    boardEl.querySelector('.x').onclick = closeBoard;
    boardEl.querySelector('[data-a=close]').onclick = closeBoard;
    boardEl.querySelector('[data-a=post]').onclick = () => {
      const v = boardEl.querySelector('textarea').value.trim();
      if (!v) return;
      posted.unshift(v);
      openBoard();
      toast('Note pinned on this device. Shared notes come with accounts.');
    };
    complete(0);
  }
  function closeBoard() { boardEl.classList.remove('on'); }

  // ---------- route on the ground ----------
  const chevShape = new THREE.Shape();
  chevShape.moveTo(-0.45, -0.25); chevShape.lineTo(0, 0.2); chevShape.lineTo(0.45, -0.25); chevShape.lineTo(0.45, -0.05); chevShape.lineTo(0, 0.4); chevShape.lineTo(-0.45, -0.05);
  const chevGeo = new THREE.ShapeGeometry(chevShape).rotateX(-Math.PI / 2);
  const chevMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.25, 0.35), transparent: true, depthWrite: false });
  const MAXC = 18;
  const route = new THREE.InstancedMesh(chevGeo, chevMat, MAXC);
  route.frustumCulled = false;
  route.renderOrder = 3;
  const routeM = new THREE.Matrix4(), routeQ = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);

  // ---------- tags ----------
  const tagsEl = $('#lk-tags');
  const tags = props.builders.map((b) => {
    const d = document.createElement('div');
    d.innerHTML = `<span>${b.name}</span>${b.live ? '<b></b>' : ''}`;
    tagsEl.appendChild(d);
    return { b, d };
  });
  const v = new THREE.Vector3();

  let active = null;
  function interact() {
    if (boardEl.classList.contains('on')) { closeBoard(); return true; }
    if (!active) return false;
    if (active.id === 'board') openBoard();
    if (active.id === 'build') {
      if (steps[2] && !steps[2].done) {
        onInteract?.('place-bench');
        complete(1); complete(2);
        toast('Bench added. It stays on this device until shared building is live.');
        active.label = 'Bench added';
      }
    }
    return true;
  }

  function drawMap(player, yaw, target) {
    const S = 312, C = S / 2, k = 1.9; // pixels per metre
    map.setTransform(1, 0, 0, 1, 0, 0);
    map.clearRect(0, 0, S, S);
    map.fillStyle = 'rgba(20,28,48,0.95)'; map.fillRect(0, 0, S, S);
    map.translate(C, C);
    map.rotate(yaw - Math.PI); // camera forward points up
    map.translate(-player.x * k, -player.z * k);
    map.lineCap = 'round'; map.lineJoin = 'round';
    world.roads.forEach((r) => {
      if (['footway', 'path', 'cycleway', 'pedestrian'].includes(r.cls)) return;
      map.strokeStyle = 'rgba(150,165,200,0.55)';
      map.lineWidth = Math.max(4, r.w * k * 0.9);
      map.beginPath(); r.pts.forEach(([x, z], i) => (i ? map.lineTo(x * k, z * k) : map.moveTo(x * k, z * k))); map.stroke();
    });
    world.plots.forEach((p) => {
      map.fillStyle = p.b.id === 'you' ? 'rgba(242,179,61,0.9)' : 'rgba(110,125,165,0.75)';
      map.beginPath(); p.pts.forEach(([x, z], i) => (i ? map.lineTo(x * k, z * k) : map.moveTo(x * k, z * k))); map.closePath(); map.fill();
    });
    if (props.area) { map.fillStyle = '#3ad1c0'; map.beginPath(); map.arc(props.area.x * k, props.area.z * k, 6, 0, 7); map.fill(); }
    if (target) {
      map.strokeStyle = 'rgba(242,179,61,0.9)'; map.setLineDash([6, 8]); map.lineWidth = 4;
      map.beginPath(); map.moveTo(player.x * k, player.z * k); map.lineTo(target.x * k, target.z * k); map.stroke(); map.setLineDash([]);
      map.fillStyle = '#f2b33d'; map.beginPath(); map.arc(target.x * k, target.z * k, 9, 0, 7); map.fill();
      map.fillStyle = '#10131c'; map.beginPath(); map.arc(target.x * k, target.z * k, 3.5, 0, 7); map.fill();
    }
    map.setTransform(1, 0, 0, 1, 0, 0);
    // player arrow, always pointing up
    map.fillStyle = '#4fb6ff';
    map.beginPath(); map.moveTo(C, C - 16); map.lineTo(C + 11, C + 12); map.lineTo(C, C + 6); map.lineTo(C - 11, C + 12); map.closePath(); map.fill();
    // north marker on the rim
    const na = yaw - Math.PI;
    const nx = C + Math.sin(na) * (C - 18), ny = C - Math.cos(na) * (C - 18);
    map.fillStyle = '#0d1326'; map.beginPath(); map.arc(nx, ny, 13, 0, 7); map.fill();
    map.fillStyle = '#fff'; map.font = 'bold 16px system-ui'; map.textAlign = 'center'; map.textBaseline = 'middle'; map.fillText('N', nx, ny + 1);
  }

  let mapTimer = 0;
  renderSteps();

  function update(dt, t, player, yaw) {
    const step = steps[current];
    const target = step?.target;
    // nearest interactable
    active = null;
    let best = Infinity;
    props.interact.forEach((it) => {
      const d = Math.hypot(it.x - player.x, it.z - player.z);
      if (d < it.r && d < best) { best = d; active = it; }
    });
    if (active) { promptText.textContent = active.label; prompt.classList.add('on'); } else prompt.classList.remove('on');
    if (step?.near && target && Math.hypot(target.x - player.x, target.z - player.z) < 4.5) complete(current);

    // objective distance
    const dist = target ? Math.hypot(target.x - player.x, target.z - player.z) : null;
    mapTimer -= dt;
    if (mapTimer <= 0) { mapTimer = 0.1; renderSteps(dist); drawMap(player, yaw, target); }

    // route chevrons, flowing toward the objective
    let n = 0;
    if (target && dist > 3.5) {
      const dx = (target.x - player.x) / dist, dz = (target.z - player.z) / dist;
      routeQ.setFromAxisAngle(up, Math.atan2(dx, dz));
      const flow = reduced ? 0 : (t * 1.6) % 1.6;
      for (let s = 1.6 + flow; s < Math.min(dist - 2, 1.6 * MAXC) && n < MAXC; s += 1.6) {
        routeM.compose(new THREE.Vector3(player.x + dx * s, 0.12, player.z + dz * s), routeQ, new THREE.Vector3(1, 1, 1));
        route.setMatrixAt(n++, routeM);
      }
    }
    route.count = n;
    route.instanceMatrix.needsUpdate = true;
    chevMat.opacity = 0.55 + (reduced ? 0 : 0.25 * Math.sin(t * 3));

    // name tags
    tags.forEach(({ b, d }) => {
      v.setFromMatrixPosition(b.obj.matrixWorld); v.y += 2.15;
      const dd = v.distanceTo(camera.position);
      v.project(camera);
      const vis = v.z < 1 && dd < 45;
      d.style.display = vis ? 'flex' : 'none';
      if (vis) d.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`, d.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
    });
  }

  // ---------- live weather chip ----------
  const wxEl = el.querySelector('#lk-wx');
  let wxTimer = 0, unsub = null;
  function renderWeather() {
    const w = weatherFeed?.state;
    if (!wxEl || !w) return;
    const temp = w.tempC == null ? '' : `${Math.round(w.tempC)}°`;
    const mine = w.loc.how === 'your location';
    const tag = w.source === 'preset' ? ' · preview' : w.source === 'offline' ? ' · offline' : '';
    wxEl.innerHTML = `<div class="t">${temp}<span>${w.label}</span></div>
      <div class="p">${w.loc.label} · ${weatherFeed.localTime()}${tag}</div>
      <button type="button">${mine ? 'Stop using my location' : 'Use my location'}</button>
      <span class="src">Weather: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></span>`;
    wxEl.querySelector('button').onclick = async () => {
      if (mine) { await weatherFeed.forgetMyLocation(); toast('Back to your home city weather.'); return; }
      const ok = await weatherFeed.useMyLocation();
      toast(ok ? 'Weather now follows your area, rounded to about 10 km. Stored on this device only.' : 'Location was not shared. Using your home city.');
    };
  }
  if (weatherFeed) {
    unsub = weatherFeed.onChange(renderWeather);
    wxTimer = setInterval(renderWeather, 30000); // keep the clock honest
  }

  function dispose() { unsub?.(); clearInterval(wxTimer); el.remove(); style.remove(); route.removeFromParent(); chevGeo.dispose(); chevMat.dispose(); }

  return { update, interact, route, dispose, isOpen: () => boardEl.classList.contains('on'), close: closeBoard, toast };
}
