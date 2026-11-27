/* MIDNIGHT PROTOCOL — match state: nations, tiles, structures, ownership bookkeeping */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World;

  const G = (MP.G = { S: null });

  // ---------------- match creation ----------------
  G.create = function (opts) {
    const N = World.N;
    const S = {
      opts,
      seed: opts.seed >>> 0,
      t: 0,                    // seconds since match start (sim time)
      phase: 'spawn',          // spawn | play | over
      spawnLeft: C.SPAWN_SECONDS,
      clock: C.CLOCK_START,
      defcon: 5,
      nations: [null],
      owner: new Uint8Array(N),
      softUntil: new Float32Array(N),
      home: new Uint8Array(N),         // first nation to claim the tile from the wild (its homeland)
      prevOwner: new Uint8Array(N),    // owner before the latest capture
      ghostForts: new Map(),           // tile -> {owner, level}: crumbled Trench Warfare forts awaiting recapture
      capFalls: [],                    // capitals captured this tick (resolved after the land war step)
      structAt: new Map(),     // tile -> struct
      structs: [],
      nextStructId: 1,
      attacks: [],
      nextAttackId: 1,
      convoys: [], ships: [], missiles: [], effects: [], fallout: [], storms: [],
      roads: [],               // rebuilt periodically
      softQ: new Int32Array(1 << 20), softQT: new Float32Array(1 << 20), softHead: 0, softTail: 0,
      relations: null,         // Float32Array(n*n) opinions
      offers: [],              // pending diplomacy offers to the player
      council: { next: C.COUNCIL_INTERVAL, active: null, effects: [] },
      wire: [],
      stats: { capitals: 0, eliminated: 0, launched: 0, intercepted: 0, sunk: 0, built: {}, peakPct: 0, nukesTaken: 0, betrayals: 0, alliances: 0, convoyIncome: 0, prizes: 0 },
      flags: {},               // one-shot milestones
      winner: 0, ending: null,
      landTotal: World.landTotal,
      firstNuke: false,
      dirtyAll: true,
    };
    S.rng = U.rng(S.seed);
    G.S = S;
    return S;
  };

  // ---------------- nations ----------------
  G.addNation = function (spec) {
    const S = G.S;
    const id = S.nations.length;
    const n = Object.assign({
      id, name: 'NATION', flag: 'h:888888,444444', color: [200, 200, 200],
      isPlayer: false, isBot: true, team: 0, partner: false, personality: 'opportunist', difficulty: 'regular',
      doctrine: 'homeland', directives: [], pattern: 'none',
      alive: true, spawned: false, capital: -1, capX: 0, capY: 0,
      troops: 0, credits: C.START_CREDITS, uranium: C.START_URANIUM,
      tiles: 0, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0,
      border: new Set(),
      st: { city: [], port: [], factory: [], hub: [], enrich: [], fort: [], silo: [], radar: [], sam: [], abm: [], laser: [], aegis: [] },
      levels: {},              // total levels owned per type (for cost ladder)
      research: {}, researching: null,
      allies: new Set(), truces: new Map(), embargo: new Set(), wars: new Set(),
      traitorUntil: 0, launches: 0, eliminatedBy: 0, eliminatedAt: 0,
      income: 0, incomeAvg: C.BASE_INCOME, incomeAcc: 0, growth: 0, cap: C.CAP_BASE,
      orbitalReady: 0, launchBanUntil: 0,
      mods: null, ai: null, label: null, rank: 0,
      lastHitBy: 0, lastHitAt: -99, stats: { kills: 0, nukes: 0, peak: 0 },
    }, spec);
    n.mods = G.computeMods(n);
    n.troops = C.START_TROOPS * (n.mods.startTroops || 1);
    S.nations.push(n);
    return n;
  };

  G.computeMods = function (n) {
    const m = {};
    const apply = (mods) => { for (const k in mods) m[k] = (m[k] == null ? 1 : m[k]) * mods[k]; };
    const d = C.DOCTRINES.find((x) => x.id === n.doctrine);
    if (d) apply(d.mods);
    for (const id of n.directives) { const dr = C.DIRECTIVES.find((x) => x.id === id); if (dr) apply(dr.mods); }
    for (const id of (n.skills || [])) { const sk = C.SKILLS.find((x) => x.id === id); if (sk) apply(sk.mods); }
    return m;
  };
  G.mod = (n, k) => (n && n.mods && n.mods[k] != null ? n.mods[k] : 1);
  G.has = (n, k) => !!(n && n.mods && n.mods[k] != null); // flag-style mods (presence = active)

  G.alive = () => G.S.nations.filter((n) => n && n.alive && n.spawned);
  G.player = () => G.S.nations.find((n) => n && n.isPlayer) || null;

  // relations
  G.initRelations = function () {
    const S = G.S, n = S.nations.length;
    S.relN = n;
    S.relations = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) S.relations[i] = S.rng.range(-10, 15);
  };
  G.rel = (a, b) => G.S.relations[a * G.S.relN + b];
  G.addRel = function (a, b, v) {
    const S = G.S, i = a * S.relN + b;
    S.relations[i] = U.clamp(S.relations[i] + v, -100, 100);
  };

  G.isAllied = function (a, b) {
    if (a === b) return true;
    const S = G.S, na = S.nations[a], nb = S.nations[b];
    if (!na || !nb) return false;
    if (na.team && na.team === nb.team) return true;
    return na.allies.has(b);
  };
  G.hasTruce = function (a, b) {
    const S = G.S, na = S.nations[a];
    if (!na) return false;
    const until = na.truces.get(b);
    return until != null && until > S.t;
  };
  G.protectedNow = () => { const S = G.S; return !S || S.phase !== 'play' || S.t - S.playStart < C.PROTECT_SECONDS; };
  G.isAlienPair = (a, b) => { const S = G.S; return !!((S.nations[a] && S.nations[a].isAlien) || (S.nations[b] && S.nations[b].isAlien)); };
  // spawn protection never shields anyone from (or from fighting) the aliens
  G.canAttack = (a, b) => b === 0 || ((!G.protectedNow() || G.isAlienPair(a, b)) && !G.isAllied(a, b) && !G.hasTruce(a, b));
  G.embargoed = function (a, b) { // trade blocked between a and b
    const S = G.S, na = S.nations[a], nb = S.nations[b];
    if (!na || !nb) return false;
    if (na.embargo.has(b) || nb.embargo.has(a)) return true;
    for (const e of S.council.effects) if (e.id === 'sanctions' && (e.target === a || e.target === b) && a !== b) return true;
    return false;
  };

  // ---------------- tiles ----------------
  const W = () => World.W;

  function isBorderTile(t, o) {
    const w = World.W, owner = G.S.owner;
    const x = t % w;
    return (x > 0 && owner[t - 1] !== o) || (x < w - 1 && owner[t + 1] !== o) ||
      (t >= w && owner[t - w] !== o) || (t < World.N - w && owner[t + w] !== o);
  }
  G.isBorderTile = isBorderTile;

  function refreshBorder(t) {
    const S = G.S, o = S.owner[t];
    if (!o) return;
    const n = S.nations[o];
    if (isBorderTile(t, o)) n.border.add(t); else n.border.delete(t);
  }

  // change the owner of a tile; keeps counts, moments, border sets, render dirt, structures
  G.setOwner = function (t, o, soft) {
    const S = G.S, owner = S.owner, w = World.W;
    const prev = owner[t];
    if (prev === o) { if (soft) G.markSoft(t, soft); return; }
    let permanent = false;
    if (o && prev && soft) {
      const pn = S.nations[prev], on = S.nations[o];
      if (G.has(on, 'homeland') && S.home[t] === o) soft = 0;               // Homeland retakes its soil already dug in
      else if (G.has(on, 'scorched') && S.prevOwner[t] === o) soft = 5;     // Scorched Earth digs back in within 5 seconds
      else if (G.has(on, 'trench')) soft = 0;                                // trench diggers never hold fresh land
      else if (G.has(pn, 'scorched')) permanent = true;                        // scorched land never settles
      else if (G.has(pn, 'trench') || (G.has(pn, 'homeland') && S.home[t] === prev)) soft *= 2;
      if (soft) soft *= G.mod(on, 'digIn');
    } else if (o && soft && G.has(S.nations[o], 'trench')) soft = 0;
    if (prev && o) S.prevOwner[t] = prev;
    if (o && !prev && !S.home[t]) S.home[t] = o;
    const x = t % w, y = (t / w) | 0;
    if (prev) {
      const p = S.nations[prev];
      p.lostSince = true;
      p.tiles--; p.sx -= x; p.sy -= y; p.sxx -= x * x; p.syy -= y * y; p.sxy -= x * y;
      p.border.delete(t);
    }
    owner[t] = o;
    if (o) {
      const n = S.nations[o];
      n.tiles++; n.sx += x; n.sy += y; n.sxx += x * x; n.syy += y * y; n.sxy += x * y;
    }
    if (permanent) { const was = S.softUntil[t] > S.t; S.softUntil[t] = 1e9; if (!was && MP.Render) MP.Render.dirty(t); }
    else if (soft) G.markSoft(t, soft); else S.softUntil[t] = 0;
    refreshBorder(t);
    if (x > 0) refreshBorder(t - 1);
    if (x < w - 1) refreshBorder(t + 1);
    if (t >= w) refreshBorder(t - w);
    if (t < World.N - w) refreshBorder(t + w);
    MP.Render && MP.Render.dirty(t);
    const st = S.structAt.get(t);
    if (st) G.structCaptured(st, prev, o);
    else if (o && S.ghostForts.size) {
      const gf = S.ghostForts.get(t);
      if (gf && gf.owner === o) { S.ghostForts.delete(t); const n = S.nations[o]; G.addStruct(n, 'fort', t, { level: gf.level, builtBy: o }); n.levels.fort += gf.level - 1; MP.FX && MP.FX.burst(t % w, (t / w) | 0, [255, 210, 31], 5); }
    }
    if (prev && S.nations[prev].capital === t) G.capitalLost(prev, o);
  };

  G.markSoft = function (t, seconds) {
    const S = G.S;
    const until = S.t + seconds;
    if (S.softUntil[t] >= until) return;
    const wasSoft = S.softUntil[t] > S.t;
    S.softUntil[t] = until;
    // FIFO queue (constant durations keep it ordered; fallout durations are ≥ dig-in so near-ordered)
    const cap = S.softQ.length;
    if (S.softTail - S.softHead >= cap - 1) S.softHead = S.softTail - cap + 2; // overwrite oldest
    S.softQ[S.softTail % cap] = t; S.softQT[S.softTail % cap] = until; S.softTail++;
    if (!wasSoft && MP.Render) MP.Render.dirty(t);
  };
  G.isSoft = (t) => G.S.softUntil[t] > G.S.t;

  G.tickSoft = function () {
    const S = G.S, cap = S.softQ.length;
    let guard = 0;
    while (S.softHead < S.softTail && guard++ < 50000) {
      const i = S.softHead % cap;
      if (S.softQT[i] > S.t) break;
      const t = S.softQ[i];
      S.softHead++;
      if (S.softUntil[t] && S.softUntil[t] <= S.t) { S.softUntil[t] = 0; MP.Render && MP.Render.dirty(t); }
    }
  };

  // ---------------- structures ----------------
  G.structCost = function (n, type) {
    const b = C.BUILD[type];
    const lv = n.levels[type] || 0;
    let credits = b.base + b.a * Math.pow(lv, b.p);
    let u = b.u ? b.u : 0;
    let mul = G.mod(n, 'cost_' + type);
    if (b.defense || type === 'radar') mul *= G.mod(n, 'cost_defense');
    if (G.S.defcon === 1) mul *= 1; // DEFCON discount applies to weapons only
    credits *= mul;
    return { credits: Math.round(credits / 100) * 100, u: Math.round(u * (b.defense ? G.mod(n, 'cost_defense') : 1)) };
  };

  G.addStruct = function (n, type, t, opts) {
    const S = G.S, w = World.W;
    const s = Object.assign({
      id: S.nextStructId++, type, owner: n.id, tile: t, x: t % w, y: (t / w) | 0, level: 1,
      build: 0, buildMax: 0, disabledUntil: 0, ammo: 1, reload: 0, ready: 1, siloT: 0,
      convoyT: 0, tradeT: 0, born: S.t, builtBy: n.id,
    }, opts || {});
    S.structs.push(s);
    S.structAt.set(t, s);
    n.st[type].push(s);
    n.levels[type] = (n.levels[type] || 0) + 1;
    if (type === 'enrich') { const d = World.deposits.find((d2) => d2.tile === s.depositTile); if (d) d.plant = s; }
    S.roadsDirty = true;
    return s;
  };

  G.removeStruct = function (s) {
    const S = G.S;
    const n = S.nations[s.owner];
    if (n) {
      const arr = n.st[s.type]; const i = arr.indexOf(s); if (i >= 0) arr.splice(i, 1);
      n.levels[s.type] = Math.max(0, (n.levels[s.type] || 0) - s.level);
    }
    S.structAt.delete(s.tile);
    const j = S.structs.indexOf(s); if (j >= 0) S.structs.splice(j, 1);
    if (s.type === 'enrich') for (const d of World.deposits) if (d.plant === s) d.plant = null;
    s.dead = true;
    S.roadsDirty = true;
  };

  G.downgradeStruct = function (s, by) {
    const n = G.S.nations[s.owner];
    const drop = Math.min(by, s.level);
    s.level -= drop;
    if (n) n.levels[s.type] = Math.max(0, (n.levels[s.type] || 0) - drop);
    if (s.level <= 0) { s.level = drop; G.removeStruct(s); return true; }
    s.ammo = Math.min(s.ammo, s.level); s.ready = Math.min(s.ready, s.level);
    return false;
  };

  G.structCaptured = function (s, prev, o) {
    const S = G.S;
    if (s.owner === o) return; // already transferred (e.g. a ceded puppet-state)
    const pn = S.nations[prev];
    if (!o) { G.removeStruct(s); return; }
    const scorched = G.has(pn, 'scorched');
    if (s.type === 'fort' && G.has(pn, 'trench') && s.builtBy === prev) {   // trench forts crumble, and return with their owner
      S.ghostForts.set(s.tile, { owner: prev, level: s.level });
      G.removeStruct(s);
      MP.FX && MP.FX.burst(s.x, s.y, [180, 160, 120], 5);
      return;
    }
    if (scorched || s.type === 'silo' || s.type === 'laser') {
      G.removeStruct(s);
      MP.FX && MP.FX.burst(s.x, s.y, [255, 120, 40], 4);
      return;
    }
    // transfer, losing a level (captured infrastructure is damaged)
    if (pn) {
      const arr = pn.st[s.type]; const i = arr.indexOf(s); if (i >= 0) arr.splice(i, 1);
      pn.levels[s.type] = Math.max(0, (pn.levels[s.type] || 0) - s.level);
      if (prev === (G.player() && G.player().id)) MP.Game && MP.Game.notify('build.lost', { type: C.BUILD[s.type].name, nation: S.nations[o].name });
    }
    if (s.level > 1) s.level -= 1;
    s.owner = o;
    s.build = 0;
    const n = S.nations[o];
    n.st[s.type].push(s);
    n.levels[s.type] = (n.levels[s.type] || 0) + s.level;
    S.roadsDirty = true;
  };

  G.structsNear = function (x, y, r, filter) {
    const out = [], r2 = r * r;
    for (const s of G.S.structs) {
      if (U.dist2(s.x, s.y, x, y) <= r2 && (!filter || filter(s))) out.push(s);
    }
    return out;
  };

  G.isActive = (s) => s.build <= 0 && s.disabledUntil <= G.S.t && !s.dead;

  // ---------------- capitals / elimination ----------------
  G.capitalLost = function (vid, by) {
    const S = G.S, v = S.nations[vid], a = S.nations[by];
    if (!v) return;
    const lostX = v.capX, lostY = v.capY;
    v.capital = -1;
    const fresh = !(v.capitalLostAt && G.S.t - v.capitalLostAt < 45);
    v.capitalLostAt = G.S.t;
    if (a && fresh) {
      const cr = Math.round(v.credits * C.CAPITAL_LOOT_CREDITS) + 500;
      const ur = Math.round(v.uranium * C.CAPITAL_LOOT_URANIUM) + 20;
      v.credits = Math.max(0, v.credits - cr); v.uranium = Math.max(0, v.uranium - ur);
      a.credits += cr; a.uranium += ur;
      if (a.isPlayer || v.isPlayer) MP.FX && MP.FX.floatText(v.capX, v.capY, '+' + U.fmtInt(cr), [255, 210, 31], '+' + ur);
      if (a.isPlayer) { S.stats.capitals++; MP.Game.notify('capital.taken', { nation: v.name, credits: U.fmtInt(cr), uranium: ur }); }
      if (v.isPlayer) MP.Game.notify('capital.lost', { nation: a.name });
      MP.Game.wire('OSINT', `${a.name} TAKES THE CAPITAL OF ${v.name}`, v.isPlayer ? 'bad' : 'osint');
    }
    // relocate capital to the best remaining city, else any border-free tile
    let best = null;
    for (const c of v.st.city) if (!best || c.level > best.level) best = c;
    if (best) G.setCapital(v, best.tile);
    else if (v.tiles > 0) {
      // fall back deep inside remaining land: the centroid pushed away from where we were hit
      let cx = v.sx / v.tiles, cy = v.sy / v.tiles;
      const dx = cx - lostX, dy = cy - lostY, d = Math.hypot(dx, dy) || 1;
      cx += dx / d * Math.min(20, Math.sqrt(v.tiles) * 0.3); cy += dy / d * Math.min(20, Math.sqrt(v.tiles) * 0.3);
      const t = G.nearestOwned(v.id, Math.round(cx), Math.round(cy), 60);
      if (t >= 0) G.setCapital(v, t);
    }
    // a captured capital brings the whole nation down — except Scorched Earth, whose pockets fight on
    if (a && !G.has(v, 'scorched') && !v.isAlien) G.S.capFalls.push({ v: vid, by: by }); // the armada's mothership simply relocates
  };
  G.resolveCapFalls = function () {
    const S = G.S;
    while (S.capFalls.length) {
      const f = S.capFalls.shift();
      const v = S.nations[f.v], a = S.nations[f.by];
      if (!v || !v.alive) continue;
      MP.Game.wire('FLASH', `${v.name} COLLAPSES — ITS CAPITAL HAS FALLEN`, v.isPlayer ? 'bad' : 'flash');
      G.eliminate(f.v, a && a.alive ? f.by : 0);
    }
  };
  G.setCapital = function (n, t) {
    n.capital = t; n.capX = t % World.W; n.capY = (t / World.W) | 0;
  };
  G.nearestOwned = function (id, x, y, r) {
    const S = G.S, w = World.W, h = World.H;
    for (let rr = 0; rr <= r; rr++) {
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const t = xx + yy * w;
        if (S.owner[t] === id) return t;
      }
    }
    // fallback: any border tile
    const n = S.nations[id];
    for (const t of n.border) return t;
    return -1;
  };

  G.eliminate = function (vid, by) {
    const S = G.S, v = S.nations[vid];
    if (!v || !v.alive) return;
    v.alive = false; v.eliminatedBy = by; v.eliminatedAt = S.t;
    // hand remaining land to the conqueror (or leave it)
    const a = S.nations[by];
    if (v.tiles > 0) {
      const tiles = [];
      for (let t = 0; t < World.N; t++) if (S.owner[t] === vid) tiles.push(t);
      for (const t of tiles) G.setOwner(t, a && a.alive ? by : 0, C.DUG_IN_SECONDS);
    }
    for (const s of S.structs.slice()) if (s.owner === vid) G.removeStruct(s);
    // stop its attacks
    for (const at of S.attacks) if (at.from === vid || at.to === vid) at.done = true;
    // wars transfer: the victim's enemies now distrust the conqueror; its allies resent it
    if (a) {
      for (const o of S.nations) {
        if (!o || !o.alive || o.id === by) continue;
        if (o.allies.has(vid)) G.addRel(o.id, by, -25);
        if (o.wars.has(vid)) { o.wars.add(by); a.wars.add(o.id); }
      }
      a.stats.kills++;
      if (a.isPlayer) { S.stats.eliminated++; MP.Game.notify('nation.fell_us', { nation: v.name }); }
    }
    for (const o of S.nations) { if (o) { o.allies.delete(vid); o.truces.delete(vid); o.embargo.delete(vid); o.wars.delete(vid); } }
    S.clock -= C.CLOCK.nationFell;
    MP.Game.nationFell(v, a);
  };
})();
