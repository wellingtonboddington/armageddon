/* MIDNIGHT PROTOCOL — naval: trade ships, warships (patrol/fuel/hunt/prize), troop transports */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const Naval = (MP.Naval = {});
  let shipId = 1;

  function moveAlong(sh, dt) {
    // returns true when path finished
    let remaining = sh.speed * dt;
    while (remaining > 0 && sh.path && sh.pi < sh.path.length) {
      const [tx, ty] = sh.path[sh.pi];
      const dx = tx - sh.x, dy = ty - sh.y, d = Math.hypot(dx, dy);
      if (d <= remaining) { sh.x = tx; sh.y = ty; sh.pi++; remaining -= d; }
      else { sh.x += dx / d * remaining; sh.y += dy / d * remaining; sh.ang = Math.atan2(dy, dx); remaining = 0; }
    }
    return !sh.path || sh.pi >= sh.path.length;
  }

  Naval.hostile = function (a, b) { // naval hostility: at war or embargoed, never allied
    if (a === b || G.isAllied(a, b) || G.hasTruce(a, b)) return false;
    const na = G.S.nations[a];
    return na.wars.has(b) || G.embargoed(a, b);
  };

  // ---------------- transports ----------------
  // launch a troop transport from our nearest coast to a coastal target tile
  // how much enemy-held land surrounds a coast tile (0–25, sampled 5×5 at stride 2 over a 9×9 box)
  Naval.landMass = function (u, selfId) {
    const S = G.S, w = World.W, x = u % w, y = (u / w) | 0;
    let c = 0;
    for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= World.H) continue;
      const t = xx + yy * w;
      if (World.land[t] && S.owner[t] !== selfId) c++;
    }
    return c;
  };

  Naval.launchTransport = function (n, targetTile, troops) {
    const S = G.S, w = World.W;
    const tx = targetTile % w, ty = (targetTile / w) | 0;
    // landing tile: nearest coast tile to the click that is not ours
    // (prefers shore with real land behind it, so a landing doesn't strand itself on a one-tile islet)
    let land = -1, bd = 1e9;
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
      const u = targetTile + dx + dy * w;
      if (u < 0 || u >= World.N || !World.coast[u] || S.owner[u] === n.id) continue;
      const d = dx * dx + dy * dy - 10 * Naval.landMass(u, n.id); if (d < bd) { bd = d; land = u; }
    }
    if (land < 0) return { ok: false, reason: 'No coast to land on there' };
    const lx = land % w, ly = (land / w) | 0;
    const tgtOwner = S.owner[land];
    if (tgtOwner && !G.canAttack(n.id, tgtOwner)) return { ok: false, reason: 'Allied or under truce' };
    // departure: prefer own ports, else nearest own coast tile (sampled)
    let dep = null, dd = 1e18;
    for (const p of n.st.port) { if (p.build > 0) continue; const d = U.dist2(p.x, p.y, lx, ly); if (d < dd) { dd = d; dep = [p.x, p.y]; } }
    if (!dep) {
      let k = 0;
      for (const t of n.border) {
        if (!World.coast[t]) continue;
        if ((k++ & 3) !== 0) continue;
        const x = t % w, y = (t / w) | 0, d = U.dist2(x, y, lx, ly);
        if (d < dd) { dd = d; dep = [x, y]; }
      }
    }
    if (!dep) return { ok: false, reason: 'You have no coastline' };
    const path = World.seaPath(dep[0], dep[1], lx, ly);
    if (!path || path.length < 2) return { ok: false, reason: 'No sea route' };
    path.push([lx, ly]);
    troops = Math.min(troops, n.troops);
    if (troops < 100) return { ok: false, reason: 'Not enough troops' };
    n.troops -= troops;
    const sh = { id: shipId++, kind: 'transport', owner: n.id, x: path[0][0], y: path[0][1], path, pi: 1, speed: C.TRANSPORT.speed * 2.2,
      hp: C.TRANSPORT.hp, maxHp: C.TRANSPORT.hp, troops, landing: land, target: tgtOwner, ang: 0, born: S.t };
    S.ships.push(sh);
    if (tgtOwner) War_declare(n.id, tgtOwner);
    const tn = S.nations[tgtOwner];
    if (tn && tn.isPlayer) {
      MP.Game.notify('naval.transport_inbound', { nation: n.name });
      MP.Game.wire('RADAR', `${n.name} TRANSPORT BOUND FOR YOUR COAST`, 'radar');
      MP.SFX.play('naval');
    }
    if (n.isPlayer) MP.SFX.play('launchBoat');
    return { ok: true, ship: sh };
  };
  function War_declare(a, b) { MP.War.declareWar(a, b); }

  // ---------------- warships ----------------
  Naval.spawnWarship = function (n, port, patrol, buildTime) {
    const S = G.S;
    const cell = World.navCellNear(port.x, port.y, 4);
    const sx = cell >= 0 ? (cell % World.NW) * 2 + 1 : port.x, sy = cell >= 0 ? ((cell / World.NW) | 0) * 2 + 1 : port.y;
    const hp = C.WARSHIP.hp * G.mod(n, 'shipHp');
    const sh = { id: shipId++, kind: 'warship', owner: n.id, x: sx, y: sy, homeX: sx, homeY: sy, port, path: null, pi: 0,
      speed: C.WARSHIP.speed * 2.2, hp, maxHp: hp, fuel: C.WARSHIP.fuel, state: 'building', build: buildTime, buildMax: buildTime,
      patrolX: patrol ? patrol[0] : sx, patrolY: patrol ? patrol[1] : sy, target: null, scanT: 0, ang: 0, cool: 0, born: S.t };
    S.ships.push(sh);
    return sh;
  };

  Naval.assignPatrol = function (sh, x, y) {
    sh.patrolX = x; sh.patrolY = y; sh.state = 'patrol'; sh.path = null; sh.target = null;
  };

  function pickPatrolPoint(sh) {
    const S = G.S;
    for (let k = 0; k < 12; k++) {
      const a = S.rng() * Math.PI * 2, r = S.rng() * C.WARSHIP.patrol * 0.6;
      const x = sh.patrolX + Math.cos(a) * r, y = sh.patrolY + Math.sin(a) * r;
      if (World.navCellNear(Math.round(x), Math.round(y), 0) >= 0) return [x, y];
    }
    return [sh.patrolX, sh.patrolY];
  }

  // ---------------- trade ships ----------------
  Naval.tickTrade = function (dt) {
    const S = G.S;
    if (S.ships.length > 600) return;
    for (const p of S.structs) {
      if (p.type !== 'port' || !G.isActive(p)) continue;
      p.tradeT += dt * (1 + 0.5 * (p.level - 1));
      if (p.tradeT < C.TRADE_SHIP_INTERVAL) continue;
      p.tradeT = 0;
      // destination: random reachable port (foreign preferred), not embargoed / at war
      const o = S.nations[p.owner];
      const cands = [];
      for (const q of S.structs) {
        if (q === p || q.type !== 'port' || !G.isActive(q)) continue;
        if (q.owner !== p.owner && (G.embargoed(p.owner, q.owner) || o.wars.has(q.owner))) continue;
        const d2 = U.dist2(p.x, p.y, q.x, q.y);
        if (d2 > C.TRADE_RANGE * C.TRADE_RANGE || d2 < 400) continue;
        cands.push(q);
      }
      if (!cands.length) continue;
      p.routes = p.routes || new Map();
      const known = cands.filter((c) => p.routes.get(c.id));
      const q = known.length && S.rng() < 0.85 ? known[S.rng.int(known.length)] : cands[S.rng.int(cands.length)];
      let path = p.routes.get(q.id);
      if (path === undefined) {
        path = World.seaPath(p.x, p.y, q.x, q.y, 45000, true);
        if (path === undefined) { p.tradeT = C.TRADE_SHIP_INTERVAL * 0.8; continue; } // budget exhausted, retry soon
        p.routes.set(q.id, path || null);
      }
      if (!path || path.length < 2) continue;
      path = path.slice();
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      const cargo = C.TRADE_SHIP_PAY * (1 + dist / 300) * G.mod(o, 'tradeShip');
      S.ships.push({ id: shipId++, kind: 'trade', owner: p.owner, x: path[0][0], y: path[0][1], path, pi: 1, speed: C.TRADE_SHIP_SPEED * 2.2,
        hp: C.TRADE_SHIP_HP, maxHp: C.TRADE_SHIP_HP, cargo, dest: q, from: p, ang: 0, born: S.t });
    }
  };

  // ---------------- tick ----------------
  Naval.tick = function (dt) {
    const S = G.S;
    Naval.tickTrade(dt);
    const ships = S.ships;
    for (let i = ships.length - 1; i >= 0; i--) {
      const sh = ships[i];
      const o = S.nations[sh.owner];
      if (!o || !o.alive || sh.hp <= 0) {
        if (sh.hp <= 0) Naval.sunk(sh);
        ships.splice(i, 1); continue;
      }
      if (sh.kind === 'trade') {
        if (moveAlong(sh, dt)) {
          const q = sh.dest;
          if (q && !q.dead && (q.owner === sh.owner || !G.embargoed(sh.owner, q.owner))) {
            o.credits += sh.cargo; o.incomeAcc += sh.cargo;
            const qo = S.nations[q.owner];
            if (qo && qo.alive && q.owner !== sh.owner) { qo.credits += sh.cargo * 0.6; qo.incomeAcc += sh.cargo * 0.6; }
            if (o.isPlayer || (qo && qo.isPlayer)) MP.FX && MP.FX.coin(q.x, q.y);
          }
          ships.splice(i, 1);
        }
      } else if (sh.kind === 'transport') {
        if (moveAlong(sh, dt)) { Naval.land(sh); ships.splice(i, 1); }
      } else if (sh.kind === 'warship') {
        Naval.tickWarship(sh, dt);
      }
    }
  };

  Naval.tickWarship = function (sh, dt) {
    const S = G.S, W = C.WARSHIP;
    if (sh.state === 'building') {
      sh.build -= dt;
      if (sh.build <= 0) {
        sh.state = 'patrol';
        if (S.nations[sh.owner].isPlayer) { MP.Game.notify('naval.warship_ready', {}); MP.SFX.play('naval'); }
      }
      return;
    }
    if (sh.port && sh.port.dead) {
      // home port lost: find another or scuttle slowly
      const n = S.nations[sh.owner];
      const p = n.st.port.find((x) => !x.dead);
      if (p) { sh.port = p; sh.homeX = p.x; sh.homeY = p.y; } else sh.hp -= 10 * dt;
    }
    const away = U.dist(sh.x, sh.y, sh.homeX, sh.homeY) > 20;
    if (away) sh.fuel -= dt; else sh.fuel = Math.min(W.fuel, sh.fuel + dt * 6);
    sh.cool -= dt;
    // targeting
    sh.scanT -= dt;
    if (sh.scanT <= 0) {
      sh.scanT = 0.5;
      if (sh.target && (sh.target.hp <= 0 || !S.ships.includes(sh.target) || U.dist(sh.x, sh.y, sh.target.x, sh.target.y) > W.sight * 1.5)) sh.target = null;
      if (!sh.target && sh.state !== 'return') {
        let best = null, bd = W.sight * W.sight;
        for (const o of S.ships) {
          if (o === sh || o.owner === sh.owner || o.state === 'building') continue;
          let hostile = Naval.hostile(sh.owner, o.owner);
          if (o.kind === 'transport') {
            const tgt = o.target;
            if (tgt && (tgt === sh.owner || G.isAllied(sh.owner, tgt))) hostile = true; // defending our coast
          }
          if (!hostile) continue;
          const d = U.dist2(sh.x, sh.y, o.x, o.y);
          const pri = o.kind === 'transport' ? 0.5 : o.kind === 'warship' ? 0.8 : 1;
          if (d * pri < bd) { bd = d * pri; best = o; }
        }
        if (best) { sh.target = best; sh.state = 'chase'; sh.path = null; }
      }
    }
    if (sh.fuel <= 0 && sh.state !== 'return') { sh.state = 'return'; sh.target = null; sh.path = null; }
    if (sh.state === 'return') {
      if (!sh.path) { sh.path = World.seaPath(sh.x, sh.y, sh.homeX, sh.homeY, 80000) || [[sh.homeX, sh.homeY]]; sh.pi = 0; }
      if (moveAlong(sh, dt)) { sh.path = null; if (sh.fuel >= W.fuel * 0.95) sh.state = 'patrol'; }
      if (!away && sh.fuel >= W.fuel * 0.95) sh.state = 'patrol';
      return;
    }
    if (sh.state === 'chase' && sh.target) {
      const t = sh.target;
      const d = U.dist(sh.x, sh.y, t.x, t.y);
      if (d > W.range * 0.7) {
        // steer directly if close, else path
        if (!sh.path || sh.repath <= 0) { sh.path = d < 25 ? [[t.x, t.y]] : (World.seaPath(sh.x, sh.y, t.x, t.y, 40000) || [[t.x, t.y]]); sh.pi = 0; sh.repath = 1.5; }
        sh.repath -= dt;
        moveAlong(sh, dt);
      }
      if (d <= W.range) {
        if (t.kind === 'trade') { Naval.capture(sh, t); sh.target = null; sh.state = 'patrol'; }
        else {
          t.hp -= W.dps * dt; t.lastHitBy = sh.owner;
          if (sh.cool <= 0) { sh.cool = 0.6; MP.FX && MP.FX.shot(sh.x, sh.y, t.x, t.y); }
        }
      }
      return;
    }
    // patrol
    if (!sh.path || sh.pi >= sh.path.length) {
      const [px, py] = pickPatrolPoint(sh);
      sh.path = U.dist(sh.x, sh.y, px, py) < 30 ? [[px, py]] : (World.seaPath(sh.x, sh.y, px, py, 60000) || [[px, py]]);
      sh.pi = 0;
    }
    moveAlong(sh, dt * 0.6);
  };

  Naval.capture = function (sh, t) {
    const S = G.S;
    const captor = S.nations[sh.owner], victim = S.nations[t.owner];
    const amount = Math.round(t.cargo);
    captor.credits += amount; captor.incomeAcc += amount;
    const idx = S.ships.indexOf(t); if (idx >= 0) S.ships.splice(idx, 1);
    t.hp = 0; t.captured = true;
    MP.FX && MP.FX.floatText(t.x, t.y, '+' + U.fmtInt(amount), [255, 210, 31]);
    if (captor.isPlayer) { S.stats.prizes++; MP.Game.notify('naval.prize', { nation: victim.name, amount: U.fmtInt(amount) }); MP.SFX.play('coin'); }
    if (victim && victim.isPlayer) MP.Game.notify('naval.our_trade_seized', { nation: captor.name });
  };

  Naval.sunk = function (sh) {
    const S = G.S;
    MP.FX && MP.FX.burst(sh.x, sh.y, [255, 160, 60], sh.kind === 'warship' ? 8 : 5);
    const o = S.nations[sh.owner];
    const by = S.nations[sh.lastHitBy];
    if (sh.kind === 'transport') {
      if (o && o.isPlayer) MP.Game.notify('naval.our_transport_sunk', {});
      if (by && by.isPlayer) { S.stats.sunk++; MP.Game.notify('naval.transport_sunk_enemy', { nation: o.name }); }
      else if (sh.target && S.nations[sh.target] && S.nations[sh.target].isPlayer) MP.Game.notify('naval.transport_sunk_enemy', { nation: o.name });
    } else if (sh.kind === 'warship') {
      if (o && o.isPlayer) MP.Game.notify('naval.warship_lost', {});
      if (by && by.isPlayer) S.stats.sunk++;
    }
    if (by && (by.isPlayer || (o && o.isPlayer))) MP.SFX.play('explodeSmall', sh.x, sh.y);
  };

  Naval.land = function (sh) {
    const S = G.S;
    const n = S.nations[sh.owner];
    const t = sh.landing;
    const own = S.owner[t];
    if (own === n.id) { n.troops += sh.troops; return; }
    if (own && !G.canAttack(n.id, own)) { n.troops += sh.troops; return; }
    if (n.isPlayer) { MP.Game.notify('naval.landing', {}); MP.SFX.play('attack'); }
    // troops come ashore: a beachhead on the landing tile, then they fight inland
    n.troops += sh.troops;
    MP.War.launch(n.id, own, sh.troops, { seed: t, boat: true });
  };
})();
