// Sound for the street (world bible 9): music, ambience and effects, all synthesised with the Web Audio
// API while the game runs. No recordings and no audio files, so nothing to license or credit.
// Browsers only allow sound after a click or key press, so the engine wakes on the first one.

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// A minor-pentatonic-friendly highlife progression in G: I - IV - I - V, two beats each, round and round.
const BPM = 100, BEAT = 60 / BPM, SIX = BEAT / 4;
// Radio stations (world bible 11.9): every one is made by this engine as you listen, so all of it is
// the game's own music, safe to stream and post. Licensed tracks can be added as stations later.
export const STATIONS = [
  { id: 'yabafm', name: 'Yaba FM 99.1', sub: 'Highlife all day', bpm: 100, shift: 0, kick: 1, clave: 1, bell: 1 },
  { id: 'lofi', name: 'Lagos Lo-Fi 101.5', sub: 'Slow, soft, for coding', bpm: 76, shift: -3, kick: 0.6, clave: 0, bell: 0.5 },
  { id: 'groove', name: 'Afro Groove 95.3', sub: 'Faster, heavier', bpm: 114, shift: 2, kick: 1.4, clave: 1, bell: 1.2 },
];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [[55, 59, 62, 67], [60, 64, 67, 72], [55, 59, 62, 67], [62, 66, 69, 74], [52, 55, 59, 64], [60, 64, 67, 72], [55, 59, 62, 67], [62, 66, 69, 74]];
const ROOTS = [43, 48, 43, 50, 40, 48, 43, 50];
// the guitar figure: sixteenth-note steps of the chord tones (index into the chord, -1 = rest)
const FIGURE = [0, -1, 2, 1, -1, 3, 2, -1, 1, -1, 2, 3, -1, 2, 1, -1];
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0];     // afrobeat-leaning bass pushes
const KICK = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0];
const CLAVE = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0];    // 3-2 son clave
const MELODY = [67, 69, 71, 74, 76, 79, 81];                          // G major pentatonic for the bell line

