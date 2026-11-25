/* MIDNIGHT PROTOCOL — core: namespace, event bus, settings, audio context plumbing */
(function () {
  'use strict';
  const MP = (window.MP = window.MP || {});

  // ---------- event bus ----------
  const handlers = new Map();
  MP.bus = {
    on(evt, fn) {
      if (!handlers.has(evt)) handlers.set(evt, new Set());
      handlers.get(evt).add(fn);
      return fn;
    },
    off(evt, fn) {
      const s = handlers.get(evt);
      if (s) s.delete(fn);
    },
    emit(evt, data) {
      const s = handlers.get(evt);
      if (!s) return;
      for (const fn of Array.from(s)) {
        try { fn(data); } catch (e) { console.error('[bus]', evt, e); }
      }
    },
  };

  // ---------- persisted settings (safe localStorage) ----------
  const SKEY = 'mp.settings.v1';
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { cache = {}; }
  let saveTimer = 0;
  function flush() {
    try { localStorage.setItem(SKEY, JSON.stringify(cache)); } catch (e) { /* storage blocked */ }
  }
  MP.settings = {
    get(key, def) { return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : def; },
    set(key, val) {
      cache[key] = val;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 150);
    },
    flush,
  };

  // ---------- audio graph ----------
  let ctx = null, master = null, sfxBus = null, voiceBus = null, musicBus = null, ambBus = null;
  function vol(key, def) { return MP.settings.get(key, def); }
  function applyVolumes() {
    if (!ctx) return;
    const muted = !!vol('muted', false);
    master.gain.value = muted ? 0 : vol('vol.master', 0.8);
    sfxBus.gain.value = vol('vol.sfx', 0.8);
    voiceBus.gain.value = vol('vol.voice', 0.9);
    musicBus.gain.value = vol('vol.music', 0.5);
    ambBus.gain.value = vol('vol.amb', 0.5);
  }
  MP.audio = {
    unlock() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
        master = ctx.createGain();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4;
        comp.attack.value = 0.004; comp.release.value = 0.2;
        master.connect(comp); comp.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        voiceBus = ctx.createGain(); voiceBus.connect(master);
        musicBus = ctx.createGain(); musicBus.connect(master);
        ambBus = ctx.createGain(); ambBus.connect(master);
        applyVolumes();
        MP.bus.emit('audio:ready', ctx);
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    },
    getCtx() { return ctx; },
    sfxOut() { return sfxBus; },
    voiceOut() { return voiceBus; },
    musicOut() { return musicBus; },
    ambOut() { return ambBus; },
    isMuted() { return !!vol('muted', false); },
    applyVolumes,
  };
})();
