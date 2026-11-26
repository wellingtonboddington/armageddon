/* MIDNIGHT PROTOCOL — match controller: setup, phases, DEFCON & Doomsday Clock, milestones,
   notifications, endings, save/resume. */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;

  const Game = (MP.Game = { running: false, paused: false, speed: 1 });

  // ---------------- notifications ----------------
  Game.notify = function (key, params) {
    const S = G.S;
    if (!S || S.phase === 'over' && !key.startsWith('end.')) return;
    if (S.opts.mode === 'watch' && !key.startsWith('end.') && !key.startsWith('council') && !key.startsWith('defcon') && !key.startsWith('clock') && key !== 'missile.world_first') return;
    try { MP.Advisor && MP.Advisor.event(key, params || {}); } catch (e) { console.error(e); }
  };
  Game.tut = function (key) {
    const S = G.S;
    if (!S || S.opts.mode === 'watch') return;
    if (!MP.settings.get('tutorial', true)) return;
    S.flags['tut:' + key] = true;
    Game.notify(key, {});
  };
  Game.wire = function (tag, text, cls) {
    const S = G.S;
    if (!S) return;
    const item = { t: S.t, tag, text, cls: cls || '' };
    S.wire.push(item);
    if (S.wire.length > 60) S.wire.shift();
    MP.HUD && MP.HUD.pushWire(item);
  };
  Game.toast = function (text, kind) { MP.HUD && MP.HUD.toast(text, kind); };

  Game.onPlayerBuilt = function (type, s) {
    const S = G.S;
    const map = { city: 'tut.city', factory: 'tut.factory', hub: 'tut.hub', port: 'tut.port', enrich: 'tut.enrich', fort: 'tut.fort', silo: 'tut.silo',
      radar: 'tut.radar', sam: 'tut.defense', abm: 'tut.defense', laser: 'tut.defense', aegis: 'tut.defense' };
    if (s.level > 1) Game.tut('tut.upgrade');
    else if (map[type]) Game.tut(map[type]);
    const cnt = (S.stats.built[type] || 0);
    if (cnt > 0) Game.wire('ADVISOR', `${C.BUILD[type].name.toUpperCase()} (${s.level > 1 ? 'L' + s.level : cnt})`, 'advisor');
    MP.Menu && MP.Menu.missionEvent('build', type);
  };

  Game.nationFell = function (v, by) {
    const S = G.S;
    S.fallenRecent = (S.fallenRecent || 0) + 1;
    if (v.isPlayer) {
      Game.notify('end.defeat', {});
      Game.endMatch('eliminated');
      return;
    }
    if (by && by.isPlayer) Game.wire('OSINT', `${v.name} HAS FALLEN TO YOU`, 'good');
    MP.Menu && by && by.isPlayer && MP.Menu.missionEvent('eliminate');
  };

  // ---------------- setup ----------------
  Game.newMatch = function (opts) {
    const S = G.create(opts);
    for (const d of World.deposits) { d.plant = null; d.owner = 0; }
    MP.Diplo.pending = [];
    const rng = S.rng;
    const prof = opts.player;
    const totalNations = Math.min(100, Math.max(2, (opts.bots | 0) + (opts.mode === 'watch' ? 0 : 1)));
    const names = C.BOT_NAMES.slice();
    for (let i = names.length - 1; i > 0; i--) { const j = rng.int(i + 1); [names[i], names[j]] = [names[j], names[i]]; }
    const flags = MP.Flags.countryCodes();
    const persKeys = Object.keys(C.PERSONALITIES);
    const teamCount = opts.mode === 'teams' ? (opts.teams || 2) : 0;
    const TEAM_COLORS = [[255, 196, 40], [80, 170, 255], [255, 90, 80], [130, 230, 110]];
    const usedNames = new Set();
    let player = null;
    if (opts.mode !== 'watch') {
      player = G.addNation({ name: prof.name, flag: prof.flag, color: prof.color.slice(), isPlayer: true, isBot: false, doctrine: prof.doctrine,
        pattern: prof.pattern, missileStyle: prof.missile, detonation: prof.detonation, team: teamCount ? 1 : (opts.party && opts.party.length ? 1 : 0) });
      usedNames.add(prof.name);
    }
    // party: up to 2 partner bots (doctrine & spawn assigned by command), or 1 PUPPET-STATE you configure and place
    const puppetMode = opts.partyMode === 'puppet';
    const partyList = opts.mode === 'watch' ? [] : (opts.party || []).slice(0, puppetMode ? 1 : C.PARTY_MAX);
    for (const pt of partyList) {
      const doctrine = puppetMode ? pt.doctrine : C.DOCTRINES[rng.int(C.DOCTRINES.length)].id;
      const n = G.addNation({ name: pt.name, flag: pt.flag, color: U.mix(prof.color, [255, 255, 255], 0.35 + 0.15 * (S.nations.length % 2)), partner: true,
        puppet: puppetMode, doctrine, personality: puppetMode ? 'hawk' : 'expansionist', difficulty: opts.difficulty, team: player.team || 1 });
      n.donations = 0; n.giftedT = 0; n.giftedC = 0;
      usedNames.add(pt.name);
      MP.AI.init(n);
      if (puppetMode) S.puppetId = n.id;
    }
    if (player) {
      player.skills = (prof.skills || []).slice();
      player.mods = G.computeMods(player);
      player.troops = C.START_TROOPS * G.mod(player, 'startTroops');
    }
    let ni = 0;
    while (S.nations.length - 1 < totalNations) {
      let name = names[ni++ % names.length];
      if (usedNames.has(name)) name = name + ' ' + (ni > names.length ? 'II' : '');
      usedNames.add(name);
      let color = C.NATION_PALETTE[(S.nations.length * 7) % C.NATION_PALETTE.length];
      color = U.mix(color, [rng.int(255), rng.int(255), rng.int(255)], 0.25);
      const team = teamCount ? ((S.nations.length - 1) % teamCount) + 1 : 0;
      if (teamCount) color = U.mix(TEAM_COLORS[team - 1], [rng.int(255), rng.int(255), rng.int(255)], 0.22);
      const flag = rng() < 0.7 ? 'cc:' + flags[rng.int(flags.length)] : MP.Flags.randomSpec(rng);
      const docs = C.DOCTRINES;
      const n = G.addNation({ name, flag, color, personality: persKeys[rng.int(persKeys.length)], difficulty: opts.difficulty,
        doctrine: docs[rng.int(docs.length)].id, team, pattern: rng() < 0.15 ? 'hazard' : 'none' });
      MP.AI.init(n);
    }
    if (player && teamCount) player.color = TEAM_COLORS[0].slice();
    G.initRelations();
    // teams are allied by construction (team id)
    S.spawnSchedule = [];
    for (let i = 1; i < S.nations.length; i++) {
      const n = S.nations[i];
      if (n.isPlayer || n.puppet) continue; // the puppet-state is placed by the player
      S.spawnSchedule.push({ id: n.id, at: 0.5 + rng() * (C.SPAWN_SECONDS - 3) * (n.partner ? 0.6 : 1) });
    }
    S.spawnSchedule.sort((a, b) => a.at - b.at);
    S.spawnEnd = C.SPAWN_SECONDS;
    S.matchSeconds = (opts.minutes || 40) * 60;
    S.peaceSeconds = (opts.peaceMinutes == null ? 5 : opts.peaceMinutes) * 60;
    S.winPct = opts.winPct || C.WIN_PCT;
    for (const n of S.nations) if (n) n.credits = (opts.startCredits != null ? opts.startCredits : C.START_CREDITS) + (n.isPlayer && G.has(n, 'startCredits') ? 10000 : 0);
    Game.running = true; Game.paused = false; Game.speed = 1;
    MP.Render.resetMatch();
    MP.HUD.startMatch();
    MP.Advisor && MP.Advisor.reset();
    MP.Advisor && MP.Advisor.setMode(opts.mode === 'watch' ? 'game' : 'game');
    Game.notify('game.start', {});
    if (opts.mode !== 'watch') Game.tut('tut.spawn');
    Game.wire('FLASH', `WIRE ONLINE · JAN ${C.START_YEAR} · DEFCON 5`, 'flash');
    if (opts.mode !== 'watch') Game.wire('ADVISOR', 'CLICK LAND TO PLACE YOUR NATION', 'advisor');
    MP.SFX.startAmbient();
    MP.Render.focusWorld();
    return S;
  };

  Game.playerSpawn = function (t, moveSelf) {
    const S = G.S, p = G.player();
    if (!p || S.phase !== 'spawn') return false;
    const pup = S.puppetId ? S.nations[S.puppetId] : null;
    if (pup && p.spawned && !moveSelf && S.owner[t] !== p.id) {
      if (!MP.War.validSpawn(t, 14) && S.owner[t] !== pup.id) { Game.toast('Pick open land for your puppet-state', 'bad'); MP.SFX.play('error'); return false; }
      if (pup.spawned) { for (let i = 0; i < World.N; i++) if (S.owner[i] === pup.id) G.setOwner(i, 0, 0); pup.spawned = false; }
      MP.War.spawnAt(pup, t);
      MP.SFX.play('spawn');
      Game.wire('CABLE', `PUPPET-STATE ${pup.name} ESTABLISHED`, 'good');
      Game.notify('game.partner_spawned', { name: pup.name });
      return true;
    }
    if (!MP.War.validSpawn(t, 14)) {
      // allow respawn on own blob
      if (S.owner[t] !== p.id) { Game.toast('Pick open land away from other nations', 'bad'); MP.SFX.play('error'); return false; }
    }
    if (p.spawned) {
      for (let i = 0; i < World.N; i++) if (S.owner[i] === p.id) G.setOwner(i, 0, 0);
      p.spawned = false;
    }
    MP.War.spawnAt(p, t);
    MP.SFX.play('spawn');
    Game.notify('game.spawned', {});
    return true;
  };

  // ---------------- per-tick phase logic ----------------
  Game.tick = function (dt) {
    const S = G.S;
    if (!S || S.phase === 'over') return;
    S._tickN = (S._tickN || 0) + 1;
    World.pathBudget = S._tickN % 3 === 0 ? 1 : 0; // new A* searches allowed per tick for trade (warships/transports bypass via retry)
    S.t += dt;
    if (S.phase === 'spawn') {
      S.spawnLeft = S.spawnEnd - S.t;
      while (S.spawnSchedule.length && S.spawnSchedule[0].at <= S.t) {
        const it = S.spawnSchedule.shift();
        const n = S.nations[it.id];
        const t = MP.War.randomSpawnTile(S.rng, n.personality === 'trader' ? 'coast' : n.personality === 'hawk' ? 'deposit' : null);
        if (t >= 0) {
          MP.War.spawnAt(n, t);
          if (n.partner) {
            Game.notify('game.partner_spawned', { name: n.name });
            Game.wire('CABLE', `PARTNER ${n.name} DEPLOYED`, 'good');
            MP.Render.ping(n.capX, n.capY, [62, 230, 255]);
          }
        } else n.alive = false;
      }
      if (S.t >= S.spawnEnd) Game.beginPlay();
    } else if (S.phase === 'play') {
      MP.Eco.tick(dt);
      MP.War.tick(dt);
      G.resolveCapFalls();
      MP.Naval.tick(dt);
      MP.Weapons.tick(dt);
      G.resolveCapFalls();
      MP.Diplo.tick(dt);
      MP.Weather.tick(dt);
      MP.AI.tick(dt);
      MP.War.tickPockets();
      G.resolveCapFalls();
      Game.tickRules(dt);
    }
    G.tickSoft();
  };

  Game.beginPlay = function () {
    const S = G.S;
    const p = G.player();
    if (p && !p.spawned) {
      const t = MP.War.randomSpawnTile(S.rng);
      if (t >= 0) { MP.War.spawnAt(p, t); Game.toast('Auto-deployed', 'info'); MP.Render.centerOn(p.capX, p.capY, 5); }
    }
    const pup = S.puppetId ? S.nations[S.puppetId] : null;
    if (pup && !pup.spawned) {
      // not placed: settle it next to the player
      let t = -1;
      for (let k = 0; k < 300 && t < 0; k++) {
        const a = S.rng() * Math.PI * 2, d = 30 + S.rng() * 60;
        const c = Math.round(p.capX + Math.cos(a) * d) + Math.round(p.capY + Math.sin(a) * d) * World.W;
        if (c > 0 && c < World.N && MP.War.validSpawn(c, 12)) t = c;
      }
      if (t < 0) t = MP.War.randomSpawnTile(S.rng);
      if (t >= 0) { MP.War.spawnAt(pup, t); Game.wire('CABLE', `PUPPET-STATE ${pup.name} ESTABLISHED`, 'good'); }
    }
    for (const it of S.spawnSchedule) {
      const n = S.nations[it.id];
      const t = MP.War.randomSpawnTile(S.rng);
      if (t >= 0) MP.War.spawnAt(n, t); else n.alive = false;
    }
    S.spawnSchedule = [];
    for (const n of S.nations) if (n && !n.spawned) n.alive = false;
    S.phase = 'play';
    S.playStart = S.t;
    Game.tut('tut.expand');
    setTimeout(() => G.S === S && Game.tut('tut.attack'), 15000);
    MP.SFX.play('phase');
  };

  Game.elapsed = () => (G.S.phase === 'play' || G.S.phase === 'over') ? G.S.t - G.S.playStart : 0;
  Game.matchLeft = () => G.S.matchSeconds - Game.elapsed();
  Game.peaceLeft = () => Math.max(0, G.S.peaceSeconds - Game.elapsed());

  Game.setDefcon = function (d) {
    const S = G.S;
    if (d >= S.defcon) return;
    S.defcon = d;
    Game.notify('defcon.' + d, {});
    Game.wire('FLASH', `DEFCON ${d}`, 'flash');
    MP.SFX.play('defcon');
    MP.HUD && MP.HUD.flashDefcon();
  };

  Game.tickRules = function (dt) {
    const S = G.S;
    const el = Game.elapsed();
    // clock
    const frozen = S.council.effects.some((e) => e.id === 'testban');
    if (!frozen) S.clock -= C.CLOCK_DRIFT_PER_SEC * dt;
    const clk = S.clock;
    const mark = (k, cond) => { if (cond && !S.flags[k]) { S.flags[k] = true; Game.notify(k, {}); } };
    mark('clock.5min', clk <= 300); mark('clock.2min', clk <= 120); mark('clock.1min', clk <= 60);
    if (clk <= 60) { S._tick1 = (S._tick1 || 0) + dt; if (S._tick1 >= 1) { S._tick1 = 0; MP.SFX.play('clockTick'); } }
    if (clk <= 0) { S.clock = 0; Game.endMatch('winter'); return; }
    if (el >= C.PROTECT_SECONDS && !S.flags.protectEnd) { S.flags.protectEnd = true; Game.wire('FLASH', 'SPAWN PROTECTION LIFTED · BORDERS ARE OPEN', 'flash'); MP.SFX.play('phase'); }
    // DEFCON
    if (S.opts.nukes !== false) {
      if (S.defcon === 5 && el >= S.peaceSeconds) { Game.setDefcon(4); Game.notify('game.peace_end', {}); Game.tut('tut.research'); }
      if (S.defcon === 4) {
        const big = G.alive().some((n) => n.tiles / S.landTotal >= 0.10);
        if (big || S.firstNuke) Game.setDefcon(3);
      }
      if (S.defcon === 3) {
        const big = G.alive().some((n) => n.tiles / S.landTotal >= 0.25);
        if (big || clk <= 300) Game.setDefcon(2);
      }
      if (S.defcon === 2 && clk <= 120) Game.setDefcon(1);
    }
    S._ruleT = (S._ruleT || 0) + dt;
    if (S._ruleT < 0.5) return;
    S._ruleT = 0;
    MP.War.tickElim();
    // ranks & milestones
    const al = G.alive().sort((a, b) => b.tiles - a.tiles);
    al.forEach((n, i) => { n.rank = i + 1; });
    const p = G.player();
    if (p && p.alive) {
      const pct = 100 * p.tiles / S.landTotal;
      S.stats.peakPct = Math.max(S.stats.peakPct, pct);
      for (const m of C.MILESTONES) if (pct >= m && !S.flags['ms' + m]) {
        S.flags['ms' + m] = true;
        Game.notify('milestone.' + m, {});
        Game.wire('FLASH', `YOU HOLD ${m}% OF THE WORLD`, 'flash');
        MP.SFX.play('milestone');
        if (m === 10 || m === 25) MP.HUD.offerDirective();
      }
      if (p.rank <= 3 && !S.flags.top3 && al.length > 10) { S.flags.top3 = true; Game.notify('rank.top3', {}); }
      if (p.rank === 1 && !S.flags.first && al.length > 5 && el > 60) { S.flags.first = true; Game.notify('rank.first', {}); }
      if (p.credits > 150000 && !S.flags.rich) { S.flags.rich = true; Game.notify('econ.rich', {}); }
      if (p.uCapped && p.uranium >= C.URANIUM_CAP_NO_DEPOSIT - 0.5 && !S.flags.ucap) { S.flags.ucap = true; Game.notify('econ.uranium_capped', {}); }
      if (el > 40 && !S.flags.tutCity && p.levels.city == null) { S.flags.tutCity = true; Game.tut('tut.city'); }
      if (el > 70 && !S.flags.tutDug) { S.flags.tutDug = true; Game.tut('tut.dugin'); }
      if (el > 110 && !S.flags.tutFac && !p.levels.factory) { S.flags.tutFac = true; Game.tut('tut.factory'); }
      if (el > 150 && !S.flags.tutSup) { S.flags.tutSup = true; Game.tut('tut.supply'); }
      if (el > 200 && !S.flags.tutAlly && !(S.opts.party && S.opts.party.length)) { S.flags.tutAlly = true; Game.tut('tut.alliance'); }
      if (el > 240 && !S.flags.tutBoat && p.st.port.length === 0) { S.flags.tutBoat = true; Game.tut('tut.boat'); }
    }
    // ---- victory: alliances pool their land ----
    // a solo nation wins at the win %; an alliance (or team) counts its members together, and any bloc
    // that is not yours reaching the win % ends the match. Your own alliance must take the whole world.
    const pBloc = p && p.alive ? Game.blocOf(p) : null;
    const blocTiles = (set) => { let t = 0; for (const id of set) t += S.nations[id].tiles; return t; };
    if (pBloc) {
      const bt = blocTiles(pBloc);
      S.blocPct = 100 * bt / S.landTotal;
      S.blocSize = pBloc.size;
      if (pBloc.size === 1) { if (100 * p.tiles / S.landTotal >= S.winPct) { Game.endMatch('domination', p.id); return; } }
      else {
        if (S.blocPct >= S.winPct && !S.flags.blocLead) {
          S.flags.blocLead = true;
          Game.wire('FLASH', `YOUR ALLIANCE HOLDS ${Math.round(S.blocPct)}% · VICTORY DEMANDS THE WHOLE WORLD`, 'flash');
          Game.notify('alliance.lead', { text: 'Together we hold the line. Victory still demands every last border.', priority: 1 });
        }
        const outside = al.filter((n) => !pBloc.has(n.id));
        if (!outside.length) { Game.endMatch('alliance', p.id); return; }
      }
    }
    for (const n of al) {
      if (pBloc && pBloc.has(n.id)) continue;
      const bloc = Game.blocOf(n);
      if (pBloc) { let mine = false; for (const id of bloc) if (pBloc.has(id)) { mine = true; break; } if (mine) continue; }
      if (100 * blocTiles(bloc) / S.landTotal >= S.winPct) {
        Game.wire('FLASH', `${n.name}${bloc.size > 1 ? ' AND ITS ALLIES' : ''} REACH ${S.winPct}% OF THE WORLD`, 'bad');
        Game.endMatch(p && p.alive ? 'overrun' : 'eliminated', n.id); return;
      }
    }
    // last standing
    if (al.length <= 1) { Game.endMatch(al[0] && al[0].isPlayer ? 'last' : (p && p.alive ? 'last' : 'eliminated')); return; }
    if (S.opts.mode === 'teams') {
      const teams = new Set(al.map((n) => n.team));
      if (teams.size === 1) { Game.endMatch(p && al[0].team === p.team ? 'alliance' : 'eliminated'); return; }
    }
    if (Game.matchLeft() <= 0) {
      // the largest bloc holds the field when the hour runs out
      let best = null, bt = -1;
      for (const n of al) { const b = Game.blocOf(n); const t = blocTiles(b); if (t > bt) { bt = t; best = b; } }
      const win = p && p.alive && best && best.has(p.id);
      Game.endMatch(win ? 'timeout_win' : (p && p.alive ? 'timeout_loss' : 'eliminated')); return;
    }
    // autosave
    S._saveT = (S._saveT || 0) + 0.5;
    if (S._saveT >= 60 && S.opts.mode !== 'watch') { S._saveT = 0; Game.save(true); }
  };

  Game.blocOf = function (n) {
    const S = G.S, set = new Set([n.id]);
    for (const a of n.allies) { const m = S.nations[a]; if (m && m.alive && m.spawned) set.add(a); }
    if (n.team) for (const m of S.nations) if (m && m.alive && m.spawned && m.team === n.team) set.add(m.id);
    return set;
  };

  // ---------------- ending ----------------
  Game.ENDINGS = {
    domination: { title: 'DOMINATION', win: true, line: 'end.victory', desc: 'You held the world. Nobody had the uranium to argue.' },
    last: { title: 'LAST STANDING', win: true, line: 'end.victory', desc: 'Every other flag came down. Yours is the only one left on the wire.' },
    timeout_win: { title: 'TIMEKEEPER', win: true, line: 'end.timeout_win', desc: 'When the hour ran out, you were the largest nation on Earth.' },
    alliance: { title: 'COALITION', win: true, line: 'end.alliance_win', desc: 'Every surviving nation answers to your alliance.' },
    council: { title: 'MIDNIGHT ACCORD', win: null, line: 'end.council', desc: 'The Council ended the war on paper. The largest nation signs first.' },
    winter: { title: 'NUCLEAR WINTER', win: false, line: 'end.winter', desc: 'The clock reached midnight. There is no winner under the ash.' },
    eliminated: { title: 'FALLEN', win: false, line: 'end.defeat', desc: 'Your nation has been erased from the map.' },
    overrun: { title: 'OUTPACED', win: false, line: 'end.defeat', desc: 'Another power — and its allies — claimed the world first.' },
    timeout_loss: { title: 'OUTLASTED', win: false, line: 'end.timeout_loss', desc: 'You survived the hour — but another nation held more of the world.' },
    resign: { title: 'WITHDRAWAL', win: false, line: 'end.resign', desc: 'You signed the instrument of surrender.' },
  };

  Game.endMatch = function (kind, winnerId) {
    const S = G.S;
    if (!S || S.phase === 'over') return;
    S.phase = 'over';
    const p = G.player();
    const al = G.alive().sort((a, b) => b.tiles - a.tiles);
    let win = Game.ENDINGS[kind].win;
    if (kind === 'council') win = !!(p && p.alive && al[0] && al[0].id === p.id);
    S.ending = kind; S.won = !!win;
    S.winner = winnerId || (al[0] ? al[0].id : 0);
    Game.notify(Game.ENDINGS[kind].line, {});
    MP.SFX.play(kind === 'winter' ? 'winter' : win ? 'victory' : 'defeat');
    MP.SFX.stopAmbient();
    Game.clearSave();
    const cc = document.getElementById('h-council'); if (cc) cc.style.display = 'none';
    const result = MP.Menu ? MP.Menu.recordMatch(S, kind, !!win) : null;
    setTimeout(() => MP.HUD.showEnd(kind, !!win, result), kind === 'winter' ? 2600 : 900);
  };

  Game.resign = function () {
    const S = G.S;
    if (!S || S.phase === 'over') return;
    if (S.opts.mode === 'watch') { Game.quitToMenu(); return; }
    Game.endMatch('resign');
  };

  Game.quitToMenu = function () {
    Game.running = false;
    MP.SFX.stopAmbient();
    MP.HUD.stopMatch();
    MP.Menu.show();
  };

  Game.setPaused = function (v) {
    Game.paused = v;
    MP.HUD.syncSpeed();
    if (v) { Game.notify('game.paused', {}); if (G.S && G.S.phase === 'play' && G.S.opts.mode !== 'watch') Game.save(true); }
  };
  Game.setSpeed = function (s) {
    Game.speed = s; Game.paused = false;
    MP.HUD.syncSpeed();
    Game.notify('game.speed', { speed: s + '×' });
  };

  // ---------------- save / resume (IndexedDB, localStorage fallback) ----------------
  const DB = 'midnight-protocol', STORE = 'saves';
  function idb() {
    return new Promise((res, rej) => {
      try {
        const rq = indexedDB.open(DB, 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    });
  }
  async function put(key, val) {
    try {
      const db = await idb();
      await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
      return true;
    } catch (e) {
      try { localStorage.setItem('mp.save.' + key, JSON.stringify(val)); return true; } catch (e2) { return false; }
    }
  }
  async function get(key) {
    try {
      const db = await idb();
      return await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const rq = tx.objectStore(STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    } catch (e) {
      try { return JSON.parse(localStorage.getItem('mp.save.' + key) || 'null'); } catch (e2) { return null; }
    }
  }
  async function del(key) {
    try { const db = await idb(); const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); } catch (e) { /* ignore */ }
    try { localStorage.removeItem('mp.save.' + key); } catch (e) { /* ignore */ }
  }

  Game.serialize = function () {
    const S = G.S;
    const soft = new Uint8Array(World.N);
    for (let i = 0; i < World.N; i++) { const r = S.softUntil[i] - S.t; soft[i] = r > 0 ? Math.min(255, Math.ceil(r)) : 0; }
    const nations = S.nations.map((n) => n && {
      id: n.id, name: n.name, flag: n.flag, color: n.color, isPlayer: n.isPlayer, isBot: n.isBot, team: n.team, partner: n.partner,
      personality: n.personality, difficulty: n.difficulty, doctrine: n.doctrine, directives: n.directives, pattern: n.pattern,
      missileStyle: n.missileStyle, detonation: n.detonation, alive: n.alive, spawned: n.spawned, capital: n.capital,
      troops: n.troops, credits: n.credits, uranium: n.uranium, research: n.research, researching: n.researching,
      allies: Array.from(n.allies), truces: Array.from(n.truces.entries()).map(([k, v]) => [k, v - S.t]), embargo: Array.from(n.embargo), wars: Array.from(n.wars),
      traitorUntil: n.traitorUntil - S.t, launches: n.launches, orbitalReady: n.orbitalReady - S.t, launchBanUntil: n.launchBanUntil - S.t,
      stats: n.stats, eliminatedBy: n.eliminatedBy, incomeAvg: n.incomeAvg,
      puppet: !!n.puppet, skills: n.skills || [], donations: n.donations || 0, giftedT: n.giftedT || 0, giftedC: n.giftedC || 0, targetId: n.targetId || 0,
      grudge: n.ai ? Array.from(n.ai.grudge.entries()) : [],
    });
    return {
      v: 1, savedAt: Date.now(), opts: S.opts, seed: S.seed, rngState: S.rng.state(), t: S.t, phase: S.phase, playStart: S.playStart, spawnEnd: S.spawnEnd,
      matchSeconds: S.matchSeconds, peaceSeconds: S.peaceSeconds, winPct: S.winPct, clock: S.clock, defcon: S.defcon, firstNuke: S.firstNuke,
      owner: U.rleEncode(S.owner), soft: U.rleEncode(soft), home: U.rleEncode(S.home), prevOwner: U.rleEncode(S.prevOwner), nations,
      puppetId: S.puppetId || 0, ghostForts: Array.from(S.ghostForts.entries()),
      structs: S.structs.map((s) => ({ id: s.id, type: s.type, owner: s.owner, tile: s.tile, level: s.level, build: s.build, buildMax: s.buildMax,
        disabledUntil: s.disabledUntil - S.t, ammo: s.ammo, reload: s.reload, ready: s.ready, siloT: s.siloT, depositTile: s.depositTile })),
      attacks: S.attacks.filter((a) => !a.done).map((a) => ({ from: a.from, to: a.to, troops: a.troops })),
      ships: S.ships.filter((s) => s.kind !== 'trade').map((s) => ({ kind: s.kind, owner: s.owner, x: s.x, y: s.y, hp: s.hp, maxHp: s.maxHp, troops: s.troops,
        landing: s.landing, target: s.target, fuel: s.fuel, state: s.state === 'building' ? 'building' : 'patrol', build: s.build, buildMax: s.buildMax,
        patrolX: s.patrolX, patrolY: s.patrolY, portTile: s.port ? s.port.tile : -1 })),
      missiles: S.missiles.map((m) => Object.assign({}, m)),
      fallout: S.fallout.map((f) => ({ x: f.x, y: f.y, r: f.r, until: f.until - S.t })),
      storms: S.storms.map((s) => Object.assign({}, s, { born: s.born - S.t })),
      council: { next: S.council.next, effects: S.council.effects.map((e) => Object.assign({}, e, { until: e.until - S.t })) },
      relations: Array.from(S.relations), relN: S.relN, wire: S.wire.slice(-25).map((w) => Object.assign({}, w, { t: w.t - S.t })),
      stats: S.stats, flags: S.flags, nextStructId: S.nextStructId,
      camera: MP.Render.getCamera(),
    };
  };

  Game.save = async function (quiet) {
    const S = G.S;
    if (!S || S.phase === 'over' || S.opts.mode === 'watch') return false;
    let data;
    try { data = Game.serialize(); } catch (e) { console.error('[save]', e); return false; }
    const ok = await put('auto', data);
    if (!quiet || !ok) MP.HUD && MP.HUD.savedIndicator(ok);
    if (!quiet) Game.notify('game.saved', {});
    return ok;
  };
  Game.hasSave = async function () { const d = await get('auto'); return d && d.v === 1 ? d : null; };
  Game.clearSave = function () { del('auto'); };

  Game.load = async function () {
    let d = null;
    try { d = await get('auto'); } catch (e) { d = null; }
    if (!d || d.v !== 1) return false;
    try { return Game.loadData(d); } catch (e) {
      // a save from an older/newer build that no longer fits: discard it instead of breaking the game
      console.error('[load]', e);
      Game.clearSave();
      MP.HUD && MP.HUD.toast('That save is from an incompatible build and was discarded', 'bad');
      Game.running = false;
      MP.Menu && MP.Menu.show();
      return false;
    }
  };
  Game.loadData = function (d) {
    const S = G.create(d.opts);
    for (const dep of World.deposits) { dep.plant = null; dep.owner = 0; }
    S.rng.setState(d.rngState);
    S.t = d.t; S.phase = d.phase === 'spawn' ? 'play' : d.phase; S.playStart = d.playStart != null ? d.playStart : d.t; S.spawnEnd = d.spawnEnd;
    S.matchSeconds = d.matchSeconds; S.peaceSeconds = d.peaceSeconds; S.winPct = d.winPct; S.clock = d.clock; S.defcon = d.defcon; S.firstNuke = d.firstNuke;
    S.spawnSchedule = [];
    for (const nd of d.nations) {
      if (!nd) continue;
      const n = G.addNation({ name: nd.name, flag: nd.flag, color: nd.color, isPlayer: nd.isPlayer, isBot: nd.isBot, team: nd.team, partner: nd.partner, puppet: !!nd.puppet, skills: nd.skills || [],
        personality: nd.personality, difficulty: nd.difficulty, doctrine: nd.doctrine, directives: nd.directives || [], pattern: nd.pattern,
        missileStyle: nd.missileStyle, detonation: nd.detonation });
      n.alive = nd.alive; n.spawned = nd.spawned; n.troops = nd.troops; n.credits = nd.credits; n.uranium = nd.uranium;
      n.research = nd.research || {}; n.researching = nd.researching; n.allies = new Set(nd.allies); n.embargo = new Set(nd.embargo); n.wars = new Set(nd.wars);
      n.truces = new Map(nd.truces.map(([k, v]) => [k, v + S.t]));
      n.traitorUntil = nd.traitorUntil + S.t; n.launches = nd.launches; n.orbitalReady = nd.orbitalReady + S.t; n.launchBanUntil = nd.launchBanUntil + S.t;
      n.stats = nd.stats; n.eliminatedBy = nd.eliminatedBy; n.incomeAvg = nd.incomeAvg || C.BASE_INCOME;
      n.donations = nd.donations || 0; n.giftedT = nd.giftedT || 0; n.giftedC = nd.giftedC || 0; n.targetId = nd.targetId || 0;
      if (!n.isPlayer) { MP.AI.init(n); n.ai.grudge = new Map(nd.grudge || []); }
    }
    G.initRelations();
    if (d.relN === S.relN) S.relations.set(d.relations);
    S.puppetId = d.puppetId || 0;
    if (d.home) S.home.set(U.rleDecode(d.home, World.N));
    if (d.prevOwner) S.prevOwner.set(U.rleDecode(d.prevOwner, World.N));
    if (d.ghostForts) S.ghostForts = new Map(d.ghostForts);
    const owner = U.rleDecode(d.owner, World.N);
    const soft = U.rleDecode(d.soft, World.N);
    for (let t = 0; t < World.N; t++) if (owner[t]) G.setOwner(t, owner[t], soft[t] || 0);
    for (const nd of d.nations) if (nd && nd.capital >= 0) G.setCapital(S.nations[nd.id], nd.capital);
    for (const sd of d.structs) {
      const n = S.nations[sd.owner];
      if (!n) continue;
      const s = G.addStruct(n, sd.type, sd.tile, { depositTile: sd.depositTile });
      n.levels[sd.type] += sd.level - 1;
      Object.assign(s, { level: sd.level, build: sd.build, buildMax: sd.buildMax, disabledUntil: sd.disabledUntil + S.t, ammo: sd.ammo, reload: sd.reload, ready: sd.ready, siloT: sd.siloT });
    }
    S.nextStructId = Math.max(S.nextStructId, d.nextStructId || 0);
    for (const a of d.attacks) { const n = S.nations[a.from]; if (n && n.alive) { n.troops += a.troops; MP.War.launch(a.from, a.to, a.troops); } }
    for (const sd of d.ships) {
      const n = S.nations[sd.owner];
      if (!n || !n.alive) continue;
      if (sd.kind === 'warship') {
        const port = n.st.port.find((p) => p.tile === sd.portTile) || n.st.port[0];
        if (!port) continue;
        const sh = MP.Naval.spawnWarship(n, port, [sd.patrolX, sd.patrolY], sd.build || 0);
        Object.assign(sh, { x: sd.x, y: sd.y, hp: sd.hp, maxHp: sd.maxHp, fuel: sd.fuel, state: sd.state });
      } else if (sd.kind === 'transport') {
        const path = World.seaPath(sd.x, sd.y, sd.landing % World.W, (sd.landing / World.W) | 0);
        if (!path) { n.troops += sd.troops; continue; }
        path.push([sd.landing % World.W, (sd.landing / World.W) | 0]);
        S.ships.push({ id: 900000 + S.ships.length, kind: 'transport', owner: n.id, x: sd.x, y: sd.y, path, pi: 0, speed: C.TRANSPORT.speed * 2.2, hp: sd.hp, maxHp: sd.maxHp,
          troops: sd.troops, landing: sd.landing, target: sd.target, ang: 0, born: S.t });
      }
    }
    S.missiles = d.missiles || [];
    S.fallout = d.fallout.map((f) => Object.assign(f, { until: f.until + S.t, born: S.t }));
    S.storms = d.storms.map((s) => Object.assign(s, { born: s.born + S.t }));
    S.council.next = d.council.next; S.council.effects = d.council.effects.map((e) => Object.assign(e, { until: e.until + S.t }));
    S.stats = d.stats; S.flags = d.flags;
    Game.running = true; Game.paused = true; Game.speed = 1;
    MP.Render.resetMatch();
    MP.HUD.startMatch();
    for (const w of d.wire) { w.t += S.t; S.wire.push(w); MP.HUD.pushWire(w); }
    MP.Advisor && MP.Advisor.reset();
    MP.Advisor && MP.Advisor.setMode('game');
    if (d.camera) MP.Render.setCamera(d.camera);
    MP.HUD.syncSpeed();
    MP.SFX.startAmbient();
    Game.notify('game.loaded', {});
    Game.wire('FLASH', 'SESSION RESTORED · PAUSED', 'flash');
    return true;
  };
})();
