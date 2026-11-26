/* MIDNIGHT PROTOCOL — static world: land mask decode, procedural terrain, deposits,
   coasts, ocean connectivity and naval navigation grid. */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U;

  const World = (MP.World = {});

  // biome ids
  const PLAINS = 0, FOREST = 1, DESERT = 2, TUNDRA = 3;
  World.BIOME_NAMES = ['PLAINS', 'FOREST', 'DESERT', 'TUNDRA'];
  World.ELEV_NAMES = ['', 'HIGHLANDS', 'MOUNTAINS'];

  // --- mountain ranges [lon,lat] polylines with half-width in degrees ---
  const RANGES = [
    [3.2, [[73, 35], [80, 31], [88, 28], [95, 28.5], [97, 28]]],
    [2.0, [[66, 35], [71, 37], [75, 38.5]]],
    [2.0, [[70, 41.5], [80, 42], [88, 43], [94, 43]]],
    [2.0, [[85, 50], [90, 48.5], [98, 47]]],
    [2.2, [[44, 37], [47, 34], [50, 31.5], [56, 28]]],
    [1.3, [[39.5, 43.5], [44, 42.5], [48, 41.3]]],
    [1.4, [[5.8, 44.5], [8, 46], [11, 46.8], [14.5, 47]]],
    [0.8, [[-1.8, 43], [1, 42.7], [3, 42.4]]],
    [1.2, [[18, 49.4], [22, 49], [25, 47.5], [26, 45.8], [23, 45.4]]],
    [1.6, [[6, 59], [9, 61.5], [13, 64], [16, 67], [20, 69]]],
    [1.3, [[59, 51], [59.5, 56], [60, 60], [63, 65], [66, 68]]],
    [1.6, [[-8, 30.5], [-3, 32.5], [2, 34.5], [8, 36]]],
    [2.0, [[30, -1], [33, -4], [35, -8], [34, -13], [33, -17]]],
    [1.2, [[27.5, -31.5], [29.5, -28.5], [31, -26]]],
    [1.8, [[-73, 11], [-76, 5], [-78, 0], [-79.5, -5], [-76, -12], [-71, -16], [-68.5, -21], [-69, -27], [-70, -33], [-71, -38], [-72, -44], [-73, -50], [-72, -55]]],
    [3.0, [[-150, 62], [-140, 60], [-130, 57], [-123, 51], [-116, 46], [-111, 43], [-107, 39], [-106, 34]]],
    [1.2, [[-122, 49], [-121.5, 44], [-121, 40], [-119, 37], [-117, 34]]],
    [1.6, [[-107, 29], [-104, 24], [-101, 20], [-97, 18], [-93, 16.5]]],
    [1.2, [[-86, 34], [-81, 37], [-77, 40.5], [-73, 43.5], [-69, 46]]],
    [1.3, [[146, -38], [149.5, -33], [152, -27], [148, -21], [145, -16]]],
    [1.6, [[134, 59], [142, 62], [152, 64], [162, 64], [170, 66]]],
    [1.0, [[132, 33], [136, 35.5], [139, 37], [141, 40], [142.5, 43.5]]],
    [1.0, [[-155, 62], [-148, 63], [-142, 61.5]]],
    [0.9, [[47.3, -13.5], [47, -19], [46.5, -24]]],
    [1.4, [[35.5, 29], [39, 24], [42, 18], [44, 14]]],
    [2.0, [[77, 36], [86, 36], [95, 35.5], [101, 34]]],
    [1.4, [[98, 29], [99.5, 22], [101, 17], [103, 13]]],
    [1.3, [[134, -3.5], [139, -4.5], [144, -6], [147, -7]]],
    [1.2, [[103, 1.5], [102, -3], [104, -5]]],
    [1.0, [[-72, 19], [-70, 18.8]]],
    [1.5, [[160, 58], [158, 54]]],
    [1.0, [[44.5, 43], [40, 44]]],
    [1.1, [[20, 41], [21, 39], [22, 37.5]]],
    [1.0, [[-4, 57], [-5, 58.5]]],
  ];
  // plateaus / highland regions: [lon, lat, rx, ry, strength]
  const PLATEAUS = [
    [88, 33, 12, 5, 1.0], [39, 9, 5, 5.5, 1.0], [25, -24, 10, 7, 0.9], [-68, -18, 3.5, 6, 1.1],
    [-45, -15, 8, 7, 0.75], [57, 32, 8, 5, 0.85], [34, 39, 6, 2.2, 0.85], [103, 46, 12, 4, 0.8],
    [77, 17, 4, 5, 0.7], [-110, 37, 5, 3, 0.85], [105, 63, 12, 5, 0.7], [-42, 72, 15, 9, 1.2],
    [-62, 5, 5, 2, 0.75], [-102, 24, 5, 4, 0.8], [30, -10, 6, 6, 0.75], [12, 7, 4, 3, 0.6],
    [-3.5, 40, 3.5, 2, 0.7], [95, 52, 6, 3, 0.7], [119, 29, 6, 4, 0.55], [-105, 45, 6, 4, 0.6],
    [21, -12, 7, 4, 0.6], [16, 18, 4, 4, 0.55], [8, 9, 3, 2, 0.6], [43, 23, 4, 6, 0.6],
  ];
  const DESERTS = [
    [8, 23, 22, 7], [25, 22, 10, 7], [-8, 21, 8, 5], [47, 22, 9, 6], [40, 32, 5, 3], [56, 32, 5, 3],
    [71, 27, 4, 3], [61, 41, 7, 3], [83, 39, 7, 2.5], [105, 43, 11, 3.5], [20, -23, 6, 5], [15, -23, 2, 6],
    [46, 6, 4, 4], [128, -25, 14, 7], [138, -27, 6, 4], [-70, -23, 1.6, 6], [-68, -45, 3, 5],
    [-113, 33, 5, 4], [-105, 29, 4, 4], [-117, 40, 4, 3], [53, 16, 5, 3], [17, 15, 10, 3],
  ];
  const FORESTS = [
    [-62, -4, 14, 7], [22, 0, 9, 5.5], [-5, 7, 8, 2.5], [102, 12, 8, 10], [113, -1, 15, 5],
    [142, -5, 7, 3], [-86, 13, 5, 4], [-82, 38, 10, 7], [15, 52, 15, 5], [112, 27, 8, 6],
    [49, -17, 1.6, 5], [-44, -20, 3, 6], [-125, 52, 5, 8], [148, -35, 4, 5], [-73, -42, 2, 6],
    [137, 37, 4, 4], [127, 40, 3, 3], [-57, -27, 5, 4], [30, -3, 4, 4], [37, -2, 3, 3], [80, 22, 6, 5],
  ];
  // uranium deposits (approximate real-world mining regions + scattered finds)
  const DEPOSITS = [
    [-105.5, 57.5], [-106.5, 59.5], [-81, 46.5], [-75, 52], [-108, 42.5], [-110, 38], [-104, 33], [-149, 64],
    [-45, -10], [-49, -5], [-66, -32], [-70, -42], [-60, 5], [-102, 21],
    [65, 44], [69, 41], [61, 46], [74, 45], [57, 49], [117, 51], [131, 44], [61, 66], [95, 56], [107, 62],
    [32, 49], [14, 50], [-6, 40.5], [24, 66], [44, 61],
    [8, 18], [12, 15], [15, -22], [17, -23], [26, -26], [28, -12], [13, -1.5], [34, -11], [36, -7], [27, -4], [3, 26], [-12, 20], [44, 7], [33, 15],
    [133, -13], [137, -30], [121, -27], [117, -21], [145, -22],
    [80, 14], [77, 24], [101, 26], [112, 25], [107, 40], [92, 42], [100, 47],
    [52, 33], [46, 29], [35, 37], [55, 23], [70, 64], [140, 37], [-90, 65], [-122, 55], [-66, -18],
  ];

  World.load = function () {
    const md = MP.MAPDATA;
    const W = md.w, H = md.h, N = W * H;
    World.W = W; World.H = H; World.N = N;
    const K = W / (2 * Math.PI);
    const millerY = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));
    const Y0 = millerY(md.latN);
    World.toXY = (lon, lat) => [(lon + 180) / 360 * W, (Y0 - millerY(lat)) * K];
    World.toLonLat = (x, y) => {
      const Y = Y0 - y / K;
      return [x / W * 360 - 180, (2.5 * Math.atan(Math.exp(0.8 * Y)) - 0.625 * Math.PI) * 180 / Math.PI];
    };

    // ---- decode land mask ----
    const bytes = U.b64ToBytes(md.rle);
    const land = new Uint8Array(N);
    let p = 0, i = 0, cur = 0;
    while (i < bytes.length && p < N) {
      let run = 0, sh = 0, c;
      do { c = bytes[i++]; run |= (c & 127) << sh; sh += 7; } while (c & 128);
      if (cur) land.fill(1, p, Math.min(N, p + run));
      p += run; cur ^= 1;
    }
    World.land = land;

    // latitude per row
    const rowLat = new Float32Array(H);
    for (let y = 0; y < H; y++) rowLat[y] = World.toLonLat(0, y + 0.5)[1];
    World.rowLat = rowLat;

    // ---- terrain ----
    const elevS = new Float32Array(N);
    const desS = new Float32Array(N);
    const forS = new Float32Array(N);
    const degPerX = 360 / W;
    function stampEllipse(arr, lon, lat, rx, ry, strength, mode) {
      const [cx, cy] = World.toXY(lon, lat);
      const [, yTop] = World.toXY(lon, Math.min(84, lat + ry));
      const [, yBot] = World.toXY(lon, Math.max(-84, lat - ry));
      const rxPx = rx / degPerX;
      const x0 = Math.max(0, Math.floor(cx - rxPx)), x1 = Math.min(W - 1, Math.ceil(cx + rxPx));
      const y0 = Math.max(0, Math.floor(yTop)), y1 = Math.min(H - 1, Math.ceil(yBot));
      for (let y = y0; y <= y1; y++) {
        const dyN = (y < cy) ? (cy - y) / Math.max(1, cy - yTop) : (y - cy) / Math.max(1, yBot - cy);
        for (let x = x0; x <= x1; x++) {
          const t = x + y * W;
          if (!land[t]) continue;
          const dxN = (x - cx) / rxPx;
          const d = Math.sqrt(dxN * dxN + dyN * dyN);
          if (d >= 1) continue;
          const v = (1 - d) * strength;
          if (mode === 'max') { if (v > arr[t]) arr[t] = v; } else arr[t] += v;
        }
      }
    }
    function stampRange(w, pts) {
      for (let s = 0; s + 1 < pts.length; s++) {
        const [ax, ay] = World.toXY(pts[s][0], pts[s][1]);
        const [bx, by] = World.toXY(pts[s + 1][0], pts[s + 1][1]);
        const latMid = (pts[s][1] + pts[s + 1][1]) / 2;
        const sc = 1 / Math.cos(latMid * Math.PI / 180); // miller ~ mercator scale at mid lats
        const wPx = w / degPerX * Math.min(2.2, Math.max(1, sc * 0.9));
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - wPx)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + wPx));
        const y0 = Math.max(0, Math.floor(Math.min(ay, by) - wPx)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + wPx));
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const t = x + y * W;
          if (!land[t]) continue;
          let u = ((x - ax) * dx + (y - ay) * dy) / L2; u = u < 0 ? 0 : u > 1 ? 1 : u;
          const ex = ax + u * dx - x, ey = ay + u * dy - y;
          const n = U.vnoise(x * 0.09, y * 0.09, 77) * 0.6 + 0.7;
          const d = Math.sqrt(ex * ex + ey * ey) / (wPx * n);
          if (d >= 1) continue;
          const v = (1 - d) * 2.1;
          if (v > elevS[t]) elevS[t] = v;
        }
      }
    }
    for (const [w, pts] of RANGES) stampRange(w, pts);
    for (const [lo, la, rx, ry, s] of PLATEAUS) stampEllipse(elevS, lo, la, rx, ry, s * 1.6, 'max');
    for (const [lo, la, rx, ry] of DESERTS) stampEllipse(desS, lo, la, rx, ry, 1.6, 'max');
    for (const [lo, la, rx, ry] of FORESTS) stampEllipse(forS, lo, la, rx, ry, 1.4, 'max');

    const terr = new Uint8Array(N);
    for (let y = 0; y < H; y++) {
      const lat = rowLat[y];
      const boreal = (lat > 48 && lat < 66) ? 0.55 * Math.min(1, (lat - 48) / 4) : 0;
      for (let x = 0; x < W; x++) {
        const t = x + y * W;
        if (!land[t]) continue;
        const n1 = U.fbm(x * 0.035, y * 0.035, 11, 4);
        const n2 = U.fbm(x * 0.05, y * 0.05, 23, 3);
        const n3 = U.fbm(x * 0.02, y * 0.02, 31, 3);
        let e = elevS[t] + (n1 - 0.5) * 0.9 + Math.max(0, n3 - 0.68) * 2.2;
        const elev = e >= 1.5 ? 2 : e >= 0.62 ? 1 : 0;
        let biome = PLAINS;
        const tundraLine = 64 + (n2 - 0.5) * 8;
        if (lat > tundraLine || (elevS[t] > 1.75 && n2 > 0.45)) biome = TUNDRA;
        else if (desS[t] + (n2 - 0.5) * 0.8 > 0.35) biome = DESERT;
        else if (forS[t] + boreal + (n2 - 0.5) * 0.9 > 0.42) biome = FOREST;
        terr[t] = biome | (elev << 2);
      }
    }
    World.terr = terr;

    // ---- water components (ocean vs lakes) ----
    const wcomp = new Int32Array(N).fill(-1);
    const compSize = [];
    const stack = new Int32Array(N);
    let nc = 0;
    for (let s = 0; s < N; s++) {
      if (land[s] || wcomp[s] >= 0) continue;
      let sp = 0, size = 0; stack[sp++] = s; wcomp[s] = nc;
      while (sp) {
        const t = stack[--sp]; size++;
        const x = t % W;
        if (x > 0 && !land[t - 1] && wcomp[t - 1] < 0) { wcomp[t - 1] = nc; stack[sp++] = t - 1; }
        if (x < W - 1 && !land[t + 1] && wcomp[t + 1] < 0) { wcomp[t + 1] = nc; stack[sp++] = t + 1; }
        if (t >= W && !land[t - W] && wcomp[t - W] < 0) { wcomp[t - W] = nc; stack[sp++] = t - W; }
        if (t < N - W && !land[t + W] && wcomp[t + W] < 0) { wcomp[t + W] = nc; stack[sp++] = t + W; }
      }
      compSize.push(size); nc++;
    }
    const ocean = new Uint8Array(N);
    for (let t = 0; t < N; t++) if (!land[t] && compSize[wcomp[t]] > 3000) ocean[t] = 1;
    World.ocean = ocean;
    World.wcomp = wcomp;
    // inland lakes count as plain water for display but not navigable
    const coast = new Uint8Array(N); // land next to ocean
    let coastCount = 0;
    for (let t = 0; t < N; t++) {
      if (!land[t]) continue;
      const x = t % W;
      if ((x > 0 && ocean[t - 1]) || (x < W - 1 && ocean[t + 1]) || (t >= W && ocean[t - W]) || (t < N - W && ocean[t + W])) { coast[t] = 1; coastCount++; }
    }
    World.coast = coast;

    // distance from coast for water (for ocean shading), capped 12
    const wdist = new Uint8Array(N).fill(255);
    let q = [];
    for (let t = 0; t < N; t++) if (coast[t]) { wdist[t] = 0; q.push(t); }
    for (let d = 1; d <= 12 && q.length; d++) {
      const nq = [];
      for (const t of q) {
        const x = t % W;
        const nb = [x > 0 ? t - 1 : -1, x < W - 1 ? t + 1 : -1, t - W, t + W];
        for (const u of nb) { if (u < 0 || u >= N || land[u] || wdist[u] !== 255) continue; wdist[u] = d; nq.push(u); }
      }
      q = nq;
    }
    World.wdist = wdist;

    // ---- deposits ----
    World.deposits = [];
    const rng = U.rng(9001);
    for (const [lo, la] of DEPOSITS) {
      const [x, y] = World.toXY(lo + rng.range(-0.8, 0.8), la + rng.range(-0.8, 0.8));
      const t = World.nearestLand(Math.round(x), Math.round(y), 25);
      if (t >= 0 && !World.deposits.some((d) => U.dist2(d.x, d.y, t % W, (t / W) | 0) < 100)) {
        World.deposits.push({ id: World.deposits.length, tile: t, x: t % W, y: (t / W) | 0, owner: 0, plant: null });
      }
    }
    for (let k = 0; World.deposits.length < 85 && k < 5000; k++) {
      const t = rng.int(N);
      if (!land[t]) continue;
      const x = t % W, y = (t / W) | 0;
      if (World.deposits.some((d) => U.dist2(d.x, d.y, x, y) < 900)) continue;
      World.deposits.push({ id: World.deposits.length, tile: t, x, y, owner: 0, plant: null });
    }

    World.landTotal = md.land;
    World.buildNav();
  };

  // real-world country raster for PRE-SET COUNTRIES (decoded on first use)
  World.countries = function () {
    if (World._countries) return World._countries;
    const CD = MP.COUNTRIES;
    if (!CD) return null;
    const cid = U.rleDecode(CD.rle, World.N);
    const list = CD.list.map((c) => Object.assign({}, c, { flag: c.a2 && MP.Flags.byCode[c.a2] ? 'cc:' + c.a2 : null }));
    World._countries = { cid, list, byIdx: new Map(list.map((c) => [c.i, c])) };
    return World._countries;
  };
  World.playableCountries = function () {
    const c = World.countries();
    return c ? c.list.filter((x) => x.tiles >= 12).sort((a, b) => b.tiles - a.tiles) : [];
  };

  World.nearestLand = function (x, y, r) {
    const W = World.W, H = World.H;
    let best = -1, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const t = xx + yy * W;
      if (!World.land[t]) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  };

  World.terrainName = function (t) {
    const v = World.terr[t];
    const b = v & 3, e = v >> 2;
    if (e === 0) return World.BIOME_NAMES[b];
    if (b === PLAINS) return World.ELEV_NAMES[e];
    return World.BIOME_NAMES[b] + ' ' + World.ELEV_NAMES[e];
  };
  World.difficulty = function (t) { // 0..3 pips
    const v = World.terr[t];
    const e = v >> 2, b = v & 3;
    return Math.min(3, e + (b === PLAINS ? 0 : 1) - (e === 0 && b === PLAINS ? 0 : 0));
  };

  // ---------------- naval navigation (2×2 coarse grid) ----------------
  World.buildNav = function () {
    const W = World.W, H = World.H;
    const NW = W >> 1, NH = H >> 1;
    const nav = new Uint8Array(NW * NH);
    for (let cy = 0; cy < NH; cy++) for (let cx = 0; cx < NW; cx++) {
      const t = cx * 2 + cy * 2 * W;
      const c = World.ocean[t] + World.ocean[t + 1] + World.ocean[t + W] + World.ocean[t + W + 1];
      nav[cx + cy * NW] = c >= 2 ? 1 : 0;
    }
    World.NW = NW; World.NH = NH; World.nav = nav;
    // connected components of navigable water (unreachable pairs are rejected instantly)
    const comp = new Int32Array(NW * NH).fill(-1);
    const st = new Int32Array(NW * NH);
    let nc = 0;
    for (let s = 0; s < NW * NH; s++) {
      if (!nav[s] || comp[s] >= 0) continue;
      let sp = 0; st[sp++] = s; comp[s] = nc;
      while (sp) {
        const c = st[--sp]; const cx = c % NW, cy = (c / NW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= NW || ny >= NH) continue;
          const n = nx + ny * NW;
          if (!nav[n] || comp[n] >= 0) continue;
          if (dx && dy && (!nav[cx + dx + cy * NW] || !nav[cx + (cy + dy) * NW])) continue;
          comp[n] = nc; st[sp++] = n;
        }
      }
      nc++;
    }
    World.navComp = comp;
    World.pathBudget = 1e9;
    World._g = new Float32Array(NW * NH);
    World._from = new Int32Array(NW * NH);
    World._stamp = new Uint32Array(NW * NH);
    World._closed = new Uint32Array(NW * NH);
    World._gen = 1;
    World._pathCache = new Map();
  };

  // nearest navigable coarse cell to tile coords
  World.navCellNear = function (x, y, r) {
    const NW = World.NW, NH = World.NH, nav = World.nav;
    const cx0 = (x >> 1), cy0 = (y >> 1);
    let best = -1, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const cx = cx0 + dx, cy = cy0 + dy;
      if (cx < 0 || cy < 0 || cx >= NW || cy >= NH) continue;
      const c = cx + cy * NW;
      if (!nav[c]) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  // A* over the coarse grid; returns array of [x,y] in tile coords (smoothed) or null
  World.seaPath = function (x0, y0, x1, y1, maxExpand, budgeted) {
    const NW = World.NW, nav = World.nav;
    const a = World.navCellNear(Math.round(x0), Math.round(y0), 4);
    const b = World.navCellNear(Math.round(x1), Math.round(y1), 4);
    if (a < 0 || b < 0) return null;
    if (World.navComp[a] !== World.navComp[b]) return null;
    const key = a + '|' + b;
    const cached = World._pathCache.get(key);
    if (cached !== undefined) return cached ? cached.slice() : null;
    if (budgeted) { if (World.pathBudget <= 0) return undefined; World.pathBudget--; } // trade only: caller retries later
    const g = World._g, from = World._from, stamp = World._stamp, closed = World._closed;
    const gen = ++World._gen;
    const bx = b % NW, by = (b / NW) | 0;
    const h = (c) => {
      const dx = Math.abs(c % NW - bx), dy = Math.abs(((c / NW) | 0) - by);
      return (dx > dy ? dx + 0.414 * dy : dy + 0.414 * dx) * (budgeted ? 1.4 : 1.15);
    };
    const heap = new U.Heap();
    g[a] = 0; stamp[a] = gen; from[a] = -1; heap.push(h(a), a);
    let found = false, expanded = 0;
    const lim = maxExpand || 260000;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
    while (heap.size) {
      const c = heap.pop();
      if (closed[c] === gen) continue;
      closed[c] = gen;
      if (c === b) { found = true; break; }
      if (++expanded > lim) break;
      const cx = c % NW, cy = (c / NW) | 0;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], ny = cy + DY[k];
        if (nx < 0 || ny < 0 || nx >= NW || ny >= World.NH) continue;
        const n = nx + ny * NW;
        if (!nav[n] || closed[n] === gen) continue;
        if (k >= 4 && (!nav[cx + DX[k] + cy * NW] || !nav[cx + (cy + DY[k]) * NW])) continue; // no corner cutting
        const ng = g[c] + DC[k];
        if (stamp[n] !== gen || ng < g[n]) { stamp[n] = gen; g[n] = ng; from[n] = c; heap.push(ng + h(n), n); }
      }
    }
    if (!found) { World._pathCache.set(key, null); return null; }
    const cells = [];
    for (let c = b; c >= 0; c = from[c]) cells.push(c);
    cells.reverse();
    // string-pull smoothing with line-of-sight on nav grid
    const los = (c1, c2) => {
      let xA = c1 % NW, yA = (c1 / NW) | 0; const xB = c2 % NW, yB = (c2 / NW) | 0;
      const dx = Math.abs(xB - xA), dy = Math.abs(yB - yA), sx = xA < xB ? 1 : -1, sy = yA < yB ? 1 : -1;
      let err = dx - dy;
      for (;;) {
        if (!nav[xA + yA * NW]) return false;
        if (xA === xB && yA === yB) return true;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; xA += sx; }
        if (e2 < dx) { err += dx; yA += sy; }
      }
    };
    const pts = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = Math.min(cells.length - 1, i + 60);
      while (j > i + 1 && !los(cells[i], cells[j])) j--;
      pts.push(cells[j]); i = j;
    }
    const out = pts.map((c) => [(c % NW) * 2 + 1, ((c / NW) | 0) * 2 + 1]);
    if (World._pathCache.size > 4000) World._pathCache.clear();
    World._pathCache.set(key, out);
    return out.slice();
  };
})();
