/* MIDNIGHT PROTOCOL — strategic weapons: research, silos, missiles, radar warning,
   defences (one shot per level; type-specific interception), detonations, fallout, EMP. */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const Wp = (MP.Weapons = {});
  let mid = 1;

  // ---------------- research ----------------
  Wp.researchCost = function (n, w) {
    const r = C.WEAPON[w].research;
    return { credits: r[0], u: r[1], time: r[2] * G.mod(n, 'research') };
  };
  Wp.canResearch = function (n, w) {
    if (n.research[w]) return { ok: false, reason: 'Already researched' };
    if (n.researching) return { ok: false, reason: 'Already researching ' + n.researching.w };
    if (G.S.defcon > C.WEAPON[w].defcon) return { ok: false, reason: 'Locked until DEFCON ' + C.WEAPON[w].defcon };
    const c = Wp.researchCost(n, w);
    if (n.credits < c.credits) return { ok: false, reason: 'Not enough credits' };
    if (n.uranium < c.u) return { ok: false, reason: 'Not enough uranium' };
    return { ok: true, cost: c };
  };
  Wp.startResearch = function (n, w) {
    const chk = Wp.canResearch(n, w);
    if (!chk.ok) return chk;
    n.credits -= chk.cost.credits; n.uranium -= chk.cost.u;
    n.researching = { w, t: 0, total: chk.cost.time };
    if (n.isPlayer) { MP.Game.notify('research.started', { weapon: w }); MP.SFX.play('research'); }
    return chk;
  };
  Wp.tickResearch = function (dt) {
    for (const n of G.S.nations) {
      if (!n || !n.alive || !n.researching) continue;
      n.researching.t += dt;
      if (n.researching.t >= n.researching.total) {
        const w = n.researching.w;
        n.research[w] = true; n.researching = null;
        if (n.isPlayer) { MP.Game.notify('research.done', { weapon: w }); MP.SFX.play('researchDone'); }
      }
    }
  };

  // ---------------- launch ----------------
  Wp.launchCost = function (n, w) {
    const c = C.WEAPON[w].cost;
    let mul = G.S.defcon === 1 ? C.DEFCON_DISCOUNT : 1;
    if (C.WEAPON[w].nuclear && G.S.council.effects.some((e) => e.id === 'testban')) mul *= 1.5;
    return { credits: Math.round(c[0] * mul), u: Math.round(c[1] * mul) };
  };

  // find launchers able to hit (x,y): returns array sorted by distance
  Wp.launchers = function (n, w, x, y) {
    const def = C.WEAPON[w];
    const out = [];
    if (def.from === 'silo') {
      for (const s of n.st.silo) {
        if (!G.isActive(s) || s.ready < 1) continue;
        const d = U.dist(s.x, s.y, x, y);
        if (def.range && d > def.range) continue;
        out.push({ s, d });
      }
    } else if (def.from === 'city') {
      const srcs = n.st.city.filter((c) => c.build <= 0);
      if (n.capital >= 0) srcs.push({ x: n.capX, y: n.capY, capital: true });
      for (const s of srcs) {
        const d = U.dist(s.x, s.y, x, y);
        if (def.range && d > def.range) continue;
        out.push({ s, d });
      }
    }
    out.sort((a, b) => a.d - b.d);
    return out;
  };

  Wp.canLaunch = function (n, w, x, y) {
    const S = G.S, def = C.WEAPON[w];
    if (!n.research[w]) return { ok: false, reason: 'Research ' + w + ' first' };
    if (S.defcon > def.defcon) return { ok: false, reason: 'Locked until DEFCON ' + def.defcon };
    if (n.launchBanUntil > S.t) return { ok: false, reason: 'Council arms embargo in force' };
    const t = Math.round(x) + Math.round(y) * World.W;
    const tgt = S.owner[t];
    if (tgt && G.isAllied(n.id, tgt)) return { ok: false, reason: 'Target is an ally' };
    if (tgt === n.id) return { ok: false, reason: 'That is your own land' };
    if (w === 'Airstrike' && MP.Weather.stormAt(x, y)) return { ok: false, reason: 'Storm over target — aircraft grounded' };
    const cost = Wp.launchCost(n, w);
    if (n.credits < cost.credits) return { ok: false, reason: 'Not enough credits' };
    if (n.uranium < cost.u) return { ok: false, reason: 'Not enough uranium' };
    if (def.from === 'orbit') {
      if (n.orbitalReady > S.t) return { ok: false, reason: 'Orbital platform recharging' };
      return { ok: true, cost, from: null };
    }
    const ls = Wp.launchers(n, w, x, y);
    if (!ls.length) return { ok: false, reason: def.from === 'silo' ? (n.st.silo.length ? 'No ready silo in range' : 'Build a missile silo') : 'Out of range' };
    return { ok: true, cost, from: ls[0].s, all: ls };
  };

  Wp.launch = function (n, w, x, y, opts) {
    const S = G.S;
    const chk = Wp.canLaunch(n, w, x, y);
    if (!chk.ok) {
      if (n.isPlayer && !(opts && opts.quiet)) { MP.Game.toast(chk.reason, 'bad'); MP.SFX.play('error'); }
      return null;
    }
    const def = C.WEAPON[w];
    n.credits -= chk.cost.credits; n.uranium -= chk.cost.u;
    n.launches++; n.stats.nukes += def.nuclear ? 1 : 0;
    const t = Math.round(x) + Math.round(y) * World.W;
    const target = S.owner[t];
    if (target) MP.War.declareWar(n.id, target);
    if (def.from === 'orbit') {
      n.orbitalReady = S.t + def.cooldown;
      const m = { id: mid++, w, owner: n.id, x0: x, y0: y - 60, x1: x, y1: y, t: 0, T: def.charge, target, orbital: true, style: n.missileStyle || 'standard', det: n.detonation };
      S.missiles.push(m);
      Wp.detect(m);
      if (n.isPlayer) MP.SFX.play('orbitalCharge');
      return m;
    }
    const src = chk.from;
    if (def.from === 'silo') { src.ready--; if (src.siloT <= 0) src.siloT = C.SILO_RELOAD * G.mod(n, 'siloReload'); }
    const d = Math.hypot(x - src.x, y - src.y);
    const T = Math.max(2.5, d / def.speed + (w === 'ICBM' || w === 'MIRV' ? 4 : 1));
    const m = { id: mid++, w, owner: n.id, x0: src.x, y0: src.y, x1: x, y1: y, t: 0, T, target, arc: def.arc, style: n.missileStyle || 'standard', det: n.detonation,
      detected: {}, split: false };
    S.missiles.push(m);
    S.stats.launchedAll = (S.stats.launchedAll || 0) + 1;
    if (n.isPlayer) S.stats.launched++;
    Wp.detect(m);
    if (n.isPlayer || (target && S.nations[target] && S.nations[target].isPlayer)) MP.SFX.play(w === 'Airstrike' ? 'jet' : 'launch', src.x, src.y);
    if (n.isPlayer && !(opts && opts.quiet)) MP.Game.notify('missile.launched', { weapon: w, nation: target ? S.nations[target].name : 'UNCLAIMED LAND' });
    return m;
  };

  Wp.launchAll = function (n, w, x, y) {
    let c = 0;
    for (let i = 0; i < 40; i++) {
      const chk = Wp.canLaunch(n, w, x, y);
      if (!chk.ok) break;
      const jx = x + (c ? U.R.range(-4, 4) : 0), jy = y + (c ? U.R.range(-4, 4) : 0);
      if (!Wp.launch(n, w, jx, jy, { quiet: true })) break;
      c++;
    }
    if (c && n.isPlayer) MP.Game.notify('missile.launch_all', { count: c, weapon: w });
    if (!c && n.isPlayer) { const chk = Wp.canLaunch(n, w, x, y); MP.Game.toast(chk.reason || 'Nothing ready', 'bad'); MP.SFX.play('error'); }
    return c;
  };

  // ---------------- missile position ----------------
  Wp.pos = function (m, tt) {
    const f = tt == null ? m.t / m.T : tt;
    const x = m.x0 + (m.x1 - m.x0) * f;
    const y = m.y0 + (m.y1 - m.y0) * f;
    const len = Math.hypot(m.x1 - m.x0, m.y1 - m.y0);
    const h = (m.arc || 0) * len * 4 * f * (1 - f);
    return [x, y - h, x, y]; // [screen-ish x, lifted y, ground x, ground y]
  };

  // radar detection: compute detection fraction for each nation whose land is targeted (and the player)
  Wp.detect = function (m) {
    const S = G.S;
    const victims = new Set();
    if (m.target) victims.add(m.target);
    const p = G.player(); if (p && p.alive) victims.add(p.id);
    m.detF = m.detF || {};
    for (const v of victims) {
      const n = S.nations[v];
      if (!n || !n.alive) continue;
      let f = 1 - C.WARN.noRadarLead; // late detection without radar
      if (m.orbital) f = 0.2;
      const range = C.DEFENSE.radar.range * G.mod(n, 'radarRange');
      for (const r of n.st.radar) {
        if (!G.isActive(r) || MP.Weather.stormAt(r.x, r.y)) continue;
        const rr = range * (1 + 0.25 * (r.level - 1));
        // earliest flight fraction where the missile's ground track enters radar range (sampled)
        for (let k = 0; k <= 20; k++) {
          const ff = k / 20;
          if (ff >= f) break;
          const gx = m.x0 + (m.x1 - m.x0) * ff, gy = m.y0 + (m.y1 - m.y0) * ff;
          if (U.dist2(gx, gy, r.x, r.y) <= rr * rr) { f = ff; break; }
        }
      }
      m.detF[v] = f;
    }
  };

  Wp.warnFactor = function (m, v) {
    const f = m.detF && m.detF[v] != null ? m.detF[v] : 1 - C.WARN.noRadarLead;
    const lead = 1 - f; // fraction of flight remaining at detection
    return U.clamp(C.WARN.minF + (lead - C.WARN.noRadarLead) * ((C.WARN.maxF - C.WARN.minF) / (1 - C.WARN.noRadarLead)), C.WARN.minF, C.WARN.maxF);
  };

  // ---------------- tick ----------------
  Wp.tick = function (dt) {
    const S = G.S;
    Wp.tickResearch(dt);
    // silo reloads & defence ammo
    for (const s of S.structs) {
      if (s.build > 0) continue;
      if (s.type === 'silo') {
        if (s.ready < s.level) {
          s.siloT -= dt;
          if (s.siloT <= 0) { s.ready++; s.siloT = s.ready < s.level ? C.SILO_RELOAD * G.mod(S.nations[s.owner], 'siloReload') : 0; }
        }
      } else if (C.DEFENSE[s.type] && C.DEFENSE[s.type].reload) {
        if (s.ammo < s.level) {
          s.reload += dt;
          if (s.reload >= C.DEFENSE[s.type].reload) { s.reload = 0; s.ammo++; }
        }
      }
    }
    const p = G.player();
    for (let i = S.missiles.length - 1; i >= 0; i--) {
      const m = S.missiles[i];
      m.t += dt;
      const f = m.t / m.T;
      // player-facing detection alerts
      if (p && p.alive && m.owner !== p.id && !m.alerted) {
        const df = m.detF && m.detF[p.id] != null ? m.detF[p.id] : 0.85;
        const aimed = m.target === p.id || G.isAllied(m.target, p.id) && m.target !== 0;
        if (f >= df && aimed) {
          m.alerted = true;
          const eta = Math.max(0, m.T - m.t);
          const on = S.nations[m.owner];
          if (m.target === p.id) {
            MP.Game.notify('missile.inbound', { weapon: m.w, nation: on.name, eta: Math.ceil(eta) });
            if (1 - df > 0.45) MP.Game.notify('radar.early_warning', { weapon: m.w, nation: on.name });
            MP.SFX.play('siren');
            MP.Game.wire('RADAR', `${m.w.toUpperCase()} INBOUND FROM ${on.name} · ETA ${Math.ceil(eta)}s`, 'bad');
          }
          m.seen = true;
        }
      }
      // MIRV split at apex
      if (m.w === 'MIRV' && !m.warhead && !m.split && f >= 0.5) {
        m.split = true;
        const def = C.WEAPON.MIRV;
        const [, , gx, gy] = Wp.pos(m, 0.5);
        for (let k = 0; k < def.warheads; k++) {
          const a = (k / def.warheads) * Math.PI * 2 + S.rng() * 0.6;
          const r = k === 0 ? 0 : def.spread * (0.4 + 0.6 * S.rng());
          const tx = U.clamp(m.x1 + Math.cos(a) * r, 1, World.W - 2), ty = U.clamp(m.y1 + Math.sin(a) * r, 1, World.H - 2);
          const tt = Math.round(tx) + Math.round(ty) * World.W;
          const w2 = { id: mid++, w: 'MIRV', warhead: true, owner: m.owner, x0: gx, y0: gy, x1: tx, y1: ty, t: 0, T: m.T * 0.5, target: S.owner[tt], arc: 0.25, style: m.style, det: m.det,
            detF: {}, liftFrom: (m.arc || 0) * Math.hypot(m.x1 - m.x0, m.y1 - m.y0) };
          for (const v in m.detF) w2.detF[v] = 0; // already tracked
          w2.alerted = m.alerted;
          S.missiles.push(w2);
        }
        MP.FX && MP.FX.split(gx, gy - (m.arc || 0) * Math.hypot(m.x1 - m.x0, m.y1 - m.y0));
        S.missiles.splice(i, 1);
        continue;
      }
      // interception attempts (terminal phase)
      if (!m.intercepted && m.target && f > 0.5 && f < 0.97) {
        if (Wp.tryIntercept(m, dt)) { S.missiles.splice(i, 1); continue; }
      }
      if (m.t >= m.T) {
        S.missiles.splice(i, 1);
        Wp.detonate(m);
      }
    }
    // fallout expiry & falloutFrac every second
    S._foT = (S._foT || 0) + dt;
    if (S._foT >= 1) {
      S._foT = 0;
      for (let i = S.fallout.length - 1; i >= 0; i--) if (S.fallout[i].until <= S.t) S.fallout.splice(i, 1);
      Wp.computeFalloutFrac();
    }
    // lasers pull the clock back a little
    S._lzT = (S._lzT || 0) + dt;
    if (S._lzT >= 60) {
      S._lzT = 0;
      let lasers = 0;
      for (const s of S.structs) if (s.type === 'laser' && G.isActive(s)) lasers++;
      if (lasers) { S.clock = Math.min(C.CLOCK_START, S.clock - C.CLOCK.laserPerMin * Math.min(10, lasers) * 0.5); }
    }
  };

  Wp.tryIntercept = function (m, dt) {
    const S = G.S;
    const v = m.target;
    const n = S.nations[v];
    if (!n || !n.alive) return false;
    const [, , gx, gy] = Wp.pos(m);
    const df = m.detF && m.detF[v] != null ? m.detF[v] : 1 - C.WARN.noRadarLead;
    if (m.t / m.T < df) return false; // not detected yet
    m.engT = (m.engT || 0) - dt;
    if (m.engT > 0) return false;
    m.engT = 0.35;
    // defenders: the target nation and its allies
    const factor = Wp.warnFactor(m, v);
    for (const s of S.structs) {
      const dd = C.DEFENSE[s.type];
      if (!dd || !dd.vs || !dd.vs[m.w]) continue;
      if (s.ammo < 1 || !G.isActive(s)) continue;
      if (s.owner !== v && !G.isAllied(s.owner, v)) continue;
      if (U.dist2(s.x, s.y, m.x1, m.y1) > dd.range * dd.range) continue;
      s.ammo--;
      const owner = S.nations[s.owner];
      const p = Math.min(C.WARN.cap, dd.vs[m.w] * factor * G.mod(owner, 'intercept'));
      const hit = S.rng() < p;
      MP.FX && MP.FX.interceptor(s.x, s.y, m, hit);
      const pl = G.player();
      if (hit) {
        m.intercepted = true;
        S.clock = Math.min(C.CLOCK_START, S.clock - C.CLOCK.intercept);
        if (pl && (s.owner === pl.id || v === pl.id)) { S.stats.intercepted++; MP.Game.notify('missile.intercepted', { weapon: m.w }); MP.SFX.play('intercept'); }
        return true;
      } else if (pl && v === pl.id) MP.SFX.play('interceptMiss');
      return false; // one shot per engagement window; next window may fire again
    }
    return false;
  };

  // ---------------- detonation ----------------
  Wp.detonate = function (m) {
    const S = G.S, W = World.W, H = World.H;
    const def = C.WEAPON[m.w];
    const owner = S.nations[m.owner];
    const R = def.radius;
    const cx = m.x1, cy = m.y1;
    const nuclear = def.nuclear || m.w === 'Orbital';
    const isEMP = m.w === 'EMP', isAir = m.w === 'Airstrike';
    const hitN = new Map(); // nation -> tiles hit
    const blastR = isAir || isEMP ? 0 : R * (m.w === 'Orbital' ? 0.5 : 0.6);
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 > R * R) continue;
      const t = x + y * W;
      if (!World.land[t]) continue;
      const o = S.owner[t];
      if (o && G.isAllied(m.owner, o)) continue; // no friendly fire on allies (or self)
      if (o) hitN.set(o, (hitN.get(o) || 0) + 1);
      if (isEMP || isAir) continue;
      const bunker = o ? G.mod(S.nations[o], 'nukeDamage') : 1;
      if (d2 <= blastR * blastR && S.rng() < bunker) { if (o) G.setOwner(t, 0, 0); G.markSoft(t, C.FALLOUT_SECONDS); }
      else if (o) G.markSoft(t, C.FALLOUT_SECONDS);
    }
    // troops & structures
    for (const [vid, cnt] of hitN) {
      const v = S.nations[vid];
      if (!v || !v.alive) continue;
      const bunker = G.mod(v, 'nukeDamage');
      if (!isEMP) {
        const frac = Math.min(1, cnt / Math.max(1, v.tiles + cnt));
        const loss = (isAir ? 0.6 : 1.6) * frac * v.troops * bunker + (isAir ? 400 : 1200) * (R / 10) * bunker;
        v.troops = Math.max(0, v.troops - loss);
      }
      v.lastHitBy = m.owner; v.lastHitAt = S.t;
      G.addRel(vid, m.owner, isEMP ? -15 : isAir ? -10 : -45);
      // the whole world dislikes nuclear users a little
      if (nuclear) for (const o of S.nations) if (o && o.alive && o.id !== m.owner && o.id !== vid) G.addRel(o.id, m.owner, -2);
      MP.War.declareWar(m.owner, vid);
      if (v.isPlayer) {
        if (isEMP) MP.Game.notify('emp.us', {});
        else { MP.Game.notify('missile.impact_us', { weapon: m.w }); S.stats.nukesTaken++; }
      }
      if (owner && owner.isPlayer && !isEMP) MP.Game.notify('missile.hit_enemy', { weapon: m.w, nation: v.name });
      // AI retaliation hook
      if (v.ai) MP.AI.onStruck(v, m.owner, m.w);
    }
    for (const s of G.structsNear(cx, cy, R)) {
      if (G.isAllied(m.owner, s.owner)) continue;
      if (isEMP) { s.disabledUntil = S.t + C.EMP_SECONDS; continue; }
      const d = U.dist(s.x, s.y, cx, cy);
      if (isAir) { if (d <= R * 0.6) G.downgradeStruct(s, 1); continue; }
      const bunker = G.mod(S.nations[s.owner], 'nukeDamage');
      if (d <= R * 0.7 && S.rng() < bunker) G.removeStruct(s); else G.downgradeStruct(s, 1);
    }
    // ships in blast
    for (const sh of S.ships) {
      if (G.isAllied(m.owner, sh.owner)) continue;
      if (U.dist2(sh.x, sh.y, cx, cy) <= R * R) sh.hp -= isEMP ? 0 : isAir ? 300 : 5000;
    }
    if (def.nuclear) {
      S.fallout.push({ x: cx, y: cy, r: R * 1.25, until: S.t + C.FALLOUT_SECONDS, born: S.t });
      if (!S.firstNuke) { S.firstNuke = true; MP.Game.notify('missile.world_first', {}); MP.Game.wire('FLASH', 'FIRST NUCLEAR DETONATION CONFIRMED', 'bad'); }
      const p = G.player();
      if (p && p.alive && Wp.inFalloutOf(p.id, cx, cy, R * 1.25)) MP.Game.notify('fallout.us', {});
    }
    S.clock -= (C.CLOCK[m.w] || 0) / (m.warhead ? C.WEAPON.MIRV.warheads : 1);
    MP.FX && MP.FX.detonation(cx, cy, R, m.w, m.det);
    const p = G.player();
    const near = p && p.alive && (hitN.has(p.id) || m.owner === p.id);
    MP.SFX.play(isAir ? 'explodeSmall' : isEMP ? 'emp' : m.w === 'Orbital' ? 'orbital' : 'nuke', cx, cy, near ? 1 : 0.45);
  };

  Wp.inFallout = function (x, y) {
    for (const f of G.S.fallout) if (U.dist2(f.x, f.y, x, y) <= f.r * f.r) return true;
    return false;
  };
  Wp.inFalloutOf = function (id, x, y, r) {
    const S = G.S;
    const n = S.nations[id];
    return n.capital >= 0 && U.dist2(n.capX, n.capY, x, y) < (r + 30) * (r + 30);
  };
  Wp.computeFalloutFrac = function () {
    const S = G.S, W = World.W;
    for (const n of S.nations) if (n) n.falloutFrac = 0;
    if (!S.fallout.length) return;
    const cnt = new Map();
    for (const f of S.fallout) {
      const x0 = Math.max(0, Math.floor(f.x - f.r)), x1 = Math.min(W - 1, Math.ceil(f.x + f.r));
      const y0 = Math.max(0, Math.floor(f.y - f.r)), y1 = Math.min(World.H - 1, Math.ceil(f.y + f.r));
      for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
        if ((x - f.x) * (x - f.x) + (y - f.y) * (y - f.y) > f.r * f.r) continue;
        const o = S.owner[x + y * W];
        if (o) cnt.set(o, (cnt.get(o) || 0) + 4);
      }
    }
    for (const [o, c] of cnt) { const n = S.nations[o]; if (n) n.falloutFrac = Math.min(1, c / Math.max(1, n.tiles)); }
  };
})();
