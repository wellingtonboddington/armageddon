/* MIDNIGHT PROTOCOL — AI commanders for up to 99 nations */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const AI = (MP.AI = {});

  AI.init = function (n) {
    n.ai = { next: G.S.rng() * 1.5, scanT: 0, neighbors: new Map(), unclaimed: false, coastal: false,
      grudge: new Map(), lastAttack: -99, lastBuild: -99, lastNuke: -99, lastDiplo: G.S.rng() * 30, lastOffer: -999,
      lastBoat: -99, landHist: [], target: 0, borderArr: [], spawnPref: null };
  };

  AI.tick = function (dt) {
    const S = G.S;
    for (let i = 1; i < S.nations.length; i++) {
      const n = S.nations[i];
      if (!n.ai || !n.alive || !n.spawned) continue;
      n.ai.next -= dt;
      if (n.ai.next > 0) continue;
      const diff = C.DIFFICULTY[n.difficulty] || C.DIFFICULTY.regular;
      n.ai.next = (0.8 + S.rng() * 0.6) * diff.think;
      try { AI.think(n); } catch (e) { console.error('[ai]', n.name, e); }
    }
  };

  function scan(n) {
    const S = G.S, owner = S.owner, W = World.W;
    const ai = n.ai;
    ai.scanT = S.t + 3;
    ai.borderArr = Array.from(n.border);
    const nb = new Map();
    let unclaimed = false, coastal = false;
    const arr = ai.borderArr;
    const step = Math.max(1, Math.floor(arr.length / 400));
    for (let i = (S.rng.int(step)); i < arr.length; i += step) {
      const t = arr[i];
      if (World.coast[t]) coastal = true;
      const x = t % W;
      const ns = [x > 0 ? t - 1 : -1, x < W - 1 ? t + 1 : -1, t - W, t + W];
      for (const u of ns) {
        if (u < 0 || u >= World.N || !World.land[u]) continue;
        const o = owner[u];
        if (o === n.id) continue;
        if (o === 0) unclaimed = true;
        else nb.set(o, (nb.get(o) || 0) + 1);
      }
    }
    ai.neighbors = nb; ai.unclaimed = unclaimed; ai.coastal = coastal || n.st.port.length > 0;
    ai.landHist.push(n.tiles);
    if (ai.landHist.length > 10) ai.landHist.shift();
  }

  function randomOwnTile(n, nearBorder) {
    const S = G.S, W = World.W;
    if (nearBorder && n.ai.borderArr.length) {
      const t = n.ai.borderArr[S.rng.int(n.ai.borderArr.length)];
      return t;
    }
    const r = Math.max(4, Math.sqrt(n.tiles) * 0.55);
    const cx = n.tiles ? n.sx / n.tiles : n.capX, cy = n.tiles ? n.sy / n.tiles : n.capY;
    for (let k = 0; k < 25; k++) {
      const x = Math.round(cx + (S.rng() * 2 - 1) * r), y = Math.round(cy + (S.rng() * 2 - 1) * r);
      if (x < 0 || y < 0 || x >= W || y >= World.H) continue;
      const t = x + y * W;
      if (S.owner[t] === n.id) return t;
    }
    return n.capital;
  }

  function tryBuild(n, type, tile) {
    if (tile == null || tile < 0) return false;
    if (!MP.Eco.canAfford(n, type)) return false;
    const chk = MP.Eco.checkPlace(n, type, tile);
    if (!chk.ok) return false;
    return !!MP.Eco.place(n, type, tile, true);
  }

  AI.enemyTech = function (n) {
    const S = G.S;
    const t = {};
    for (const [o] of n.ai.neighbors) { const e = S.nations[o]; if (e) for (const w in e.research) t[w] = true; }
    for (const [o] of n.ai.grudge) { const e = S.nations[o]; if (e) for (const w in e.research) t[w] = true; }
    return t;
  };

  AI.think = function (n) {
    const S = G.S;
    const ai = n.ai;
    if (S.t >= ai.scanT) scan(n);
    const pers = C.PERSONALITIES[n.personality] || C.PERSONALITIES.opportunist;
    const fill = n.troops / Math.max(1, n.cap);

    if (n.isAlien) { AI.alien(n); return; }
    // a puppet-state never outgrows its master
    const master = n.puppet ? G.player() : null;
    const capped = !!(master && master.alive && n.tiles >= master.tiles * 0.9);
    // ---------------- expansion into unclaimed land ----------------
    const myAttacks = S.attacks.filter((a) => a.from === n.id && !a.done);
    if (!capped && ai.unclaimed && fill > 0.22 && !myAttacks.some((a) => a.to === 0)) {
      const early = S.t < 240;
      MP.War.launch(n.id, 0, n.troops * (early ? 0.4 : 0.25));
    }

    // ---------------- economy ----------------
    AI.build(n, pers, fill);

    // ---------------- research ----------------
    if (!n.researching && S.phase === 'play') {
      const want = n.puppet ? 1.6 : pers.nuke * (C.DIFFICULTY[n.difficulty].nukeMul);
      for (const w of C.WEAPON_ORDER) {
        if (n.research[w]) continue;
        if (S.defcon > C.WEAPON[w].defcon) continue;
        if (w === 'Orbital' && want < 0.8) continue;
        const c = MP.Weapons.researchCost(n, w);
        if (n.credits > c.credits * (2.2 - want) && n.uranium >= c.u && S.rng() < 0.25 * want + 0.05) { MP.Weapons.startResearch(n, w); }
        break;
      }
    }

    // ---------------- land war ----------------
    if (!capped && S.t - ai.lastAttack > (n.puppet && ai.focus ? 2 : 4) && fill > (n.puppet && ai.focus ? 0.2 : 0.5 - pers.aggro * 0.15)) {
      const target = AI.pickTarget(n, pers);
      // mobilise first: mass divisions on the border (the target can see it coming), then strike
      if (target && n.divs && n.divs.length && !n.divPlan && (target.isPlayer || S.rng() < 0.25) && !S.attacks.some((x) => !x.done && x.from === n.id && x.to === target.id)) {
        if (MP.Div.aiPlan(n, target.id, true)) {
          ai.mobilizeUntil = S.t + 10 + S.rng() * 10;
          if (target.isPlayer) { MP.Game.wire('IMINT', `${n.name} MOBILISES DIVISIONS ON YOUR BORDER`, 'bad'); MP.Game.notify('attack.mobilise', { nation: n.name, text: `${n.name} is massing divisions on our border. Press T on them to answer.`, priority: 2 }); }
          ai.lastAttack = S.t;
        }
      }
      const mobilising = ai.mobilizeUntil && S.t < ai.mobilizeUntil;
      if (target && !mobilising) {
        const ratio = 0.22 + pers.aggro * 0.3;
        // aim the assault: at their capital, or a weak point between forts
        const aim = AI.attackAim(n, target);
        MP.War.launch(n.id, target.id, n.troops * ratio, aim ? { fx: aim[0], fy: aim[1] } : null);
        ai.lastAttack = S.t; ai.target = target.id;
      } else if (!ai.unclaimed && ai.neighbors.size === 0 && S.t - ai.lastBoat > 25 && fill > 0.45) {
        AI.boatAttack(n);
      }
    }
    if (ai.coastal && S.t - ai.lastBoat > 60 && fill > 0.7 && S.rng() < 0.08 * pers.naval + (ai.unclaimed ? 0 : 0.04)) AI.boatAttack(n);

    if (n.divs) MP.Div.aiTick(n);
    // ---------------- strategic weapons ----------------
    AI.strike(n, pers);

    // ---------------- diplomacy ----------------
    if (!n.isAlien && S.t - ai.lastDiplo > 20) { ai.lastDiplo = S.t + S.rng() * 15; AI.diplomacy(n, pers); }
  };

  AI.build = function (n, pers, fill) {
    const S = G.S, ai = n.ai;
    if (S.t - ai.lastBuild < 2.5) return;
    const lv = (t) => n.levels[t] || 0;
    const opts = [];
    const cities = lv('city'), facs = lv('factory');
    opts.push(['city', (fill > 0.75 ? 3 : 1) + (cities < 1 + n.tiles / 2500 ? 1.5 : 0)]);
    if (cities >= 1) opts.push(['factory', facs < Math.ceil(cities / 2) + 1 ? 2 * pers.trade + 0.5 : 0.3]);
    if (ai.coastal) opts.push(['port', lv('port') < 1 + n.tiles / 5000 ? 1.4 * pers.trade + 0.4 : 0.2]);
    if (facs >= 2) opts.push(['hub', lv('hub') < Math.ceil(facs / 3) ? 1.5 : 0.2]);
    const dep = World.deposits.find((d) => !d.plant && S.owner[d.tile] === n.id);
    if (dep) opts.push(['enrich', 4]);
    // threat → forts
    let threat = 0, threatId = 0;
    for (const [o, cnt] of ai.neighbors) {
      const e = S.nations[o];
      if (!e || G.isAllied(n.id, o)) continue;
      const r = MP.Diplo.strength(e) / Math.max(1, MP.Diplo.strength(n));
      const v = r * (e.wars.has(n.id) ? 1.5 : 1) * Math.min(1, cnt / 20);
      if (v > threat) { threat = v; threatId = o; }
    }
    if (threat > 0.8) opts.push(['fort', (threat - 0.6) * 2 * pers.defense + (n.doctrine === 'fortress' ? 1 : 0)]);
    if (S.phase === 'play' && S.defcon <= 4) {
      const anyMissile = n.research.Tactical || n.research.ICBM || n.research.Hypersonic || n.research.EMP;
      if (anyMissile) opts.push(['silo', lv('silo') < 1 + pers.nuke * 2.5 ? 1.6 * pers.nuke : 0.1]);
      const et = AI.enemyTech(n);
      const missileThreat = et.Tactical || et.ICBM || et.Hypersonic || et.MIRV || et.EMP;
      if (missileThreat || ai.grudge.size) {
        opts.push(['radar', lv('radar') < 1 + n.tiles / 15000 ? 1.4 * pers.defense + 0.3 : 0.05]);
        if (et.Tactical || et.Airstrike) opts.push(['sam', lv('sam') < 1 + n.tiles / 8000 ? 1.3 * pers.defense : 0.1]);
        if (et.ICBM || et.EMP) opts.push(['abm', lv('abm') < 1 + n.tiles / 12000 ? 1.2 * pers.defense : 0.1]);
        if (et.Hypersonic || et.Orbital) opts.push(['laser', lv('laser') < n.tiles / 15000 ? 1.0 * pers.defense : 0.05]);
        if (et.MIRV) opts.push(['aegis', lv('aegis') < n.tiles / 15000 ? 1.0 * pers.defense : 0.05]);
      }
    }
    if (n.st.port.length && lv('warship') < 1 + pers.naval * 3 && n.credits > 30000) opts.push(['warship', 0.6 * pers.naval]);
    // weighted pick
    let tot = 0; for (const o of opts) tot += Math.max(0, o[1]);
    if (tot <= 0) return;
    let r = S.rng() * tot, type = opts[0][0];
    for (const o of opts) { r -= Math.max(0, o[1]); if (r <= 0) { type = o[0]; break; } }
    const cost = G.structCost(n, type);
    if (n.credits < cost.credits || n.uranium < cost.u) return;
    let ok = false;
    if (type === 'enrich' && dep) ok = tryBuild(n, 'enrich', dep.tile);
    else if (type === 'warship') {
      const p = n.st.port[S.rng.int(n.st.port.length)];
      ok = p && tryBuild(n, 'warship', p.tile);
    } else if (type === 'port') {
      const coastT = ai.borderArr.filter((t) => World.coast[t]);
      for (let k = 0; k < 6 && !ok && coastT.length; k++) ok = tryBuild(n, 'port', coastT[S.rng.int(coastT.length)]);
    } else if (type === 'fort') {
      // a border tile facing the threat, nudged inward
      const cand = ai.borderArr.filter((t) => {
        const x = t % World.W; const ns = [t - 1, t + 1, t - World.W, t + World.W];
        return ns.some((u) => u >= 0 && u < World.N && S.owner[u] === threatId) && x > 0;
      });
      for (let k = 0; k < 6 && !ok && cand.length; k++) {
        const t = cand[S.rng.int(cand.length)];
        const dx = Math.sign(n.capX - t % World.W) * 4, dy = Math.sign(n.capY - ((t / World.W) | 0)) * 4;
        ok = tryBuild(n, 'fort', t + dx + dy * World.W);
      }
    } else {
      // upgrade an existing one sometimes
      const own = n.st[type];
      if (own && own.length && S.rng() < 0.4) { const s = own[S.rng.int(own.length)]; ok = tryBuild(n, type, s.tile); }
      for (let k = 0; k < 8 && !ok; k++) ok = tryBuild(n, type, randomOwnTile(n, false));
    }
    if (ok) ai.lastBuild = S.t;
  };

  AI.pickTarget = function (n, pers) {
    const S = G.S, ai = n.ai;
    if (ai.focus) {
      const f = S.nations[ai.focus];
      if (!f || !f.alive || ai.focusUntil < S.t || G.isAllied(n.id, f.id)) ai.focus = 0;
      else if (ai.neighbors.has(f.id) && G.canAttack(n.id, f.id)) return f;
      else if (S.t - ai.lastBoat > 30 && n.troops > n.cap * 0.4) { AI.boatAttackOn(n, f); }
    }
    let best = null, bs = 0;
    const myS = MP.Diplo.strength(n);
    const myDensity = n.troops / Math.max(1, n.tiles);
    for (const [o, cnt] of ai.neighbors) {
      const e = S.nations[o];
      if (!e || !e.alive || !G.canAttack(n.id, o)) continue;
      const eDensity = e.troops / Math.max(1, e.tiles);
      let s = (myDensity / Math.max(0.5, eDensity)) * 0.6 + (myS / Math.max(1, MP.Diplo.strength(e))) * 0.4;
      s *= 0.6 + pers.aggro;
      s += -G.rel(n.id, o) / 120;
      if (ai.grudge.has(o)) s += 0.6;
      // not every nation is interested in fighting the aliens
      if (e.isAlien) s += (pers.aggro > 0.7 ? 0.3 : -0.7) + (n.tiles > e.tiles * 0.8 ? 0.25 : -0.35);
      if (e.wars.has(n.id)) s += 0.25;
      if (e.isPlayer && S.t - (S.playStart || 0) < 240) s *= 0.35;  // let the player breathe early
      if (ai.unclaimed) s -= 0.5;                        // prefer free land while it lasts
      if (e.st.fort.length) s -= 0.15 * Math.min(3, e.st.fort.length);
      s *= Math.min(1, 0.3 + cnt / 30);
      if (s > bs) { bs = s; best = e; }
    }
    return bs > 1.0 ? best : null;
  };

  AI.boatAttack = function (n) {
    const S = G.S, ai = n.ai;
    ai.lastBoat = S.t;
    // look for a coastal target within reach: unclaimed coast or weaker nation
    const W = World.W;
    let best = -1, bs = -1e9;
    for (let k = 0; k < 40; k++) {
      const ang = S.rng() * Math.PI * 2, dist = 30 + S.rng() * 220;
      const x = Math.round(n.capX + Math.cos(ang) * dist), y = Math.round(n.capY + Math.sin(ang) * dist);
      if (x < 1 || y < 1 || x >= W - 1 || y >= World.H - 1) continue;
      const t = x + y * W;
      if (!World.coast[t]) continue;
      const o = S.owner[t];
      if (o === n.id || (o && !G.canAttack(n.id, o))) continue;
      let s = o === 0 ? 1.5 : (MP.Diplo.strength(n) / Math.max(1, MP.Diplo.strength(S.nations[o]))) - G.rel(n.id, o) / 100;
      s -= dist / 300;
      if (s > bs) { bs = s; best = t; }
    }
    if (best < 0) return;
    MP.Naval.launchTransport(n, best, n.troops * 0.3);
  };

  // the Void Armada: relentless expansion, constant pressure, orbital fire from day one
  AI.alien = function (n) {
    const S = G.S, ai = n.ai;
    if (S.t >= ai.scanT) scan(n);
    const fill = n.troops / Math.max(1, n.cap);
    const mine = S.attacks.filter((a) => a.from === n.id && !a.done);
    if (ai.unclaimed && fill > 0.12 && !mine.some((a) => a.to === 0)) MP.War.launch(n.id, 0, n.troops * 0.3);
    const under = S.attacks.filter((a) => a.to === n.id && !a.done).length;
    if (S.t - ai.lastAttack > 4 && (fill > 0.2 || n.troops > 60000) && !(under >= 3 && fill < 0.25)) {
      let best = null, bs = -1e9;
      for (const [o, cnt] of ai.neighbors) {
        const e = S.nations[o];
        if (!e || !e.alive || !G.canAttack(n.id, o)) continue;
        const sc = cnt / 20 - MP.Diplo.strength(e) / Math.max(1, MP.Diplo.strength(n)) * 2 + S.rng();
        if (sc > bs) { bs = sc; best = e; }
      }
      if (best) { const aim = AI.attackAim(n, best); MP.War.launch(n.id, best.id, n.troops * 0.25, aim ? { fx: aim[0], fy: aim[1] } : null); ai.lastAttack = S.t; }
    }
    // sea invasions: when the continent is ours, several at once; when rich in troops, keep a second front open by sea
    const afloat = S.ships.filter((s) => s.owner === n.id && s.kind === 'transport').length;
    const landLocked = !ai.neighbors.size || !Array.from(ai.neighbors.keys()).some((o) => G.canAttack(n.id, o));
    if ((landLocked && fill > 0.15 && S.t - ai.lastBoat > 6 && afloat < 3) || (!landLocked && fill > 0.5 && under < 3 && S.t - ai.lastBoat > 25 && afloat < 1)) {
      const cx = n.sx / Math.max(1, n.tiles), cy = n.sy / Math.max(1, n.tiles);
      const near = G.alive().filter((e) => e.id !== n.id && e.tiles > (landLocked ? 60 : 20) && G.canAttack(n.id, e.id)).sort((a, b) => U.dist2(a.capX, a.capY, cx, cy) - U.dist2(b.capX, b.capY, cx, cy));
      const tgt = near[S.rng.int(Math.min(landLocked ? 5 : 3, near.length))];
      if (tgt) AI.boatAttackOn(n, tgt, landLocked ? 0.2 : 0.15); else AI.boatAttack(n);
      ai.lastBoat = S.t;
    }
    // build up the base at hyper speed
    if (S.t - ai.lastBuild > 1.5) {
      const order = ['city', 'factory', 'silo', 'laser', 'sam', 'abm', 'aegis', 'radar', 'fort', 'port'];
      const type = order[S.rng.int(order.length)];
      for (let k = 0; k < 4; k++) if (tryBuild(n, type, randomOwnTile(n, type === 'fort'))) { ai.lastBuild = S.t; break; }
    }
    // orbital fire and missiles at the strongest nation in reach
    if (S.t - ai.lastNuke > 12) {
      const targets = G.alive().filter((e) => e.id !== n.id && e.tiles > 30).sort((a, b) => MP.Diplo.strength(b) - MP.Diplo.strength(a));
      const e = ai.neighbors.size && S.rng() < 0.6 ? S.nations[Array.from(ai.neighbors.keys())[S.rng.int(ai.neighbors.size)]] : targets[S.rng.int(Math.min(6, targets.length))];
      if (e && e.alive) {
        const aim = AI.aimPoint(n, e);
        if (aim) for (const w of ['Orbital', 'ICBM', 'Hypersonic', 'Tactical']) { if (MP.Weapons.canLaunch(n, w, aim[0], aim[1]).ok) { MP.Weapons.launch(n, w, aim[0], aim[1]); ai.lastNuke = S.t; break; } }
      }
    }
  };

  AI.attackAim = function (n, e) {
    const S = G.S;
    if (S.rng() < 0.3 && e.capital >= 0) return [e.capX, e.capY];
    const arr = e.st.city.length ? e.st.city : null;
    if (arr) { const c = arr[S.rng.int(arr.length)]; return [c.x, c.y]; }
    return e.capital >= 0 ? [e.capX, e.capY] : null;
  };

  AI.boatAttackOn = function (n, f, share) {
    const S = G.S, W = World.W;
    n.ai.lastBoat = S.t;
    const coast = [];
    let k = 0;
    for (const t of f.border) { if (World.coast[t] && (k++ % 5) === 0) coast.push(t); if (coast.length > 60) break; }
    if (!coast.length) return;
    // nearest shore that has real land behind it (skip islets the beachhead would be stranded on)
    let best = coast[0], bd = 1e18;
    for (const t of coast) {
      const mass = MP.Naval.landMass(t, n.id);
      const d = U.dist2(t % W, (t / W) | 0, n.capX, n.capY) * (mass >= 12 ? 1 : mass >= 6 ? 2.5 : 8);
      if (d < bd) { bd = d; best = t; }
    }
    MP.Naval.launchTransport(n, best, n.troops * (share || 0.3));
  };

  AI.onStruck = function (v, attacker, w) {
    const ai = v.ai;
    if (!ai) return;
    ai.grudge.set(attacker, (ai.grudge.get(attacker) || 0) + (w === 'Airstrike' || w === 'EMP' ? 1 : 3));
    ai.retaliate = attacker;
  };

  AI.strike = function (n, pers) {
    const S = G.S, ai = n.ai;
    if (S.phase !== 'play' || S.defcon > 4) return;
    const nukeMul = C.DIFFICULTY[n.difficulty].nukeMul;
    // MAD restraint near midnight
    const late = S.clock < 90;
    let target = 0, reason = '';
    if (ai.retaliate && S.nations[ai.retaliate] && S.nations[ai.retaliate].alive) { target = ai.retaliate; reason = 'retaliate'; }
    else if (n.puppet && ai.focus && S.nations[ai.focus] && S.nations[ai.focus].alive && S.t - ai.lastNuke > 20) { target = ai.focus; reason = 'master'; }
    else if (!late && S.t - ai.lastNuke > 110 / (pers.nuke * nukeMul) && S.rng() < 0.07 * pers.nuke * nukeMul) {
      // strike a stronger enemy we're at war with, or a grudge
      let bs = 0;
      if (ai.focus && S.nations[ai.focus] && S.nations[ai.focus].alive) n.wars.add(ai.focus);
      for (const o of n.wars) {
        const e = S.nations[o];
        if (!e || !e.alive || G.isAllied(n.id, o)) continue;
        let s = MP.Diplo.strength(e) / Math.max(1, MP.Diplo.strength(n)) + (ai.grudge.get(o) || 0) * 0.4 + (pers.nuke - 0.6) + (ai.focus === o ? 0.6 : 0);
        if (e.isPlayer && S.t < 600) s -= 0.3;
        if (s > bs) { bs = s; target = o; }
      }
      if (bs < 1.25) target = 0;
      reason = 'war';
    }
    if (!target) return;
    if (late && reason !== 'retaliate' && reason !== 'master') return;
    if (S.clock < 45 && pers.nuke < 1.1) { ai.retaliate = 0; return; }
    const e = S.nations[target];
    // choose weapon: strongest available & affordable
    const order = ['MIRV', 'ICBM', 'Hypersonic', 'Orbital', 'Tactical', 'EMP', 'Airstrike'];
    const aim = AI.aimPoint(n, e);
    if (!aim) return;
    for (const w of order) {
      if (!n.research[w]) continue;
      if (w === 'EMP' && reason === 'retaliate') continue;
      const chk = MP.Weapons.canLaunch(n, w, aim[0], aim[1]);
      if (!chk.ok) continue;
      // keep a reserve unless retaliating
      if (reason === 'war' && n.credits - chk.cost.credits < 5000) continue;
      MP.Weapons.launch(n, w, aim[0], aim[1]);
      ai.lastNuke = S.t;
      if (reason === 'retaliate' && S.rng() < 0.6) ai.retaliate = 0;
      return;
    }
  };

  AI.aimPoint = function (n, e) {
    const S = G.S;
    // prefer silos > cities > capital of the enemy; within range of our launchers
    const cands = [];
    for (const s of e.st.silo) cands.push([s.x, s.y, 3]);
    for (const s of e.st.city) cands.push([s.x, s.y, 2 + s.level * 0.3]);
    for (const s of e.st.factory) cands.push([s.x, s.y, 1.5]);
    if (e.capital >= 0) cands.push([e.capX, e.capY, 2.5]);
    if (!cands.length) return null;
    cands.sort((a, b) => b[2] - a[2] + (S.rng() - 0.5));
    return [cands[0][0] + S.rng.range(-2, 2), cands[0][1] + S.rng.range(-2, 2)];
  };

  AI.diplomacy = function (n, pers) {
    const S = G.S, ai = n.ai;
    const p = G.player();
    // embargo hated nations
    for (const [o] of ai.neighbors) if (G.rel(n.id, o) < -55 && !n.embargo.has(o)) {
      n.embargo.add(o); S.roadsDirty = true;
      const e = S.nations[o];
      if (e && e.isPlayer) { MP.Game.wire('CABLE', `${n.name} EMBARGOES YOU`, 'embargo'); MP.Game.notify('diplo.embargo_us', { nation: n.name }); }
    }
    // truce when losing land fast to a stronger enemy
    const h = ai.landHist;
    if (h.length >= 4 && h[h.length - 1] < h[h.length - 4] * 0.85 && n.lastHitBy && S.t - n.lastHitAt < 10) {
      const e = S.nations[n.lastHitBy];
      if (e && e.alive && !G.hasTruce(n.id, e.id)) {
        if (e.isPlayer) MP.Diplo.offerToPlayer(n, 'truce');
        else if (S.rng() < MP.Diplo.truceOdds(n, e)) MP.Diplo.formTruce(n, e);
      }
    }
    // alliances with other bots
    if (MP.Diplo.allianceCount(n) < 3 && S.rng() < 0.35 * pers.ally && S.opts.mode !== 'teams') {
      const al = G.alive();
      const cand = al[S.rng.int(al.length)];
      if (cand && cand.id !== n.id && !G.isAllied(n.id, cand.id) && !cand.isPlayer && cand.ai && !cand.isAlien && !n.partner && !cand.partner) {
        if (MP.Diplo.allianceCount(cand) < 4 && S.rng() < MP.Diplo.allianceOdds(n, cand) * 0.6) MP.Diplo.formAlliance(n, cand);
      }
    }
    // offer an alliance to the player occasionally
    if (p && p.alive && !n.partner && !G.isAllied(n.id, p.id) && S.t - ai.lastOffer > 150 && S.phase === 'play') {
      const odds = MP.Diplo.allianceOdds(p, n);
      if (odds > 0.6 && G.rel(n.id, p.id) > 10 && S.rng() < 0.12 * pers.ally) { ai.lastOffer = S.t; MP.Diplo.offerToPlayer(n, 'ally'); }
    }
    // help allies under attack (troop gift)
    for (const a of n.allies) {
      const ally = S.nations[a];
      if (!ally || !ally.alive) continue;
      if (S.t - ally.lastHitAt < 8 && n.troops > n.cap * 0.6 && S.rng() < 0.25) {
        const amt = MP.Diplo.gift(n, ally, 'troops', n.troops * 0.12);
        if (ally.isPlayer && amt) { MP.Game.notify('diplo.gift', { nation: n.name }); MP.Game.wire('CABLE', `${n.name} SENDS ${U.fmtK(amt)} TROOPS TO YOU`, 'good'); }
      }
    }
    // forget grudges slowly
    for (const [o, v] of ai.grudge) { if (v <= 1) ai.grudge.delete(o); else ai.grudge.set(o, v - 1); }
  };
})();
