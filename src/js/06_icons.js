/* MIDNIGHT PROTOCOL — procedural vector icons (map sprites + HUD) */
(function () {
  'use strict';
  const MP = window.MP;
  const I = (MP.Icons = {});

  // each glyph drawn in a 0..1 box, stroke/fill white
  const G = {
    city(c) { // skyline
      c.fillRect(0.14, 0.45, 0.18, 0.43); c.fillRect(0.38, 0.18, 0.22, 0.70); c.fillRect(0.66, 0.34, 0.2, 0.54);
      c.clearRect(0.44, 0.28, 0.04, 0.06); c.clearRect(0.52, 0.28, 0.04, 0.06); c.clearRect(0.44, 0.42, 0.04, 0.06); c.clearRect(0.52, 0.42, 0.04, 0.06);
    },
    port(c) { // anchor
      c.beginPath(); c.arc(0.5, 0.2, 0.08, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(0.5, 0.28); c.lineTo(0.5, 0.86); c.stroke();
      c.beginPath(); c.moveTo(0.3, 0.42); c.lineTo(0.7, 0.42); c.stroke();
      c.beginPath(); c.arc(0.5, 0.56, 0.3, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    },
    factory(c) {
      c.beginPath(); c.moveTo(0.1, 0.88); c.lineTo(0.1, 0.5); c.lineTo(0.32, 0.38); c.lineTo(0.32, 0.5); c.lineTo(0.54, 0.38); c.lineTo(0.54, 0.5);
      c.lineTo(0.72, 0.4); c.lineTo(0.72, 0.14); c.lineTo(0.86, 0.14); c.lineTo(0.86, 0.88); c.closePath(); c.fill();
      c.clearRect(0.2, 0.62, 0.1, 0.1); c.clearRect(0.42, 0.62, 0.1, 0.1); c.clearRect(0.64, 0.62, 0.1, 0.1);
    },
    hub(c) { // locomotive front
      c.beginPath(); c.roundRect ? c.roundRect(0.22, 0.12, 0.56, 0.6, 0.1) : c.rect(0.22, 0.12, 0.56, 0.6); c.fill();
      c.clearRect(0.3, 0.2, 0.4, 0.18);
      c.beginPath(); c.arc(0.36, 0.56, 0.05, 0, 7); c.arc(0.64, 0.56, 0.05, 0, 7); c.fillStyle = '#000'; c.fill(); c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(0.3, 0.74); c.lineTo(0.18, 0.9); c.moveTo(0.7, 0.74); c.lineTo(0.82, 0.9); c.stroke();
    },
    enrich(c) { // flask with atom dot
      c.beginPath(); c.moveTo(0.4, 0.1); c.lineTo(0.6, 0.1); c.lineTo(0.6, 0.38); c.lineTo(0.84, 0.86); c.lineTo(0.16, 0.86); c.lineTo(0.4, 0.38); c.closePath(); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.arc(0.5, 0.66, 0.08, 0, 7); c.fill(); c.fillStyle = '#fff';
    },
    fort(c) {
      c.beginPath(); c.moveTo(0.18, 0.88); c.lineTo(0.26, 0.36); c.lineTo(0.18, 0.36); c.lineTo(0.18, 0.14); c.lineTo(0.32, 0.14); c.lineTo(0.32, 0.24);
      c.lineTo(0.43, 0.24); c.lineTo(0.43, 0.14); c.lineTo(0.57, 0.14); c.lineTo(0.57, 0.24); c.lineTo(0.68, 0.24); c.lineTo(0.68, 0.14); c.lineTo(0.82, 0.14);
      c.lineTo(0.82, 0.36); c.lineTo(0.74, 0.36); c.lineTo(0.82, 0.88); c.closePath(); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.arc(0.5, 0.88, 0.12, Math.PI, 0); c.fill(); c.fillStyle = '#fff';
    },
    silo(c) { // missile upright
      c.beginPath(); c.moveTo(0.5, 0.06); c.quadraticCurveTo(0.64, 0.2, 0.62, 0.36); c.lineTo(0.62, 0.72); c.lineTo(0.76, 0.9); c.lineTo(0.24, 0.9); c.lineTo(0.38, 0.72);
      c.lineTo(0.38, 0.36); c.quadraticCurveTo(0.36, 0.2, 0.5, 0.06); c.fill();
    },
    radar(c) {
      c.beginPath(); c.arc(0.42, 0.46, 0.3, 0.75 * Math.PI, 1.75 * Math.PI, true); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0.42, 0.46); c.lineTo(0.72, 0.18); c.stroke();
      c.beginPath(); c.arc(0.75, 0.15, 0.05, 0, 7); c.fill();
      c.fillRect(0.36, 0.7, 0.12, 0.18); c.fillRect(0.24, 0.84, 0.36, 0.06);
    },
    sam(c) { // shield with up arrow
      c.beginPath(); c.moveTo(0.5, 0.08); c.lineTo(0.86, 0.22); c.quadraticCurveTo(0.84, 0.7, 0.5, 0.92); c.quadraticCurveTo(0.16, 0.7, 0.14, 0.22); c.closePath(); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.moveTo(0.5, 0.26); c.lineTo(0.64, 0.46); c.lineTo(0.55, 0.46); c.lineTo(0.55, 0.72); c.lineTo(0.45, 0.72); c.lineTo(0.45, 0.46); c.lineTo(0.36, 0.46); c.closePath(); c.fill(); c.fillStyle = '#fff';
    },
    abm(c) { // shield with dome arc
      c.beginPath(); c.moveTo(0.5, 0.08); c.lineTo(0.86, 0.22); c.quadraticCurveTo(0.84, 0.7, 0.5, 0.92); c.quadraticCurveTo(0.16, 0.7, 0.14, 0.22); c.closePath(); c.fill();
      c.strokeStyle = '#000'; c.lineWidth = 0.08; c.beginPath(); c.arc(0.5, 0.62, 0.2, Math.PI, 0); c.stroke(); c.beginPath(); c.moveTo(0.5, 0.42); c.lineTo(0.5, 0.25); c.stroke(); c.strokeStyle = '#fff';
    },
    laser(c) {
      c.beginPath(); c.moveTo(0.5, 0.1); c.lineTo(0.72, 0.5); c.lineTo(0.5, 0.9); c.lineTo(0.28, 0.5); c.closePath(); c.fill();
      c.fillStyle = '#000'; c.beginPath(); c.arc(0.5, 0.5, 0.1, 0, 7); c.fill(); c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(0.5, 0.5); c.lineTo(0.95, 0.05); c.stroke();
    },
    aegis(c) { // hex net
      c.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const x = 0.5 + Math.cos(a) * 0.38, y = 0.5 + Math.sin(a) * 0.38; if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(0.17, 0.5); c.lineTo(0.83, 0.5); c.moveTo(0.33, 0.21); c.lineTo(0.67, 0.79); c.moveTo(0.67, 0.21); c.lineTo(0.33, 0.79); c.stroke();
    },
    warship(c) {
      c.beginPath(); c.moveTo(0.06, 0.58); c.lineTo(0.94, 0.58); c.lineTo(0.8, 0.8); c.lineTo(0.18, 0.8); c.closePath(); c.fill();
      c.fillRect(0.3, 0.42, 0.36, 0.14); c.fillRect(0.42, 0.26, 0.14, 0.16); c.fillRect(0.6, 0.36, 0.22, 0.04);
    },
    capital(c) {
      c.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const r = k % 2 ? 0.2 : 0.44; const x = 0.5 + Math.cos(a) * r, y = 0.52 + Math.sin(a) * r; if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.closePath(); c.fill();
    },
    // weapons
    jet(c) { c.beginPath(); c.moveTo(0.5, 0.06); c.lineTo(0.58, 0.36); c.lineTo(0.94, 0.56); c.lineTo(0.94, 0.64); c.lineTo(0.58, 0.56); c.lineTo(0.56, 0.78); c.lineTo(0.7, 0.9); c.lineTo(0.3, 0.9); c.lineTo(0.44, 0.78); c.lineTo(0.42, 0.56); c.lineTo(0.06, 0.64); c.lineTo(0.06, 0.56); c.lineTo(0.42, 0.36); c.closePath(); c.fill(); },
    tac(c) { G.silo(c); c.fillStyle = '#000'; c.beginPath(); c.arc(0.5, 0.48, 0.07, 0, 7); c.fill(); c.fillStyle = '#fff'; },
    hyp(c) { c.beginPath(); c.moveTo(0.94, 0.5); c.lineTo(0.5, 0.36); c.lineTo(0.12, 0.42); c.lineTo(0.2, 0.5); c.lineTo(0.12, 0.58); c.lineTo(0.5, 0.64); c.closePath(); c.fill(); c.fillRect(0.02, 0.47, 0.1, 0.06); },
    icbm(c) { G.silo(c); c.fillRect(0.26, 0.6, 0.48, 0.05); },
    mirv(c) { for (const [x, y] of [[0.5, 0.15], [0.25, 0.45], [0.75, 0.45], [0.35, 0.78], [0.65, 0.78]]) { c.beginPath(); c.moveTo(x, y - 0.1); c.lineTo(x + 0.07, y + 0.08); c.lineTo(x - 0.07, y + 0.08); c.closePath(); c.fill(); } },
    orbit(c) { c.beginPath(); c.ellipse(0.5, 0.42, 0.42, 0.16, -0.3, 0, 7); c.stroke(); c.beginPath(); c.arc(0.5, 0.42, 0.12, 0, 7); c.fill(); c.beginPath(); c.moveTo(0.5, 0.55); c.lineTo(0.5, 0.96); c.lineWidth = 0.1; c.stroke(); },
    emp(c) { c.beginPath(); c.moveTo(0.58, 0.04); c.lineTo(0.22, 0.54); c.lineTo(0.46, 0.54); c.lineTo(0.38, 0.96); c.lineTo(0.78, 0.4); c.lineTo(0.54, 0.4); c.closePath(); c.fill(); },
    nuke(c) { // trefoil
      c.beginPath(); c.arc(0.5, 0.5, 0.08, 0, 7); c.fill();
      for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 3; c.beginPath(); c.moveTo(0.5 + Math.cos(a - 0.5) * 0.14, 0.5 + Math.sin(a - 0.5) * 0.14); c.arc(0.5, 0.5, 0.42, a - 0.5, a + 0.5); c.arc(0.5, 0.5, 0.14, a + 0.5, a - 0.5, true); c.closePath(); c.fill(); }
    },
    troops(c) { c.beginPath(); c.arc(0.5, 0.42, 0.34, Math.PI, 0); c.lineTo(0.9, 0.56); c.lineTo(0.1, 0.56); c.closePath(); c.fill(); c.fillRect(0.3, 0.6, 0.4, 0.08); },
    flag(c) { c.fillRect(0.2, 0.1, 0.07, 0.8); c.beginPath(); c.moveTo(0.27, 0.12); c.lineTo(0.84, 0.28); c.lineTo(0.27, 0.48); c.closePath(); c.fill(); },
    coin(c) { c.beginPath(); c.ellipse(0.5, 0.36, 0.34, 0.14, 0, 0, 7); c.fill(); c.fillRect(0.16, 0.36, 0.68, 0.16); c.beginPath(); c.ellipse(0.5, 0.52, 0.34, 0.14, 0, 0, 7); c.fill(); c.fillRect(0.16, 0.52, 0.68, 0.16); c.beginPath(); c.ellipse(0.5, 0.68, 0.34, 0.14, 0, 0, 7); c.fill(); },
    bolt(c) { G.emp(c); },
    fire(c) { c.beginPath(); c.moveTo(0.5, 0.06); c.quadraticCurveTo(0.9, 0.5, 0.72, 0.8); c.quadraticCurveTo(0.5, 0.98, 0.28, 0.8); c.quadraticCurveTo(0.1, 0.5, 0.5, 0.06); c.fill(); },
    shield(c) { G.sam(c); },
    anchor(c) { G.port(c); },
    bunker(c) { c.beginPath(); c.arc(0.5, 0.72, 0.4, Math.PI, 0); c.fill(); c.fillStyle = '#000'; c.fillRect(0.4, 0.56, 0.2, 0.16); c.fillStyle = '#fff'; c.fillRect(0.06, 0.74, 0.88, 0.1); },
    gear(c) { c.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; const r = k % 2 ? 0.3 : 0.42; c.lineTo(0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(0.5, 0.5, 0.12, 0, 7); c.fill(); c.fillStyle = '#fff'; },
  };
  I.glyphs = G;

  I.drawGlyph = function (ctx, name, x, y, size, color) {
    const fn = G[name];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(size, size);
    ctx.fillStyle = color || '#fff'; ctx.strokeStyle = color || '#fff';
    ctx.lineWidth = 0.09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx);
    ctx.restore();
  };

  // glyph to data URL (cached) for HUD <img>
  const urlCache = new Map();
  I.url = function (name, color, px) {
    const key = name + '|' + (color || '') + '|' + (px || 32);
    if (urlCache.has(key)) return urlCache.get(key);
    const s = px || 32;
    const cv = document.createElement('canvas'); cv.width = s; cv.height = s;
    const ctx = cv.getContext('2d');
    // glyphs use clearRect/black cutouts — draw on transparent then mask black to transparent
    I.drawGlyph(ctx, name, s * 0.08, s * 0.08, s * 0.84, '#fff');
    const img = ctx.getImageData(0, 0, s, s); const d = img.data;
    const col = color ? MP.U.hex2rgb(color) : [255, 255, 255];
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i]; // white glyph → keep, black cutouts → transparent
      d[i + 3] = Math.round(d[i + 3] * (lum / 255));
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    }
    ctx.putImageData(img, 0, 0);
    const u = cv.toDataURL();
    urlCache.set(key, u);
    return u;
  };

  // map sprite: dark rounded tile with coloured frame + glyph (cached per type/colour/size)
  const spriteCache = new Map();
  I.sprite = function (name, rgb, px, opts) {
    const key = name + '|' + rgb.join(',') + '|' + px + '|' + (opts && opts.round ? 'r' : '');
    let cv = spriteCache.get(key);
    if (cv) return cv;
    const s = px, pad = 1;
    cv = document.createElement('canvas'); cv.width = s; cv.height = s;
    const c = cv.getContext('2d');
    const r = s * 0.22;
    c.beginPath();
    if (opts && opts.round) c.arc(s / 2, s / 2, s / 2 - pad, 0, 7);
    else if (c.roundRect) c.roundRect(pad, pad, s - pad * 2, s - pad * 2, r); else c.rect(pad, pad, s - pad * 2, s - pad * 2);
    c.fillStyle = 'rgba(14,13,10,0.92)'; c.fill();
    c.lineWidth = Math.max(1.2, s * 0.09); c.strokeStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; c.stroke();
    const g = document.createElement('canvas'); g.width = s; g.height = s;
    const gc = g.getContext('2d');
    gc.fillStyle = '#000'; gc.fillRect(0, 0, s, s);
    I.drawGlyph(gc, name, s * 0.22, s * 0.22, s * 0.56, '#fff');
    const id = gc.getImageData(0, 0, s, s); const d = id.data;
    for (let i = 0; i < d.length; i += 4) { d[i + 3] = d[i]; d[i] = 245; d[i + 1] = 240; d[i + 2] = 225; }
    gc.putImageData(id, 0, 0);
    c.drawImage(g, 0, 0);
    if (spriteCache.size > 3000) spriteCache.clear();
    spriteCache.set(key, cv);
    return cv;
  };

  I.svgIcon = function (name, color, px) {
    return `<img class="ico" src="${I.url(name, color, px || 32)}" alt="" draggable="false">`;
  };
})();
