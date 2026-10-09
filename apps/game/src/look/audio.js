// Sound for the street (world bible 9): music, ambience and effects, all synthesised with the Web Audio
// API while the game runs. No recordings and no audio files, so nothing to license or credit.
// Browsers only allow sound after a click or key press, so the engine wakes on the first one.

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// A minor-pentatonic-friendly highlife progression in G: I - IV - I - V, two beats each, round and round.
const BPM = 100, BEAT = 60 / BPM, SIX = BEAT / 4;
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
  const settings = { music: store.get('bw-music', true), sfx: store.get('bw-sfx', true), ambience: store.get('bw-amb', true), volume: store.get('bw-vol', 0.7) };
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
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.5 : 0; musicBus.connect(master);
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
    while (nextNote < ctx.currentTime + 0.12) { playStep(nextNote, step); nextNote += SIX; step = (step + 1) % 16; if (step === 0) bar = (bar + 1) % 64; }
  }
  function playStep(t, s) {
    if (!settings.music) return;
    const night = 1 - state.day, ci = Math.floor(bar / 1) % CHORDS.length, chord = CHORDS[ci];
    const sparse = night > 0.6; // after dark the band plays quieter: no kick, softer guitar
    // pad on the first step of each bar: warm and slow
    if (s === 0) chord.forEach((n, k) => tone(musicBus, midi(n - 12), t, { type: 'triangle', a: 0.4, peak: 0.035, dec: BEAT * 4, filter: 900, detune: k * 4 - 6 }));
    // highlife guitar: bright plucks on the figure
    const fi = FIGURE[s]; if (fi >= 0) tone(musicBus, midi(chord[fi] + 12), t, { type: 'triangle', peak: sparse ? 0.05 : 0.08, dec: 0.22, filter: 3200 });
    if (BASS[s]) tone(musicBus, midi(ROOTS[ci] + (s === 14 ? 7 : 0)), t, { type: 'sine', a: 0.01, peak: 0.22, dec: 0.32 });
    if (!sparse && KICK[s] && bar % 16 > 1) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g).connect(musicBus); env(g, t, 0.003, 0.35, 0.18); o.start(t); o.stop(t + 0.25); }
    if (CLAVE[s] && bar % 8 > 0) tone(musicBus, 2400, t, { type: 'sine', peak: sparse ? 0.03 : 0.05, dec: 0.05 });
    if (s % 2 === 0) noise(musicBus, t, { type: 'highpass', f: 7000, dur: 0.04, peak: (s % 4 === 2 ? 0.05 : 0.025) * (sparse ? 0.5 : 1) });
    // a bell melody now and then, never the same twice
    if ((bar % 4 === 2 || bar % 4 === 3) && (s === 2 || s === 7 || s === 10) && Math.random() < 0.6) tone(musicBus, midi(MELODY[Math.floor(Math.random() * MELODY.length)]), t, { type: 'sine', peak: 0.06, dec: 0.6 });
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

  // ---------- settings ----------
  function set(key, value) {
    settings[key] = value;
    store.set({ music: 'bw-music', sfx: 'bw-sfx', ambience: 'bw-amb', volume: 'bw-vol' }[key], value);
    if (ctx) {
      const t = ctx.currentTime;
      musicBus.gain.setTargetAtTime(settings.music ? 0.5 : 0, t, 0.3);
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
  return { wake, play, update, set, settings, onChange, dispose, level, get started() { return started; }, get context() { return ctx; } };
}

// one engine per page
let instance = null;
export const audioEngine = () => (instance ??= createAudio());

// fire a sound from anywhere without holding a reference to the engine
export const sfx = (name, opt) => dispatchEvent(new CustomEvent('bw:sfx', { detail: { name, opt } }));
