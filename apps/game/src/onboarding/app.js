import './style.css';
import { createOnboardingScene } from './scenes.js';
import { session, signedIn, signInUrl, signOut } from '../session.js';
import { CITIES, COLORS, STYLES, STEPS, CHAPTERS, freshProfile, loadProfile, saveProfile, canEnter, cityFor, providerFor, homeSeed } from './state.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let profile = loadProfile();
let filmTime = 0;
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let chapterShown = -1;
let scene;
let saved = true;
const chapterDuration = 9;
document.documentElement.dataset.theme = 'dark';
document.title = 'Builders World · Arrivals';
document.body.className = 'onboarding';
document.body.innerHTML = `
  <canvas id="arrival-canvas" aria-label="First-person Builders World arrivals terminal"></canvas>
  <div class="arrival-vignette" aria-hidden="true"></div>
  <header class="arrival-header">
    <a class="arrival-brand" href="./" aria-label="Builders World arrivals"><span class="brand-symbol" aria-hidden="true">B<span>W</span></span><span>BUILDERS<br><strong>WORLD</strong></span></a>
    <nav class="journey" aria-label="Onboarding progress"></nav>
    <button class="country-button" data-action="country"><span class="flag-ng" aria-hidden="true"></span>Nigeria <span aria-hidden="true">⌄</span></button>
  </header>
  <div class="scene-caption" aria-hidden="true"></div>
  <main id="arrival-panel" class="arrival-panel"></main>
  <div class="walking-controls" aria-label="Movement controls">
    <button data-walk="forward" aria-label="Walk forward">↑</button>
    <div><button data-walk="left" aria-label="Walk left">←</button><button data-walk="back" aria-label="Walk backward">↓</button><button data-walk="right" aria-label="Walk right">→</button></div>
  </div>
  <footer class="arrival-footer"><span id="local-status">LOCAL PREVIEW <i></i> Progress saved on this device</span><div><button data-action="help">Controls</button><button data-action="sign-out" id="sign-out" hidden>Sign out</button><button data-action="restart-dialog">Restart journey</button></div></footer>
  <div id="arrival-toast" role="status"></div>
  <dialog id="arrival-dialog" aria-labelledby="dialog-title"></dialog>
`;
const panel = document.getElementById('arrival-panel');
const dialog = document.getElementById('arrival-dialog');
const toastEl = document.getElementById('arrival-toast');
let toastTimer;
function toast(message) {
  toastEl.textContent = message; toastEl.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3500);
}
function persist() {
  saved = saveProfile(profile);
  const who = signedIn() ? `SIGNED IN · @${esc(session.me.account.login)}` : 'NOT SIGNED IN';
  document.getElementById('local-status').innerHTML = saved ? `${who} <i></i> Progress saved on this device${signedIn() ? ' and to your account' : ''}` : `${who} <i></i> Storage unavailable · keep this tab open`;
  document.getElementById('sign-out').hidden = !signedIn();
}
// Signed in with GitHub (boot() has already asked the server): that is the connection step done, and their GitHub name is a fair first answer to "what should we call you".
if (signedIn()) {
  profile.connection = { mode: 'github', provider: 'GitHub' };
  if (!profile.name.trim()) profile.name = (session.me.profile?.name || session.me.account.name || session.me.account.login).slice(0, 32);
}
const button = (action, text, extra = '') => `<button class="primary" data-action="${action}" ${extra}>${text}<span aria-hidden="true">↗</span></button>`;
const back = action => `<button class="back" data-action="${action}"><span aria-hidden="true">←</span> Back</button>`;
const eyebrow = text => `<div class="eyebrow"><span></span>${text}</div>`;
const attendant = text => `<div class="speaker"><span class="speaker-dot"></span><span>ARRIVALS OFFICER <small>WELCOME DESK</small></span></div><p class="dialogue">“${text}”</p>`;
function sceneStage() { return ['role', 'connect'].includes(profile.step) ? 'checkin' : profile.step; }
function syncScene() { scene?.setStage(sceneStage(), { ...profile, seed: homeSeed(profile) }); }
function go(step) {
  if (!canEnter(profile, step)) { toast('Complete your check-in before continuing.'); return; }
  clearTimeout(toastTimer); toastEl.classList.remove('visible');
  profile.step = step; persist(); render(); syncScene();
  panel.scrollTop = 0;
  panel.querySelector('h1')?.focus({ preventScroll: true });
}
function render() {
  const step = profile.step;
  const city = cityFor(profile);
  const phase = step === 'lobby' || step === 'role' || step === 'connect' ? 0 : step === 'destination' ? 1 : step === 'flight' ? 2 : 3;
  document.body.dataset.stage = step;
  document.querySelector('.journey').innerHTML = ['Arrivals', 'Destination', 'In flight', 'Your home'].map((label, i) => `<span class="${i === phase ? 'current' : i < phase ? 'complete' : ''}" ${i === phase ? 'aria-current="step"' : ''}><b>${i < phase ? '✓' : String(i + 1).padStart(2, '0')}</b>${label}</span>`).join('');
  const captions = { lobby: ['NIGERIA', 'Every builder starts somewhere.', 'ARRIVALS TERMINAL / NG'], role: ['WELCOME DESK', 'A little about you.', 'NIGERIA / ARRIVALS'], connect: ['CHECK IN', 'Bring what you build.', 'NIGERIA / ARRIVALS'], destination: ['YOUR NEXT CHAPTER', 'Find a place to belong.', 'DOMESTIC CONNECTIONS / NG'], flight: [`BW · ${city?.code || 'LOS'}`, `Next stop, ${profile.city}.`, 'BUILDERS AIR / WELCOME ABOARD'], home: ['WELCOME HOME', `${profile.district}, ${profile.city}.`, 'YOUR JOURNEY STARTS HERE'] };
  const caption = captions[step];
  document.querySelector('.scene-caption').innerHTML = `<div>${esc(caption[2])}</div><strong>${esc(caption[0])}</strong><p>${esc(caption[1])}</p>`;
  if (step === 'lobby') {
    panel.innerHTML = `${eyebrow('YOUR ARRIVAL')}
      <h1 tabindex="-1">Welcome to<br>Builders World.</h1>
      <p class="intro">A world for the things you make.<br>And the people you make them with.</p>
      <div class="arrival-ticket"><div><span>COUNTRY LOBBY</span><strong><span class="flag-ng" aria-hidden="true"></span> Nigeria</strong></div><b>NG</b></div>
      ${button('checkin', 'Walk to arrivals')}
      <p class="subtle">WASD to walk · drag to look around.<br>Nigeria is the first lobby in this local preview.</p>`;
  } else if (step === 'role') {
    panel.innerHTML = `${back('lobby')}${attendant('Welcome. What should we call you, and what do you love to make?')}
      <h1 tabindex="-1">Let’s get you<br>checked in.</h1>
      <label class="field-label" for="builder-name">Your name</label><input id="builder-name" name="name" type="text" autocomplete="nickname" maxlength="32" value="${esc(profile.name)}" placeholder="What should we call you?" aria-describedby="name-help">
      <p id="name-help" class="field-hint">The name your neighbours will see.</p>
      <fieldset class="role-options"><legend>I’m here as a</legend>${['developer', 'designer'].map(role => `<button class="choice ${profile.role === role ? 'selected' : ''}" data-role="${role}" aria-pressed="${profile.role === role}"><span class="role-icon" aria-hidden="true">${role === 'developer' ? '{ }' : '✳'}</span><span>${role === 'developer' ? 'Developer' : 'Designer'}<small>${role === 'developer' ? 'Code, products & possibilities' : 'Interfaces, ideas & experiences'}</small></span><i aria-hidden="true">${profile.role === role ? '✓' : '+'}</i></button>`).join('')}</fieldset>
      ${button('identity-next', 'Continue', !profile.name.trim() || !profile.role ? 'disabled' : '')}`;
  } else if (step === 'connect') {
    const known = signedIn();
    const problem = { denied: 'GitHub did not let you in. You can try again.', github: 'GitHub could not confirm who you are. Please try again.', server: 'We could not finish signing you in. Please try again.' }[session.error];
    panel.innerHTML = `${back('role')}${attendant(`Good to meet you, ${esc(profile.name)}. Let’s bring a little of your work with you.`)}
      <h1 tabindex="-1">Your work is<br>your introduction.</h1>
      <div class="provider-mark" aria-hidden="true">{ / }</div>
      <h2>GitHub</h2><p class="intro compact">Sign in with the place where you build. ${profile.role === 'designer' ? 'Designers: your Dribbble profile can be added later.' : ''}</p>
      <div class="connection-state ${known ? 'connected' : ''}">${known ? `✓ Signed in as @${esc(session.me.account.login)}` : 'Not signed in'}</div>
      ${problem ? `<p class="prototype-note" role="alert">${esc(problem)}</p>` : ''}
      <p class="prototype-note">${known ? 'Your commits count towards your Efforts, and your choices are saved to your account.' : 'We only read what GitHub shows anyone: your username and name. We never see or touch your code.'}</p>
      ${known ? button('destination', 'Choose your destination') : button('connect-github', 'Sign in with GitHub')}`;
  } else if (step === 'destination') {
    panel.innerHTML = `${back('connect')}${eyebrow('DOMESTIC CONNECTIONS')}
      <h1 tabindex="-1">Where do you<br>want to belong?</h1><p class="intro compact">Choose a city. Find your community.</p>
      <div class="destination-list" role="group" aria-label="Choose a city">${CITIES.map(c => `<button class="destination ${profile.city === c.name ? 'selected' : ''}" data-city="${c.name}" aria-pressed="${profile.city === c.name}"><span class="airport-code">${c.code}</span><span><strong>${c.name}</strong><small>${c.preview ? 'Community preview' : 'Yaba district available'}</small></span><i aria-hidden="true">${profile.city === c.name ? '✓' : '↗'}</i></button>`).join('')}</div>
      ${city ? `<fieldset class="district-options"><legend>Your district in ${esc(city.name)}</legend><button class="district ${profile.district ? 'selected' : ''}" data-action="district" aria-pressed="${!!profile.district}"><span><strong>${esc(city.district)}</strong><small>${city.preview ? 'Temporary preview · districts to be defined' : 'Our first neighbourhood of builders'}</small></span><span aria-hidden="true">${profile.district ? '✓' : '+'}</span></button></fieldset>` : '<p class="field-hint">Select a city to see its communities.</p>'}
      ${button('board', 'Board your flight', !profile.district ? 'disabled' : '')}`;
  } else if (step === 'flight') {
    chapterShown = -1;
    panel.innerHTML = `${back('destination')}${eyebrow('WELCOME ABOARD')}
      <div class="boarding-heading"><h1 tabindex="-1">Make yourself<br>at home.</h1><span class="boarding-code">${city.code}<small>SEAT 01A</small></span></div>
      <p class="intro compact">Meet the world on your seatback screen.<br>Make your travel look yours while you watch.</p>
      <section class="film-controls" aria-label="World introduction"><div class="film-heading"><span>YOUR WORLD, IN A MINUTE</span><span id="film-count">1 / 3</span></div><h2 id="film-title"></h2><p id="film-description"></p><div class="film-progress" role="progressbar" aria-label="Introduction progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><div class="film-buttons"><button data-action="film-toggle">${playing ? 'Pause' : 'Play'} intro</button><button data-action="film-replay">Replay</button><button data-action="film-next">Next chapter →</button></div></section>
      <fieldset class="avatar-styles"><legend>Your travel look</legend><div>${STYLES.map(style => `<button class="style-option ${profile.avatar.style === style ? 'selected' : ''}" data-style="${style}" aria-pressed="${profile.avatar.style === style}">${style[0].toUpperCase() + style.slice(1)}</button>`).join('')}</div></fieldset>
      <fieldset class="avatar-colors"><legend>Choose a colour</legend><div>${COLORS.map((color, i) => `<button class="swatch ${color === profile.avatar.color ? 'selected' : ''}" style="--swatch:${color}" data-color="${color}" aria-label="${['Amber', 'Sage', 'Blue', 'Terracotta', 'Chalk'][i]} outfit" aria-pressed="${color === profile.avatar.color}"><span aria-hidden="true">${color === profile.avatar.color ? '✓' : ''}</span></button>`).join('')}</div></fieldset>
      <p class="field-hint">Provisional avatar · final character design to come.</p>
      ${button('land', 'Ready to land')}
      <p class="subtle">You can land whenever you’re ready.</p>`;
    updateFilm();
  } else if (step === 'home') {
    panel.innerHTML = `${eyebrow('YOU HAVE ARRIVED')}
      <h1 tabindex="-1">Welcome home,<br>${esc(profile.name)}.</h1>
      <p class="intro">Your first place in ${esc(profile.city)}.<br>Your next chapter starts here.</p>
      <div class="home-pass"><div class="pass-heading"><span>RESIDENT PASS</span><span>NG / ${city.code}</span></div><strong>${esc(profile.district)}</strong><p>${esc(profile.city)}, Nigeria</p><div class="pass-rule"></div><div class="pass-details"><span>${profile.role === 'designer' ? 'Designer' : 'Developer'}</span><span>Home ${String(homeSeed(profile) % 900 + 100)}</span></div></div>
      <p class="prototype-note">Your starter home is generated from your GitHub identity. This is a local preview, not a permanent plot claim.${city.preview ? ' This city’s districts are still being defined.' : ''}</p>
      ${button(city.preview ? 'neighbourhood-preview' : 'enter-world', city.preview ? 'Explore your home preview' : 'Enter Yaba')}
      <button class="text-button" data-action="flight">Edit your avatar</button><button class="text-button" data-action="destination">Change destination</button>`;
  }
}
function showDialog(title, content) {
  dialog.innerHTML = `<button class="dialog-close" data-action="close-dialog" aria-label="Close dialog">×</button><h2 id="dialog-title">${title}</h2>${content}`;
  dialog.showModal();
}
document.addEventListener('input', event => {
  if (event.target.id !== 'builder-name') return;
  profile.name = event.target.value.slice(0, 32);
  persist();
  panel.querySelector('[data-action="identity-next"]').disabled = !profile.name.trim() || !profile.role;
});
document.addEventListener('click', event => {
  const el = event.target.closest('button'); if (!el || el.disabled) return;
  if (el.dataset.role) {
    profile.role = el.dataset.role; persist(); render(); panel.querySelector(`[data-role="${profile.role}"]`).focus(); return;
  }
  if (el.dataset.city) {
    if (profile.city !== el.dataset.city) profile.district = '';
    profile.city = el.dataset.city; persist(); render(); syncScene(); panel.querySelector(`[data-city="${profile.city}"]`).focus(); return;
  }
  if (el.dataset.style || el.dataset.color) {
    if (el.dataset.style) profile.avatar.style = el.dataset.style;
    if (el.dataset.color) profile.avatar.color = el.dataset.color;
    persist(); scene?.setAvatar(profile.avatar);
    panel.querySelectorAll('[data-style]').forEach(b => { b.classList.toggle('selected', b.dataset.style === profile.avatar.style); b.setAttribute('aria-pressed', String(b.dataset.style === profile.avatar.style)); });
    panel.querySelectorAll('[data-color]').forEach(b => { const active = b.dataset.color === profile.avatar.color; b.classList.toggle('selected', active); b.setAttribute('aria-pressed', String(active)); b.firstElementChild.textContent = active ? '✓' : ''; });
    return;
  }
  const action = el.dataset.action;
  if (STEPS.includes(action)) { go(action); return; }
  switch (action) {
    case 'checkin': go('role'); break;
    case 'identity-next': profile.name = profile.name.trim(); go('connect'); break;
    case 'connect-github': location.href = signInUrl(); break;
    case 'sign-out': signOut().then(() => { profile.connection = null; profile.step = 'lobby'; persist(); location.reload(); }); break;
    case 'district': profile.district = cityFor(profile).district; persist(); render(); panel.querySelector('[data-action="board"]').focus(); break;
    case 'board': filmTime = 0; go('flight'); break;
    case 'land': go('home'); break;
    case 'film-toggle': if (filmTime >= 27) { filmTime = 0; playing = true; } else playing = !playing; updateFilm(); break;
    case 'film-replay': filmTime = 0; playing = true; updateFilm(); break;
    case 'film-next': filmTime = Math.min(2 * chapterDuration, (Math.floor(filmTime / chapterDuration) + 1) * chapterDuration); updateFilm(); break;
    case 'enter-world':
      persist();
      if (!saved) { toast('Your browser could not save this arrival. Allow site storage before entering Yaba; your home preview is still here.'); break; }
      location.href = '?world=1&resident=1&still=1'; break;
    case 'neighbourhood-preview': showDialog(`Your place in ${esc(profile.city)}`, `<p>Your avatar and starter home are ready to preview here. Named districts and an explorable ${esc(profile.city)} world are coming later.</p><p>Your selection stays saved on this device.</p><button class="primary" data-action="close-dialog">Back to your home</button><a class="dialog-link" href="?world=1&still=1">Visit the separate Yaba demo ↗</a>`); break;
    case 'country': showDialog('Your country lobby', '<p>Nigeria is the first country lobby in this local prototype. Your location has not been detected or requested.</p><p>Country routing and more national terminals will come later.</p><button class="primary" data-action="close-dialog">Continue in Nigeria</button>'); break;
    case 'help': showDialog('Make your way through arrivals', '<p><strong>Terminal:</strong> WASD or the arrow buttons to walk. Drag the scene to look around. “Walk to arrivals” takes you straight to the desk.</p><p><strong>Onboarding:</strong> Tab between choices and press Enter or Space. Use Back to revisit your choices.</p><p><strong>Flight:</strong> watch, pause, replay, or skip the intro while changing your outfit. You can land at any time.</p><p>Progress is stored only on this device. Connections, avatar art, and home ownership are previews.</p>'); break;
    case 'restart-dialog': showDialog('Start a new arrival?', '<p>This resets your local onboarding choices. It does not affect any real accounts.</p><button class="primary" data-action="restart">Start again</button><button class="text-button" data-action="close-dialog">Keep my journey</button>'); break;
    case 'restart': dialog.close(); profile = freshProfile(); filmTime = 0; go('lobby'); break;
    case 'close-dialog': dialog.close(); break;
  }
});
document.querySelectorAll('[data-walk]').forEach(b => {
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); scene?.walk(b.dataset.walk, true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => b.addEventListener(type, () => scene?.walk(b.dataset.walk, false)));
});
dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
function updateFilm() {
  const index = Math.max(0, Math.min(2, Math.floor(filmTime / chapterDuration)));
  const progress = Math.min(1, (filmTime - index * chapterDuration) / chapterDuration);
  scene?.setFilm(index, progress, playing);
  if (profile.step !== 'flight') return;
  if (index !== chapterShown) {
    document.getElementById('film-title').textContent = CHAPTERS[index].title;
    document.getElementById('film-description').textContent = CHAPTERS[index].text;
    document.getElementById('film-count').textContent = `${index + 1} / 3`;
    chapterShown = index;
  }
  const percent = Math.min(100, filmTime / (chapterDuration * 3) * 100);
  const progressEl = panel.querySelector('.film-progress');
  progressEl.firstElementChild.style.width = `${percent}%`;
  progressEl.setAttribute('aria-valuenow', String(Math.round(percent)));
  panel.querySelector('[data-action="film-toggle"]').textContent = filmTime >= 27 ? 'Play again' : `${playing ? 'Pause' : 'Play'} intro`;
  panel.querySelector('[data-action="film-next"]').disabled = index === 2;
}
render();
try {
  scene = createOnboardingScene(document.getElementById('arrival-canvas'));
  syncScene();
} catch (error) {
  console.error(error);
  toast('3D could not start. Try a browser with WebGL enabled.');
  document.body.classList.add('no-webgl');
}
persist();
let last = null;
let frame;
function animate(now) {
  const dt = last === null ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
  if (!document.hidden) {
    if (profile.step === 'flight') {
      if (playing && !dialog.open) filmTime = Math.min(27, filmTime + dt);
      if (filmTime >= 27) playing = false;
      updateFilm();
    }
    scene?.update(dt);
  }
  frame = requestAnimationFrame(animate);
}
frame = requestAnimationFrame(animate);
addEventListener('resize', () => scene?.resize());
addEventListener('pagehide', event => { cancelAnimationFrame(frame); if (!event.persisted) scene?.dispose(); });
addEventListener('pageshow', event => { if (event.persisted) { last = null; frame = requestAnimationFrame(animate); } });
if (import.meta.env.DEV) window.__arrivals = { get profile() { return JSON.parse(JSON.stringify(profile)); }, get diagnostics() { return scene?.diagnostics; }, get film() { return { time: filmTime, playing }; } };
