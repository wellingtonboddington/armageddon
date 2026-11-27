/* MIDNIGHT PROTOCOL — divisions: infantry and armoured formations shown as flags on the front.
   They are drawn from the troop pool, supplied by factories / logistics hubs, change attack and
   defence where they stand (leaving real gaps between them), stack up to three deep, train, upgrade,
   and can be planned onto a frontline with T. */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;
  const D = C.DIV;
  const Div = (MP.Div = {});
  let divId = 1;

  const listOf = (n) => (n.divs || (n.divs = []));
  Div.all = function () { const out = []; for (const n of G.S.nations) if (n && n.alive && n.divs) for (const d of n.divs) out.push(d); return out; };

  // ---------------- sizing ----------------
  Div.cap = function (n) {
    let c = D.baseCount + Math.floor(Math.sqrt(Math.max(0, n.tiles)) * D.perSqrtTiles) + (n.divExtra || 0);
    if (G.has(n, 'generalStaff')) c += 3;
    if (G.has(n, 'reservePool')) c += 2;
    return Math.min(D.maxCount + (n.divExtra || 0), c);
  };
  Div.maxSize = function (n, d) {
    const inf = (D.infSize + D.infCapShare * (n.cap || C.CAP_BASE)) * (1 + 0.3 * (n.divLevel || 0));
    return d.type === 'arm' ? inf * D.armorSize : inf;
  };
  Div.power = function (d) {
    const n = G.S.nations[d.owner];
    let mul = d.type === 'arm' ? D.armorPower : D.infPower + (D.gearBonus[d.gear] || 0);
    if (d.type === 'inf') mul *= G.mod(n, 'infPower');
    if (d.trainedFull) mul *= G.has(n, 'veteran') ? 2.4 : D.trainedMul;
    if (!d.supplied) mul *= G.has(n, 'fieldDepot') ? 0.85 : D.unsupplied;
    return d.size * mul;
  };
  Div.radius = (d) => (d.type === 'arm' ? D.armorRadius : D.radius) * G.mod(G.S.nations[d.owner], 'divRadius');

  function spawnDiv(n, type) {
    const S = G.S;
    const gear = type === 'arm' ? (S.rng() < 0.5 ? 'tanks' : 'motorized') : (S.rng() < 0.5 ? 'artillery' : 'drones');
    const d = { id: divId++, owner: n.id, type, gear, x: n.capX, y: n.capY, tx: n.capX, ty: n.capY, size: 0, trained: 0, trainedFull: false, training: false,
      supplied: true, vis: 0, mode: 'garrison', front: 0, stack: 0, sel: false };
    listOf(n).push(d);
    return d;
  }

  // ---------------- geometry helpers ----------------
  // a point a few tiles inside our land next to (fx, fy) on the enemy side
  function insidePoint(n, fx, fy, depth) {
    const cx = n.tiles ? n.sx / n.tiles : n.capX, cy = n.tiles ? n.sy / n.tiles : n.capY;
    const dx = cx - fx, dy = cy - fy, L = Math.hypot(dx, dy) || 1;
    const x = Math.round(fx + dx / L * depth), y = Math.round(fy + dy / L * depth);
    const t = G.nearestOwned(n.id, x, y, 6);
    return t >= 0 ? [t % World.W + 0.5, ((t / World.W) | 0) + 0.5] : [fx, fy];
  }
  // border tiles of n that touch `enemy`, sampled and ordered along the border
  Div.sharedBorder = function (n, enemy, maxPts) {
    const S = G.S, W = World.W, pts = [];
    let k = 0;
    for (const t of n.border) {
      if ((k++ & 1) !== 0) continue;
      const x = t % W;
      if ((x > 0 && S.owner[t - 1] === enemy) || (x < W - 1 && S.owner[t + 1] === enemy) || (t >= W && S.owner[t - W] === enemy) || (t < World.N - W && S.owner[t + W] === enemy)) pts.push([x, (t / W) | 0]);
      if (pts.length > 2000) break;
    }
    if (pts.length < 2) return pts;
    // order roughly along the principal axis so evenly spaced picks spread along the front
    let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= pts.length; my /= pts.length;
    let cxx = 0, cyy = 0, cxy = 0; for (const p of pts) { const a = p[0] - mx, b = p[1] - my; cxx += a * a; cyy += b * b; cxy += a * b; }
    const ang = 0.5 * Math.atan2(2 * cxy, cxx - cyy), ux = Math.cos(ang), uy = Math.sin(ang);
    pts.sort((a, b) => (a[0] * ux + a[1] * uy) - (b[0] * ux + b[1] * uy));
    if (!maxPts || pts.length <= maxPts) return pts;
    const out = [];
    for (let i = 0; i < maxPts; i++) out.push(pts[Math.floor((i + 0.5) * pts.length / maxPts)]);
    return out;
  };

  // spread divisions along a border: armour and infantry interleaved, extras stacked behind
  Div.spread = function (n, enemy, divs, opts) {
    if (!divs.length) return;
    const lines = Math.max(1, Math.ceil(divs.length / Math.max(1, Math.ceil(divs.length / 1))));
    const frontCount = Math.max(1, Math.ceil(divs.length / (opts && opts.stack ? 2 : 1)));
    const pts = Div.sharedBorder(n, enemy, frontCount);
    if (!pts.length) return;
    divs.forEach((d, i) => {
      const p = pts[i % pts.length];
      const row = Math.floor(i / pts.length);
      const [x, y] = insidePoint(n, p[0], p[1], 2.5 + row * 4);
      d.tx = x; d.ty = y;
      if (opts && opts.teleport) { d.x = x; d.y = y; }
    });
    return lines;
  };

  // ---------------- supply ----------------
  function supplyCheck(n, d) {
    const r1 = D.supplyFactory * G.mod(n, 'supply') * G.mod(n, 'divSupply'), r2 = D.supplyHub * G.mod(n, 'supply') * G.mod(n, 'divSupply');
    for (const f of n.st.factory) if (G.isActive(f) && U.dist2(f.x, f.y, d.x, d.y) <= r1 * r1) { d.src = f; return true; }
    for (const h of n.st.hub) if (G.isActive(h) && U.dist2(h.x, h.y, d.x, d.y) <= r2 * r2) { d.src = h; return true; }
    if (n.capital >= 0 && U.dist2(n.capX, n.capY, d.x, d.y) <= 40 * 40) { d.src = null; return true; } // the capital feeds its own garrison
    d.src = null;
    return false;
  }

  // ---------------- per-tick ----------------
  Div.tick = function (dt) {
    const S = G.S;
    S._divT = (S._divT || 0) + dt;
    const slow = S._divT >= 1;
    if (slow) S._divT = 0;
    for (const n of S.nations) {
      if (!n || !n.alive || !n.spawned) continue;
      const divs = listOf(n);
      // movement (every tick)
      const mv = G.mod(n, 'divMove');
      for (const d of divs) {
        const dx = d.tx - d.x, dy = d.ty - d.y, L = Math.hypot(dx, dy);
        if (L > 0.05) { const sp = (d.type === 'arm' ? D.moveArm : D.moveInf) * mv * dt * 2.2; if (L <= sp) { d.x = d.tx; d.y = d.ty; } else { d.x += dx / L * sp; d.y += dy / L * sp; } }
      }
      if (!slow) continue;
      // once a second: spawn, refill, supply, training, assignment, stacks
      const cap = Div.cap(n);
      n._divSpawn = (n._divSpawn || 0) + 1;
      if (divs.length < cap && n._divSpawn >= D.spawnEvery) {
        n._divSpawn = 0;
        const arm = divs.filter((d) => d.type === 'arm').length;
        const d = spawnDiv(n, arm < divs.length * D.armorShare ? 'arm' : 'inf');
        if (n.divPlan) { d.mode = 'plan'; d.front = n.divPlan.enemy; }
      }
      while (divs.length > cap + 2) { const d = divs.pop(); n.troops += d.size; }
      const refill = D.refill * G.mod(n, 'divRefill');
      for (const d of divs) {
        const ms = Div.maxSize(n, d);
        d.supplied = supplyCheck(n, d);
        if (d.size < ms && d.supplied && n.troops > 1000) { const add = Math.min(ms - d.size, ms * refill * (d.size < ms * 0.2 ? 4 : 1), n.troops * 0.02); d.size += add; n.troops -= add; }
        if (d.training) {
          d.trained += 1 / (D.trainTime * G.mod(n, 'trainTime'));
          if (d.trained >= 1) { d.trained = 1; d.training = false; d.trainedFull = true; if (n.isPlayer) MP.FX.ping(d.x, d.y, [255, 210, 31]); }
        }
        // retreat if the ground under it was lost
        const t = Math.round(d.x) + Math.round(d.y) * World.W;
        if (S.owner[t] !== n.id) { const u = G.nearestOwned(n.id, Math.round(d.x), Math.round(d.y), 12); if (u >= 0) { d.x = d.tx = u % World.W + 0.5; d.y = d.ty = ((u / World.W) | 0) + 0.5; } }
      }
      Div.assign(n);
      Div.computeStacks(n);
    }
  };

  // ---------------- automatic deployment ----------------
  Div.assign = function (n) {
    const S = G.S, divs = listOf(n);
    if (!divs.length) return;
    const incoming = S.attacks.filter((a) => !a.done && a.to === n.id && a.front.length);
    const outgoing = S.attacks.filter((a) => !a.done && a.from === n.id && a.to && a.front.length);
    const plan = n.divPlan;
    const free = divs.filter((d) => d.mode !== 'plan');
    // planned divisions fight on their own front; they only follow attacks against that enemy
    if (plan) {
      for (const d of divs) if (d.mode === 'plan') {
        const fight = incoming.some((a) => a.from === plan.enemy) || outgoing.some((a) => a.to === plan.enemy);
        if (fight) d.vis = S.t + D.visibleFor;
        if (n.isPlayer) d.vis = Math.max(d.vis, S.t + 1.5);
      }
    }
    // invaded: free divisions appear on the threatened front immediately
    if (incoming.length && free.length) {
      // each threatened front gets divisions in proportion to its width (a beachhead gets one or two, a wide
      // land front gets many); the rest stay in reserve. Divisions already on a front keep their place.
      const want = incoming.map((a) => Math.max(1, Math.min(8, Math.ceil(a.front.length / 30))));
      const totalWant = want.reduce((x, y) => x + y, 0);
      const scale = totalWant > free.length ? free.length / totalWant : 1;
      const pool = free.slice().sort((x, y) => (y.mode === 'defend') - (x.mode === 'defend'));
      const taken = new Set();
      const groups = incoming.map((a, i) => {
        const k = Math.max(1, Math.floor(want[i] * scale));
        const g = [];
        for (const d of pool) { if (g.length >= k) break; if (!taken.has(d) && d.mode === 'defend' && d.front === a.from) { g.push(d); taken.add(d); } }
        for (const d of pool) { if (g.length >= k) break; if (!taken.has(d)) { g.push(d); taken.add(d); } }
        return g;
      });
      for (const d of free) if (!taken.has(d) && d.mode === 'defend') { d.mode = 'garrison'; d.front = 0; }
      incoming.forEach((a, i) => {
        const group = groups[i];
        if (!group.length) return;
        const pts = samplePoints(a, group.length, a.fx);
        group.forEach((d, j) => {
          const p = pts[j % pts.length];
          const [x, y] = insidePoint(n, p[0], p[1], 2.5 + Math.floor(j / pts.length) * 4);
          if (d.mode !== 'defend' || d.front !== a.from) { d.x = x; d.y = y; } // spawn straight onto the line
          d.tx = x; d.ty = y; d.mode = 'defend'; d.front = a.from; d.vis = S.t + D.visibleFor;
        });
      });
      return;
    }
    // attacking: free divisions (armour first) move up behind the point of main effort
    if (outgoing.length && free.length) {
      const sorted = free.slice().sort((a, b) => (b.type === 'arm') - (a.type === 'arm'));
      const per = Math.max(1, Math.ceil(sorted.length / outgoing.length));
      outgoing.forEach((a, i) => {
        const group = sorted.slice(i * per, (i + 1) * per);
        if (!group.length) return;
        const pts = samplePoints(a, Math.max(1, Math.ceil(group.length / 2)), true);
        group.forEach((d, j) => {
          const p = pts[j % pts.length];
          const [x, y] = insidePoint(n, p[0], p[1], 1.5 + Math.floor(j / pts.length) * 4);
          d.tx = x; d.ty = y; d.mode = 'attack'; d.front = a.to; d.vis = S.t + D.visibleFor;
        });
      });
      return;
    }
    // quiet: free divisions fall back to garrison around the capital and cities (hidden)
    for (const d of free) {
      if (d.mode === 'garrison' && U.dist2(d.tx, d.ty, n.capX, n.capY) < 400) continue;
      d.mode = 'garrison'; d.front = 0;
      const spots = [[n.capX, n.capY]].concat(n.st.city.map((c) => [c.x, c.y]));
      const s = spots[d.id % spots.length];
      d.tx = s[0] + ((d.id * 7) % 5) - 2; d.ty = s[1] + ((d.id * 3) % 5) - 2;
    }
  };

  // points along an attack's front, weighted toward its clicked point of main effort
  function samplePoints(a, k, focus) {
    const W = World.W, f = a.front;
    let pts = [];
    const step = Math.max(1, Math.floor(f.length / 200));
    for (let i = 0; i < f.length; i += step) pts.push([f[i] % W, (f[i] / W) | 0]);
    if (focus && a.fx != null && pts.length > k * 3) {
      pts.sort((p, q) => ((p[0] - a.fx) ** 2 + (p[1] - a.fy) ** 2) - ((q[0] - a.fx) ** 2 + (q[1] - a.fy) ** 2));
      pts = pts.slice(0, Math.max(k * 3, Math.round(pts.length * 0.3)));
    }
    if (pts.length <= k) return pts.length ? pts : [[a.fx || 0, a.fy || 0]];
    // spread picks across the (sorted-by-angle-ish) sample
    let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= pts.length; my /= pts.length;
    pts.sort((p, q) => Math.atan2(p[1] - my, p[0] - mx) - Math.atan2(q[1] - my, q[0] - mx));
    const out = [];
    for (let i = 0; i < k; i++) out.push(pts[Math.floor((i + 0.5) * pts.length / k)]);
    return out;
  }

  // stacks: a division with others of ours right behind it (toward our interior) leads a stack (max 3)
  Div.computeStacks = function (n) {
    const divs = listOf(n), r2 = D.stackRange * D.stackRange;
    for (const d of divs) d.stack = 0;
    for (const d of divs) {
      if (d.mode === 'garrison') continue;
      let depth = 0;
      for (const e of divs) {
        if (e === d || e.mode === 'garrison') continue;
        if (U.dist2(d.x, d.y, e.x, e.y) <= r2) depth++;
      }
      d.stack = Math.min(D.stackMax - 1, depth);
    }
  };

  // ---------------- combat effects ----------------
  // multipliers for capturing tile (x,y) in attack `at`
  Div.tileMods = function (at, x, y) {
    const S = G.S;
    const a = S.nations[at.from], d = at.to ? S.nations[at.to] : null;
    let pa = 0, pd = 0, armA = 0, stackA = 0, stackD = 0, nearD = false;
    if (a && a.divs) for (const v of a.divs) {
      if (v.mode === 'garrison') continue;
      const r = Div.radius(v);
      if (U.dist2(v.x, v.y, x, y) > r * r) continue;
      let p = Div.power(v);
      if (d && G.has(d, 'counterBattery')) p *= 0.85;
      pa += p;
      if (v.type === 'arm') armA++;
      stackA = Math.max(stackA, v.stack);
    }
    if (d && d.divs) for (const v of d.divs) {
      if (v.mode === 'garrison') continue;
      const r = Div.radius(v);
      if (U.dist2(v.x, v.y, x, y) > r * r) continue;
      let p = Div.power(v);
      if (G.has(a, 'counterBattery')) p *= 0.85;
      pd += p; nearD = true;
      stackD = Math.max(stackD, v.stack);
    }
    let cost = (1 + pd / 12000) / (1 + pa / 10000);
    let speed = 1;
    if (armA) {
      speed *= Math.pow(1.3 * G.mod(a, 'armorSpeed'), Math.min(3, armA));        // +30% per armoured division (stacks)
      if (at.press > 0.5) speed *= 1.2 * G.mod(a, 'armorBreak');                  // breakthroughs: +20% more
    }
    if (stackA) speed *= 1 + 0.1 * stackA;                                          // the lead of a stack pushes 10% faster per support
    let slow = 1;
    if (stackD) { const k = 1 + 0.25 * G.mod(d, 'depth'); cost *= k; slow *= k; }   // redundant defence: +25% cost, ground lost 25% slower
    if (nearD && d.divPlan && d.divPlan.enemy === at.from && d.divPlan.prepared) {
      const k = G.has(d, 'ironLine') ? 1.25 : D.preparedBonus; cost *= k; slow *= k;   // a front planned before they attacked
    }
    if (nearD) cost *= G.mod(d, 'hedgehog');
    slow *= 1 + pd / 60000;
    return { cost: U.clamp(cost, 0.4, 3.2), slow: U.clamp(slow, 1, 3) / speed, digIn: stackA ? 0.67 : 1 };
  };

  // casualties after a capture: attackers near the tile pay part of the cost, defenders near it lose men
  Div.onCapture = function (at, x, y, cost) {
    const S = G.S;
    const a = S.nations[at.from], d = at.to ? S.nations[at.to] : null;
    const near = (n) => (n && n.divs ? n.divs.filter((v) => v.mode !== 'garrison' && U.dist2(v.x, v.y, x, y) <= Div.radius(v) ** 2) : []);
    const na = near(a);
    if (na.length) { const loss = cost * 0.25 / na.length; for (const v of na) { v.size = Math.max(0, v.size - loss); v.vis = S.t + D.visibleFor; } }
    const nd = near(d);
    if (nd.length) { const loss = cost * 0.35 / nd.length; for (const v of nd) { v.size = Math.max(0, v.size - loss); v.vis = S.t + D.visibleFor; } }
  };

  // ---------------- planning (T) ----------------
  Div.togglePlan = function (n, enemyId) {
    const S = G.S, e = S.nations[enemyId];
    if (n.divPlan && n.divPlan.enemy === enemyId) { Div.recall(n); return 'off'; }
    if (n.divPlan) return 'busy';
    if (!e || !e.alive || G.isAllied(n.id, enemyId) || !MP.War.bordersWith(n.id, enemyId)) return 'nofront';
    const attacking = S.attacks.some((a) => !a.done && a.from === enemyId && a.to === n.id);
    n.divPlan = { enemy: enemyId, prepared: !attacking, at: S.t };
    for (const d of listOf(n)) { d.mode = 'plan'; d.front = enemyId; d.vis = S.t + 2; }
    Div.spread(n, enemyId, listOf(n).slice().sort((a, b) => (b.type === 'arm') - (a.type === 'arm')), { stack: false });
    // the other side sees the build-up and gets ready
    if (e.ai) { e.ai.alertFrom = n.id; e.ai.alertAt = S.t; if (!e.divPlan) Div.aiPlan(e, n.id, true); }
    return 'on';
  };
  Div.recall = function (n) {
    n.divPlan = null;
    for (const d of listOf(n)) { d.mode = 'garrison'; d.front = 0; d.sel = false; }
    Div.assign(n);
  };
  Div.trainCost = (n) => Math.round(D.trainCost * G.mod(n, 'divCost'));
  Div.trainAll = function (n) {
    const todo = listOf(n).filter((d) => !d.trainedFull && !d.training);
    if (!todo.length) return { ok: false, reason: 'Every division is already trained' };
    const cost = Div.trainCost(n) * todo.length;
    if (n.credits < cost) return { ok: false, reason: `Training costs ${U.fmtK(cost)} credits` };
    n.credits -= cost;
    for (const d of todo) { d.training = true; d.trained = 0; d.vis = G.S.t + D.visibleFor; }
    return { ok: true, count: todo.length, cost };
  };
  Div.upgradeCost = (n) => Math.round(D.upgradeCost * Math.pow((n.divLevel || 0) + 1, 1.5) * G.mod(n, 'divCost'));
  Div.upgrade = function (n) {
    if ((n.divLevel || 0) >= D.upgradeMax) return { ok: false, reason: 'Divisions are at maximum strength' };
    const c = Div.upgradeCost(n);
    if (n.credits < c) return { ok: false, reason: `Upgrade costs ${U.fmtK(c)} credits` };
    n.credits -= c; n.divLevel = (n.divLevel || 0) + 1;
    return { ok: true, cost: c };
  };
  Div.raiseCost = (n) => Math.round(D.raiseCost * ((n.divExtra || 0) + 1) * G.mod(n, 'divCost'));
  Div.raise = function (n) {
    const c = Div.raiseCost(n);
    if (n.credits < c) return { ok: false, reason: `A new division costs ${U.fmtK(c)} credits` };
    n.credits -= c; n.divExtra = (n.divExtra || 0) + 1;
    const arm = listOf(n).filter((d) => d.type === 'arm').length;
    const d = spawnDiv(n, arm < listOf(n).length * D.armorShare ? 'arm' : 'inf');
    if (n.divPlan) { d.mode = 'plan'; d.front = n.divPlan.enemy; }
    return { ok: true, cost: c, div: d };
  };
  Div.moveTo = function (d, x, y) { d.tx = x; d.ty = y; d.vis = G.S.t + D.visibleFor; };

  // AI: mass divisions on a border before an attack (visible to the target) or to meet a threat
  Div.aiPlan = function (n, enemyId, prepared) {
    if (n.divPlan || !MP.War.bordersWith(n.id, enemyId)) return false;
    n.divPlan = { enemy: enemyId, prepared: !!prepared, at: G.S.t, ai: true };
    for (const d of listOf(n)) { d.mode = 'plan'; d.front = enemyId; d.vis = G.S.t + 20; }
    Div.spread(n, enemyId, listOf(n), { stack: true });
    return true;
  };
  Div.aiTick = function (n) {
    const S = G.S;
    if (!n.divPlan) return;
    const e = S.nations[n.divPlan.enemy];
    const stale = S.t - n.divPlan.at > 90 && !S.attacks.some((a) => !a.done && (a.from === n.id || a.to === n.id) && (a.from === e.id || a.to === e.id));
    if (!e || !e.alive || G.isAllied(n.id, e.id) || stale) Div.recall(n);
    // rich AI trains and upgrades
    if (n.credits > 60000 && S.rng() < 0.05) Div.trainAll(n);
    if (n.credits > 120000 && S.rng() < 0.03) Div.upgrade(n);
  };

  // visibility for the player
  // is (x,y) within r tiles of nation id's land? (coarse ring sampling)
  function nearLand(id, x, y, r) {
    const S = G.S, W = World.W, H = World.H;
    x = Math.round(x); y = Math.round(y);
    for (let rr = 0; rr <= r; rr += 3) {
      const steps = Math.max(6, Math.round(rr * 1.6));
      for (let k = 0; k < steps; k++) {
        const ang = (k / steps) * Math.PI * 2;
        const xx = Math.round(x + Math.cos(ang) * rr), yy = Math.round(y + Math.sin(ang) * rr);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (S.owner[xx + yy * W] === id) return true;
      }
    }
    return false;
  }
  Div.visibleTo = function (d, p) {
    const S = G.S;
    if (!p || S.opts.mode === 'watch') return d.vis > S.t && d.mode !== 'garrison';
    if (d.owner === p.id) return !!p.divPlan || (d.vis > S.t && d.mode !== 'garrison');
    if (d.mode === 'garrison') return false;
    if (d.vis > S.t && (d.front === p.id || G.isAllied(d.front, p.id))) return true;  // fighting us or our allies
    if (d.mode === 'plan' && d.front === p.id) return true;                             // massing on our border
    const spy = p.divPlan && p.divPlan.enemy === d.owner, intel = G.has(p, 'intel');
    if (!spy && !intel) return false;
    // front-line intel / INTEL skill: only divisions close to our land, re-checked twice a second
    if (d._seeT > S.t && d._seeP === p.id) return d._seeV;
    d._seeT = S.t + 0.5; d._seeP = p.id;
    d._seeV = nearLand(p.id, d.x, d.y, intel ? 30 : 18);
    return d._seeV;
  };
})();