export function createAudio() {
  const settings = { music: store.get('bw-music', true), sfx: store.get('bw-sfx', true), ambience: store.get('bw-amb', true), volume: store.get('bw-vol', 0.7), creator: store.get('bw-creator', false) };
  let station = 0, radio = false, radioHp = null, radioLp = null, hiss = null;
  let ctx = null, meter = null, master, musicBus, sfxBus, ambBus, ambFilter, noiseBuf, started = false;
  const listeners = new Set();
  const state = { day: 1, rain: 0, inside: false, riding: false, speed: 0 };
  let engine = null, rainNode = null, hum = null, nextNote = 0, step = 0, bar = 0, timer = 0, birdT = 2, hornT = 14, cricketT = 0;

  function wake() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = settings.volume;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    meter = ctx.createAnalyser(); meter.fftSize = 2048; comp.connect(meter); // for tests: is anything audible?
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.5 : 0;
    // the radio: in a vehicle the music comes through a small speaker (band-limited), otherwise wide open
    radioHp = ctx.createBiquadFilter(); radioHp.type = 'highpass'; radioHp.frequency.value = 20;
    radioLp = ctx.createBiquadFilter(); radioLp.type = 'lowpass'; radioLp.frequency.value = 20000;
    musicBus.connect(radioHp).connect(radioLp).connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx ? 0.8 : 0; sfxBus.connect(master);
    ambFilter = ctx.createBiquadFilter(); ambFilter.type = 'lowpass'; ambFilter.frequency.value = 18000;
    ambBus = ctx.createGain(); ambBus.gain.value = settings.ambience ? 0.6 : 0; ambBus.connect(ambFilter).connect(master);
    // one second of white noise, reused for every noisy sound
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startBeds();
    nextNote = ctx.currentTime + 0.15;
    timer = setInterval(schedule, 25);
    started = true;
  }

  // ---------- building blocks ----------
  const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  function tone(bus, f, t, { type = 'sine', a = 0.005, peak = 0.2, dec = 0.3, filter = 0, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    let out = o;
    if (filter) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; o.connect(fl); out = fl; }
    out.connect(g).connect(bus); env(g, t, a, peak, dec);
    o.start(t); o.stop(t + a + dec + 0.05);
  }
  function noise(bus, t, { dur = 0.1, type = 'bandpass', f = 1200, q = 1, peak = 0.2, a = 0.002 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); s.connect(fl).connect(g).connect(bus); env(g, t, a, peak, dur);
    s.start(t, Math.random() * 0.8); s.stop(t + a + dur + 0.05);
  }

  // ---------- music: a scheduler that writes a little ahead of time ----------
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const st = STATIONS[station], six = 60 / st.bpm / 4;
    while (nextNote < ctx.currentTime + 0.12) { playStep(nextNote, step); nextNote += six; step = (step + 1) % 16; if (step === 0) bar = (bar + 1) % 64; }
  }
  function playStep(t, s) {
    if (!settings.music || tracks.playing) return; // real tracks play instead (below), the band rests
    const st = STATIONS[station], night = 1 - state.day, ci = Math.floor(bar / 1) % CHORDS.length, chord = CHORDS[ci].map((n) => n + st.shift);
    const sparse = night > 0.6; // after dark the band plays quieter: no kick, softer guitar
    // pad on the first step of each bar: warm and slow
    if (s === 0) chord.forEach((n, k) => tone(musicBus, midi(n - 12), t, { type: 'triangle', a: 0.4, peak: 0.035, dec: BEAT * 4, filter: 900, detune: k * 4 - 6 }));
    // highlife guitar: bright plucks on the figure
    const fi = FIGURE[s]; if (fi >= 0) tone(musicBus, midi(chord[fi] + 12), t, { type: 'triangle', peak: sparse ? 0.05 : 0.08, dec: 0.22, filter: 3200 });
    if (BASS[s]) tone(musicBus, midi(ROOTS[ci] + st.shift + (s === 14 ? 7 : 0)), t, { type: 'sine', a: 0.01, peak: 0.22, dec: 0.32 });
    if (!sparse && st.kick && KICK[s] && bar % 16 > 1) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g).connect(musicBus); env(g, t, 0.003, 0.35 * st.kick, 0.18); o.start(t); o.stop(t + 0.25); }
    if (st.clave && CLAVE[s] && bar % 8 > 0) tone(musicBus, 2400, t, { type: 'sine', peak: sparse ? 0.03 : 0.05, dec: 0.05 });
    if (s % 2 === 0) noise(musicBus, t, { type: 'highpass', f: 7000, dur: 0.04, peak: (s % 4 === 2 ? 0.05 : 0.025) * (sparse ? 0.5 : 1) });
    // a bell melody now and then, never the same twice
    if ((bar % 4 === 2 || bar % 4 === 3) && (s === 2 || s === 7 || s === 10) && Math.random() < 0.6) tone(musicBus, midi(MELODY[Math.floor(Math.random() * MELODY.length)] + st.shift), t, { type: 'sine', peak: 0.06 * st.bell, dec: st.bpm < 90 ? 1.2 : 0.6 });
  }

  // ---------- ambience: a city hum, rain, birds by day, crickets at night, distant horns ----------
  function loopNoise(f, type, gain, q = 0.7) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain; s.connect(fl).connect(g).connect(ambBus); s.start();
    return { g, fl };
  }
  function startBeds() {
    hum = loopNoise(220, 'lowpass', 0.08);             // traffic and generators, far off
    rainNode = loopNoise(2600, 'bandpass', 0, 0.4);    // rain on roofs and roads
  }
  function chirp(t) {
    const base = 2600 + Math.random() * 1800;
    for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), at = t + k * 0.11;
      o.frequency.setValueAtTime(base, at); o.frequency.exponentialRampToValueAtTime(base * 1.4, at + 0.06);
      o.connect(g).connect(ambBus); env(g, at, 0.005, 0.03, 0.07); o.start(at); o.stop(at + 0.1);
    }
  }
  function horn(t) {
    // a danfo two-tone horn, far away down another street
    [349, 440].forEach((f) => { const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 900; o.connect(fl).connect(g).connect(ambBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.018, t + 0.03); g.gain.setValueAtTime(0.018, t + 0.32); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); o.start(t); o.stop(t + 0.45); });
  }

  // ---------- effects ----------
  const SFX = {
    step: (o = {}) => noise(sfxBus, ctx.currentTime, { type: 'lowpass', f: o.grass ? 500 : 900, dur: o.run ? 0.06 : 0.08, peak: o.run ? 0.16 : 0.1 }),
    jump: () => { noise(sfxBus, ctx.currentTime, { type: 'bandpass', f: 600, dur: 0.12, peak: 0.08 }); },
    land: (v = 1) => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'lowpass', f: 400, dur: 0.14, peak: 0.12 + 0.1 * v }); tone(sfxBus, 70, t, { peak: 0.12 * v, dec: 0.12 }); },
    tap: () => tone(sfxBus, 880, ctx.currentTime, { type: 'triangle', peak: 0.05, dec: 0.06 }),
    open: () => { const t = ctx.currentTime; tone(sfxBus, 523, t, { type: 'triangle', peak: 0.06, dec: 0.1 }); tone(sfxBus, 784, t + 0.06, { type: 'triangle', peak: 0.06, dec: 0.14 }); },
    close: () => { const t = ctx.currentTime; tone(sfxBus, 784, t, { type: 'triangle', peak: 0.05, dec: 0.08 }); tone(sfxBus, 523, t + 0.05, { type: 'triangle', peak: 0.05, dec: 0.12 }); },
    route: () => { const t = ctx.currentTime; [67, 71, 74].forEach((n, k) => tone(sfxBus, midi(n + 12), t + k * 0.09, { type: 'sine', peak: 0.09, dec: 0.4 })); },
    arrive: () => { const t = ctx.currentTime; [74, 79, 83, 86].forEach((n, k) => tone(sfxBus, midi(n), t + k * 0.08, { type: 'triangle', peak: 0.08, dec: 0.5 })); },
    door: () => { const t = ctx.currentTime; tone(sfxBus, midi(76), t, { type: 'sine', peak: 0.08, dec: 0.5 }); tone(sfxBus, midi(72), t + 0.18, { type: 'sine', peak: 0.08, dec: 0.7 }); },
    interact: () => tone(sfxBus, midi(81), ctx.currentTime, { type: 'sine', peak: 0.07, dec: 0.25 }),
    // a car horn: two short square-wave beeps, deeper for a danfo or the BRT
    horn: (o = {}) => { const t = ctx.currentTime, f = ['danfo', 'brt'].includes(o.kind) ? [220, 277] : o.kind === 'keke' ? [520, 620] : [349, 440]; [0, 0.22].forEach((k) => f.forEach((fr) => { const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = 'square'; osc.frequency.value = fr; osc.connect(g).connect(sfxBus); g.gain.setValueAtTime(0.0001, t + k); g.gain.exponentialRampToValueAtTime(0.025, t + k + 0.02); g.gain.setValueAtTime(0.025, t + k + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + k + 0.19); osc.start(t + k); osc.stop(t + k + 0.2); })); },
    // three knocks on a wooden door
    knock: () => { const t = ctx.currentTime; [0, 0.2, 0.4].forEach((k) => { noise(sfxBus, t + k, { type: 'lowpass', f: 380, dur: 0.07, peak: 0.22 }); tone(sfxBus, 95, t + k, { type: 'sine', peak: 0.16, dec: 0.1 }); }); },
    // litter into the bag: a short crinkle and a soft up-note
    // sports (sports/): a chess piece set down, racket and ball, the hoop, the pool, the referee
    clack: () => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'bandpass', f: 1800, q: 3, dur: 0.04, peak: 0.16 }); tone(sfxBus, 420, t, { type: 'triangle', peak: 0.05, dec: 0.05 }); },
    hit: (o = {}) => { const t = ctx.currentTime, tt = o.kind === 'tt'; noise(sfxBus, t, { type: 'bandpass', f: tt ? 3200 : 1400, q: 2, dur: tt ? 0.03 : 0.05, peak: 0.12 + 0.12 * (o.power ?? 0.6) }); tone(sfxBus, tt ? 900 : 260, t, { type: 'triangle', peak: tt ? 0.05 : 0.08, dec: tt ? 0.03 : 0.07 }); },
    bounce: (o = {}) => { const t = ctx.currentTime, k = o.kind; if (k === 'bball') { tone(sfxBus, 85, t, { peak: 0.2, dec: 0.12 }); noise(sfxBus, t, { type: 'lowpass', f: 300, dur: 0.06, peak: 0.12 }); return; } tone(sfxBus, k === 'tt' ? 1300 : 330, t, { type: 'sine', peak: k === 'tt' ? 0.05 : 0.07, dec: k === 'tt' ? 0.03 : 0.06 }); noise(sfxBus, t, { type: 'bandpass', f: k === 'tt' ? 3500 : 900, dur: 0.03, peak: 0.06 }); },
    wall: () => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'bandpass', f: 700, q: 1.5, dur: 0.08, peak: 0.12 }); tone(sfxBus, 180, t, { peak: 0.06, dec: 0.1 }); },
    net: () => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'lowpass', f: 500, dur: 0.12, peak: 0.1 }); },
    whistle: () => { const t = ctx.currentTime; [0, 0.09, 0.18].forEach((k) => tone(sfxBus, 2900 + (k ? 120 : 0), t + k, { type: 'sine', peak: 0.06, dec: 0.08 })); },
    buzzer: () => { const t = ctx.currentTime; tone(sfxBus, 196, t, { type: 'square', a: 0.01, peak: 0.05, dec: 0.7, filter: 1200 }); tone(sfxBus, 233, t, { type: 'square', a: 0.01, peak: 0.04, dec: 0.7, filter: 1200 }); },
    rim: () => { const t = ctx.currentTime; [610, 937, 1450].forEach((f, k) => tone(sfxBus, f, t, { type: 'sine', peak: 0.06 / (k + 1), dec: 0.35 })); },
    swish: () => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'highpass', f: 2600, dur: 0.22, peak: 0.08, a: 0.03 }); },
    splash: (o = {}) => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'lowpass', f: o.big ? 900 : 1600, dur: o.big ? 0.5 : 0.14, peak: o.big ? 0.2 : 0.06, a: 0.01 }); },
    // the airport PA's three-note chime, and a jet taking off out on the runway (airport.js)
    chime: () => { const t = ctx.currentTime; [79, 76, 72].forEach((n, k) => { tone(sfxBus, midi(n), t + k * 0.42, { type: 'sine', peak: 0.12, dec: 1.4 }); tone(sfxBus, midi(n + 12), t + k * 0.42, { type: 'sine', peak: 0.025, dec: 0.8 }); }); },
    jet: () => { const t = ctx.currentTime; [[420, 'lowpass', 0.07], [1800, 'bandpass', 0.018]].forEach(([f, type, peak]) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ctx.createGain(); s.connect(fl).connect(g).connect(sfxBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 3); g.gain.exponentialRampToValueAtTime(0.0001, t + 9); s.start(t); s.stop(t + 9.1); }); },
    // the switch (main.js): a rushing whoosh up into the sky, a deep thud at each drop back down
    whoosh: () => { const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.5); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7); s.connect(f).connect(g).connect(sfxBus); s.start(t); s.stop(t + 0.75); },
    thud: () => { const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3); o.connect(g).connect(sfxBus); env(g, t, 0.004, 0.32, 0.35); o.start(t); o.stop(t + 0.45); noise(sfxBus, t, { type: 'lowpass', f: 600, dur: 0.12, peak: 0.12 }); },
    beep: (o = {}) => tone(sfxBus, o.high ? 1320 : 880, ctx.currentTime, { type: 'sine', peak: 0.1, dec: o.long ? 0.6 : 0.2 }),
    cheer: () => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'bandpass', f: 1100, q: 0.6, dur: 1.4, peak: 0.12, a: 0.25 }); noise(sfxBus, t + 0.1, { type: 'bandpass', f: 2300, q: 0.8, dur: 1.1, peak: 0.06, a: 0.3 }); },
    pick: () => { const t = ctx.currentTime; noise(sfxBus, t, { type: 'highpass', f: 2400, dur: 0.09, peak: 0.06 }); tone(sfxBus, midi(84), t + 0.05, { type: 'sine', peak: 0.04, dec: 0.15 }); },
    // a speech blip: two quick soft notes, higher for you than for others
    chat: (o = {}) => { const t = ctx.currentTime, b = o.me ? 79 : 72 + Math.floor(Math.random() * 5); tone(sfxBus, midi(b), t, { type: 'sine', peak: 0.04, dec: 0.08 }); tone(sfxBus, midi(b + 4), t + 0.07, { type: 'sine', peak: 0.035, dec: 0.1 }); },
  };
  function play(name, opt) { if (!ctx || !settings.sfx || !SFX[name]) return; SFX[name](opt); }

  // the hired vehicle's engine: a low sawtooth whose pitch follows the speed
  function setEngine(on) {
    if (on && !engine) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = 38; o2.frequency.value = 19;
      fl.type = 'lowpass'; fl.frequency.value = 320; g.gain.value = 0;
      o.connect(fl); o2.connect(fl); fl.connect(g).connect(sfxBus); o.start(); o2.start();
      g.gain.setTargetAtTime(0.06, ctx.currentTime, 0.3);
      engine = { o, o2, g, fl };
    } else if (!on && engine) {
      const e = engine; engine = null;
      e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => { e.o.stop(); e.o2.stop(); }, 900);
    }
  }

  // ---------- per frame ----------
  function update(dt, s) {
    Object.assign(state, s);
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (rainNode) rainNode.g.gain.setTargetAtTime(0.16 * Math.min(1, state.rain), t, 0.8);
    if (hum) hum.g.gain.setTargetAtTime(state.inside ? 0.03 : 0.08, t, 0.5);
    ambFilter.frequency.setTargetAtTime(state.inside ? 700 : 18000, t, 0.3); // walls muffle the street
    setEngine(!!state.riding);
    if (!!state.riding !== radio) setRadio(!!state.riding);
    tickTracks();
    if (engine) { const k = Math.min(1, Math.abs(state.speed) / 14); engine.o.frequency.setTargetAtTime(38 + 50 * k, t, 0.2); engine.o2.frequency.setTargetAtTime(19 + 25 * k, t, 0.2); engine.fl.frequency.setTargetAtTime(320 + 500 * k, t, 0.2); }
    if (!settings.ambience || state.inside) return;
    birdT -= dt; hornT -= dt; cricketT -= dt;
    if (birdT <= 0) { birdT = 2 + Math.random() * 6; if (state.day > 0.4 && state.rain < 0.3) chirp(t); }
    if (hornT <= 0) { hornT = 12 + Math.random() * 25; if (state.day > 0.2) horn(t); }
    if (cricketT <= 0) {
      cricketT = 0.5 + Math.random() * 0.6;
      if (state.day < 0.3) for (let k = 0; k < 3; k++) tone(ambBus, 4200 + Math.random() * 300, t + k * 0.05, { peak: 0.012, dec: 0.03 });
    }
  }

  // ---------- tracks: licensed music files in public/music, listed in playlist.json ----------
  // { "day": [{ "file": "sunny-accra-groove.mp3", "title": "...", "artist": "...", "licence": "Pixabay" }], "night": [...] }
  // They crossfade one into the next, the night list after dark, through the same bus (so the radio
  // filter applies in a vehicle). Creator mode, or no playlist, means the game's own generated music.
  const tracks = { list: null, playing: false, el: [null, null], cur: 0, src: [null, null], g: [null, null], now: null, fading: false };
  fetch('./music/playlist.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && (j.day?.length || j.night?.length)) tracks.list = j; }).catch(() => {});
  function pickTrack() {
    const L = tracks.list, set = (state.day < 0.35 && L.night?.length ? L.night : L.day?.length ? L.day : L.night) || [];
    if (!set.length) return null;
    let t; do { t = set[Math.floor(Math.random() * set.length)]; } while (set.length > 1 && t === tracks.now);
    return t;
  }
  function startTrack() {
    const t = pickTrack(); if (!t || !ctx) return;
    const k = 1 - tracks.cur;
    if (!tracks.el[k]) { const a = new Audio(); a.crossOrigin = 'anonymous'; a.preload = 'auto'; tracks.el[k] = a; tracks.src[k] = ctx.createMediaElementSource(a); tracks.g[k] = ctx.createGain(); tracks.g[k].gain.value = 0; tracks.src[k].connect(tracks.g[k]).connect(musicBus); a.onended = () => { if (tracks.cur === k) startTrack(); }; }
    const a = tracks.el[k]; a.src = `./music/${t.file}`; a.currentTime = 0;
    a.play().then(() => {
      const now = ctx.currentTime;
      tracks.g[k].gain.cancelScheduledValues(now); tracks.g[k].gain.setValueAtTime(0, now); tracks.g[k].gain.linearRampToValueAtTime(1.6, now + 3);
      const old = tracks.g[tracks.cur]; if (old) { old.gain.cancelScheduledValues(now); old.gain.setValueAtTime(old.gain.value, now); old.gain.linearRampToValueAtTime(0, now + 3); const oe = tracks.el[tracks.cur]; setTimeout(() => oe?.pause(), 3200); }
      tracks.cur = k; tracks.now = t; tracks.playing = true; listeners.forEach((fn) => fn(settings));
    }).catch(() => { tracks.playing = false; });
  }
  function stopTracks() { tracks.el.forEach((a) => a?.pause()); tracks.playing = false; tracks.now = null; }
  let lastNight = null;
  function tickTracks() {
    const want = !!tracks.list && settings.music && !settings.creator;
    if (want && !tracks.playing) startTrack();
    if (!want && tracks.playing) stopTracks();
    // dusk or dawn: move to the other list at the end of a crossfade
    const night = state.day < 0.35; if (tracks.playing && lastNight !== null && night !== lastNight) startTrack(); lastNight = night;
  }

  // ---------- the radio ----------
  function setRadio(on) {
    radio = on; if (!ctx) return;
    const t = ctx.currentTime;
    radioHp.frequency.setTargetAtTime(on ? 320 : 20, t, 0.15); radioLp.frequency.setTargetAtTime(on ? 3600 : 20000, t, 0.15);
    musicBus.gain.setTargetAtTime(settings.music ? (on ? 0.75 : 0.5) : 0, t, 0.2);
    if (on && !hiss) { const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 3000; const g = ctx.createGain(); g.gain.value = 0.004; src.connect(fl).connect(g).connect(master); src.start(); hiss = { src, g }; }
    if (!on && hiss) { hiss.src.stop(); hiss = null; }
    if (on) tuneBlip();
  }
  function tuneBlip() { if (!ctx) return; const t = ctx.currentTime; noise(sfxBus, t, { type: 'bandpass', f: 2200, dur: 0.35, peak: 0.08 }); }
  function nextStation() {
    // with a playlist, the radio's first station is the playlist (skip to the next track); then the generated stations
    if (tracks.playing) { startTrack(); tuneBlip(); return { name: 'Yaba FM 99.1', sub: tracks.now ? `${tracks.now.title} · ${tracks.now.artist}` : 'Next track' }; }
    station = (station + 1) % STATIONS.length; tuneBlip(); listeners.forEach((fn) => fn(settings)); return STATIONS[station];
  }

  // ---------- settings ----------
  function set(key, value) {
    settings[key] = value;
    store.set({ music: 'bw-music', sfx: 'bw-sfx', ambience: 'bw-amb', volume: 'bw-vol', creator: 'bw-creator' }[key], value);
    if (key === 'creator') document.body.classList.toggle('bw-creator', !!value);
    if (ctx) {
      const t = ctx.currentTime;
      musicBus.gain.setTargetAtTime(settings.music ? (radio ? 0.75 : 0.5) : 0, t, 0.3);
      sfxBus.gain.setTargetAtTime(settings.sfx ? 0.8 : 0, t, 0.1);
      ambBus.gain.setTargetAtTime(settings.ambience ? 0.6 : 0, t, 0.3);
      master.gain.setTargetAtTime(settings.volume, t, 0.1);
    }
    listeners.forEach((fn) => fn(settings));
  }
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  // wake on the first gesture; UI buttons tap; other parts of the game fire 'bw:sfx' events
  const gesture = () => wake();
  addEventListener('pointerdown', gesture, true); addEventListener('keydown', gesture, true);
  const onTap = (e) => { if (e.target.closest?.('button, .app, .it, [role="tab"]')) play('tap'); };
  addEventListener('pointerdown', onTap, true);
  const onEvt = (e) => play(e.detail?.name || e.detail, e.detail?.opt);
  addEventListener('bw:sfx', onEvt);

  function dispose() {
    clearInterval(timer);
    removeEventListener('pointerdown', gesture, true); removeEventListener('keydown', gesture, true);
    removeEventListener('pointerdown', onTap, true); removeEventListener('bw:sfx', onEvt);
    ctx?.close();
  }
  // loudness of the mix right now (RMS, 0..1), for tests and a future meter
  const level = () => { if (!meter) return 0; const a = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(a); let s = 0; for (const v of a) s += v * v; return Math.sqrt(s / a.length); };
  document.body.classList.toggle('bw-creator', !!settings.creator);
  return { wake, play, update, set, settings, onChange, dispose, level, nextStation, get track() { return tracks.now; }, get station() { return tracks.playing ? { name: 'Yaba FM 99.1', sub: tracks.now ? `${tracks.now.title} · ${tracks.now.artist}` : '' } : STATIONS[station]; }, get radio() { return radio; }, get started() { return started; }, get context() { return ctx; } };
}

// one engine per page
let instance = null;
export const audioEngine = () => (instance ??= createAudio());

// fire a sound from anywhere without holding a reference to the engine
export const sfx = (name, opt) => dispatchEvent(new CustomEvent('bw:sfx', { detail: { name, opt } }));
