/* MIDNIGHT PROTOCOL — land warfare: spawning, attacks, forts, supply, pockets, elimination */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const War = (MP.War = {});

  // ---------------- spawning ----------------
  War.spawnAt = function (n, t) {
    const S = G.S, w = World.W;
    const cx = t % w, cy = (t / w) | 0;
    const r = C.SPAWN_RADIUS;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= w || y >= World.H) continue;
      const u = x + y * w;
      if (!World.land[u] || S.owner[u]) continue;
      G.setOwner(u, n.id, 0);
    }
    if (S.owner[t] !== n.id) G.setOwner(t, n.id, 0);
    G.setCapital(n, t);
    n.spawned = true;
  };

  War.validSpawn = function (t, minDist) {
    const S = G.S, w = World.W;
    if (t < 0 || !World.land[t] || S.owner[t]) return false;
    const x = t % w, y = (t / w) | 0;
    if (World.terr[t] >> 2 === 2) return false;
    const md2 = (minDist || 18) * (minDist || 18);
    for (const n of S.nations) if (n && n.spawned && U.dist2(n.capX, n.capY, x, y) < md2) return false;
    // need some land around
    let c = 0;
    for (let dy = -6; dy <= 6; dy += 3) for (let dx = -6; dx <= 6; dx += 3) { const u = t + dx + dy * w; if (u >= 0 && u < World.N && World.land[u]) c++; }
    return c >= 18;
  };

  War.randomSpawnTile = function (rng, prefer) {
    const N = World.N;
    for (let k = 0; k < 4000; k++) {
      const t = rng.int(N);
      if (!War.validSpawn(t, k < 2500 ? 22 : 12)) continue;
      if (prefer === 'deposit' && k < 1500) {
        const x = t % World.W, y = (t / World.W) | 0;
        if (!World.deposits.some((d) => !d.owner && U.dist2(d.x, d.y, x, y) < 900)) continue;
      }
      if (prefer === 'coast' && k < 1500) {
        const x = t % World.W, y = (t / World.W) | 0;
        if (World.navCellNear(x, y, 10) < 0) continue;
      }
      return t;
    }
    return -1;
  };

  // ---------------- attacks ----------------
  function neighbors(t) {
    const w = World.W, x = t % w;
    return [x > 0 ? t - 1 : -1, x < w - 1 ? t + 1 : -1, t >= w ? t - w : -1, t < World.N - w ? t + w : -1];
  }
  War.neighbors = neighbors;

  War.bordersWith = function (a, b) { // does nation a touch nation b (or unclaimed when b=0)?
    const S = G.S, owner = S.owner, land = World.land;
    for (const t of S.nations[a].border) {
      for (const u of neighbors(t)) if (u >= 0 && owner[u] === b && (b !== 0 || land[u])) return true;
    }
    return false;
  };

  War.launch = function (from, to, troops, opts) {
    const S = G.S;
    const a = S.nations[from];
    if (!a || !a.alive || troops < 1) return null;
    if (to && !G.canAttack(from, to)) return null;
    troops = Math.min(troops, a.troops);
    if (troops < 50) return null;
    // merge with an existing attack on the same target
    let at = S.attacks.find((x) => !x.done && x.from === from && x.to === to && !x.boat);
    // opposing attack cancels troops first
    const opp = to ? S.attacks.find((x) => !x.done && x.from === to && x.to === from && !x.boat) : null;
    a.troops -= troops;
    if (opp) {
      const m = Math.min(opp.troops, troops);
      opp.troops -= m; troops -= m;
      if (opp.troops < 1) opp.done = true;
      if (troops < 1) return opp;
    }
    const fx = opts && opts.fx != null ? opts.fx : null, fy = opts && opts.fy != null ? opts.fy : null;
    if (at && !(opts && opts.seed != null)) {
      at.troops += troops; at.initial += troops;
      if (fx != null) {
        // re-clicking near the same mark concentrates harder; a new mark shifts the weight of the assault
        const near = at.fx != null && U.dist2(at.fx, at.fy, fx, fy) < 900;
        at.fx = fx; at.fy = fy; at.press = Math.min(1, (near ? at.press : at.press * 0.5) + 0.3);
      }
      War.refreshFrontier(at);
      return at;
    }
    at = { id: S.nextAttackId++, from, to, troops, initial: troops, front: [], inFront: new Set(), budget: 0, done: false,
      boat: !!(opts && opts.boat), started: S.t, captured: 0, idle: 0, def: 0, defPeak: 0, defNext: S.t + 1.5 + S.rng() * 2.5,
      fx, fy, press: fx != null ? 0.5 : 0 };
    S.attacks.push(at);
    if (opts && opts.seed != null) War.seedFrom(at, opts.seed); else War.refreshFrontier(at);
    if (to) War.declareWar(from, to);
    // notifications
    const d = to ? S.nations[to] : null;
    if (d && d.isPlayer) {
      MP.Game.notify('attack.incoming', { nation: a.name, troops: U.fmtK(troops) });
      MP.SFX.play('invaded');
      MP.Game.wire('IMINT', `${a.name} PROBES YOUR BORDER`, 'imint');
    }
    return at;
  };

  War.declareWar = function (from, to) {
    const S = G.S, a = S.nations[from], d = S.nations[to];
    if (!a || !d) return;
    const fresh = !a.wars.has(to);
    a.wars.add(to); d.wars.add(from);
    G.addRel(to, from, -12);
    if (fresh) {
      // defender embargoes the aggressor "for the attack"
      if (!d.embargo.has(from) && !d.isPlayer) {
        d.embargo.add(from);
        if (a.isPlayer) { MP.Game.wire('CABLE', `${d.name} EMBARGOES YOU · FOR THE ATTACK`, 'embargo'); MP.Game.notify('diplo.embargo_us', { nation: d.name }); }
      }
      // allies of the defender cool on the attacker
      for (const al of d.allies) G.addRel(al, from, -10);
      for (const al of d.allies) { const n = S.nations[al]; if (n && n.isPlayer) MP.Game.notify('diplo.ally_attacked', { nation: d.name }); }
      S.roadsDirty = true;
    }
  };

  War.seedFrom = function (at, t) {
    const S = G.S;
    // capture the landing tile directly
    const own = S.owner[t];
    if (own === at.from) { War.refreshFrontier(at); return; }
    if (own !== at.to) at.to = own;
    G.setOwner(t, at.from, C.DUG_IN_SECONDS);
    for (const u of neighbors(t)) War.pushFront(at, u);
    War.refreshFrontier(at, true);
  };

  War.pushFront = function (at, u) {
    if (u < 0) return;
    const S = G.S;
    if (S.owner[u] !== at.to || !World.land[u] || at.inFront.has(u)) return;
    at.inFront.add(u); at.front.push(u);
  };

  War.refreshFrontier = function (at, keep) {
    const S = G.S, a = S.nations[at.from];
    if (!keep) { at.front.length = 0; at.inFront.clear(); }
    for (const t of a.border) for (const u of neighbors(t)) War.pushFront(at, u);
  };

  // number of fort layers protecting (x,y) for defender defId against attacker atkId (0 = none)
  function fortFactor(defId, x, y, atkId) {
    if (!defId) return 0;
    const S = G.S, d = S.nations[defId];
    const homeReclaim = atkId && G.has(S.nations[atkId], 'homeland') && S.home[x + y * World.W] === atkId;
    let n = 0;
    const rm = G.mod(d, 'fortRadius');
    for (const f of d.st.fort) {
      if (!G.isActive(f)) continue;
      if (homeReclaim && f.builtBy === atkId) continue; // Homeland walks straight through forts it built itself
      const r = C.FORT_RADIUS * Math.pow(2, f.level - 1) * rm;
      if (U.dist2(f.x, f.y, x, y) <= r * r) { n++; if (n >= 2) break; }
    }
    if (S.tempForts) for (const tf of S.tempForts) if (tf.owner === defId && tf.until > S.t && U.dist2(tf.x, tf.y, x, y) <= tf.r * tf.r) n++;
    return Math.min(2, n);
  }
  War.fortFactor = fortFactor;

  War.supplyDist = function (n, x, y) {
    let best = n.capital >= 0 ? U.dist2(n.capX, n.capY, x, y) : 1e12;
    for (const c of n.st.city) { if (c.build > 0) continue; const d = U.dist2(c.x, c.y, x, y); if (d < best) best = d; }
    for (const h of n.st.hub) { if (!G.isActive(h)) continue; const d = U.dist2(h.x, h.y, x, y); if (d < best) best = d; }
    return Math.sqrt(best);
  };

  War.tileCost = function (at, t) {
    const S = G.S, a = S.nations[at.from], v = World.terr[t];
    const w = World.W, x = t % w, y = (t / w) | 0;
    let cost = C.TERRAIN_COST[v & 3] * C.ELEV_COST[v >> 2];
    let slow = 1 / C.ELEV_SPEED[v >> 2];
    if (at.to) {
      const d = S.nations[at.to];
      if (!G.isSoft(t) && !MP.Weapons.inFallout(x, y)) cost *= C.DUG_IN_MULT;
      cost += (d.troops / Math.max(1, d.tiles)) * C.DENSITY_COST;
      cost *= G.mod(d, 'defendCost');
      const ff = fortFactor(at.to, x, y, at.from);
      if (ff) { cost *= C.FORT_COST_MULT * (ff > 1 ? 1.5 : 1); slow *= C.FORT_SLOW * (ff > 1 ? 1.3 : 1); }
      // capital garrison: the ground around a capital is the hardest in the nation
      if (d.capital >= 0) { const gx = x - d.capX, gy = y - d.capY; if (gx * gx + gy * gy <= C.CAPITAL_GUARD_R * C.CAPITAL_GUARD_R) { cost *= C.CAPITAL_GUARD_COST; slow *= C.CAPITAL_GUARD_SLOW; } }
      // Homeland reclaiming its own soil: 25% cheaper, 3× faster
      if (G.has(a, 'homeland') && S.home[t] === at.from) { cost *= 0.75; slow /= 3; }
      // Scorched Earth retaking burnt land it once held: half price
      if (G.has(a, 'scorched') && S.prevOwner[t] === at.from && G.isSoft(t)) cost *= 0.5;
      // Blitzkrieg without numbers bleeds
      if (G.has(a, 'blitzkrieg') && at.troops < at.def + (d.troops / Math.max(1, d.tiles)) * Math.min(at.front.length, 400) * 0.5) cost *= 1.5;
    }
    // concentrated forces near the clicked mark: cheaper and faster there, thinner elsewhere
    if (at.fx != null && at.press > 0) {
      const dd = Math.hypot(x - at.fx, y - at.fy);
      const near = Math.exp(-dd / 45);
      cost *= 1 - 0.22 * at.press * near + 0.12 * at.press * (1 - near);
      slow *= 1 - 0.35 * at.press * near;
    }
    cost *= G.mod(a, 'attackCost');
    // supply lines
    const free = C.SUPPLY_FREE * G.mod(a, 'supply');
    const sd = War.supplyDist(a, x, y);
    if (sd > free) cost *= 1 + Math.min(C.SUPPLY_MAX_PENALTY, (sd - free) / C.SUPPLY_SPAN);
    if (MP.Weather.stormAt(x, y)) slow *= 1.6;
    if (a.ai) cost /= MP.CONFIG.DIFFICULTY[a.difficulty].eff;
    return { cost, slow };
  };

  War.tick = function (dt) {
    const S = G.S, owner = S.owner;
    for (let i = 0; i < S.attacks.length; i++) {
      const at = S.attacks[i];
      if (at.done) continue;
      const a = S.nations[at.from];
      if (!a.alive) { at.done = true; continue; }
      if (at.to && (!S.nations[at.to].alive || !G.canAttack(at.from, at.to))) { War.finish(at, true); continue; }
      if (at.to && S.t >= at.defNext) War.aiDefend(at);
      if (at.press > 0) at.press = Math.max(0.15, at.press - 0.01 * dt);
      let speed = (C.ATTACK_SPEED_BASE + Math.sqrt(Math.max(0, at.troops)) * C.ATTACK_SPEED_SQRT) * G.mod(a, 'attackSpeed');
      if (!at.to) speed *= C.EXPAND_SPEED_MULT;
      at.budget += speed * dt;
      let guard = 0;
      while (at.budget >= 1 && guard++ < 400) {
        if (!at.front.length) {
          at.idle++;
          if (at.idle > 2) { War.finish(at, true); break; }
          War.refreshFrontier(at);
          if (!at.front.length) { War.finish(at, true); break; }
          continue;
        }
        let k = S.rng.int(at.front.length);
        if (at.fx != null && at.press > 0.02 && at.front.length > 2) {
          // tournament pick: more pressure (and Blitzkrieg / Spearhead) = stronger pull toward the mark
          const tries = 1 + Math.round(at.press * 5 * G.mod(a, 'breakthrough'));
          const W0 = World.W;
          let bd = 1e18;
          for (let q = 0; q < tries; q++) {
            const kk = q === 0 ? k : S.rng.int(at.front.length);
            const tt = at.front[kk], tx = tt % W0, ty = (tt / W0) | 0;
            let sc = (tx - at.fx) * (tx - at.fx) + (ty - at.fy) * (ty - at.fy);
            if (at.to && fortFactor(at.to, tx, ty, at.from)) sc += 3600; // seek the gaps between forts
            if (sc < bd) { bd = sc; k = kk; }
          }
        }
        const t = at.front[k];
        at.front[k] = at.front[at.front.length - 1]; at.front.pop(); at.inFront.delete(t);
        if (owner[t] !== at.to || !World.land[t]) continue;
        // must touch attacker land
        let touch = false;
        for (const u of neighbors(t)) if (u >= 0 && owner[u] === at.from) { touch = true; break; }
        if (!touch) continue;
        const tc = War.tileCost(at, t);
        let defCost = 0;
        if (at.def > 0) { // committed defenders hold the line: each tile costs more and is taken slower
          defCost = Math.min(at.def, at.def / Math.max(25, at.front.length) * 1.4 + 2);
          tc.cost += defCost * 1.2;
          tc.slow *= 1 + Math.min(2, at.def / Math.max(1, at.troops));
        }
        if (at.troops < tc.cost) {
          at.inFront.add(t); at.front.push(t);
          War.finish(at, false);
          break;
        }
        at.troops -= tc.cost;
        at.budget -= tc.slow;
        at.idle = 0;
        if (defCost) at.def = Math.max(0, at.def - defCost);
        if (at.to) {
          const d = S.nations[at.to];
          const loss = Math.min(d.troops, (d.troops / Math.max(1, d.tiles)) * C.DENSITY_LOSS);
          d.troops -= loss;
          d.lastHitBy = at.from; d.lastHitAt = S.t;
        }
        G.setOwner(t, at.from, C.DUG_IN_SECONDS);
        at.captured++;
        for (const u of neighbors(t)) War.pushFront(at, u);
        if (at.to && S.nations[at.to].tiles <= 0) { G.eliminate(at.to, at.from); War.finish(at, true); break; }
      }
    }
    // cleanup finished attacks
    for (let i = S.attacks.length - 1; i >= 0; i--) if (S.attacks[i].done) S.attacks.splice(i, 1);
  };

  War.finish = function (at, returnTroops) {
    if (at.done) return;
    const S = G.S, a = S.nations[at.from];
    at.done = true;
    if (returnTroops && a && a.alive && at.troops > 0) a.troops += at.troops;
    const d = at.to ? S.nations[at.to] : null;
    if (d && d.alive && at.def > 0) { d.troops += at.def; at.def = 0; } // surviving defenders stand down
    if (d && d.isPlayer && d.alive && at.captured < 40 && S.t - at.started > 3) MP.Game.notify('attack.repelled', { nation: a.name });
    if (a && a.isPlayer && !returnTroops && at.captured < 5) MP.Game.notify('attack.stalled', {});
  };

  // defender commits troops to hold a front (shown as the defender's number on the map)
  War.commitDefense = function (at, amount) {
    const S = G.S, d = S.nations[at.to];
    if (!d || !d.alive || at.done) return 0;
    amount = Math.min(amount, d.troops);
    if (amount < 50) return 0;
    d.troops -= amount; at.def += amount; at.defPeak = Math.max(at.defPeak, at.def);
    return amount;
  };
  War.aiDefend = function (at) {
    const S = G.S, d = S.nations[at.to];
    at.defNext = S.t + 6 + S.rng() * 4;
    if (!d || !d.ai || !d.alive) return;
    const pers = C.PERSONALITIES[d.personality] || C.PERSONALITIES.opportunist;
    if (at.troops < d.troops * 0.06 && at.troops < 3000) return;           // a probe: not worth committing
    if (at.def > at.troops * 0.5) return;                                    // the line already holds
    const want = Math.min(d.troops * (0.22 + pers.defense * 0.2), at.troops * (0.55 + pers.defense * 0.35)) - at.def;
    if (want > 0) War.commitDefense(at, want);
  };

  War.recall = function (at) {
    if (at.done) return;
    War.finish(at, true);
  };

  // ---------------- pockets / supply connectivity (one nation per call) ----------------
  War.pocketCursor = 1;
  War.tickPockets = function () {
    const S = G.S;
    if (S.pockets) for (let i = S.pockets.length - 1; i >= 0; i--) if (S.t - S.pockets[i].seen > (S.pockets[i].breakout ? 80 : 16) || !S.nations[S.pockets[i].nation].alive) S.pockets.splice(i, 1);
    if (S.tempForts) for (let i = S.tempForts.length - 1; i >= 0; i--) if (S.tempForts[i].until <= S.t) S.tempForts.splice(i, 1);
    const nn = S.nations.length;
    for (let tries = 0; tries < nn; tries++) {
      War.pocketCursor = War.pocketCursor % (nn - 1) + 1;
      const n = S.nations[War.pocketCursor];
      if (n && n.alive && n.spawned && n.tiles > 0) { War.analyzePockets(n); return; }
    }
  };

  const visit = { arr: null, gen: 0 };
  War.analyzePockets = function (n) {
    const S = G.S, owner = S.owner, w = World.W, N = World.N;
    if (!visit.arr) visit.arr = new Uint32Array(N);
    const id = n.id;
    const comps = [];
    const stack = [];
    const g = ++visit.gen; // one generation per pass: every tile of this nation visited once
    for (const start of n.border) {
      if (visit.arr[start] === g) continue;
      stack.length = 0; stack.push(start); visit.arr[start] = g;
      let size = 0, hasCap = false, open = false;
      const nb = new Map();
      const tiles = [];
      while (stack.length) {
        const t = stack.pop(); size++; tiles.push(t);
        if (t === n.capital) hasCap = true;
        const x = t % w;
        const ns = [x > 0 ? t - 1 : -1, x < w - 1 ? t + 1 : -1, t - w, t + w];
        for (const u of ns) {
          if (u < 0 || u >= N) continue;
          const o = owner[u];
          if (o === id) { if (visit.arr[u] !== g) { visit.arr[u] = g; stack.push(u); } }
          else if (!World.land[u] || o === 0) open = true;
          else nb.set(o, (nb.get(o) || 0) + 1);
        }
      }
      comps.push({ size, hasCap, open, nb, tiles });
    }
    // re-mark nothing else; compute supply connectivity
    let connected = 0;
    for (const c of comps) if (c.hasCap) connected += c.size;
    n.supplyGrowth = 0.5 + 0.5 * (connected / Math.max(1, n.tiles));
    // annex enclosed pockets
    for (const c of comps) {
      if (c.hasCap || c.open || c.size > n.tiles * 0.3) continue;
      let best = 0, bc = 0;
      for (const [o, cnt] of c.nb) if (cnt > bc && G.canAttack(o, id)) { bc = cnt; best = o; }
      if (!best) continue;
      let cx = 0, cy = 0; for (const t of c.tiles) { cx += t % w; cy += (t / w) | 0; } cx /= c.size; cy /= c.size;
      S.pockets = S.pockets || [];
      const trapped = n.troops * c.size / Math.max(1, n.tiles);
      let pk = S.pockets.find((q) => q.nation === id && U.dist2(q.x, q.y, cx, cy) < 900);
      const notable = c.size >= 25 || (n.isPlayer && c.size >= 8);
      if (!pk && notable) {
        const byN = S.nations[best];
        const delay = 7 * (G.has(byN, 'blitzkrieg') ? 0.75 : 1) * (G.has(byN, 'pincer') ? 0.6 : 1);
        pk = { nation: id, by: best, x: cx, y: cy, troops: trapped, size: c.size, seen: S.t, annexAt: S.t + delay };
        S.pockets.push(pk);
        // Call for the Motherland: encircled troops on home soil dig in like a fort and break out toward the main force
        let homeTiles = 0; for (const t of c.tiles) if (S.home[t] === id) homeTiles++;
        if (G.has(n, 'motherland') && homeTiles > c.size * 0.6) {
          let ownFort = false;
          for (const f of n.st.fort) if (U.dist2(f.x, f.y, cx, cy) < 70 * 70) { ownFort = true; break; }
          S.tempForts = S.tempForts || [];
          S.tempForts.push({ owner: id, x: cx, y: cy, r: Math.max(10, Math.sqrt(c.size) * 1.3) * (ownFort ? 1.4 : 1), until: S.t + 75 });
          pk.breakout = true; pk.annexAt = S.t + 75;
          // the pocket pushes back toward the capital
          let seed = -1, bd = 1e18;
          for (let q = 0; q < c.tiles.length; q += Math.max(1, Math.floor(c.tiles.length / 60))) {
            const t = c.tiles[q]; const d2 = U.dist2(t % w, (t / w) | 0, n.capX, n.capY);
            if (d2 < bd) { bd = d2; seed = t; }
          }
          if (seed >= 0) { const nb = neighbors(seed).find((u) => u >= 0 && owner[u] === best); if (nb != null) War.launch(id, best, Math.max(trapped, 500), { seed: nb, fx: n.capX, fy: n.capY }); }
          if (n.isPlayer) { MP.Game.wire('IMINT', `CALL FOR THE MOTHERLAND — ${U.fmtInt(trapped)} TROOPS BREAK OUT`, 'good'); MP.SFX.play('milestone'); }
          continue;
        }
        if (n.isPlayer) { MP.Game.notify('pocket.cut', {}); MP.Game.wire('IMINT', `${U.fmtInt(trapped)} OF YOUR TROOPS ENCIRCLED BY ${byN.name}`, 'bad'); }
        else if (byN && byN.isPlayer) MP.Game.wire('IMINT', `${U.fmtInt(trapped)} ${n.name} TROOPS ENCIRCLED`, 'good');
        continue;
      }
      if (pk) {
        pk.seen = S.t; pk.troops = trapped; pk.x = cx; pk.y = cy; pk.by = best; pk.size = c.size;
        if (S.t < pk.annexAt) continue;
        if (pk.breakout) { S.pockets.splice(S.pockets.indexOf(pk), 1); continue; } // the breakout window closed; re-evaluate next pass
        S.pockets.splice(S.pockets.indexOf(pk), 1);
      }
      for (const t of c.tiles) G.setOwner(t, best, C.DUG_IN_SECONDS);
      // pocketed troops are lost
      n.troops *= 1 - Math.min(0.5, c.size / Math.max(1, n.tiles + c.size));
      if (n.isPlayer) MP.Game.notify('pocket.cut', {});
      if (n.tiles <= 0) { G.eliminate(id, best); return; }
    }
    if (n.isPlayer && connected < n.tiles * 0.85) MP.Game.notify('supply.overextended', {});
  };

  // ---------------- elimination sweep ----------------
  War.tickElim = function () {
    const S = G.S;
    for (const n of S.nations) {
      if (!n || !n.alive || !n.spawned) continue;
      if (n.tiles <= 0 || (n.capital < 0 && n.tiles < 40)) G.eliminate(n.id, n.lastHitBy || 0);
    }
  };
})();
