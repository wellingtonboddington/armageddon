/* MIDNIGHT PROTOCOL — canvas renderer: cached terrain + incremental territory layer, overlays,
   units, missiles, effects, labels, minimap. Also MP.FX (visual effects API). */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const R = (MP.Render = {});
  let cv, ctx, DPR = 1, VW = 0, VH = 0;
  let terrainCv, terrCv, terrCtx, terrImg, terrData;
  let softCv, softCtx, softImg, softData, stripeCv, stripeCtx, stripePat;
  let dirtyFlag, dirtyList = [], dirtyCount = 0;
  const cam = { x: 1000, y: 470, z: 1, tx: null, ty: null, tz: null };
  R.cam = cam;
  R.hover = { t: -1, x: 0, y: 0, sx: 0, sy: 0, owner: 0 };
  const effects = [];
  let lastFrame = 0, timeNow = 0;
  let labelCursor = 1;
  let mini, miniCtx, miniT = 0;

  R.init = function (canvas, minimap) {
    cv = canvas; ctx = cv.getContext('2d', { alpha: false });
    mini = minimap; miniCtx = mini.getContext('2d');
    R.resize();
    window.addEventListener('resize', R.resize);
    R.buildTerrain();
    terrCv = document.createElement('canvas'); terrCv.width = World.W; terrCv.height = World.H;
    terrCtx = terrCv.getContext('2d');
    terrImg = terrCtx.createImageData(World.W, World.H);
    terrData = new Uint32Array(terrImg.data.buffer);
    softCv = document.createElement('canvas'); softCv.width = World.W; softCv.height = World.H;
    softCtx = softCv.getContext('2d');
    softImg = softCtx.createImageData(World.W, World.H);
    softData = new Uint32Array(softImg.data.buffer);
    stripeCv = document.createElement('canvas'); stripeCtx = stripeCv.getContext('2d');
    const pc = document.createElement('canvas'); pc.width = 10; pc.height = 10;
    const pcx = pc.getContext('2d');
    pcx.strokeStyle = '#fff'; pcx.lineWidth = 2.2;
    pcx.beginPath(); pcx.moveTo(-2, 12); pcx.lineTo(12, -2); pcx.moveTo(8, 12); pcx.lineTo(12, 8); pcx.moveTo(-2, 2); pcx.lineTo(2, -2); pcx.stroke();
    stripePat = stripeCtx.createPattern(pc, 'repeat');
    dirtyFlag = new Uint8Array(World.N);
    cam.z = R.minZoom() * 1.05;
  };

  // ---------------- adaptive quality (keeps every feature; trades resolution / refresh rates) ----------------
  const QUAL = {
    high: { dpr: 2, stripeEvery: 0, skip: 0, labels: 6 },
    balanced: { dpr: 1.5, stripeEvery: 0.18, skip: 0, labels: 4 },
    low: { dpr: 1, stripeEvery: 0.45, skip: 1, labels: 3 },
  };
  const ORDER = ['high', 'balanced', 'low'];
  R.quality = 'high';
  let frameEma = 16, badFor = 0, goodFor = 0, skipFlip = 0;
  R.setQuality = function (q) {
    if (!QUAL[q] || q === R.quality) return;
    R.quality = q; R.resize(); stripeAge = 99;
  };
  R.applyGfxSetting = function () {
    const s = MP.settings.get('gfx', 'auto');
    R.gfxMode = s;
    R.setQuality(s === 'auto' ? (R.quality || 'high') : s);
  };
  // called by the main loop with the real cost of the last frame (sim + render)
  R.reportFrame = function (ms, dt) {
    frameEma = frameEma * 0.92 + ms * 0.08;
    if (R.gfxMode !== 'auto') return;
    const i = ORDER.indexOf(R.quality);
    if (frameEma > 22) { badFor += dt; goodFor = 0; if (badFor > 2 && i < ORDER.length - 1) { badFor = 0; R.setQuality(ORDER[i + 1]); } }
    else if (frameEma < 9) { goodFor += dt; badFor = 0; if (goodFor > 12 && i > 0) { goodFor = 0; R.setQuality(ORDER[i - 1]); } }
    else { badFor = Math.max(0, badFor - dt); goodFor = 0; }
  };
  R.frameCost = () => frameEma;

  R.resize = function () {
    DPR = Math.min(QUAL[R.quality || 'high'].dpr, window.devicePixelRatio || 1);
    VW = window.innerWidth; VH = window.innerHeight;
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  };
  R.minZoom = () => Math.min(VW / World.W, VH / World.H) * 0.98;

  // ---------------- terrain (static) ----------------
  R.buildTerrain = function () {
    const W = World.W, H = World.H;
    terrainCv = document.createElement('canvas'); terrainCv.width = W; terrainCv.height = H;
    const tc = terrainCv.getContext('2d');
    const img = tc.createImageData(W, H); const d = img.data;
    const BIOME = [[62, 82, 46], [40, 66, 40], [122, 100, 64], [150, 156, 146]];
    const ELEV_TINT = [[0, 0, 0], [92, 70, 46], [120, 108, 96]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = x + y * W, i = t * 4;
      let r, g, b;
      if (World.land[t]) {
        const v = World.terr[t], bio = v & 3, el = v >> 2;
        let c = BIOME[bio];
        if (el) c = U.mix(c, ELEV_TINT[el], el === 1 ? 0.42 : 0.6);
        const n = U.vnoise(x * 0.35, y * 0.35, 5) * 0.16 + U.vnoise(x * 0.08, y * 0.08, 9) * 0.18 - 0.17;
        r = c[0] * (1 + n); g = c[1] * (1 + n); b = c[2] * (1 + n);
        r *= 0.72; g *= 0.72; b *= 0.72;
      } else {
        const wd = World.wdist[t];
        const lake = !World.ocean[t];
        const k = lake ? 0.9 : Math.max(0, 1 - Math.min(12, wd) / 12);
        r = 8 + 10 * k; g = 12 + 16 * k; b = 18 + 24 * k;
        if (lake) { r = 16; g = 26; b = 38; }
        const n = U.vnoise(x * 0.05, y * 0.05, 3) * 4;
        r += n; g += n; b += n;
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
    tc.putImageData(img, 0, 0);
    // graticule
    tc.strokeStyle = 'rgba(255,210,31,0.05)'; tc.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) { const [x] = World.toXY(lon, 0); tc.beginPath(); tc.moveTo(x + 0.5, 0); tc.lineTo(x + 0.5, H); tc.stroke(); }
    for (let lat = -60; lat <= 80; lat += 20) { const [, y] = World.toXY(0, lat); tc.beginPath(); tc.moveTo(0, y + 0.5); tc.lineTo(W, y + 0.5); tc.stroke(); }
  };

  // ---------------- territory layer ----------------
  R.resetMatch = function () {
    terrData.fill(0);
    terrCtx.putImageData(terrImg, 0, 0);
    softData.fill(0);
    softCtx.putImageData(softImg, 0, 0);
    dirtyFlag.fill(0); dirtyList = []; dirtyCount = 0;
    effects.length = 0;
    labelCursor = 1;
    R.selectedShip = null;
  };
  R.dirty = function (t) {
    if (dirtyFlag[t]) return;
    dirtyFlag[t] = 1; dirtyList.push(t);
  };

  const LE = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d;
  function pack(r, g, b, a) { return LE ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0; }

  function tileColor(t) {
    const S = G.S, o = S.owner[t];
    const W = World.W, x = t % W, y = (t / W) | 0;
    const soft = S.softUntil[t] > S.t;
    if (!o) {
      if (soft && World.land[t]) return pack(30, 18, 10, 150); // scorched / blasted
      return 0;
    }
    const n = S.nations[o];
    const c = n.color;
    if (G.isBorderTile(t, o)) {
      // bright border; slight lightening
      return pack(Math.min(255, c[0] + 55), Math.min(255, c[1] + 55), Math.min(255, c[2] + 55), 255);
    }
    let a = 105;
    let col = c;
    switch (n.pattern) {
      case 'hazard': if (((x + y) >> 2) & 1) { col = [20, 18, 12]; a = 70; } else a = 105; break;
      case 'grid': if (x % 6 === 0 || y % 6 === 0) a = 150; break;
      case 'dots': if (x % 4 === 0 && y % 4 === 0) a = 190; break;
      case 'chevron': if (((x + Math.abs((y % 8) - 4)) % 8) < 2) a = 160; break;
      case 'scan': if (y % 3 === 0) a = 140; break;
    }
    return pack(col[0], col[1], col[2], a);
  }

  function flushTerritory() {
    if (!dirtyList.length) return;
    const W = World.W;
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    const list = dirtyList; dirtyList = [];
    // chunked dirty rects to keep putImageData small
    const CH = 128;
    const chunks = new Map();
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      dirtyFlag[t] = 0;
      terrData[t] = tileColor(t);
      softData[t] = (G.S.owner[t] && G.S.softUntil[t] > G.S.t) ? 0xffffffff : 0;
      const x = t % W, y = (t / W) | 0;
      const k = ((y / CH) | 0) * 64 + ((x / CH) | 0);
      let r = chunks.get(k);
      if (!r) { r = [x, y, x, y]; chunks.set(k, r); }
      else { if (x < r[0]) r[0] = x; if (y < r[1]) r[1] = y; if (x > r[2]) r[2] = x; if (y > r[3]) r[3] = y; }
    }
    for (const r of chunks.values()) {
      terrCtx.putImageData(terrImg, 0, 0, r[0], r[1], r[2] - r[0] + 1, r[3] - r[1] + 1);
      softCtx.putImageData(softImg, 0, 0, r[0], r[1], r[2] - r[0] + 1, r[3] - r[1] + 1);
    }
  }
  R.redrawAll = function () {
    const S = G.S; if (!S) return;
    for (let t = 0; t < World.N; t++) if (S.owner[t] || S.softUntil[t]) R.dirty(t);
  };

  // ---------------- camera ----------------
  R.w2s = (x, y) => [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2];
  R.s2w = (sx, sy) => [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y];
  R.clampCam = function () {
    cam.z = U.clamp(cam.z, R.minZoom(), 42);
    const hw = VW / 2 / cam.z, hh = VH / 2 / cam.z;
    cam.x = World.W < hw * 2 ? World.W / 2 : U.clamp(cam.x, hw - 40, World.W - hw + 40);
    cam.y = World.H < hh * 2 ? World.H / 2 : U.clamp(cam.y, hh - 40, World.H - hh + 40);
  };
  R.zoomAt = function (sx, sy, f) {
    const [wx, wy] = R.s2w(sx, sy);
    cam.z *= f; R.clampCam();
    const [wx2, wy2] = R.s2w(sx, sy);
    cam.x += wx - wx2; cam.y += wy - wy2; R.clampCam();
    cam.tx = null;
  };
  R.pan = function (dx, dy) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; R.clampCam(); cam.tx = null; };
  R.centerOn = function (x, y, z) { cam.tx = x; cam.ty = y; cam.tz = z || Math.max(cam.z, 4); };
  R.focusWorld = function () { cam.x = World.W / 2; cam.y = World.H * 0.47; cam.z = R.minZoom() * 1.02; cam.tx = null; R.clampCam(); };
  R.getCamera = () => ({ x: cam.x, y: cam.y, z: cam.z });
  R.setCamera = (c) => { cam.x = c.x; cam.y = c.y; cam.z = c.z; cam.tx = null; R.clampCam(); };

  // ---------------- FX api ----------------
  const FX = (MP.FX = {});
  FX.burst = (x, y, col, n) => { for (let i = 0; i < (n || 6); i++) effects.push({ k: 'p', x, y, vx: U.R.range(-6, 6), vy: U.R.range(-6, 6), life: 0.8 + U.R() * 0.6, t: 0, col }); };
  FX.floatText = (x, y, text, col, sub) => effects.push({ k: 'txt', x, y, text, sub, col, t: 0, life: 2.6 });
  FX.coin = (x, y) => { if (effects.length < 900) effects.push({ k: 'coin', x, y, t: 0, life: 0.9 }); };
  FX.shot = (x1, y1, x2, y2) => effects.push({ k: 'shot', x1, y1, x2, y2, t: 0, life: 0.25 });
  FX.split = (x, y) => effects.push({ k: 'ring', x, y, r: 6, t: 0, life: 0.8, col: [255, 220, 120] });
  FX.interceptor = (x, y, m, hit) => {
    const [px, py] = MP.Weapons.pos(m);
    effects.push({ k: 'icpt', x1: x, y1: y, x2: px, y2: py, hit, t: 0, life: 0.7 });
    if (hit) effects.push({ k: 'ring', x: px, y: py, r: 5, t: 0, life: 0.6, col: [120, 230, 255] });
  };
  FX.detonation = (x, y, r, w, det) => {
    const dc = (C.DETONATIONS.find((d) => d.id === det) || C.DETONATIONS[0]).rgb;
    effects.push({ k: 'det', x, y, r, w, t: 0, life: w === 'Airstrike' ? 1.2 : 3.6, col: w === 'EMP' ? [120, 200, 255] : dc });
    if (w !== 'Airstrike' && w !== 'EMP') R.shake = Math.min(14, (R.shake || 0) + r * 0.35);
  };
  FX.ping = (x, y, col) => effects.push({ k: 'ping', x, y, t: 0, life: 2.2, col: col || [255, 210, 31] });
  R.ping = FX.ping;

  // ---------------- labels ----------------
  function updateLabels(n) {
    const S = G.S;
    const nn = S.nations.length;
    for (let k = 0; k < n; k++) {
      labelCursor = labelCursor % (nn - 1) + 1;
      const na = S.nations[labelCursor];
      if (!na || !na.alive || na.tiles <= 0) { if (na) na.label = null; continue; }
      const N = na.tiles;
      const mx = na.sx / N, my = na.sy / N;
      const cxx = na.sxx / N - mx * mx, cyy = na.syy / N - my * my, cxy = na.sxy / N - mx * my;
      const tr = cxx + cyy, det = cxx * cyy - cxy * cxy;
      const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const l2 = Math.max(0.5, tr - l1);
      let ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
      if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      ang = U.clamp(ang, -0.7, 0.7);
      const major = Math.sqrt(l1) * 3.2, minor = Math.sqrt(l2) * 3.2;
      let px = Math.round(mx), py = Math.round(my);
      const t = px + py * World.W;
      if (S.owner[t] !== na.id) { const u = G.nearestOwned(na.id, px, py, 40); if (u >= 0) { px = u % World.W; py = (u / World.W) | 0; } }
      const size = Math.max(1.2, Math.min(major / (na.name.length * 0.9 + 2), minor * 0.75, 40));
      na.label = { x: px, y: py, ang, size, major };
    }
  }

  // ---------------- main draw ----------------
  let stripeAge = 99, stripeCam = '';
  R.frame = function (dtReal) {
    timeNow += dtReal;
    const S = G.S;
    const Q = QUAL[R.quality || 'high'];
    if (Q.skip && cam.tx == null && !R.shake) { skipFlip = (skipFlip + 1) % (Q.skip + 1); if (skipFlip) return; }
    if (cam.tx != null) {
      const k = Math.min(1, dtReal * 4);
      cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.z += (cam.tz - cam.z) * k;
      if (Math.abs(cam.tx - cam.x) < 0.3 && Math.abs(cam.tz - cam.z) < 0.02) cam.tx = null;
      R.clampCam();
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    let shx = 0, shy = 0;
    if (R.shake > 0.1) { shx = U.R.range(-R.shake, R.shake); shy = U.R.range(-R.shake, R.shake); R.shake *= Math.pow(0.02, dtReal); }
    ctx.translate(shx, shy);
    ctx.fillStyle = '#060709'; ctx.fillRect(-20, -20, VW + 40, VH + 40);
    ctx.imageSmoothingEnabled = false;
    // visible world rect
    const [wx0, wy0] = R.s2w(0, 0), [wx1, wy1] = R.s2w(VW, VH);
    const sx0 = Math.max(0, Math.floor(wx0)), sy0 = Math.max(0, Math.floor(wy0));
    const sx1 = Math.min(World.W, Math.ceil(wx1)), sy1 = Math.min(World.H, Math.ceil(wy1));
    if (sx1 > sx0 && sy1 > sy0) {
      const [dx, dy] = R.w2s(sx0, sy0);
      const dw = (sx1 - sx0) * cam.z, dh = (sy1 - sy0) * cam.z;
      ctx.drawImage(terrainCv, sx0, sy0, sx1 - sx0, sy1 - sy0, dx, dy, dw, dh);
      if (S) {
        if (R.prof) { const t0 = performance.now(); flushTerritory(); R.prof.flush = (R.prof.flush || 0) + performance.now() - t0; } else flushTerritory();
        ctx.drawImage(terrCv, sx0, sy0, sx1 - sx0, sy1 - sy0, dx, dy, dw, dh);
        // fresh (soft) land: crisp screen-space hatching at every zoom level
        const bw = cv.width, bh = cv.height;
        const camKey = cam.x.toFixed(2) + '|' + cam.y.toFixed(2) + '|' + cam.z.toFixed(4) + '|' + bw + 'x' + bh;
        stripeAge += dtReal;
        if (camKey !== stripeCam || stripeAge >= Q.stripeEvery) {
          stripeCam = camKey; stripeAge = 0;
          if (stripeCv.width !== bw || stripeCv.height !== bh) { stripeCv.width = bw; stripeCv.height = bh; }
          stripeCtx.setTransform(1, 0, 0, 1, 0, 0);
          stripeCtx.globalCompositeOperation = 'source-over';
          stripeCtx.clearRect(0, 0, bw, bh);
          stripeCtx.imageSmoothingEnabled = false;
          stripeCtx.drawImage(softCv, sx0, sy0, sx1 - sx0, sy1 - sy0, dx * DPR, dy * DPR, dw * DPR, dh * DPR);
          stripeCtx.globalCompositeOperation = 'source-in';
          stripeCtx.fillStyle = stripePat;
          stripeCtx.fillRect(0, 0, bw, bh);
        }
        ctx.save(); ctx.setTransform(1, 0, 0, 1, shx * DPR, shy * DPR); ctx.globalAlpha = 0.22;
        ctx.drawImage(stripeCv, 0, 0);
        ctx.restore();
      }
    }
    // screen grid (tactical)
    drawGrid();
    if (!S) return;
    ctx.imageSmoothingEnabled = true;
    const P = R.prof;
    const T = P ? (k, fn) => { const t0 = performance.now(); fn(); P[k] = (P[k] || 0) + performance.now() - t0; } : (k, fn) => fn();
    T('labelsU', () => updateLabels(Q.labels));
    T('fallout', drawFallout);
    T('storms', () => drawStorms(true));
    T('roads', drawRoads);
    T('ranges', drawRanges);
    T('ally', drawAllyLines);
    T('deposits', drawDeposits);
    T('structs', drawStructs);
    T('convoys', drawConvoys);
    T('ships', drawShips);
    T('capitals', drawCapitals);
    T('divisions', drawDivisions);
    T('attacks', drawAttacks);
    T('missiles', drawMissiles);
    T('effects', () => drawEffects(dtReal));
    T('storms2', () => drawStorms(false));
    T('labels', drawLabels);
    T('cursor', drawCursor);
    miniT -= dtReal;
    T('mini', () => { if (miniT <= 0) { miniT = R.quality === 'high' ? 0.5 : 1; drawMinimap(); } drawMiniView(); });
  };

  function drawGrid() {
    const step = 100;
    ctx.strokeStyle = 'rgba(255,210,31,0.035)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const [a] = R.s2w(0, 0), [b] = R.s2w(VW, 0);
    for (let x = Math.floor(a / step) * step; x <= b; x += step) { const [sx] = R.w2s(x, 0); ctx.moveTo(Math.round(sx) + 0.5, 0); ctx.lineTo(Math.round(sx) + 0.5, VH); }
    const [, c] = R.s2w(0, 0), [, d] = R.s2w(0, VH);
    for (let y = Math.floor(c / step) * step; y <= d; y += step) { const [, sy] = R.w2s(0, y); ctx.moveTo(0, Math.round(sy) + 0.5); ctx.lineTo(VW, Math.round(sy) + 0.5); }
    ctx.stroke();
  }

  function onScreen(x, y, m) { const [sx, sy] = R.w2s(x, y); m = m || 40; return sx > -m && sy > -m && sx < VW + m && sy < VH + m; }

  function drawFallout() {
    const S = G.S;
    for (const f of S.fallout) {
      if (!onScreen(f.x, f.y, f.r * cam.z + 20)) continue;
      const [sx, sy] = R.w2s(f.x, f.y);
      const life = (f.until - S.t) / C.FALLOUT_SECONDS;
      const r = f.r * cam.z;
      const g = ctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
      const a = 0.28 * Math.min(1, life * 1.5) * (0.85 + 0.15 * Math.sin(timeNow * 3 + f.x));
      g.addColorStop(0, `rgba(190,255,60,${a})`); g.addColorStop(0.6, `rgba(150,200,40,${a * 0.6})`); g.addColorStop(1, 'rgba(120,160,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
      if (cam.z > 1.5) {
        ctx.strokeStyle = `rgba(200,255,80,${0.25 * life})`; ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  function drawStorms(under) {
    const S = G.S;
    for (const s of S.storms) {
      if (!onScreen(s.x, s.y, s.r * cam.z + 40)) continue;
      const [sx, sy] = R.w2s(s.x, s.y);
      const r = s.r * cam.z * s.k;
      if (under) {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, 'rgba(20,24,32,0.45)'); g.addColorStop(1, 'rgba(20,24,32,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill();
        continue;
      }
      ctx.save();
      ctx.globalAlpha = 0.5 * s.k;
      for (let k = 0; k < 7; k++) {
        const a = s.seed + k * 0.9 + timeNow * 0.08 * (k % 2 ? 1 : -1);
        const cx = sx + Math.cos(a) * r * 0.45, cy = sy + Math.sin(a) * r * 0.35;
        const rr = r * (0.35 + 0.12 * Math.sin(k * 3.1 + timeNow * 0.3));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, 'rgba(170,178,190,0.5)'); g.addColorStop(1, 'rgba(120,128,140,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill();
      }
      // rain
      ctx.strokeStyle = 'rgba(180,200,230,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k < 40; k++) {
        const h = U.hash2(k, s.id, 7), h2 = U.hash2(k, s.id, 9);
        const rx = sx + (h - 0.5) * r * 1.4, ry = sy + (((h2 + timeNow * 0.9) % 1) - 0.5) * r * 1.2;
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 9);
      }
      ctx.stroke();
      // lightning flicker
      if (U.hash2(Math.floor(timeNow * 3), s.id, 3) > 0.96) { ctx.fillStyle = 'rgba(255,255,220,0.15)'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.7, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawRoads() {
    const S = G.S;
    if (cam.z < 1.1) return;
    const p = G.player();
    const showOthers = cam.z >= 3;
    for (const r of S.roads) {
      const mine = p && (r.owner === p.id || G.isAllied(r.owner, p.id));
      if (!mine && !showOthers) continue;
      const [x1, y1] = R.w2s(r.x1, r.y1), [x2, y2] = R.w2s(r.x2, r.y2);
      if (Math.max(x1, x2) < -10 || Math.min(x1, x2) > VW + 10 || Math.max(y1, y2) < -10 || Math.min(y1, y2) > VH + 10) continue;
      const k = mine ? 1 : 0.4;
      if (r.kind === 'white') { ctx.strokeStyle = `rgba(240,238,225,${0.42 * k})`; ctx.lineWidth = U.clamp(cam.z * 0.3, 1.2, 3); }
      else { ctx.strokeStyle = `rgba(170,168,155,${0.3 * k})`; ctx.lineWidth = U.clamp(cam.z * 0.15, 0.8, 1.6); }
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }

  function circle(x, y, r, stroke, fill, dash) {
    const [sx, sy] = R.w2s(x, y);
    ctx.beginPath(); ctx.arc(sx, sy, r * cam.z, 0, 7);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]); }
  }

  function drawRanges() {
    const S = G.S, H = MP.HUD;
    const p = G.player();
    const mode = H && H.mode;
    if (mode && mode.kind === 'build' && R.hover.t >= 0) {
      const type = mode.type;
      const rangeOf = { factory: C.FACTORY_RANGE, hub: C.HUB_RANGE, fort: C.FORT_RADIUS, radar: C.DEFENSE.radar.range * (p ? G.mod(p, 'radarRange') : 1),
        sam: C.DEFENSE.sam.range, abm: C.DEFENSE.abm.range, laser: C.DEFENSE.laser.range, aegis: C.DEFENSE.aegis.range }[type];
      if (rangeOf) circle(R.hover.x + 0.5, R.hover.y + 0.5, rangeOf, 'rgba(255,240,200,0.55)', 'rgba(255,240,200,0.04)');
      // highlight upgrade targets of this type
      if (p) for (const s of p.st[type] || []) {
        const [sx, sy] = R.w2s(s.x, s.y);
        const hs = Math.max(14, cam.z * 5);
        ctx.fillStyle = 'rgba(255,210,31,0.12)'; ctx.strokeStyle = 'rgba(255,210,31,0.55)'; ctx.lineWidth = 1;
        ctx.fillRect(sx - hs, sy - hs, hs * 2, hs * 2); ctx.strokeRect(sx - hs, sy - hs, hs * 2, hs * 2);
      }
      if (type === 'enrich') for (const d of World.deposits) if (!d.plant && p && S.owner[d.tile] === p.id) circle(d.x, d.y, 6, 'rgba(255,210,31,0.8)', 'rgba(255,210,31,0.1)');
    }
    if (mode && mode.kind === 'weapon' && R.hover.t >= 0) {
      const def = C.WEAPON[mode.w];
      const hx = R.hover.wx, hy = R.hover.wy;
      circle(hx, hy, def.radius, 'rgba(255,68,51,0.9)', 'rgba(255,68,51,0.12)');
      if (mode.w === 'MIRV') circle(hx, hy, def.spread + def.radius, 'rgba(255,68,51,0.5)', null, [4, 4]);
      // range of launchers
      if (p && def.range) {
        const ls = def.from === 'silo' ? p.st.silo : p.st.city;
        for (const s of ls) circle(s.x, s.y, def.range, 'rgba(255,210,31,0.18)', null, [2, 6]);
      }
    }
    // hovering one of our structures: show its range
    const hs = R.hoverStruct;
    if (hs && !mode) {
      const rr = hs.type === 'fort' ? C.FORT_RADIUS * Math.pow(2, hs.level - 1) : hs.type === 'factory' ? C.FACTORY_RANGE : hs.type === 'hub' ? C.HUB_RANGE :
        C.DEFENSE[hs.type] ? (C.DEFENSE[hs.type].range * (hs.type === 'radar' ? (1 + 0.25 * (hs.level - 1)) * G.mod(S.nations[hs.owner], 'radarRange') : 1)) : 0;
      if (rr) circle(hs.x, hs.y, rr, 'rgba(255,240,200,0.5)', 'rgba(255,240,200,0.03)');
    }
    // radar rings (player) — subtle sweep
    if (p && p.alive && cam.z > 0.8) {
      for (const r of p.st.radar) {
        if (!G.isActive(r)) continue;
        const rr = C.DEFENSE.radar.range * G.mod(p, 'radarRange') * (1 + 0.25 * (r.level - 1));
        const [sx, sy] = R.w2s(r.x, r.y);
        const a = (timeNow * 1.4 + r.id) % (Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,210,31,0.10)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, sy, rr * cam.z, 0, 7); ctx.stroke();
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr * cam.z);
        g.addColorStop(0, 'rgba(255,210,31,0.10)'); g.addColorStop(1, 'rgba(255,210,31,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, rr * cam.z, a - 0.5, a); ctx.closePath(); ctx.fill();
      }
    }
  }

  function nationCenter(n) { if (n.label) return [n.label.x, n.label.y]; if (n.tiles) return [n.sx / n.tiles, n.sy / n.tiles]; return [n.capX, n.capY]; }

  function drawAllyLines() {
    const S = G.S;
    const o = R.hover.owner;
    if (!o) return;
    const n = S.nations[o];
    if (!n || !n.alive) return;
    const allies = [];
    for (const a of n.allies) if (S.nations[a] && S.nations[a].alive) allies.push(S.nations[a]);
    if (n.team) for (const m of S.nations) if (m && m.alive && m.id !== n.id && m.team === n.team && !allies.includes(m)) allies.push(m);
    if (!allies.length) return;
    const [ax, ay] = nationCenter(n);
    const [sx, sy] = R.w2s(ax, ay);
    ctx.strokeStyle = 'rgba(62,230,255,0.85)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (const m of allies) { const [bx, by] = nationCenter(m); const [tx, ty] = R.w2s(bx, by); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); }
    ctx.stroke();
  }

  function drawDeposits() {
    if (cam.z < 0.9) return;
    const S = G.S;
    const size = U.clamp(cam.z * 3.2, 9, 18);
    for (const d of World.deposits) {
      if (d.plant) continue;
      if (!onScreen(d.x, d.y)) continue;
      const [sx, sy] = R.w2s(d.x + 0.5, d.y + 0.5);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(10,10,8,0.65)'; ctx.beginPath(); ctx.arc(sx, sy, size * 0.62, 0, 7); ctx.fill();
      MP.Icons.drawGlyph(ctx, 'nuke', sx - size / 2, sy - size / 2, size, S.owner[d.tile] ? '#ffd21f' : '#c9a516');
      ctx.globalAlpha = 1;
    }
  }

  function drawStructs() {
    const S = G.S;
    const p = G.player();
    const base = U.clamp(cam.z * 3.6, 9, 24);
    R.hoverStruct = null;
    for (const s of S.structs) {
      if (!onScreen(s.x, s.y)) continue;
      const big = s.type === 'city' || s.type === 'silo' || s.type === 'port';
      const mine = p && (s.owner === p.id || G.isAllied(s.owner, p.id));
      if (mine) { if (cam.z < 0.9 && !big) continue; if (cam.z < 0.55) continue; }
      else { if (cam.z < (big ? 1.7 : 2.6)) continue; }
      const n = S.nations[s.owner];
      const size = Math.round(base * (s.type === 'city' ? 1.05 : 0.92));
      const [sx, sy] = R.w2s(s.x + 0.5, s.y + 0.5);
      const glyph = { city: 'city', port: 'port', factory: 'factory', hub: 'hub', enrich: 'enrich', fort: 'fort', silo: 'silo', radar: 'radar', sam: 'sam', abm: 'abm', laser: 'laser', aegis: 'aegis' }[s.type];
      const spr = MP.Icons.sprite(glyph, n.color, Math.max(12, Math.round(size * DPR)));
      ctx.globalAlpha = s.build > 0 ? 0.55 : (s.disabledUntil > S.t ? 0.4 + 0.3 * Math.sin(timeNow * 20) : 1);
      ctx.drawImage(spr, sx - size / 2, sy - size / 2, size, size);
      ctx.globalAlpha = 1;
      if (s.build > 0 && s.buildMax) {
        ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, size * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - s.build / s.buildMax)); ctx.stroke();
      }
      if (s.level > 1 && cam.z > 1.4) {
        ctx.fillStyle = '#ffd21f'; ctx.font = `bold ${Math.max(8, size * 0.38)}px ${MP.FONT_MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(s.level, sx + size * 0.36, sy - size * 0.62);
      }
      if (s.type === 'silo' && n === p && s.ready > 0 && s.build <= 0) {
        ctx.fillStyle = '#ff4433'; ctx.beginPath(); ctx.arc(sx + size * 0.45, sy + size * 0.45, 3, 0, 7); ctx.fill();
      }
      if (Math.abs(R.hover.sx - sx) < size / 2 && Math.abs(R.hover.sy - sy) < size / 2) R.hoverStruct = s;
    }
  }

  function drawConvoys() {
    if (cam.z < 1.3) return;
    const S = G.S;
    const sz = Math.max(2, cam.z * 0.7);
    for (const cv2 of S.convoys) {
      if (cv2.x == null || !onScreen(cv2.x, cv2.y, 5)) continue;
      const [sx, sy] = R.w2s(cv2.x + 0.5, cv2.y + 0.5);
      ctx.fillStyle = cv2.back ? 'rgba(255,90,60,0.9)' : (cv2.viaHub ? 'rgba(255,236,170,0.95)' : 'rgba(255,196,60,0.9)');
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
    }
  }

  function drawShip(sh, sx, sy, col, scale) {
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(sh.ang || 0); ctx.scale(scale, scale);
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 0.15;
    ctx.beginPath();
    if (sh.kind === 'warship') { ctx.moveTo(1.4, 0); ctx.lineTo(0.5, -0.55); ctx.lineTo(-1.1, -0.5); ctx.lineTo(-1.1, 0.5); ctx.lineTo(0.5, 0.55); }
    else if (sh.kind === 'transport') { ctx.moveTo(1, 0); ctx.lineTo(0.4, -0.5); ctx.lineTo(-0.9, -0.5); ctx.lineTo(-0.9, 0.5); ctx.lineTo(0.4, 0.5); }
    else { ctx.moveTo(0.8, 0); ctx.lineTo(0.2, -0.38); ctx.lineTo(-0.7, -0.38); ctx.lineTo(-0.7, 0.38); ctx.lineTo(0.2, 0.38); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (sh.kind === 'warship') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-0.4, -0.22, 0.6, 0.44); }
    ctx.restore();
  }

  function drawShips() {
    const S = G.S, p = G.player();
    for (const sh of S.ships) {
      if (sh.kind === 'trade' && cam.z < 1.2) continue;
      if (!onScreen(sh.x, sh.y, 30)) { if (sh.kind !== 'transport') continue; }
      const n = S.nations[sh.owner];
      const [sx, sy] = R.w2s(sh.x, sh.y);
      const sc = sh.kind === 'warship' ? U.clamp(cam.z * 2.2, 5, 14) : sh.kind === 'transport' ? U.clamp(cam.z * 2, 5, 12) : U.clamp(cam.z * 1.6, 3, 9);
      if (sh.kind === 'transport') {
        // dotted path to landing; red reticle if it targets the player or allies
        const lx = sh.landing % World.W, ly = (sh.landing / World.W) | 0;
        const hostileToUs = p && (sh.target === p.id || (sh.target && G.isAllied(sh.target, p.id) && sh.owner !== p.id));
        if (sh.owner === p?.id || hostileToUs) {
          ctx.fillStyle = hostileToUs ? 'rgba(255,68,51,0.8)' : 'rgba(255,210,31,0.7)';
          let px = sh.x, py = sh.y;
          const pts = [[sh.x, sh.y]].concat(sh.path.slice(sh.pi));
          for (let k = 1; k < pts.length; k++) {
            const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
            const len = Math.hypot(bx - ax, by - ay);
            for (let d = 0; d < len; d += 4) { const [qx, qy] = R.w2s(ax + (bx - ax) * d / len, ay + (by - ay) * d / len); ctx.fillRect(qx - 1, qy - 1, 2, 2); }
            px = bx; py = by;
          }
          const [rx, ry] = R.w2s(lx + 0.5, ly + 0.5);
          ctx.strokeStyle = hostileToUs ? '#ff4433' : '#ffd21f'; ctx.lineWidth = 1.5;
          const pr = 8 + 3 * Math.sin(timeNow * 6);
          ctx.beginPath(); ctx.arc(rx, ry, pr, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.arc(rx, ry, pr * 2.2, 0, 7); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(rx - 4, ry); ctx.lineTo(rx + 4, ry); ctx.moveTo(rx, ry - 4); ctx.lineTo(rx, ry + 4); ctx.stroke();
        }
      }
      if (!onScreen(sh.x, sh.y, 30)) continue;
      const col = sh.state === 'building' ? 'rgba(150,150,150,0.6)' : U.rgb(n.color);
      drawShip(sh, sx, sy, col, sc);
      if (sh.kind !== 'trade' && sh.hp < sh.maxHp) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 10, sy - sc - 6, 20, 3);
        ctx.fillStyle = '#ff4433'; ctx.fillRect(sx - 10, sy - sc - 6, 20 * sh.hp / sh.maxHp, 3);
      }
      if (sh.kind === 'transport' && cam.z > 1.5 && p && (sh.owner === p.id || sh.target === p.id)) {
        ctx.font = `bold 10px ${MP.FONT_MONO}`; ctx.fillStyle = '#ece6cf'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(U.fmtK(sh.troops), sx, sy - sc);
      }
      if (sh === R.selectedShip) { ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, sc * 1.6, 0, 7); ctx.stroke(); circle(sh.patrolX, sh.patrolY, C.WARSHIP.patrol * 0.6, 'rgba(255,210,31,0.4)', null, [3, 5]); }
      if (sh.kind === 'warship' && sh.owner === p?.id) sh._sx = sx, sh._sy = sy;
    }
  }

  function drawCapitals() {
    const S = G.S, p = G.player();
    if (cam.z < 0.7) return;
    for (const n of S.nations) {
      if (!n || !n.alive || n.capital < 0) continue;
      if (!onScreen(n.capX, n.capY)) continue;
      const [sx, sy] = R.w2s(n.capX + 0.5, n.capY + 0.5);
      const sz = U.clamp(cam.z * 4.5, 12, 26);
      if (n === p) {
        ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, sz * 0.75 + Math.sin(timeNow * 3) * 1.5, 0, 7); ctx.stroke();
      }
      const spr = MP.Icons.sprite('capital', n === p ? [255, 210, 31] : n.color, Math.round(sz * DPR), { round: true });
      ctx.drawImage(spr, sx - sz / 2, sy - sz / 2, sz, sz);
      // chevron marker above enemy capital at war with us
      if (p && n !== p && n.wars.has(p.id)) {
        ctx.fillStyle = '#ff4433';
        ctx.beginPath(); ctx.moveTo(sx - 6, sy - sz * 0.9 - 6); ctx.lineTo(sx, sy - sz * 0.9); ctx.lineTo(sx + 6, sy - sz * 0.9 - 6); ctx.lineTo(sx + 6, sy - sz * 0.9 - 3); ctx.lineTo(sx, sy - sz * 0.9 + 3); ctx.lineTo(sx - 6, sy - sz * 0.9 - 3); ctx.fill();
      }
    }
  }

  // divisions: few, big flags on the line (infantry with artillery/drones, armour with tanks/motorised).
  // Divisions that sit on top of each other on screen merge into one stack marker (×N) so the line stays readable.
  function drawDivisions() {
    const S = G.S, p = G.player();
    if (!MP.Div) return;
    const fw = U.clamp(cam.z * 7, 24, 40), fh = Math.round(fw * 0.66);
    const plan = p && p.divPlan;
    const vis = [];
    for (const n of S.nations) {
      if (!n || !n.alive || !n.divs || !n.divs.length) continue;
      for (const d of n.divs) {
        d._sx = null;
        if (!MP.Div.visibleTo(d, p)) continue;
        if (!onScreen(d.x, d.y, 50)) continue;
        const [sx, sy] = R.w2s(d.x, d.y);
        d._sx = sx; d._sy = sy;
        vis.push(d);
      }
    }
    // supply lines from factory / hub while planning
    if (plan) for (const d of vis) {
      if (d.owner !== p.id || !d.src) continue;
      const [ax, ay] = R.w2s(d.src.x, d.src.y);
      ctx.strokeStyle = 'rgba(255,210,31,0.28)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(d._sx, d._sy); ctx.stroke(); ctx.setLineDash([]);
    }
    // screen-space clustering per owner
    const groups = [];
    const near = fw * 0.85;
    for (const d of vis) {
      let g = null;
      for (const q of groups) if (q.owner === d.owner && Math.abs(q.sx - d._sx) < near && Math.abs(q.sy - d._sy) < near * 0.8) { g = q; break; }
      if (!g) { g = { owner: d.owner, sx: d._sx, sy: d._sy, list: [] }; groups.push(g); }
      g.list.push(d);
    }
    for (const g of groups) {
      const n = S.nations[g.owner];
      const flag = MP.Flags.canvas(n.flag, 60, 40);
      const mine = p && n.id === p.id;
      const list = g.list, lead = list[0];
      const sx = g.sx, sy = g.sy;
      const size = list.reduce((a, d) => a + d.size, 0);
      const arm = list.filter((d) => d.type === 'arm').length;
      const trained = list.every((d) => d.trainedFull), unsup = list.some((d) => !d.supplied);
      const fx = sx - fw / 2, fy = sy - fh - 8;
      // stacked flags peek out behind the lead one
      for (let k = Math.min(2, list.length - 1); k >= 1; k--) { ctx.globalAlpha = 0.7; ctx.drawImage(flag, fx + k * 4, fy - k * 4, fw, fh); ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(10,10,8,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(fx + k * 4 + 0.5, fy - k * 4 + 0.5, fw - 1, fh - 1); }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(fx + 2, fy + 2, fw, fh);
      ctx.fillStyle = '#d8d2bc'; ctx.fillRect(sx - 1, fy, 2, fh + 8);
      ctx.drawImage(flag, fx, fy, fw, fh);
      ctx.lineWidth = trained ? 2 : 1;
      ctx.strokeStyle = trained ? '#ffd21f' : unsup ? '#ff4433' : 'rgba(10,10,8,0.9)';
      if (unsup && !trained) ctx.setLineDash([3, 2]);
      ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1); ctx.setLineDash([]);
      if (list.length > 1) {
        ctx.font = `bold 10px ${MP.FONT_MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0a0a08'; ctx.fillRect(fx + fw - 6, fy - 6, 16, 12); ctx.fillStyle = '#ffd21f'; ctx.fillText('×' + list.length, fx + fw + 2, fy);
      }
      // type badge + strength
      const label = U.fmtK(size);
      ctx.font = `bold ${Math.round(U.clamp(fw * 0.34, 9, 13))}px ${MP.FONT_MONO}`;
      const tw = ctx.measureText(label).width, bh = Math.round(U.clamp(fw * 0.42, 11, 16));
      const icons = (arm ? 1 : 0) + (arm < list.length ? 1 : 0);
      const bw = bh * icons + tw + 8, bx = sx - bw / 2, by = sy - 6;
      ctx.fillStyle = 'rgba(10,10,8,0.88)'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = mine ? '#ffd21f' : U.rgb(n.color); ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
      let ix = bx + 2;
      if (arm) { MP.Icons.drawGlyph(ctx, 'tank', ix, by + 1, bh - 2, '#ffb000'); ix += bh; }
      if (arm < list.length) { MP.Icons.drawGlyph(ctx, lead.gear === 'drones' ? 'drone' : 'gun', ix, by + 1, bh - 2, '#ece6cf'); ix += bh; }
      ctx.fillStyle = '#ece6cf'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, ix + 2, by + bh / 2 + 0.5);
      const tr = list.find((d) => d.training);
      if (tr) { ctx.strokeStyle = '#3ee6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, fy + fh / 2, fw * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * tr.trained); ctx.stroke(); }
      if (list.some((d) => d.sel)) { ctx.strokeStyle = '#ffd21f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, fy + fh / 2, fw * 0.75 + Math.sin(timeNow * 6) * 2, 0, 7); ctx.stroke(); }
      for (const d of list) { d._sx = sx; d._sy = sy; }
    }
  }

  function pill(sx, sy, text, fg, bg, border) {
    ctx.font = `bold 11px ${MP.FONT_MONO}`;
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 1;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(sx - w / 2, sy - 9, w, 18, 9); else ctx.rect(sx - w / 2, sy - 9, w, 18);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, sx, sy + 0.5);
  }

  // front-line geometry (centre, along-front angle, normal pointing at the attacker), cached briefly.
  // With a clicked point of main effort, the geometry follows the part of the front nearest to it.
  function frontGeom(at) {
    if (at._g && timeNow - at._g.t < 0.35 && at._g.z === cam.z) return at._g;
    const S = G.S, W = World.W, f = at.front;
    if (!f.length) return null;
    const step = Math.max(1, Math.floor(f.length / 240));
    let pts = [];
    for (let i = 0; i < f.length; i += step) { const t = f[i]; pts.push([t % W, (t / W) | 0]); }
    if (at.fx != null && at.press > 0.1 && pts.length > 12) {
      pts.sort((a, b) => ((a[0] - at.fx) ** 2 + (a[1] - at.fy) ** 2) - ((b[0] - at.fx) ** 2 + (b[1] - at.fy) ** 2));
      pts = pts.slice(0, Math.max(10, Math.round(pts.length * 0.4)));
    }
    let mx = 0, my = 0;
    for (const q of pts) { mx += q[0]; my += q[1]; }
    const c = pts.length; mx /= c; my /= c;
    let cxx = 0, cyy = 0, cxy = 0;
    for (const q of pts) { const dx = q[0] - mx, dy = q[1] - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    const ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const a = S.nations[at.from];
    let nx = -Math.sin(ang), ny = Math.cos(ang);
    // point the normal at the attacker using local ownership, not the (possibly far) centroid
    const probe = (k) => { const x = Math.round(mx + nx * k), y = Math.round(my + ny * k); return x >= 0 && y >= 0 && x < W && y < World.H ? S.owner[x + y * W] : -1; };
    let sA = 0; for (let k = 1; k <= 6; k++) { if (probe(k) === at.from) sA++; if (probe(-k) === at.from) sA--; }
    if (sA < 0 || (sA === 0 && a && a.tiles && ((a.sx / a.tiles - mx) * nx + (a.sy / a.tiles - my) * ny) < 0)) { nx = -nx; ny = -ny; }
    let la = ang; if (la > Math.PI / 2) la -= Math.PI; if (la < -Math.PI / 2) la += Math.PI;
    at._g = { t: timeNow, z: cam.z, x: mx, y: my, ang: la, nx, ny, fits: {} };
    return at._g;
  }

  // find a spot where the whole number sits inside `owner`'s land (never spilling over the border)
  function fitInside(g, side, owner, text, px) {
    const key = side + '|' + text.length + '|' + Math.round(px);
    if (g.fits[key] !== undefined) return g.fits[key];
    const S = G.S, W = World.W;
    ctx.font = `800 ${px}px ${MP.FONT_HEAD}`;
    const wT = ctx.measureText(text).width / cam.z + 1, hT = px / cam.z + 0.6;
    const ux = Math.cos(g.ang), uy = Math.sin(g.ang), vx = -uy, vy = ux;
    const nx = g.nx * side, ny = g.ny * side;
    const inside = (cx, cy) => {
      for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j += 2) {
        const x = Math.round(cx + ux * wT * 0.25 * i + vx * hT * 0.5 * j), y = Math.round(cy + uy * wT * 0.25 * i + vy * hT * 0.5 * j);
        if (x < 0 || y < 0 || x >= W || y >= World.H || S.owner[x + y * W] !== owner) return false;
      }
      return true;
    };
    let res = null;
    const d0 = hT * 0.55 + 0.8;
    outer: for (let d = d0; d < d0 + 40; d += Math.max(0.8, hT * 0.25)) {
      for (const sh of [0, 0.6, -0.6, 1.2, -1.2]) {
        const cx = g.x + nx * d + ux * wT * sh, cy = g.y + ny * d + uy * wT * sh;
        if (inside(cx, cy)) { res = [cx, cy]; break outer; }
      }
    }
    g.fits[key] = res;
    return res;
  }

  function frontNumber(x, y, ang, text, px, fill, accent) {
    const [sx, sy] = R.w2s(x, y);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(ang);
    ctx.font = `800 ${px}px ${MP.FONT_HEAD}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4,4,3,0.85)'; ctx.lineWidth = Math.max(3, px * 0.22);
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
    if (accent) { const w = ctx.measureText(text).width; ctx.fillStyle = accent; ctx.fillRect(-w / 2, px * 0.5, w, Math.max(1.5, px * 0.08)); }
    ctx.restore();
  }
  function placeNumber(g, side, owner, text, px, fill, accent) {
    let pos = fitInside(g, side, owner, text, px), size = px;
    if (!pos) { size = px * 0.72; pos = fitInside(g, side, owner, text, size); }
    if (pos) frontNumber(pos[0], pos[1], g.ang, text, size, fill, accent);
  }

  function drawAttacks() {
    const S = G.S, p = G.player();
    const fs = U.clamp(cam.z * 4.2, 11, 22);
    for (const at of S.attacks) {
      if (at.done || !at.front.length) continue;
      const mine = p && at.from === p.id, onUs = p && at.to === p.id;
      const watch = !p || S.opts.mode === 'watch';
      if (!mine && !onUs && (cam.z < (watch ? 1.0 : 2.2) || at.troops < 2500)) continue;
      const g = frontGeom(at);
      if (!g || !onScreen(g.x, g.y, 80)) continue;
      if (onUs) {
        ctx.fillStyle = 'rgba(255,68,51,0.35)';
        const sz = Math.max(2, cam.z);
        for (let i = 0; i < at.front.length; i += Math.max(1, Math.floor(at.front.length / 300))) {
          const t = at.front[i]; const [fx, fy] = R.w2s(t % World.W, (t / World.W) | 0); ctx.fillRect(fx, fy, sz, sz);
        }
      }
      const an = S.nations[at.from], dn = at.to ? S.nations[at.to] : null;
      // the attacker's committed troops — strictly inside the attacker's land, where the effort is concentrated
      placeNumber(g, 1, at.from, U.fmtInt(at.troops), fs, onUs ? '#ffc2b8' : '#ffffff', an ? U.rgb(an.color) : null);
      // defenders show a number only once they commit troops — strictly inside the defender's land
      if (dn && at.def > 0) placeNumber(g, -1, at.to, U.fmtInt(at.def), fs * 0.92, mine ? '#ffc2b8' : '#ffffff', U.rgb(dn.color));
    }
    // alien landfall marker
    if (S.alienId && S.alienRevealed && !S.alienLanded) {
      const ax = S.alienSite % World.W, ay = (S.alienSite / World.W) | 0;
      const [sx, sy] = R.w2s(ax, ay);
      const r = 34 * cam.z, k = 0.5 + 0.5 * Math.sin(timeNow * 6);
      ctx.save(); ctx.strokeStyle = `rgba(125,255,90,${0.5 + 0.4 * k})`; ctx.lineWidth = 2.5; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -timeNow * 30;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(sx - r * 0.3, sy); ctx.lineTo(sx + r * 0.3, sy); ctx.moveTo(sx, sy - r * 0.3); ctx.lineTo(sx, sy + r * 0.3); ctx.stroke();
      ctx.font = `800 14px ${MP.FONT_HEAD}`; ctx.textAlign = 'center'; ctx.fillStyle = '#7dff5a'; ctx.fillText('PROJECTED LANDFALL · ' + Math.max(0, Math.ceil(S.alienLeft || 0)) + 's', sx, sy - r - 8);
      ctx.restore();
    }
    // breakout zones (Call for the Motherland)
    if (S.tempForts) for (const tf of S.tempForts) {
      if (!onScreen(tf.x, tf.y, tf.r * cam.z + 20)) continue;
      const [sx, sy] = R.w2s(tf.x, tf.y);
      ctx.save(); ctx.strokeStyle = 'rgba(255,210,31,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = timeNow * 10;
      ctx.beginPath(); ctx.arc(sx, sy, tf.r * cam.z, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (p && S.ghostForts && S.ghostForts.size && cam.z > 1.5) for (const [t, gf] of S.ghostForts) {
      if (gf.owner !== p.id) continue;
      const x = t % World.W, y = (t / World.W) | 0;
      if (!onScreen(x, y)) continue;
      const [sx, sy] = R.w2s(x + 0.5, y + 0.5);
      ctx.globalAlpha = 0.45; MP.Icons.drawGlyph(ctx, 'fort', sx - 7, sy - 7, 14, '#c9b88a'); ctx.globalAlpha = 1;
    }
    // encircled pockets
    if (S.pockets) for (const pk of S.pockets) {
      const inv = p && (pk.nation === p.id || pk.by === p.id);
      if (!inv && cam.z < 1.3) continue;
      if (!onScreen(pk.x, pk.y)) continue;
      const [sx, sy] = R.w2s(pk.x, pk.y);
      const r = Math.max(8, Math.sqrt(pk.size) * cam.z * 0.6);
      ctx.save();
      ctx.strokeStyle = pk.nation === p?.id ? 'rgba(255,68,51,0.9)' : 'rgba(236,230,207,0.85)'; ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]); ctx.lineDashOffset = -timeNow * 12;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      ctx.font = `700 ${U.clamp(fs * 0.8, 10, 17)}px ${MP.FONT_HEAD}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
      const txt = U.fmtInt(pk.troops) + (pk.breakout ? ' Breaking Out' : ' Encircled');
      ctx.strokeStyle = 'rgba(4,4,3,0.85)'; ctx.lineWidth = 3; ctx.strokeText(txt, sx, sy - r - 3);
      ctx.fillStyle = pk.nation === p?.id ? '#ff8a7a' : 'rgba(236,230,207,0.92)'; ctx.fillText(txt, sx, sy - r - 3);
    }
  }

  function drawMissiles() {
    const S = G.S, p = G.player();
    for (const m of S.missiles) {
      const visible = !p || m.owner === p.id || m.seen || m.target === p.id || G.isAllied(m.owner, p.id) || S.opts.mode === 'watch' || m.orbital;
      if (!visible) continue;
      const own = p && m.owner === p.id;
      const hostile = p && m.target === p.id;
      const col = hostile ? [255, 68, 51] : own ? [255, 210, 31] : [255, 170, 120];
      if (m.orbital) {
        const k = m.t / m.T;
        const [sx, sy] = R.w2s(m.x1, m.y1);
        ctx.strokeStyle = `rgba(255,230,160,${0.25 + 0.6 * k})`; ctx.lineWidth = 1 + k * 5;
        ctx.beginPath(); ctx.moveTo(sx, sy - VH); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.strokeStyle = `rgba(255,68,51,${0.5 + 0.5 * Math.sin(timeNow * 20)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, C.WEAPON.Orbital.radius * cam.z * (1.2 - k * 0.4), 0, 7); ctx.stroke();
        continue;
      }
      // trail
      const f = Math.min(1, m.t / m.T);
      const lift = m.liftFrom || 0;
      const pt = (ff) => {
        const x = m.x0 + (m.x1 - m.x0) * ff, y = m.y0 + (m.y1 - m.y0) * ff;
        const len = Math.hypot(m.x1 - m.x0, m.y1 - m.y0);
        const h = (m.arc || 0) * len * 4 * ff * (1 - ff) + lift * (1 - ff);
        return R.w2s(x, y - h);
      };
      ctx.lineWidth = m.style === 'ghost' ? 1 : 1.6;
      const seg = 24;
      const start = m.style === 'comet' ? Math.max(0, f - 0.25) : 0;
      ctx.beginPath();
      for (let k = 0; k <= seg; k++) {
        const ff = start + (f - start) * k / seg;
        const [x, y] = pt(ff);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      const grad = U.rgb(col, m.style === 'ghost' ? 0.35 : 0.75);
      ctx.strokeStyle = grad;
      if (m.style === 'tracer') ctx.setLineDash([6, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      // projected remainder (dashed) for our/hostile missiles
      if (own || hostile) {
        ctx.beginPath();
        for (let k = 0; k <= 16; k++) { const ff = f + (1 - f) * k / 16; const [x, y] = pt(ff); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.strokeStyle = U.rgb(col, 0.25); ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
        const [tx, ty] = R.w2s(m.x1, m.y1);
        ctx.strokeStyle = U.rgb(col, 0.5 + 0.4 * Math.sin(timeNow * 8)); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(tx, ty, (C.WEAPON[m.w].radius) * cam.z, 0, 7); ctx.stroke();
      }
      const [hx, hy] = pt(f);
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 7);
      g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.4, U.rgb(col, 0.8)); g.addColorStop(1, U.rgb(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 7); ctx.fill();
    }
  }

  function drawEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.t += dt;
      if (e.t >= e.life) { effects.splice(i, 1); continue; }
      const k = e.t / e.life;
      if (e.k === 'p') {
        e.x += e.vx * dt; e.y += e.vy * dt;
        const [sx, sy] = R.w2s(e.x, e.y);
        ctx.fillStyle = U.rgb(e.col, 1 - k); ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      } else if (e.k === 'txt') {
        const [sx, sy] = R.w2s(e.x, e.y);
        const yy = sy - 20 - k * 30;
        ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        ctx.font = `bold 14px ${MP.FONT_MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        MP.Icons.drawGlyph(ctx, 'coin', sx - 26, yy - 7, 14, U.rgb(e.col));
        ctx.fillStyle = U.rgb(e.col); ctx.fillText(e.text, sx - 8, yy);
        if (e.sub) { MP.Icons.drawGlyph(ctx, 'nuke', sx - 24, yy + 9, 11, '#a6e35a'); ctx.fillStyle = '#a6e35a'; ctx.font = `bold 11px ${MP.FONT_MONO}`; ctx.fillText(e.sub, sx - 8, yy + 15); }
        ctx.globalAlpha = 1;
      } else if (e.k === 'coin') {
        if (cam.z < 1.2) continue;
        const [sx, sy] = R.w2s(e.x, e.y);
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffd21f';
        ctx.beginPath(); ctx.arc(sx, sy - k * 14, 2.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.k === 'shot') {
        const [a, b] = R.w2s(e.x1, e.y1), [c2, d] = R.w2s(e.x2, e.y2);
        ctx.strokeStyle = `rgba(255,230,140,${1 - k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c2, d); ctx.stroke();
      } else if (e.k === 'icpt') {
        const [a, b] = R.w2s(e.x1, e.y1), [c2, d] = R.w2s(e.x2, e.y2);
        const kk = Math.min(1, k * 2.2);
        ctx.strokeStyle = e.hit ? `rgba(120,230,255,${1 - k})` : `rgba(200,200,200,${0.7 - k * 0.7})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + (c2 - a) * kk, b + (d - b) * kk); ctx.stroke();
      } else if (e.k === 'ring' || e.k === 'ping') {
        const [sx, sy] = R.w2s(e.x, e.y);
        const rr = e.k === 'ping' ? 8 + k * 60 : (e.r * cam.z) * (0.3 + k);
        ctx.strokeStyle = U.rgb(e.col, 1 - k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, rr, 0, 7); ctx.stroke();
      } else if (e.k === 'det') {
        const [sx, sy] = R.w2s(e.x, e.y);
        const r = e.r * cam.z;
        const col = e.col;
        if (e.w === 'EMP') {
          ctx.strokeStyle = `rgba(140,210,255,${1 - k})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sx, sy, r * (0.2 + k * 1.1), 0, 7); ctx.stroke();
          for (let j = 0; j < 6; j++) { const a = j + timeNow * 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * r * k, sy + Math.sin(a) * r * k); ctx.stroke(); }
          continue;
        }
        // flash
        if (k < 0.12) { ctx.fillStyle = U.rgb(col, (0.12 - k) / 0.12 * 0.9); ctx.beginPath(); ctx.arc(sx, sy, r * 2.4, 0, 7); ctx.fill(); }
        // fireball
        const fb = r * (0.35 + 0.65 * Math.min(1, k * 3));
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, fb);
        const a = Math.max(0, 1 - k * 1.1);
        g.addColorStop(0, `rgba(255,255,235,${a})`); g.addColorStop(0.35, U.rgb(col, a * 0.9)); g.addColorStop(0.7, `rgba(255,90,20,${a * 0.55})`); g.addColorStop(1, 'rgba(80,20,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, fb, 0, 7); ctx.fill();
        // shockwave
        ctx.strokeStyle = U.rgb(col, Math.max(0, 0.8 - k)); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(sx, sy, r * (0.4 + k * 2.2), 0, 7); ctx.stroke();
        if (e.w !== 'Airstrike' && e.w !== 'Orbital' && k > 0.1) {
          // rising column / cap glow
          const capY = sy - r * 1.4 * Math.min(1, k * 2);
          const cg = ctx.createRadialGradient(sx, capY, 0, sx, capY, r * 0.8);
          cg.addColorStop(0, `rgba(255,200,120,${a * 0.6})`); cg.addColorStop(1, 'rgba(120,60,30,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(sx, capY, r * 0.8, 0, 7); ctx.fill();
          ctx.fillStyle = `rgba(255,170,90,${a * 0.35})`; ctx.fillRect(sx - r * 0.12, capY, r * 0.24, sy - capY);
        }
      }
    }
  }

  function drawLabels() {
    const S = G.S, p = G.player();
    const items = [];
    for (const n of S.nations) {
      if (!n || !n.alive || !n.label) continue;
      const L = n.label;
      const me = n === p;
      let px = L.size * cam.z * 0.8;
      if (me) px = Math.max(px, 12);
      if (px < 9) continue;
      px = Math.min(px, me ? 34 : 28);
      if (!onScreen(L.x, L.y, px * n.name.length)) continue;
      items.push({ n, px, me });
    }
    // player first, then biggest — later labels that would overlap are skipped
    items.sort((a, b) => (b.me - a.me) || (b.px - a.px));
    const placed = [];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const it of items) {
      const n = it.n, L = n.label, px = it.px, me = it.me;
      const [sx, sy] = R.w2s(L.x, L.y);
      ctx.font = `900 ${px}px ${MP.FONT_HEAD}`;
      const spacing = px * 0.14;
      const text = n.name;
      // glyph widths are measured once per size and reused (measureText is costly on slow machines)
      const lk = text + '|' + Math.round(px * 2);
      if (!n._lw || n._lw.k !== lk) {
        const w0 = []; let tot = 0;
        for (const ch of text) { const w = ctx.measureText(ch).width; w0.push(w); tot += w + spacing; }
        n._lw = { k: lk, ws: w0, total: tot - spacing };
      }
      const ws = n._lw.ws, total = n._lw.total;
      const cs = Math.abs(Math.cos(L.ang)), sn = Math.abs(Math.sin(L.ang)), hh = px * 1.75;
      const bw = total * cs + hh * sn, bh = total * sn + hh * cs;
      const box = [sx - bw / 2, sy - bh / 2, sx + bw / 2, sy + bh / 2];
      if (!me && placed.some((b) => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1])) continue;
      placed.push(box);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(L.ang);
      const c = n.color;
      const arcR = total * 3.2;
      let x = -total / 2;
      const fill = me ? '#fff4c8' : U.rgb(U.mix(c, [255, 255, 255], 0.6), 0.92);
      for (let i = 0; i < text.length; i++) {
        const ch = text[i], w = ws[i];
        const cx = x + w / 2;
        const ang = cx / arcR;
        const yOff = arcR - Math.cos(ang) * arcR;
        ctx.save();
        ctx.translate(cx, yOff - px * 0.2); ctx.rotate(ang);
        ctx.strokeStyle = 'rgba(5,5,4,0.85)'; ctx.lineWidth = Math.max(2.5, px * 0.2);
        ctx.strokeText(ch, 0, 0);
        ctx.fillStyle = fill;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        x += w + spacing;
      }
      const tp = Math.max(9, px * 0.45);
      ctx.font = `bold ${tp}px ${MP.FONT_MONO}`;
      ctx.strokeStyle = 'rgba(5,5,4,0.85)'; ctx.lineWidth = 3;
      const tt = U.fmtK(n.troops);
      ctx.strokeText(tt, 0, px * 0.74); ctx.fillStyle = U.rgb(U.mix(c, [255, 255, 255], 0.35)); ctx.fillText(tt, 0, px * 0.74);
      if (p && p.targetId === n.id) { ctx.font = `bold ${Math.max(9, px * 0.38)}px ${MP.FONT_MONO}`; ctx.fillStyle = '#ff4433'; ctx.fillText('⌖ ALLIED TARGET', 0, -px * 0.9); }
      else if (n.traitorUntil > S.t && px > 10) { ctx.font = `bold ${Math.max(8, px * 0.32)}px ${MP.FONT_MONO}`; ctx.fillStyle = '#ff4433'; ctx.fillText('⚠ TRAITOR', 0, -px * 0.85); }
      ctx.restore();
    }
  }

  function drawCursor() {
    const H = MP.HUD, S = G.S;
    if (R.hover.t < 0) return;
    const mode = H && H.mode;
    if (S.phase === 'spawn' && G.player() && !G.player().spawned) {
      const [sx, sy] = R.w2s(R.hover.x + 0.5, R.hover.y + 0.5);
      const ok = MP.War.validSpawn(R.hover.t, 14);
      ctx.strokeStyle = ok ? 'rgba(255,210,31,0.9)' : 'rgba(255,68,51,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, C.SPAWN_RADIUS * cam.z, 0, 7); ctx.stroke();
    }
    if (mode && mode.kind === 'build') {
      const p = G.player();
      const chk = p ? MP.Eco.checkPlace(p, mode.type, R.hover.t) : { ok: false };
      const t = chk.ok ? chk.tile : R.hover.t;
      const x = t % World.W, y = (t / World.W) | 0;
      const [sx, sy] = R.w2s(x + 0.5, y + 0.5);
      const sz = U.clamp(cam.z * 4.6, 16, 30);
      const glyph = mode.type === 'warship' ? 'warship' : mode.type;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(MP.Icons.sprite(glyph, chk.ok ? [166, 227, 90] : [255, 68, 51], Math.round(sz * DPR)), sx - sz / 2, sy - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
      if (chk.upgrade) { ctx.font = `bold 11px ${MP.FONT_MONO}`; ctx.fillStyle = '#a6e35a'; ctx.textAlign = 'center'; ctx.fillText('UPGRADE → L' + (chk.upgrade.level + 1), sx, sy - sz); }
    }
    if (mode && mode.kind === 'weapon') {
      const [sx, sy] = R.w2s(R.hover.wx, R.hover.wy);
      ctx.strokeStyle = '#ff4433'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 14, sy); ctx.lineTo(sx - 5, sy); ctx.moveTo(sx + 5, sy); ctx.lineTo(sx + 14, sy);
      ctx.moveTo(sx, sy - 14); ctx.lineTo(sx, sy - 5); ctx.moveTo(sx, sy + 5); ctx.lineTo(sx, sy + 14); ctx.stroke();
    }
  }

  // ---------------- minimap ----------------
  let miniBase = null;
  function drawMinimap() {
    const mw = mini.width, mh = mini.height;
    if (!miniBase) { miniBase = document.createElement('canvas'); miniBase.width = mw; miniBase.height = mh; }
    const b = miniBase.getContext('2d');
    b.imageSmoothingEnabled = true;
    b.fillStyle = '#050607'; b.fillRect(0, 0, mw, mh);
    b.drawImage(terrainCv, 0, 0, mw, mh);
    if (G.S) b.drawImage(terrCv, 0, 0, mw, mh);
    R._miniSnap = true;
  }
  function drawMiniView() {
    if (!R._miniSnap || !miniBase) return;
    const mw = mini.width, mh = mini.height;
    miniCtx.drawImage(miniBase, 0, 0);
    const [a, b] = R.s2w(0, 0), [c2, d] = R.s2w(VW, VH);
    const sx = mw / World.W, sy = mh / World.H;
    miniCtx.strokeStyle = '#ffd21f'; miniCtx.lineWidth = 1;
    miniCtx.strokeRect(a * sx + 0.5, b * sy + 0.5, (c2 - a) * sx, (d - b) * sy);
    const p = G.player();
    if (p && p.alive && p.capital >= 0) { miniCtx.fillStyle = '#ffd21f'; miniCtx.fillRect(p.capX * sx - 1.5, p.capY * sy - 1.5, 3, 3); }
    for (const m of G.S ? G.S.missiles : []) { const [, , gx, gy] = MP.Weapons.pos(m); miniCtx.fillStyle = '#ff4433'; miniCtx.fillRect(gx * sx - 1, gy * sy - 1, 2, 2); }
  }
  R.miniToWorld = function (mx, my) { return [mx / mini.clientWidth * World.W, my / mini.clientHeight * World.H]; };
})();
