/* MIDNIGHT PROTOCOL — economy: troops, income, uranium, construction, convoys & roads */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const Eco = (MP.Eco = {});

  // ---------------- per-tick resources ----------------
  Eco.tick = function (dt) {
    const S = G.S;
    const quota = S.council.effects.some((e) => e.id === 'quota');
    for (let i = 1; i < S.nations.length; i++) {
      const n = S.nations[i];
      if (!n.alive || !n.spawned) continue;
      // troop cap
      let cityLv = 0;
      for (const c of n.st.city) if (c.build <= 0) cityLv += c.level;
      n.cap = (C.CAP_BASE + C.CAP_LAND_K * Math.pow(Math.max(1, n.tiles), C.CAP_LAND_P) + C.CITY_CAP * cityLv) * G.mod(n, 'cap');
      // growth
      const T = n.troops / 1000;
      let g = 0;
      if (n.troops < n.cap) {
        g = 1000 * C.GROW_K * Math.pow(Math.max(0, T), C.GROW_P) * (1 - n.troops / n.cap) + C.GROW_FLOOR;
        g *= G.mod(n, 'growth') * (n.supplyGrowth == null ? 1 : n.supplyGrowth) * (1 - 0.5 * (n.falloutFrac || 0));
        if (n.ai) g *= MP.CONFIG.DIFFICULTY[n.difficulty].eff;
        // the Void Armada is fed from orbit: it can be bled, but never into a death spiral
        if (n.isAlien) g = Math.max(g, n.cap * 0.002 * (1 - n.troops / n.cap));
        n.troops = Math.min(n.cap, n.troops + g * dt);
      } else {
        g = -(n.troops - n.cap) * 0.02;
        n.troops += g * dt;
      }
      n.growth = g;
      // income
      const inc = (C.BASE_INCOME + C.INCOME_PER_TILE * n.tiles) * G.mod(n, 'income');
      n.credits += inc * dt;
      n.incomeAcc += inc * dt;
      // uranium
      let uRate = C.URANIUM_BASE_RATE, hasPlant = false;
      for (const e of n.st.enrich) if (G.isActive(e)) { hasPlant = true; uRate += C.ENRICH_RATE * e.level; }
      uRate *= G.mod(n, 'uranium') * (quota ? 0.5 : 1);
      if (hasPlant || n.uranium < C.URANIUM_CAP_NO_DEPOSIT) {
        n.uranium += uRate * dt;
        if (!hasPlant && n.uranium > C.URANIUM_CAP_NO_DEPOSIT) n.uranium = C.URANIUM_CAP_NO_DEPOSIT;
      }
      n.uCapped = !hasPlant;
      n.uRate = uRate;
    }
    // smoothed income display (every second)
    S._incT = (S._incT || 0) + dt;
    if (S._incT >= 1) {
      for (let i = 1; i < S.nations.length; i++) {
        const n = S.nations[i];
        if (!n.alive) continue;
        n.incomeAvg = n.incomeAvg * 0.8 + (n.incomeAcc / S._incT) * 0.2;
        n.incomeAcc = 0;
      }
      S._incT = 0;
    }
    // construction progress
    for (const s of S.structs) {
      if (s.build > 0) {
        s.build -= dt;
        if (s.build <= 0) {
          s.build = 0;
          if (C.BUILD[s.type].defense) { s.ammo = s.level; s.reload = 0; }
          if (s.type === 'silo') s.ready = s.level;
          S.roadsDirty = true;
          const n = S.nations[s.owner];
          if (n && n.isPlayer) {
            MP.SFX.play('built');
            MP.Game.notify(s.level > 1 ? 'build.upgraded' : 'build.done', { type: C.BUILD[s.type].name, level: s.level });
          }
        }
      }
    }
    Eco.tickConvoys(dt);
  };

  // ---------------- placement ----------------
  // returns {ok, reason, tile, upgrade}
  Eco.checkPlace = function (n, type, t) {
    const S = G.S, w = World.W;
    if (t < 0 || t >= World.N) return { ok: false, reason: 'Off the map' };
    const x = t % w, y = (t / w) | 0;
    const b = C.BUILD[type];
    if (type === 'warship') {
      // any own port within 90 tiles of the click (land or sea)
      let best = null, bd = 1e9;
      for (const p of n.st.port) { if (p.build > 0) continue; const d = U.dist2(p.x, p.y, x, y); if (d < bd) { bd = d; best = p; } }
      if (!best) return { ok: false, reason: 'Needs a port' };
      if (bd > 90 * 90) return { ok: false, reason: 'Too far from your ports' };
      return { ok: true, tile: best.tile, port: best, patrol: World.land[t] ? null : [x, y] };
    }
    // upgrade an existing structure of the same type nearby?
    let up = null;
    for (let dy = -3; dy <= 3 && !up; dy++) for (let dx = -3; dx <= 3; dx++) {
      const s = S.structAt.get(t + dx + dy * w);
      if (s && s.owner === n.id && s.type === type) { up = s; break; }
    }
    if (up) {
      if (up.build > 0) return { ok: false, reason: 'Still under construction' };
      if (up.level >= 9) return { ok: false, reason: 'Maximum level' };
      return { ok: true, tile: up.tile, upgrade: up };
    }
    if (!World.land[t] || S.owner[t] !== n.id) return { ok: false, reason: 'Must be your land' };
    let tile = t;
    if (type === 'port') {
      let best = -1, bd = 1e9;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const u = t + dx + dy * w;
        if (u < 0 || u >= World.N || !World.coast[u] || S.owner[u] !== n.id) continue;
        if (World.navCellNear(x + dx, y + dy, 2) < 0) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = u; }
      }
      if (best < 0) return { ok: false, reason: 'Ports must be on the coast' };
      tile = best;
    }
    if (type === 'enrich') {
      let dep = null;
      for (const d of World.deposits) if (U.dist2(d.x, d.y, x, y) <= 36 && S.owner[d.tile] === n.id && !d.plant) { dep = d; break; }
      if (!dep) {
        const taken = World.deposits.some((d) => U.dist2(d.x, d.y, x, y) <= 36 && d.plant);
        return { ok: false, reason: taken ? 'Deposit already enriched' : 'Needs a free ☢ deposit', needDeposit: true };
      }
      tile = dep.tile;
      if (S.structAt.get(tile)) return { ok: false, reason: 'Deposit occupied' };
      return { ok: true, tile, deposit: dep };
    }
    const tx = tile % w, ty = (tile / w) | 0;
    for (const s of S.structs) {
      if (Math.abs(s.x - tx) < C.STRUCT_SPACING && Math.abs(s.y - ty) < C.STRUCT_SPACING) return { ok: false, reason: 'Too close to another structure' };
    }
    return { ok: true, tile };
  };

  Eco.canAfford = function (n, type) {
    const c = G.structCost(n, type);
    return n.credits >= c.credits && n.uranium >= c.u;
  };

  // perform placement (player or AI). returns struct/ship or null
  Eco.place = function (n, type, t, quiet) {
    const chk = Eco.checkPlace(n, type, t);
    if (!chk.ok) {
      if (n.isPlayer && !quiet) { MP.SFX.play('error'); MP.Game.toast(chk.reason, 'bad'); if (chk.needDeposit) MP.Game.notify('build.need_deposit', {}); else MP.Game.notify('build.bad_spot', { reason: chk.reason }); }
      return null;
    }
    const cost = G.structCost(n, type);
    if (n.credits < cost.credits || n.uranium < cost.u) {
      if (n.isPlayer && !quiet) { MP.SFX.play('error'); MP.Game.toast('Not enough ' + (n.credits < cost.credits ? 'credits' : 'uranium'), 'bad'); MP.Game.notify('build.cant_afford', { type: C.BUILD[type].name }); }
      return null;
    }
    n.credits -= cost.credits; n.uranium -= cost.u;
    const S = G.S;
    const b = C.BUILD[type];
    let time = b.time * G.mod(n, 'buildSpeed');
    if (type === 'silo') time *= G.mod(n, 'siloBuild');
    if (type === 'warship') {
      n.levels.warship = (n.levels.warship || 0) + 1;
      const ship = MP.Naval.spawnWarship(n, chk.port, chk.patrol, time * G.mod(n, 'shipBuild'));
      if (n.isPlayer) { MP.SFX.play('build'); S.stats.built.warship = (S.stats.built.warship || 0) + 1; MP.Game.tut('tut.warship'); }
      return ship;
    }
    let s;
    if (chk.upgrade) {
      s = chk.upgrade;
      s.level++;
      n.levels[type] = (n.levels[type] || 0) + 1;
      s.build = time; s.buildMax = time;
      if (n.isPlayer) MP.SFX.play('upgrade');
    } else {
      s = G.addStruct(n, type, chk.tile, { build: time, buildMax: time, depositTile: chk.deposit ? chk.deposit.tile : undefined });
      if (n.isPlayer) MP.SFX.play('build');
    }
    S.roadsDirty = true;
    if (n.isPlayer) {
      S.stats.built[type] = (S.stats.built[type] || 0) + 1;
      MP.Game.onPlayerBuilt(type, s);
    }
    return s;
  };

  // ---------------- roads & convoys ----------------
  function isStopType(s) { return s.type === 'city' || s.type === 'port' || s.type === 'factory'; }

  Eco.rebuildRoutes = function () {
    const S = G.S;
    S.roadsDirty = false;
    const roads = new Map();
    const addRoad = (a, b, kind, owner) => {
      const k = a.id < b.id ? a.id + ':' + b.id : b.id + ':' + a.id;
      const r = roads.get(k);
      if (r) { if (kind === 'white') r.kind = 'white'; return; }
      roads.set(k, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, kind, owner });
    };
    const fr2 = C.FACTORY_RANGE * C.FACTORY_RANGE, hr2 = C.HUB_RANGE * C.HUB_RANGE;
    const stops = S.structs.filter((s) => isStopType(s) && s.build <= 0);
    const hubs = S.structs.filter((s) => s.type === 'hub' && G.isActive(s));
    for (const f of S.structs) {
      if (f.type !== 'factory') continue;
      f.routes = []; f.hub = null;
      if (!G.isActive(f)) continue;
      const fo = f.owner;
      const okStop = (s) => s !== f && (s.owner === fo || (!G.embargoed(fo, s.owner) && !S.nations[fo].wars.has(s.owner)));
      for (const s of stops) {
        if (U.dist2(s.x, s.y, f.x, f.y) <= fr2 && okStop(s)) { f.routes.push(s); addRoad(f, s, 'grey', fo); }
      }
      // logistics hubs of the factory owner (or allies) extend the network
      let best = null, bd = 1e18;
      for (const h of hubs) {
        if (!G.isAllied(h.owner, fo)) continue;
        const d = U.dist2(h.x, h.y, f.x, f.y);
        if (d <= hr2 && d < bd) { bd = d; best = h; }
      }
      if (best) {
        f.hub = best;
        f.hubRoutes = [];
        addRoad(f, best, 'white', fo);
        for (const s of stops) {
          if (U.dist2(s.x, s.y, best.x, best.y) <= hr2 && okStop(s)) f.hubRoutes.push(s);
        }
      }
    }
    // hub network roads: hub ↔ stops within range (only draw nearest few to keep it readable)
    for (const h of hubs) {
      const near = stops.filter((s) => (s.owner === h.owner || G.isAllied(s.owner, h.owner)) && U.dist2(s.x, s.y, h.x, h.y) <= hr2)
        .sort((a, b) => U.dist2(a.x, a.y, h.x, h.y) - U.dist2(b.x, b.y, h.x, h.y)).slice(0, 5);
      for (const s of near) addRoad(h, s, 'white', h.owner);
      const hh = hubs.filter((h2) => h2 !== h && G.isAllied(h.owner, h2.owner) && U.dist2(h2.x, h2.y, h.x, h.y) <= hr2)
        .sort((a, b) => U.dist2(a.x, a.y, h.x, h.y) - U.dist2(b.x, b.y, h.x, h.y)).slice(0, 2);
      for (const h2 of hh) addRoad(h, h2, 'white', h.owner);
    }
    S.roads = Array.from(roads.values());
  };

  Eco.tickConvoys = function (dt) {
    const S = G.S;
    S._routeT = (S._routeT || 0) - dt;
    if (S.roadsDirty && S._routeT <= 0) { Eco.rebuildRoutes(); S._routeT = 2; }
    // spawn
    for (const f of S.structs) {
      if (f.type !== 'factory' || !G.isActive(f)) continue;
      const mult = Math.pow(2, f.level - 1); // each level doubles convoy output (designer)
      f.convoyT += dt * mult;
      if (f.convoyT < C.CONVOY_INTERVAL) continue;
      f.convoyT -= C.CONVOY_INTERVAL;
      if (f.convoyT > C.CONVOY_INTERVAL) f.convoyT = 0;
      if (S.convoys.length > 1800) continue;
      const viaHub = f.hub && G.isActive(f.hub) && f.hubRoutes && f.hubRoutes.length;
      const pool = viaHub ? f.hubRoutes : f.routes;
      if (!pool || !pool.length) continue;
      const pts = [[f.x, f.y]], stopsList = [];
      if (viaHub) {
        pts.push([f.hub.x, f.hub.y]);
        const a = pool[S.rng.int(pool.length)];
        let b2 = pool[S.rng.int(pool.length)];
        if (b2 === a && pool.length > 1) b2 = pool[(pool.indexOf(a) + 1) % pool.length];
        stopsList.push(a); pts.push([a.x, a.y]);
        if (b2 !== a) { stopsList.push(b2); pts.push([b2.x, b2.y]); }
      } else {
        const a = pool[S.rng.int(pool.length)];
        stopsList.push(a); pts.push([a.x, a.y]);
      }
      S.convoys.push({ owner: f.owner, factory: f, pts, seg: 0, p: 0, stops: stopsList, stopIdx: 0,
        speed: C.CONVOY_SPEED * (viaHub ? C.HUB_SPEED : 1), back: false, viaHub });
    }
    // move
    const W = World.W;
    for (let i = S.convoys.length - 1; i >= 0; i--) {
      const cv = S.convoys[i];
      const o = S.nations[cv.owner];
      if (!o || !o.alive) { S.convoys.splice(i, 1); continue; }
      const a = cv.pts[cv.seg], b = cv.pts[cv.seg + 1];
      if (!b) { S.convoys.splice(i, 1); continue; }
      const len = Math.max(0.5, Math.hypot(b[0] - a[0], b[1] - a[1]));
      cv.p += (cv.speed * dt) / len;
      const cx = a[0] + (b[0] - a[0]) * Math.min(1, cv.p), cy = a[1] + (b[1] - a[1]) * Math.min(1, cv.p);
      cv.x = cx; cv.y = cy;
      // cut route: passing through land of a nation at war with us → turn back
      if (!cv.back) {
        const t = Math.round(cx) + Math.round(cy) * W;
        const ow = S.owner[t];
        if (ow && ow !== cv.owner && o.wars.has(ow)) { Eco.turnBack(cv); continue; }
      }
      if (cv.p >= 1) {
        cv.p = 0; cv.seg++;
        if (cv.back) { if (cv.seg >= cv.pts.length - 1) S.convoys.splice(i, 1); continue; }
        // arrived at a stop?
        const stopIdxPt = cv.viaHub ? cv.seg - 1 : cv.seg; // pts: factory,[hub],stop1,stop2
        if (stopIdxPt >= 1) {
          const stop = cv.stops[stopIdxPt - 1];
          if (stop && !stop.dead && (stop.owner === cv.owner || (!G.embargoed(cv.owner, stop.owner) && !o.wars.has(stop.owner)))) {
            const dist = Math.hypot(stop.x - cv.factory.x, stop.y - cv.factory.y);
            const pay = C.CONVOY_PAY * (1 + dist / 60);
            o.credits += pay; o.incomeAcc += pay;
            if (o.isPlayer) S.stats.convoyIncome += pay;
            const so = S.nations[stop.owner];
            if (so && so.alive) { const sp = pay * C.CONVOY_FOREIGN_SHARE; so.credits += sp; so.incomeAcc += sp; }
            if (o.isPlayer || (so && so.isPlayer)) MP.FX && MP.FX.coin(stop.x, stop.y);
          } else if (stop) {
            Eco.turnBack(cv);
            if (o.isPlayer && stop.owner !== cv.owner) MP.Game.notify('econ.convoy_blocked', { nation: S.nations[stop.owner] ? S.nations[stop.owner].name : 'ENEMY' });
            continue;
          }
        }
        if (cv.seg >= cv.pts.length - 1) S.convoys.splice(i, 1);
      }
    }
  };

  Eco.turnBack = function (cv) {
    const cur = [cv.x, cv.y];
    const back = [cur];
    for (let k = cv.seg; k >= 0; k--) back.push(cv.pts[k]);
    cv.pts = back; cv.seg = 0; cv.p = 0; cv.back = true;
  };
})();
