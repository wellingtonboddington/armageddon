/* MIDNIGHT PROTOCOL — procedural sound design (Web Audio API, zero audio files) */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U;
  const SFX = (MP.SFX = {});

  let noiseBuf = null;
  const last = {};
  const MIN_GAP = { hover: 0.035, hoverMap: 0.05, coin: 0.08, explodeSmall: 0.06, intercept: 0.1, interceptMiss: 0.1, type: 0.03, invaded: 1.2, siren: 2.5, clockTick: 0.5, built: 0.15, nuke: 0.15, capture: 0.08, launch: 0.12 };

  function ctx() { return MP.audio.getCtx(); }
  function out() { return MP.audio.sfxOut(); }
  function noise() {
    const c = ctx();
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    return s;
  }
  function env(g, t, a, peak, d, sus, r) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
    if (r) g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
  }
  function tone(type, f0, f1, dur, vol, dest, t0) {
    const c = ctx(); const t = t0 || c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, 0.005, vol, dur * 0.9, 0.0001, 0.02);
    o.connect(g); g.connect(dest || out());
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function nz(dur, vol, ftype, f0, f1, q, dest, t0, attack) {
    const c = ctx(); const t = t0 || c.currentTime;
    const s = noise(); const f = c.createBiquadFilter(); const g = c.createGain();
    f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    f.Q.value = q || 0.7;
    env(g, t, attack || 0.005, vol, dur, 0.0001, 0.05);
    s.connect(f); f.connect(g); g.connect(dest || out());
    s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  // positional bus: pan and attenuate by distance to the camera centre
  function spatial(x, y, vol) {
    const c = ctx();
    const g = c.createGain(); g.gain.value = vol == null ? 1 : vol;
    if (x == null || !MP.Render || !MP.Render.cam) { g.connect(out()); return g; }
    const [sx] = MP.Render.w2s(x, y);
    const w = window.innerWidth;
    const pan = U.clamp((sx - w / 2) / (w / 2), -1, 1);
    const [wx, wy] = MP.Render.s2w(w / 2, window.innerHeight / 2);
    const d = Math.hypot(x - wx, y - wy) * MP.Render.cam.z / w;
    g.gain.value *= U.clamp(1.15 - d * 0.7, 0.25, 1);
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan * 0.8; g.connect(p); p.connect(out()); }
    else g.connect(out());
    return g;
  }

  const S = {
    hover() { tone('sine', 2400, 2200, 0.018, 0.025); },
    hoverMap() { tone('triangle', 1400, 1300, 0.015, 0.015); },
    click() { tone('square', 1800, 900, 0.04, 0.05); nz(0.02, 0.04, 'highpass', 3000); },
    open() { tone('sine', 420, 840, 0.12, 0.07); tone('sine', 630, 1260, 0.12, 0.04); },
    close() { tone('sine', 840, 420, 0.1, 0.06); },
    toggle() { tone('square', 1200, 1200, 0.03, 0.04); tone('square', 1600, 1600, 0.03, 0.03, null, ctx().currentTime + 0.04); },
    type() { nz(0.015, 0.05, 'bandpass', 3500, null, 3); },
    error() { tone('square', 220, 180, 0.12, 0.07); tone('square', 180, 150, 0.14, 0.06, null, ctx().currentTime + 0.11); },
    send() { tone('sine', 900, 1800, 0.1, 0.06); },
    build(x, y) { const d = spatial(x, y, 1); nz(0.08, 0.25, 'lowpass', 900, 200, 1, d); tone('triangle', 140, 70, 0.14, 0.2, d); tone('square', 900, 1300, 0.06, 0.04, d, ctx().currentTime + 0.08); },
    built() { const t = ctx().currentTime; tone('triangle', 660, 660, 0.08, 0.06, null, t); tone('triangle', 990, 990, 0.12, 0.06, null, t + 0.07); },
    upgrade() { const t = ctx().currentTime; [520, 780, 1040].forEach((f, i) => tone('triangle', f, f * 1.01, 0.1, 0.06, null, t + i * 0.06)); nz(0.06, 0.15, 'lowpass', 800, 200); },
    spawn() { const t = ctx().currentTime; tone('sawtooth', 110, 220, 0.5, 0.08, null, t); nz(0.6, 0.12, 'lowpass', 400, 2500, 2, null, t, 0.2); tone('sine', 880, 880, 0.3, 0.05, null, t + 0.35); },
    attack(x, y) { const d = spatial(x, y, 1); const t = ctx().currentTime; for (let i = 0; i < 3; i++) { nz(0.07, 0.25, 'lowpass', 300, 90, 1, d, t + i * 0.09); tone('sine', 90, 55, 0.09, 0.2, d, t + i * 0.09); } },
    invaded() { const t = ctx().currentTime; tone('sawtooth', 160, 150, 0.35, 0.06, null, t); tone('sawtooth', 120, 112, 0.35, 0.06, null, t + 0.28); nz(0.3, 0.05, 'bandpass', 800, 400, 4, null, t); },
    capture() { tone('triangle', 520, 700, 0.06, 0.03); },
    launch(x, y) { const d = spatial(x, y, 1); const t = ctx().currentTime; nz(1.8, 0.35, 'bandpass', 300, 2400, 1.2, d, t, 0.15); tone('sawtooth', 60, 200, 1.4, 0.05, d, t); },
    launchBoat(x, y) { const d = spatial(x, y, 1); nz(0.9, 0.15, 'lowpass', 300, 800, 1, d, null, 0.2); tone('sine', 110, 100, 0.8, 0.08, d); },
    jet(x, y) { const d = spatial(x, y, 1); nz(1.4, 0.25, 'bandpass', 2400, 500, 2, d, null, 0.3); },
    siren() {
      const c = ctx(); const t = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain(); const lfo = c.createOscillator(); const lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = 620; lfo.frequency.value = 1.6; lg.gain.value = 220;
      lfo.connect(lg); lg.connect(o.frequency);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      env(g, t, 0.05, 0.07, 2.2, 0.0001, 0.3);
      o.connect(f); f.connect(g); g.connect(out()); o.start(t); lfo.start(t); o.stop(t + 2.7); lfo.stop(t + 2.7);
    },
    nuke(x, y, vol) {
      const c = ctx(); const t = c.currentTime; const d = spatial(x, y, vol == null ? 1 : vol);
      nz(0.25, 0.9, 'lowpass', 6000, 300, 0.7, d, t);
      nz(4.5, 0.9, 'lowpass', 220, 30, 1.5, d, t + 0.05, 0.08);
      tone('sine', 48, 24, 4, 0.6, d, t);
      tone('sine', 36, 20, 5, 0.4, d, t + 0.2);
      nz(3.5, 0.15, 'bandpass', 900, 150, 0.8, d, t + 0.4, 0.5);
    },
    explodeSmall(x, y) { const d = spatial(x, y, 1); nz(0.6, 0.45, 'lowpass', 1800, 120, 0.8, d); tone('sine', 80, 40, 0.5, 0.3, d); },
    orbitalCharge() { tone('sawtooth', 200, 2400, 2.8, 0.05); nz(2.8, 0.06, 'bandpass', 800, 5000, 6, null, null, 1.5); },
    orbital(x, y, vol) { const d = spatial(x, y, vol); tone('square', 2400, 80, 0.6, 0.2, d); nz(2.5, 0.8, 'lowpass', 3000, 60, 1, d); tone('sine', 60, 25, 2.5, 0.5, d); },
    emp(x, y, vol) { const d = spatial(x, y, vol); tone('sine', 4000, 40, 0.9, 0.12, d); nz(0.5, 0.25, 'highpass', 5000, 200, 2, d); },
    intercept() { const t = ctx().currentTime; tone('square', 2600, 600, 0.18, 0.06, null, t); nz(0.25, 0.2, 'bandpass', 2000, 800, 2, null, t + 0.12); },
    interceptMiss() { tone('square', 1800, 1500, 0.12, 0.04); },
    naval() { const t = ctx().currentTime; tone('sawtooth', 98, 96, 0.9, 0.08, null, t); tone('sawtooth', 147, 144, 0.9, 0.05, null, t); },
    coin() { const t = ctx().currentTime; tone('triangle', 1320, 1320, 0.05, 0.05, null, t); tone('triangle', 1760, 1760, 0.08, 0.05, null, t + 0.05); },
    research() { const t = ctx().currentTime; for (let i = 0; i < 5; i++) tone('square', 400 + i * 140, 400 + i * 140, 0.04, 0.03, null, t + i * 0.05); },
    researchDone() { const t = ctx().currentTime; [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.18, 0.06, null, t + i * 0.08)); },
    alliance() { const t = ctx().currentTime; [392, 494, 587].forEach((f) => tone('triangle', f, f, 0.6, 0.05, null, t)); tone('sine', 784, 784, 0.5, 0.04, null, t + 0.2); },
    decline() { tone('triangle', 330, 260, 0.25, 0.06); },
    offer() { const t = ctx().currentTime; tone('sine', 880, 880, 0.08, 0.06, null, t); tone('sine', 1320, 1320, 0.12, 0.06, null, t + 0.1); },
    betrayal() { const t = ctx().currentTime; [311, 330, 349].forEach((f) => tone('sawtooth', f, f * 0.97, 0.9, 0.04, null, t)); nz(0.8, 0.1, 'lowpass', 600, 100, 1, null, t); },
    council() { const t = ctx().currentTime; [262, 330, 392, 523].forEach((f, i) => tone('sine', f, f, 0.5, 0.05, null, t + i * 0.12)); },
    councilPass() { const t = ctx().currentTime; tone('triangle', 523, 523, 0.3, 0.06, null, t); tone('triangle', 784, 784, 0.5, 0.06, null, t + 0.15); },
    councilFail() { const t = ctx().currentTime; tone('triangle', 392, 392, 0.3, 0.06, null, t); tone('triangle', 311, 311, 0.5, 0.06, null, t + 0.15); },
    defcon() { const t = ctx().currentTime; for (let i = 0; i < 3; i++) { tone('square', 440, 440, 0.18, 0.06, null, t + i * 0.3); tone('square', 330, 330, 0.12, 0.05, null, t + i * 0.3 + 0.18); } },
    milestone() { const t = ctx().currentTime; [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.25, 0.06, null, t + i * 0.09)); },
    phase() { const t = ctx().currentTime; tone('sawtooth', 110, 110, 0.8, 0.06, null, t); tone('sawtooth', 165, 165, 0.8, 0.04, null, t); nz(0.8, 0.08, 'lowpass', 300, 2000, 1, null, t, 0.4); },
    clockTick() { tone('square', 2000, 2000, 0.015, 0.05); nz(0.02, 0.08, 'highpass', 4000); },
    thunder() { nz(2.5, 0.35, 'lowpass', 500, 60, 1, null, null, 0.05); },
    victory() { const t = ctx().currentTime; [262, 330, 392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.7, 0.06, null, t + i * 0.12)); },
    defeat() { const t = ctx().currentTime; [392, 349, 311, 262].forEach((f, i) => tone('sawtooth', f, f * 0.98, 0.7, 0.05, null, t + i * 0.25)); },
    winter() { const t = ctx().currentTime; tone('sine', 55, 27, 6, 0.5, null, t); nz(6, 0.3, 'lowpass', 400, 40, 1, null, t, 1.5); [220, 207, 196].forEach((f, i) => tone('sine', f, f, 2.5, 0.05, null, t + 1 + i * 1.2)); },
  };

  SFX.play = function (name, x, y, vol) {
    const c = ctx();
    if (!c || MP.audio.isMuted()) return;
    const now = c.currentTime;
    const gap = MIN_GAP[name] || 0.03;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now;
    const fn = S[name];
    if (fn) { try { fn(x, y, vol); } catch (e) { /* ignore audio errors */ } }
  };

  // ---------------- ambient & menu music ----------------
  let amb = null, music = null;
  SFX.startAmbient = function () {
    const c = ctx(); if (!c || amb) return;
    const dest = MP.audio.ambOut();
    const g = c.createGain(); g.gain.value = 0; g.connect(dest);
    g.gain.linearRampToValueAtTime(0.5, c.currentTime + 3);
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 41.2;
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 41.6;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140; f.Q.value = 2;
    const og = c.createGain(); og.gain.value = 0.08;
    o1.connect(f); o2.connect(f); f.connect(og); og.connect(g);
    const n = noise(); const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.6;
    const ng = c.createGain(); ng.gain.value = 0.012; n.connect(nf); nf.connect(ng); ng.connect(g);
    o1.start(); o2.start(); n.start();
    amb = { g, nodes: [o1, o2, n], f, timer: null };
    // occasional sonar pings / radio blips
    amb.timer = setInterval(() => {
      if (!ctx() || MP.Game.paused) return;
      const S = MP.G.S;
      const tension = S ? (5 - S.defcon) / 4 : 0;
      amb.f.frequency.setTargetAtTime(140 + tension * 160, ctx().currentTime, 2);
      if (Math.random() < 0.35) { const t = ctx().currentTime; const o = ctx().createOscillator(); const gg = ctx().createGain(); o.type = 'sine'; o.frequency.value = 1180; env(gg, t, 0.01, 0.025, 1.2, 0.0001, 0.2); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 1.5); }
      if (Math.random() < 0.25) { for (let i = 0; i < 4; i++) { const t = ctx().currentTime + i * 0.06; const o = ctx().createOscillator(); const gg = ctx().createGain(); o.type = 'square'; o.frequency.value = 1500 + Math.random() * 1500; env(gg, t, 0.002, 0.008, 0.03, 0.0001, 0.01); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 0.06); } }
    }, 2600);
  };
  SFX.stopAmbient = function () {
    if (!amb) return;
    const c = ctx();
    const a = amb; amb = null;
    clearInterval(a.timer);
    try { a.g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* */ } }), 2000); } catch (e) { /* */ }
  };

  // slow minor-key pad arpeggio for the menu (original)
  SFX.startMenuMusic = function () {
    const c = ctx(); if (!c || music) return;
    const g = c.createGain(); g.gain.value = 0; g.connect(MP.audio.musicOut());
    g.gain.linearRampToValueAtTime(0.6, c.currentTime + 4);
    const delay = c.createDelay(); delay.delayTime.value = 0.42; const fb = c.createGain(); fb.gain.value = 0.38;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
    delay.connect(fb); fb.connect(delay); delay.connect(lp); lp.connect(g);
    const chords = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 59, 64]];
    let step = 0;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const padNodes = [];
    function pad(ch, t) {
      for (const m of ch) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m - 12); o.detune.value = (Math.random() - 0.5) * 12;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.018, t + 1.5); gg.gain.linearRampToValueAtTime(0.0001, t + 6.2);
        o.connect(f); f.connect(gg); gg.connect(g); o.start(t); o.stop(t + 6.4);
      }
    }
    const tick = () => {
      if (!music) return;
      const t = c.currentTime + 0.05;
      const ch = chords[Math.floor(step / 8) % chords.length];
      if (step % 8 === 0) pad(ch, t);
      const note = ch[[0, 2, 1, 3, 2, 1, 3, 2][step % 8]] + 12;
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(note);
      const gg = c.createGain(); env(gg, t, 0.01, 0.035, 0.5, 0.0001, 0.2);
      o.connect(gg); gg.connect(g); gg.connect(delay); o.start(t); o.stop(t + 0.8);
      step++;
    };
    music = { g, iv: setInterval(tick, 750), padNodes };
    tick();
  };
  SFX.stopMenuMusic = function () {
    if (!music) return;
    const c = ctx(); const m = music; music = null;
    clearInterval(m.iv);
    try { m.g.gain.setTargetAtTime(0, c.currentTime, 0.5); } catch (e) { /* */ }
  };
})();
