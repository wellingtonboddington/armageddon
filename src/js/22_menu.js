/* MIDNIGHT PROTOCOL — main menu, profile & progression (offline), loadouts, nation editor,
   party bots, missions, armory, ranks, custom rules, settings, how-to-play */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG;
  const h = U.h;

  const Menu = (MP.Menu = {});
  const PKEY = 'mp.profile.v1';

  // ---------------- profile ----------------
  function defaultProfile() {
    return {
      v: 1, name: 'GREATER MERIDIA', flag: 'cc:NL', xp: 0, level: 1, scrap: 150, wins: 0, streak: 0, best: 0, matches: 0, survived: 0,
      loadouts: [
        { doctrine: 'homeland', territory: 'signal', pattern: 'hazard', missile: 'standard', detonation: 'amber' },
        { doctrine: 'fortress', territory: 'ember', pattern: 'none', missile: 'standard', detonation: 'white' },
        { doctrine: 'deterrence', territory: 'signal', pattern: 'none', missile: 'standard', detonation: 'white' },
        { doctrine: 'firststrike', territory: 'signal', pattern: 'none', missile: 'standard', detonation: 'white' },
        { doctrine: 'homeland', territory: 'signal', pattern: 'none', missile: 'standard', detonation: 'white' },
      ],
      active: 0,
      owned: { territory: ['signal', 'ember'], pattern: ['none', 'hazard'], missile: ['standard'], detonation: ['white', 'amber'] },
      party: [], partyOn: false,
      missions: null, lastDay: '', dayStreak: 0,
      commend: {}, endings: {}, firstBoot: true,
      rules: { bots: 99, difficulty: 'regular', minutes: 40, winPct: 80, peaceMinutes: 5, startCredits: 5000, nukes: true, weather: true, council: true, teams: 2 },
      eliminatedTotal: 0,
    };
  }
  let P = null;
  Menu.load = function () {
    try { P = JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch (e) { P = null; }
    const d = defaultProfile();
    if (!P || P.v !== 1) P = d;
    for (const k in d) if (P[k] === undefined) P[k] = d[k];
    for (const k in d.rules) if (P.rules[k] === undefined) P.rules[k] = d.rules[k];
    for (const k in d.owned) if (!P.owned[k]) P.owned[k] = d.owned[k];
    Menu.dailyCheck();
    return P;
  };
  Menu.save = function () { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) { /* blocked */ } };
  Menu.profile = () => P;
  Menu.level = () => P ? P.level : 1;
  const xpNeed = (L) => 400 + 200 * (L - 1);
  Menu.slotsUnlocked = () => 2 + (P.level >= 5 ? 1 : 0) + (P.level >= 10 ? 1 : 0) + (P.level >= 20 ? 1 : 0);
  Menu.loadout = () => P.loadouts[P.active];

  const RANKS = [[1, 'RECRUIT'], [3, 'ANALYST'], [5, 'OPERATOR'], [8, 'HANDLER'], [10, 'COMMANDER'], [12, 'STRATEGIST'], [15, 'DIRECTOR'], [20, 'MARSHAL'], [30, 'ARCHITECT OF MIDNIGHT']];
  Menu.rankName = (L) => { let r = RANKS[0][1]; for (const [lv, n] of RANKS) if (L >= lv) r = n; return r; };

  // ---------------- missions ----------------
  const DAILY_POOL = [
    { id: 'forts', text: (n) => `BUILD ${n} FORTS`, n: [2, 3, 4], reward: 60, stat: (s) => s.built.fort || 0 },
    { id: 'silos', text: (n) => `BUILD ${n} SILOS`, n: [2, 3], reward: 60, stat: (s) => s.built.silo || 0 },
    { id: 'hold', text: (n) => `END A MATCH HOLDING ${n}%`, n: [5, 10], reward: 100, stat: (s, S, alive) => alive ? s.finalPct : 0, single: true },
    { id: 'capitals', text: (n) => `TAKE ${n} CAPITALS`, n: [1, 2, 3], reward: 80, stat: (s) => s.capitals },
    { id: 'intercept', text: (n) => `INTERCEPT ${n} MISSILES`, n: [2, 4], reward: 80, stat: (s) => s.intercepted },
    { id: 'convoy', text: (n) => `EARN ${n}K FROM CONVOYS`, n: [20, 40], reward: 70, stat: (s) => Math.floor(s.convoyIncome / 1000) },
    { id: 'ally', text: (n) => `SIGN ${n} ALLIANCES`, n: [1, 2], reward: 60, stat: (s) => s.alliances },
    { id: 'sink', text: (n) => `SINK ${n} SHIPS`, n: [2, 4], reward: 70, stat: (s) => s.sunk },
    { id: 'end', text: (n) => `END ${n} NATIONS`, n: [2, 3], reward: 90, stat: (s) => s.eliminated },
    { id: 'factories', text: (n) => `BUILD ${n} FACTORIES`, n: [2, 3], reward: 60, stat: (s) => s.built.factory || 0 },
  ];
  const WEEKLY = [
    { id: 'w_play', text: 'PLAY 10 MATCHES', target: 10, reward: 400 },
    { id: 'w_end', text: 'END 5 NATIONS', target: 5, reward: 450 },
    { id: 'w_survive', text: 'SURVIVE 6 MATCHES', target: 6, reward: 400 },
  ];
  function weekKey(d) { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t.toDateString(); }
  function newDaily(rng) {
    const pool = DAILY_POOL.slice(); const out = [];
    while (out.length < 3) { const m = pool.splice(Math.floor(rng() * pool.length), 1)[0]; const n = m.n[Math.floor(rng() * m.n.length)]; out.push({ id: m.id, n, progress: 0, reward: m.reward, done: false }); }
    return out;
  }
  Menu.dailyCheck = function () {
    const today = new Date().toDateString();
    if (!P.missions) P.missions = { day: '', daily: [], week: '', weekly: [] };
    if (P.missions.day !== today) {
      P.missions.day = today; P.missions.daily = newDaily(Math.random);
      const y = new Date(Date.now() - 86400000).toDateString();
      P.dayStreak = P.lastDay === y ? (P.dayStreak || 0) + 1 : 1;
      P.lastDay = today;
      P.streakBonus = 20 + Math.min(6, P.dayStreak) * 20;
      P.scrap += P.streakBonus;
      P.streakNew = true;
    }
    const wk = weekKey(Date.now());
    if (P.missions.week !== wk) { P.missions.week = wk; P.missions.weekly = WEEKLY.map((w) => ({ id: w.id, progress: 0, done: false })); }
    Menu.save();
  };

  // ---------------- results ----------------
  Menu.recordMatch = function (S, kind, win) {
    if (S.recorded) return S.recordResult;
    S.recorded = true;
    const watch = S.opts.mode === 'watch';
    const st = S.stats;
    const p = MP.G.player();
    const alive = !!(p && p.alive && kind !== 'resign' && kind !== 'winter');
    st.finalPct = p ? 100 * p.tiles / S.landTotal : 0;
    let xp = 60 + Math.round(st.peakPct * 18) + st.eliminated * 40 + st.capitals * 25 + st.intercepted * 10 + (alive ? 120 : 0) + (win ? 400 : 0);
    let scrap = 20 + (win ? 60 : 0) + st.eliminated * 5;
    if (watch) { xp = 30; scrap = 5; }
    // missions
    const done = [];
    if (!watch) {
      for (const m of P.missions.daily) {
        if (m.done) continue;
        const def = DAILY_POOL.find((d) => d.id === m.id);
        const v = def.stat(st, S, alive);
        m.progress = def.single ? Math.max(m.progress, v >= m.n ? m.n : 0) : Math.min(m.n, m.progress + v);
        if (m.progress >= m.n) { m.done = true; scrap += m.reward; done.push(def.text(m.n)); }
      }
      for (const m of P.missions.weekly) {
        if (m.done) continue;
        const def = WEEKLY.find((w) => w.id === m.id);
        if (m.id === 'w_play') m.progress++;
        if (m.id === 'w_end') m.progress += st.eliminated;
        if (m.id === 'w_survive' && alive) m.progress++;
        if (m.progress >= def.target) { m.progress = def.target; m.done = true; scrap += def.reward; done.push(def.text); }
      }
    }
    // stats
    P.matches++;
    if (!watch) {
      if (win) { P.wins++; P.streak++; P.best = Math.max(P.best, P.streak); } else P.streak = 0;
      if (alive) P.survived++;
      P.eliminatedTotal += st.eliminated;
    }
    // endings
    let newEnding = false;
    const endKey = kind === 'timeout_loss' ? 'eliminated' : kind;
    if (!watch && !P.endings[endKey]) { P.endings[endKey] = true; newEnding = true; }
    // commendations
    const commends = [];
    const award = (id, cond) => { if (cond && !P.commend[id] && COMMENDATIONS.find((c) => c.id === id)) { P.commend[id] = true; commends.push(COMMENDATIONS.find((c) => c.id === id).name); } };
    if (!watch) {
      award('first_blood', st.capitals >= 1);
      award('conqueror', st.eliminated >= 5);
      award('untouchable', st.intercepted >= 10);
      award('tycoon', S.flags.rich);
      award('admiral', st.sunk >= 10);
      award('pacifist', win && st.launched === 0);
      award('brink', win && S.clock < 60);
      award('diplomat', st.alliances >= 4);
      award('betrayed', st.betrayals >= 1);
      award('rising', st.peakPct >= 10);
      award('hegemon', st.peakPct >= 25);
      award('trader', st.convoyIncome >= 50000);
      award('wall', (st.built.fort || 0) >= 10);
      award('striker', st.launched >= 10);
      award('first_win', win);
      award('veteran', P.matches >= 10);
      award('survivor', kind === 'timeout_win' || kind === 'timeout_loss');
      award('partner', win && S.opts.party && S.opts.party.length > 0);
      award('winter', kind === 'winter');
    } else award('observer', true);
    // level
    P.xp += xp; P.scrap += scrap;
    let leveled = false;
    while (P.xp >= xpNeed(P.level)) { P.xp -= xpNeed(P.level); P.level++; leveled = true; }
    Menu.lastResult = { kind, win };
    Menu.save();
    const res = { xp, scrap, level: P.level, levelPct: 100 * P.xp / xpNeed(P.level), leveled, missions: done, newEnding, commends };
    S.recordResult = res;
    return res;
  };
  Menu.missionEvent = function () { /* progress is tallied at match end */ };

  const COMMENDATIONS = [
    { id: 'first_blood', name: 'First Blood', desc: 'Take an enemy capital' },
    { id: 'conqueror', name: 'Conqueror', desc: 'End 5 nations in one match' },
    { id: 'untouchable', name: 'Untouchable', desc: 'Intercept 10 missiles in one match' },
    { id: 'tycoon', name: 'Tycoon', desc: 'Hold 150k credits' },
    { id: 'admiral', name: 'Admiral', desc: 'Sink 10 ships in one match' },
    { id: 'pacifist', name: 'Clean Hands', desc: 'Win without launching a single strike' },
    { id: 'brink', name: 'Brinkmanship', desc: 'Win with under 1:00 left on the Doomsday Clock' },
    { id: 'diplomat', name: 'Diplomat', desc: 'Sign 4 alliances in one match' },
    { id: 'betrayed', name: 'Et Tu', desc: 'Be betrayed by an ally' },
    { id: 'rising', name: 'Rising Power', desc: 'Hold 10% of the world' },
    { id: 'hegemon', name: 'Hegemon', desc: 'Hold 25% of the world' },
    { id: 'trader', name: 'Merchant Prince', desc: 'Earn 50k from convoys in one match' },
    { id: 'wall', name: 'The Wall', desc: 'Build 10 forts in one match' },
    { id: 'striker', name: 'Strategic Command', desc: 'Launch 10 strikes in one match' },
    { id: 'first_win', name: 'Victor', desc: 'Win a match' },
    { id: 'veteran', name: 'Veteran', desc: 'Play 10 matches' },
    { id: 'survivor', name: 'Survivor', desc: 'Still standing when the hour runs out' },
    { id: 'partner', name: 'Squad Goals', desc: 'Win with a party' },
    { id: 'winter', name: 'Ash Fall', desc: 'Witness the Nuclear Winter' },
    { id: 'observer', name: 'Observer', desc: 'Watch a match' },
  ];
  Menu.COMMENDATIONS = COMMENDATIONS;

  // ---------------- DOM ----------------
  let root, globeCv, globeCtx, globeT = 0;
  Menu.init = function () {
    root = document.getElementById('menu');
    Menu.load();
    Menu.render();
  };

  Menu.render = function () {
    const lo = Menu.loadout();
    const doc = C.DOCTRINES.find((d) => d.id === lo.doctrine) || C.DOCTRINES[0];
    const lvlPct = 100 * P.xp / xpNeed(P.level);
    const r = P.rules;
    root.innerHTML = `
      <canvas id="m-globe"></canvas>
      <div class="m-scan"></div>
      <div class="m-tl">
        <button class="panel brk m-card clickable" id="m-card">${MP.Flags.img(P.flag, 'flag mflag')}<div><b>${U.esc(P.name)}</b><div class="lv">LV ${P.level} <span class="bar"><i style="width:${lvlPct}%"></i></span></div></div></button>
        <div class="panel brk m-party">
          <span class="tag">SQUAD</span><h3>PARTY</h3>
          <div class="party-slots">${[0, 1].map((i) => partySlot(i)).join('')}</div>
          <label class="pt-toggle"><input type="checkbox" id="m-party-on" ${P.partyOn ? 'checked' : ''}> Deploy party <span class="dim">(${P.partyOn && P.party.length ? 'alliances disabled' : 'up to 5 alliances'})</span></label>
        </div>
        <div class="m-note">OFFLINE BUILD · NO NETWORK REQUIRED<br>${C.BOT_NAMES.length}+ AI COMMANDERS STANDING BY</div>
      </div>
      <div class="m-tr">
        <span class="scrap"><img class="ico" src="${MP.Icons.url('gear', '#ffd21f', 32)}"> ${U.fmtInt(P.scrap)}</span>
        <button class="btn m-top" id="m-ranks">RANKS</button><button class="btn m-top" id="m-shop">ARMORY</button><button class="btn icon m-top" id="m-settings">${MP.Icons.svgIcon('gear', '#ece6cf', 32)}</button>
      </div>
      <div class="m-center">
        <h1 class="m-title" data-text="MIDNIGHT PROTOCOL">MIDNIGHT PROTOCOL</h1>
        <div id="m-adv-slot"></div>
        <div class="panel brk m-main">
          <div id="m-resume"></div>
          <div class="m-play-row">
            <button class="m-play" id="m-play"><img class="ico pl-ico" src="${MP.Icons.url('silo', '#0a0a08', 64)}"><div><b>PLAY</b><span>${r.bots} BOTS · ${r.minutes}:00 · ${r.difficulty.toUpperCase()}</span></div><canvas class="m-play-map" width="90" height="50"></canvas></button>
            <button class="btn m-how" id="m-how"><span class="q">?</span><span>HOW TO PLAY</span></button>
          </div>
          <div class="m-row"><img class="ico ri" src="${MP.Icons.url(doc.icon === 'flag' ? 'flag' : doc.icon, '#ece6cf', 40)}"><div class="mr-t"><b>${doc.name.toUpperCase()}</b><span>${doc.desc}</span></div><canvas class="lo-prev" width="70" height="40"></canvas><button class="btn" id="m-loadout">LOADOUT</button></div>
          <div class="m-div"><span>OPERATIONS</span></div>
          <div class="m-row"><img class="ico ri" src="${MP.Icons.url('shield', '#ece6cf', 40)}"><div class="mr-t"><b>TEAMS</b><span><select id="m-teams">${[2, 3, 4].map((t) => `<option value="${t}" ${r.teams === t ? 'selected' : ''}>${t} TEAMS</option>`).join('')}</select> · ${r.bots + 1} NATIONS</span></div><button class="btn" id="m-teams-go">JOIN</button></div>
          <div class="m-row"><img class="ico ri" src="${MP.Icons.url('gear', '#ece6cf', 40)}"><div class="mr-t"><b>CUSTOM</b><span>MATCH RULES · BOTS · LENGTH · WIN %</span></div><button class="btn" id="m-custom">SET UP</button></div>
          <div class="m-row"><img class="ico ri" src="${MP.Icons.url('radar', '#ece6cf', 40)}"><div class="mr-t"><b>WATCH</b><span>SPECTATE ${Math.min(100, r.bots + 1)} AI NATIONS</span></div><button class="btn" id="m-watch">WATCH</button></div>
        </div>
      </div>
      <div class="m-right">
        ${P.streakNew ? `<div class="panel brk m-streak"><b>🔥 DAY ${P.dayStreak}</b> <span class="y">+${P.streakBonus} SCRAP</span><div class="days">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<i class="${d <= P.dayStreak ? 'on' : ''}"></i>`).join('')}</div><span class="dim">TOMORROW: +${20 + Math.min(6, P.dayStreak + 1) * 20} SCRAP</span></div>` : ''}
        <div class="panel brk m-missions">
          <span class="tag">ORDERS</span><h3>MISSIONS</h3>
          <div class="mm-h">DAILY</div>
          ${P.missions.daily.map((m, i) => { const def = DAILY_POOL.find((d) => d.id === m.id); return `<div class="mm ${m.done ? 'done' : ''}"><span>${def.text(m.n)}</span>${m.done ? '<b class="ok">✔</b>' : `<button class="btn sm reroll" data-i="${i}" title="Reroll for 50 scrap">↻ 50</button>`}<span class="rw">+${m.reward}</span><div class="bar"><i style="width:${100 * m.progress / m.n}%"></i></div></div>`; }).join('')}
          <div class="mm-h">WEEKLY</div>
          ${P.missions.weekly.map((m) => { const def = WEEKLY.find((w) => w.id === m.id); return `<div class="mm ${m.done ? 'done' : ''}"><span>${def.text}</span><span class="rw">+${def.reward}</span><div class="bar"><i style="width:${100 * m.progress / def.target}%"></i></div></div>`; }).join('')}
        </div>
      </div>
      <div class="m-foot">MIDNIGHT PROTOCOL · ${new Date().getFullYear()} · ESC SETTINGS · ALL SYSTEMS LOCAL</div>
    `;
    // wire up
    const $ = (id) => document.getElementById(id);
    $('m-card').onclick = Menu.openDossier;
    $('m-play').onclick = () => Menu.startMatch(Menu.makeOpts('ffa'));
    $('m-how').onclick = Menu.openHowTo;
    $('m-loadout').onclick = Menu.openLoadouts;
    $('m-teams').onchange = (e) => { P.rules.teams = Number(e.target.value); Menu.save(); };
    $('m-teams-go').onclick = () => { MP.Advisor && MP.Advisor.event('menu.teams', {}); Menu.startMatch(Menu.makeOpts('teams')); };
    $('m-custom').onclick = Menu.openCustom;
    $('m-watch').onclick = () => { MP.Advisor && MP.Advisor.event('menu.watch', {}); Menu.startMatch(Menu.makeOpts('watch')); };
    $('m-ranks').onclick = Menu.openRanks;
    $('m-shop').onclick = Menu.openShop;
    $('m-settings').onclick = () => Menu.openSettings(false);
    $('m-party-on').onchange = (e) => { P.partyOn = e.target.checked; Menu.save(); Menu.render(); };
    root.querySelectorAll('.party-slots [data-pi]').forEach((b) => { b.onclick = () => Menu.editPartyBot(Number(b.dataset.pi)); });
    root.querySelectorAll('.reroll').forEach((b) => { b.onclick = () => {
      if (P.scrap < 50) { MP.SFX.play('error'); return; }
      P.scrap -= 50; const i = Number(b.dataset.i);
      const used = new Set(P.missions.daily.map((m) => m.id));
      const pool = DAILY_POOL.filter((d) => !used.has(d.id));
      const m = pool[Math.floor(Math.random() * pool.length)];
      P.missions.daily[i] = { id: m.id, n: m.n[Math.floor(Math.random() * m.n.length)], progress: 0, reward: m.reward, done: false };
      Menu.save(); Menu.render(); MP.Advisor && MP.Advisor.event('menu.reroll', {});
    }; });
    // previews
    drawLoadoutPreview(root.querySelector('.lo-prev'), lo);
    const pm = root.querySelector('.m-play-map');
    if (pm && MP.World.land) { const c = pm.getContext('2d'); c.globalAlpha = 0.5; c.drawImage(Menu.miniWorld(), 0, 0, 90, 50); }
    globeCv = $('m-globe'); globeCtx = globeCv.getContext('2d');
    // the advisor's menu mount is a persistent element; re-home it inside the fresh DOM
    const slot = $('m-adv-slot');
    if (slot && Menu.advEl) slot.appendChild(Menu.advEl);
    Menu.renderResume();
  };

  Menu.miniWorld = function () {
    if (Menu._mw) return Menu._mw;
    const W = MP.World.W, H = MP.World.H;
    const cv = document.createElement('canvas'); cv.width = 180; cv.height = 100;
    const c = cv.getContext('2d'); const img = c.createImageData(180, 100);
    for (let y = 0; y < 100; y++) for (let x = 0; x < 180; x++) {
      const t = Math.floor(x / 180 * W) + Math.floor(y / 100 * H) * W;
      const i = (x + y * 180) * 4;
      if (MP.World.land[t]) { img.data[i] = 10; img.data[i + 1] = 10; img.data[i + 2] = 8; img.data[i + 3] = 255; }
    }
    c.putImageData(img, 0, 0);
    Menu._mw = cv;
    return cv;
  };

  function partySlot(i) {
    const b = P.party[i];
    if (!b) return `<button class="ps empty clickable" data-pi="${i}">＋ ADD BOT</button>`;
    const doc = C.DOCTRINES.find((d) => d.id === b.doctrine);
    return `<button class="ps clickable" data-pi="${i}">${MP.Flags.img(b.flag, 'flag sm')}<div><b>${U.esc(b.name)}</b><span>${doc ? doc.name.toUpperCase() : ''}</span></div></button>`;
  }

  function drawLoadoutPreview(cv, lo) {
    if (!cv) return;
    const c = cv.getContext('2d');
    const tc = C.TERRITORY_COLORS.find((t) => t.id === lo.territory) || C.TERRITORY_COLORS[0];
    c.fillStyle = '#2c3a22'; c.fillRect(0, 0, cv.width, cv.height);
    c.save(); c.beginPath(); c.ellipse(cv.width / 2, cv.height / 2, cv.width * 0.42, cv.height * 0.38, 0.1, 0, 7); c.clip();
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      let a = 0.4, col = tc.rgb;
      switch (lo.pattern) {
        case 'hazard': if (((x + y) >> 3) & 1) { col = [20, 18, 12]; a = 0.6; } else a = 0.75; break;
        case 'grid': a = (x % 6 === 0 || y % 6 === 0) ? 0.8 : 0.35; break;
        case 'dots': a = (x % 4 === 0 && y % 4 === 0) ? 0.9 : 0.35; break;
        case 'chevron': a = ((x + Math.abs((y % 8) - 4)) % 8) < 2 ? 0.8 : 0.35; break;
        case 'scan': a = y % 3 === 0 ? 0.8 : 0.35; break;
      }
      c.fillStyle = U.rgb(col, a); c.fillRect(x, y, 1, 1);
    }
    c.restore();
    c.strokeStyle = U.rgb(tc.rgb); c.lineWidth = 2; c.beginPath(); c.ellipse(cv.width / 2, cv.height / 2, cv.width * 0.42, cv.height * 0.38, 0.1, 0, 7); c.stroke();
  }
  Menu.drawLoadoutPreview = drawLoadoutPreview;

  Menu.renderResume = async function () {
    const box = document.getElementById('m-resume');
    if (!box) return;
    const d = await MP.Game.hasSave();
    if (!d) { box.innerHTML = ''; return; }
    const mins = Math.floor((d.t - (d.playStart || 0)) / 60);
    box.innerHTML = `<div class="m-row resume"><img class="ico ri" src="${MP.Icons.url('emp', '#ffd21f', 40)}"><div class="mr-t"><b>RESUME OPERATION</b><span>${d.opts.mode.toUpperCase()} · ${mins} MIN IN · SAVED ${new Date(d.savedAt).toLocaleString()}</span></div><button class="btn primary" id="m-resume-go">RESUME</button><button class="btn sm" id="m-resume-x" title="Discard save">✕</button></div>`;
    document.getElementById('m-resume-go').onclick = async () => { Menu.hide(); const ok = await MP.Game.load(); if (!ok) { Menu.show(); } };
    document.getElementById('m-resume-x').onclick = () => { MP.Game.clearSave(); box.innerHTML = ''; };
  };

  Menu.show = function () {
    root.style.display = '';
    Menu.dailyCheck();
    Menu.render();
    MP.SFX.startMenuMusic();
    if (MP.Advisor) {
      MP.Advisor.setMode('menu');
      if (Menu.lastResult) {
        const r = Menu.lastResult; Menu.lastResult = null;
        setTimeout(() => MP.Advisor.event(r.kind === 'winter' ? 'menu.return_winter' : r.win ? 'menu.return_victory' : 'menu.return_defeat', { ending: MP.Game.ENDINGS[r.kind].title }), 600);
      }
    }
  };
  Menu.hide = function () { root.style.display = 'none'; MP.SFX.stopMenuMusic(); };

  Menu.makeOpts = function (mode) {
    const lo = Menu.loadout(), r = P.rules;
    const tc = C.TERRITORY_COLORS.find((t) => t.id === lo.territory) || C.TERRITORY_COLORS[0];
    return {
      mode, bots: mode === 'watch' ? Math.min(100, r.bots + 1) : r.bots, teams: r.teams, difficulty: r.difficulty, minutes: r.minutes, winPct: r.winPct,
      peaceMinutes: r.peaceMinutes, startCredits: r.startCredits, nukes: r.nukes, weather: r.weather, council: r.council,
      seed: (Math.random() * 4294967295) >>> 0,
      player: { name: P.name, flag: P.flag, color: tc.rgb.slice(), pattern: lo.pattern, doctrine: lo.doctrine, missile: lo.missile, detonation: lo.detonation },
      party: mode === 'ffa' && P.partyOn ? P.party.slice(0, C.PARTY_MAX) : [],
    };
  };

  Menu.startMatch = function (opts) {
    if (!opts) opts = Menu.makeOpts('ffa');
    Menu.lastOpts = Object.assign({}, opts, { seed: (Math.random() * 4294967295) >>> 0 });
    MP.audio.unlock();
    Menu.hide();
    document.getElementById('modal-root').innerHTML = '';
    MP.Game.newMatch(opts);
  };

  // ---------------- modals ----------------
  function modal(html, setup, opts) { return MP.HUD.modal(html, setup, opts); }

  Menu.openDossier = function () {
    MP.Advisor && MP.Advisor.event('menu.dossier', {});
    const lo = Menu.loadout();
    const doc = C.DOCTRINES.find((d) => d.id === lo.doctrine);
    modal(`<div class="mh"><span class="tag">DOSSIER</span><div class="ni-head">${MP.Flags.img(P.flag, 'flag xl')}<h2>${U.esc(P.name)}</h2></div></div>
      <div class="kv"><span>DOCTRINE</span><b>${doc ? doc.name.toUpperCase() : ''}</b></div>
      <div class="kv"><span>LOADOUT</span><b>${P.active + 1} OF ${Menu.slotsUnlocked()}</b></div>
      <div class="kv"><span>LEVEL</span><b>${P.level} · ${Menu.rankName(P.level)}</b></div>
      <div class="kv"><span>WINS</span><b>${P.wins}</b></div>
      <div class="kv"><span>WIN STREAK</span><b>${P.streak} <span class="dim">BEST ${P.best}</span></b></div>
      <div class="kv"><span>MATCHES</span><b>${P.matches} <span class="dim">· SURVIVED ${P.survived}</span></b></div>
      <div class="row-btns"><button class="btn primary" data-a="nation">EDIT NATION</button><button class="btn" data-a="doctrine">DOCTRINE</button></div>
      <button class="btn wide" data-a="loadouts">LOADOUTS</button>
      <button class="btn wide" data-a="comm">COMMENDATIONS ${Object.keys(P.commend).length}/20 · ENDINGS ${Object.keys(P.endings).length}/8</button>`,
    (box, close) => box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      close();
      ({ nation: () => Menu.openNationEditor(null), doctrine: () => Menu.openDoctrines(P.active), loadouts: Menu.openLoadouts, comm: Menu.openCommendations })[b.dataset.a]();
    }));
  };

  // nation / party-bot editor
  Menu.openNationEditor = function (botIndex) {
    const isBot = botIndex != null;
    const src = isBot ? (P.party[botIndex] || { name: C.BOT_NAMES[Math.floor(Math.random() * C.BOT_NAMES.length)], flag: 'cc:' + MP.Flags.list[Math.floor(Math.random() * MP.Flags.list.length)].code, doctrine: 'homeland' }) : P;
    const st = { name: src.name, flag: src.flag, doctrine: src.doctrine || 'homeland', tab: src.flag.startsWith('cc:') ? 'country' : 'build', search: '',
      b: { layout: 'h3', colors: ['ffd21f', '111111', 'e8112d'], emblem: 'nuke', emblemColor: 'ffd21f' } };
    const m = modal(`<div class="mh"><span class="tag">${isBot ? 'PARTY · BOT COMMANDER' : 'TOP SECRET'}</span><h2>${isBot ? 'PARTY BOT' : 'YOUR NATION'}</h2></div>
      <div class="ne-top"><img class="flag xl" id="ne-flag"><div class="ne-name"><input id="ne-name" maxlength="24" spellcheck="false"><span class="dim" id="ne-count"></span>
      ${isBot ? `<select id="ne-doc">${C.DOCTRINES.map((d) => `<option value="${d.id}">${d.name}</option>`).join('')}</select>` : ''}</div></div>
      <div class="tabs"><button class="btn" data-tab="build">BUILD</button><button class="btn" data-tab="country">COUNTRY</button></div>
      <div id="ne-body"></div>
      <div class="row-btns"><button class="btn primary" id="ne-save">SAVE</button>${isBot && P.party[botIndex] ? '<button class="btn danger" id="ne-del">REMOVE</button>' : ''}</div>`, (box, close) => {
      const flagEl = box.querySelector('#ne-flag'), nameEl = box.querySelector('#ne-name'), cnt = box.querySelector('#ne-count');
      nameEl.value = st.name;
      const sync = () => { flagEl.src = MP.Flags.url(st.flag, 120, 80); cnt.textContent = nameEl.value.length + '/24'; box.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab)); };
      nameEl.addEventListener('input', () => { nameEl.value = nameEl.value.toUpperCase().replace(/[^A-Z0-9 \-'.]/g, ''); sync(); MP.SFX.play('type'); });
      const docSel = box.querySelector('#ne-doc'); if (docSel) { docSel.value = st.doctrine; docSel.onchange = () => { st.doctrine = docSel.value; }; }
      const body = box.querySelector('#ne-body');
      const renderBody = () => {
        if (st.tab === 'country') {
          body.innerHTML = `<input class="search" id="ne-search" placeholder="SEARCH" value="${U.esc(st.search)}"><div class="flag-grid" id="ne-grid"></div>`;
          const grid = body.querySelector('#ne-grid');
          const fill = () => {
            const q = st.search.toLowerCase();
            grid.innerHTML = MP.Flags.list.filter((f) => !q || f.name.toLowerCase().includes(q) || f.code.toLowerCase() === q)
              .map((f) => `<button class="fg ${st.flag === 'cc:' + f.code ? 'on' : ''}" data-cc="${f.code}" title="${U.esc(f.name)}" data-silent="1"><img src="${MP.Flags.url('cc:' + f.code, 54, 36)}"></button>`).join('');
          };
          fill();
          body.querySelector('#ne-search').addEventListener('input', (e) => { st.search = e.target.value; fill(); });
          grid.addEventListener('click', (e) => {
            const b = e.target.closest('[data-cc]'); if (!b) return;
            st.flag = 'cc:' + b.dataset.cc;
            const nm = MP.Flags.byCode[b.dataset.cc].name.toUpperCase();
            if (!isBot && (nameEl.value === P.name || !nameEl.value)) nameEl.value = nm.slice(0, 24);
            grid.querySelectorAll('.fg').forEach((x) => x.classList.toggle('on', x === b));
            MP.SFX.play('click'); sync();
          });
        } else {
          const Lay = MP.Flags.LAYOUTS.find((l) => l.id === st.b.layout);
          body.innerHTML = `<div class="fb-sec"><span>LAYOUT</span><div class="fb-opts">${MP.Flags.LAYOUTS.map((l) => `<button class="fbo ${l.id === st.b.layout ? 'on' : ''}" data-lay="${l.id}" title="${l.name}" data-silent="1"><img src="${MP.Flags.url(l.make(['ffd21f', '111111', 'e8112d']), 42, 28)}"></button>`).join('')}</div></div>
            ${[0, 1, 2].slice(0, Lay.n).map((i) => `<div class="fb-sec"><span>COLOUR ${i + 1}</span><div class="sw">${MP.Flags.PALETTE.map((c) => `<button class="swc ${st.b.colors[i] === c ? 'on' : ''}" data-ci="${i}" data-c="${c}" style="background:#${c}" data-silent="1"></button>`).join('')}</div></div>`).join('')}
            <div class="fb-sec"><span>EMBLEM</span><div class="fb-opts">${MP.Flags.EMBLEMS.map((e) => `<button class="fbo em ${e === st.b.emblem ? 'on' : ''}" data-em="${e}" title="${e}" data-silent="1"><img src="${MP.Flags.url(e === 'none' ? 'f:222' : 'f:222|' + e + ':ffd21f@0.5,0.5,0.32', 42, 28)}"></button>`).join('')}</div></div>
            <div class="fb-sec"><span>EMBLEM COLOUR</span><div class="sw">${MP.Flags.PALETTE.map((c) => `<button class="swc ${st.b.emblemColor === c ? 'on' : ''}" data-ec="${c}" style="background:#${c}" data-silent="1"></button>`).join('')}</div></div>`;
          body.onclick = (e) => {
            const b = e.target.closest('button'); if (!b) return;
            if (b.dataset.lay) st.b.layout = b.dataset.lay;
            if (b.dataset.ci) st.b.colors[Number(b.dataset.ci)] = b.dataset.c;
            if (b.dataset.em) st.b.emblem = b.dataset.em;
            if (b.dataset.ec) st.b.emblemColor = b.dataset.ec;
            st.flag = MP.Flags.build(st.b);
            MP.SFX.play('click'); renderBody(); sync();
          };
        }
      };
      box.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { st.tab = b.dataset.tab; if (st.tab === 'build' && st.flag.startsWith('cc:')) st.flag = MP.Flags.build(st.b); renderBody(); sync(); }; });
      renderBody(); sync();
      box.querySelector('#ne-save').onclick = () => {
        const name = (nameEl.value || 'NATION').trim().slice(0, 24) || 'NATION';
        if (isBot) {
          const bot = { name, flag: st.flag, doctrine: st.doctrine };
          if (P.party.length >= C.PARTY_MAX && !P.party[botIndex]) { MP.Advisor && MP.Advisor.event('menu.party_full', {}); return; }
          P.party[botIndex] = bot; P.party = P.party.filter(Boolean); P.partyOn = true;
          MP.Advisor && MP.Advisor.event('menu.party_add', { name });
        } else { P.name = name; P.flag = st.flag; MP.Advisor && MP.Advisor.event('menu.nation_saved', { name }); }
        Menu.save(); close(); Menu.render(); MP.SFX.play('researchDone');
      };
      const del = box.querySelector('#ne-del');
      if (del) del.onclick = () => { const nm = P.party[botIndex].name; P.party.splice(botIndex, 1); if (!P.party.length) P.partyOn = false; Menu.save(); close(); Menu.render(); MP.Advisor && MP.Advisor.event('menu.party_remove', { name: nm }); };
    });
    return m;
  };
  Menu.editPartyBot = function (i) { Menu.openNationEditor(Math.min(i, P.party.length)); };

  Menu.openLoadouts = function () {
    MP.Advisor && MP.Advisor.event('menu.loadouts', {});
    const slots = Menu.slotsUnlocked();
    let sel = P.active;
    const m = modal('<div id="lo-body"></div>', (box, close) => {
      const body = box.querySelector('#lo-body');
      const render = () => {
        const lo = P.loadouts[sel];
        const doc = C.DOCTRINES.find((d) => d.id === lo.doctrine);
        const name = (arr, id) => (arr.find((x) => x.id === id) || arr[0]).name.toUpperCase();
        body.innerHTML = `<div class="mh"><span class="tag">TOP SECRET</span><h2>LOADOUTS</h2></div>
          <div class="lo-tabs">${[0, 1, 2, 3, 4].map((i) => `<button class="lo-tab ${i === sel ? 'on' : ''} ${i >= slots ? 'lock' : ''}" data-s="${i}">${i >= slots ? '🔒' : ''}${i + 1}</button>`).join('')}</div>
          <h3>LOADOUT ${sel + 1} ${sel === P.active ? '<span class="g">IN USE</span>' : `<button class="btn sm" id="lo-use">USE</button>`}</h3>
          <div class="kv"><span>DOCTRINE</span><b class="v">${doc.name.toUpperCase()}</b><button class="btn" data-ch="doctrine">CHANGE</button></div>
          <p class="dim small">${doc.desc.toUpperCase()}</p>
          <div class="lo-prevs"><canvas id="lo-ter" width="180" height="110"></canvas><canvas id="lo-mis" width="150" height="110"></canvas><canvas id="lo-det" width="120" height="110"></canvas></div>
          <div class="kv"><span>TERRITORY</span><b class="v">${name(C.TERRITORY_COLORS, lo.territory)}</b><button class="btn" data-ch="territory">CHANGE</button></div>
          <div class="kv"><span>PATTERN</span><b class="v">${name(C.PATTERNS, lo.pattern)}</b><button class="btn" data-ch="pattern">CHANGE</button></div>
          <div class="kv"><span>MISSILE</span><b class="v">${name(C.MISSILE_STYLES, lo.missile)}</b><button class="btn" data-ch="missile">CHANGE</button></div>
          <div class="kv"><span>DETONATION</span><b class="v">${name(C.DETONATIONS, lo.detonation)}</b><button class="btn" data-ch="detonation">CHANGE</button></div>`;
        drawLoadoutPreview(body.querySelector('#lo-ter'), lo);
        const mc = body.querySelector('#lo-mis').getContext('2d');
        mc.fillStyle = '#121109'; mc.fillRect(0, 0, 150, 110);
        mc.strokeStyle = lo.missile === 'ghost' ? 'rgba(255,210,31,0.35)' : '#ffd21f'; mc.lineWidth = lo.missile === 'ghost' ? 1.5 : 2.5;
        if (lo.missile === 'tracer') mc.setLineDash([8, 5]);
        mc.beginPath(); mc.moveTo(lo.missile === 'comet' ? 70 : 20, lo.missile === 'comet' ? 38 : 95); mc.quadraticCurveTo(80, 0, 130, 40); mc.stroke(); mc.setLineDash([]);
        mc.fillStyle = '#fff'; mc.beginPath(); mc.arc(130, 40, 5, 0, 7); mc.fill();
        const dc = body.querySelector('#lo-det').getContext('2d');
        const dcol = (C.DETONATIONS.find((d) => d.id === lo.detonation) || C.DETONATIONS[0]).rgb;
        dc.fillStyle = '#121109'; dc.fillRect(0, 0, 120, 110);
        const g = dc.createRadialGradient(60, 55, 0, 60, 55, 46); g.addColorStop(0, '#fff'); g.addColorStop(0.35, U.rgb(dcol)); g.addColorStop(1, U.rgb(dcol, 0));
        dc.fillStyle = g; dc.beginPath(); dc.arc(60, 55, 46, 0, 7); dc.fill();
        dc.strokeStyle = U.rgb(dcol, 0.8); dc.lineWidth = 3; dc.beginPath(); dc.arc(60, 55, 40, 0, 7); dc.stroke();
        const use = body.querySelector('#lo-use'); if (use) use.onclick = () => { P.active = sel; Menu.save(); render(); Menu.render(); };
      };
      body.addEventListener('click', (e) => {
        const t = e.target.closest('[data-s]');
        if (t) { const s = Number(t.dataset.s); if (s >= slots) { MP.SFX.play('error'); MP.HUD.toast(`Loadout ${s + 1} unlocks at level ${[0, 0, 5, 10, 20][s]}`, 'bad'); return; } sel = s; render(); return; }
        const ch = e.target.closest('[data-ch]');
        if (ch) {
          if (ch.dataset.ch === 'doctrine') { Menu.openDoctrines(sel, () => { render(); Menu.render(); }); return; }
          Menu.openPicker(ch.dataset.ch, sel, () => { render(); Menu.render(); });
        }
      });
      render();
    });
    return m;
  };

  Menu.openDoctrines = function (slot, done) {
    modal(`<div class="mh"><span class="tag">TOP SECRET</span><h2>DOCTRINE</h2><p class="dim">A doctrine is a standing order for the whole war.</p></div>
      <div class="doc-list">${C.DOCTRINES.map((d) => { const locked = P.level < d.level; const on = P.loadouts[slot].doctrine === d.id;
        return `<button class="doc ${on ? 'on' : ''} ${locked ? 'locked' : ''}" data-d="${d.id}"><img src="${MP.Icons.url(d.icon, on ? '#0a0a08' : '#ece6cf', 40)}"><div><b>${d.name.toUpperCase()}${d.original ? ' <i class="new">NEW</i>' : ''}</b><span>${locked ? 'LEVEL ' + d.level + ' · ' : ''}${d.desc.toUpperCase()}</span></div>${locked ? '<span class="lk">🔒</span>' : ''}</button>`; }).join('')}</div>`,
    (box, close) => box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-d]'); if (!b) return;
      const d = C.DOCTRINES.find((x) => x.id === b.dataset.d);
      if (P.level < d.level) { MP.SFX.play('error'); return; }
      P.loadouts[slot].doctrine = d.id; Menu.save(); close();
      MP.Advisor && MP.Advisor.event('menu.doctrine', { doctrine: d.name });
      if (done) done(); else Menu.render();
    }));
  };

  const PICK = { territory: () => C.TERRITORY_COLORS, pattern: () => C.PATTERNS, missile: () => C.MISSILE_STYLES, detonation: () => C.DETONATIONS };
  Menu.openPicker = function (kind, slot, done) {
    const list = PICK[kind]();
    modal(`<div class="mh"><span class="tag">LOADOUT ${slot + 1}</span><h2>${kind.toUpperCase()}</h2></div>
      <div class="pick-list">${list.map((it) => { const own = P.owned[kind].includes(it.id); const on = P.loadouts[slot][kind] === it.id;
        return `<button class="pk ${on ? 'on' : ''} ${own ? '' : 'locked'}" data-id="${it.id}">${it.rgb ? `<i class="sw" style="background:${U.rgb(it.rgb)}"></i>` : ''}<b>${it.name.toUpperCase()}</b>${own ? '' : `<span class="price">${it.price} SCRAP</span>`}</button>`; }).join('')}</div>`,
    (box, close) => box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-id]'); if (!b) return;
      const it = list.find((x) => x.id === b.dataset.id);
      if (!P.owned[kind].includes(it.id)) {
        if (P.scrap < it.price) { MP.SFX.play('error'); MP.HUD.toast('Not enough scrap — complete missions', 'bad'); return; }
        P.scrap -= it.price; P.owned[kind].push(it.id); MP.SFX.play('coin');
        MP.Advisor && MP.Advisor.event('menu.unlock', { item: it.name });
      }
      P.loadouts[slot][kind] = it.id; Menu.save(); close(); if (done) done();
    }));
  };

  Menu.openShop = function () {
    MP.Advisor && MP.Advisor.event('menu.shop', {});
    const cats = [['territory', 'TERRITORY COLOURS'], ['pattern', 'PATTERNS'], ['missile', 'MISSILE TRAILS'], ['detonation', 'DETONATIONS']];
    const m = modal('<div id="shop-body"></div>', (box) => {
      const body = box.querySelector('#shop-body');
      const render = () => {
        body.innerHTML = `<div class="mh"><span class="tag">ARMORY</span><h2>REQUISITIONS</h2><p class="dim">Spend scrap earned from missions and matches. <b class="y">${U.fmtInt(P.scrap)} SCRAP</b></p></div>` +
          cats.map(([k, t]) => `<h4>${t}</h4><div class="pick-list">${PICK[k]().map((it) => { const own = P.owned[k].includes(it.id);
            return `<button class="pk ${own ? 'owned' : ''}" data-k="${k}" data-id="${it.id}">${it.rgb ? `<i class="sw" style="background:${U.rgb(it.rgb)}"></i>` : ''}<b>${it.name.toUpperCase()}</b><span class="price">${own ? 'OWNED' : it.price + ' SCRAP'}</span></button>`; }).join('')}</div>`).join('');
      };
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        const k = b.dataset.k, it = PICK[k]().find((x) => x.id === b.dataset.id);
        if (P.owned[k].includes(it.id)) return;
        if (P.scrap < it.price) { MP.SFX.play('error'); return; }
        P.scrap -= it.price; P.owned[k].push(it.id); Menu.save(); MP.SFX.play('coin'); render(); Menu.render();
        MP.Advisor && MP.Advisor.event('menu.unlock', { item: it.name });
      });
      render();
    });
    return m;
  };

  Menu.openRanks = function () {
    modal(`<div class="mh"><span class="tag">SERVICE RECORD</span><h2>RANKS</h2><p class="dim">Level ${P.level} · ${U.fmtInt(P.xp)} / ${U.fmtInt(xpNeed(P.level))} XP to next level</p></div>
      <div class="ranks">${RANKS.map(([lv, n]) => `<div class="rk ${P.level >= lv ? 'on' : ''} ${Menu.rankName(P.level) === n ? 'cur' : ''}"><span>LV ${lv}</span><b>${n}</b></div>`).join('')}</div>
      <h4>UNLOCKS</h4><div class="ranks">${C.DOCTRINES.filter((d) => d.level > 1).map((d) => `<div class="rk ${P.level >= d.level ? 'on' : ''}"><span>LV ${d.level}</span><b>${d.name.toUpperCase()}</b></div>`).join('')}
      <div class="rk ${P.level >= 5 ? 'on' : ''}"><span>LV 5</span><b>LOADOUT SLOT 3</b></div><div class="rk ${P.level >= 10 ? 'on' : ''}"><span>LV 10</span><b>LOADOUT SLOT 4</b></div><div class="rk ${P.level >= 20 ? 'on' : ''}"><span>LV 20</span><b>LOADOUT SLOT 5</b></div></div>`);
  };

  Menu.openCommendations = function () {
    const E = MP.Game.ENDINGS;
    const endKeys = ['domination', 'last', 'timeout_win', 'alliance', 'council', 'winter', 'eliminated', 'resign'];
    modal(`<div class="mh"><span class="tag">SERVICE RECORD</span><h2>COMMENDATIONS ${Object.keys(P.commend).length}/20</h2></div>
      <div class="comm">${COMMENDATIONS.map((c) => `<div class="cm ${P.commend[c.id] ? 'on' : ''}"><b>${P.commend[c.id] ? '★' : '☆'} ${c.name.toUpperCase()}</b><span>${c.desc}</span></div>`).join('')}</div>
      <h4>ENDINGS ${Object.keys(P.endings).length}/8</h4>
      <div class="comm">${endKeys.map((k) => `<div class="cm ${P.endings[k] ? 'on' : ''}"><b>${P.endings[k] ? E[k].title : '▒▒▒▒▒▒▒▒'}</b><span>${P.endings[k] ? E[k].desc : 'Not yet witnessed.'}</span></div>`).join('')}</div>`);
  };

  Menu.openCustom = function () {
    MP.Advisor && MP.Advisor.event('menu.custom', {});
    const r = P.rules;
    modal(`<div class="mh"><span class="tag">OPERATIONS</span><h2>MATCH RULES</h2></div>
      <div class="rules">
        <label>AI NATIONS <b id="cr-bots-v">${r.bots}</b><input type="range" min="1" max="99" value="${r.bots}" id="cr-bots"></label>
        <label>MATCH LENGTH <b id="cr-min-v">${r.minutes}:00</b><input type="range" min="10" max="90" step="5" value="${r.minutes}" id="cr-min"></label>
        <label>WIN AT LAND % <b id="cr-win-v">${r.winPct}%</b><input type="range" min="20" max="100" step="5" value="${r.winPct}" id="cr-win"></label>
        <label>PEACE TIMER <b id="cr-peace-v">${r.peaceMinutes}:00</b><input type="range" min="0" max="15" value="${r.peaceMinutes}" id="cr-peace"></label>
        <label>STARTING CREDITS <b id="cr-cr-v">${U.fmtK(r.startCredits)}</b><input type="range" min="0" max="100000" step="5000" value="${r.startCredits}" id="cr-cr"></label>
        <label>DIFFICULTY <select id="cr-diff">${Object.keys(C.DIFFICULTY).map((d) => `<option ${d === r.difficulty ? 'selected' : ''} value="${d}">${d.toUpperCase()}</option>`).join('')}</select></label>
        <label class="ck"><input type="checkbox" id="cr-nukes" ${r.nukes ? 'checked' : ''}> STRATEGIC WEAPONS (DEFCON)</label>
        <label class="ck"><input type="checkbox" id="cr-weather" ${r.weather ? 'checked' : ''}> WEATHER FRONTS</label>
        <label class="ck"><input type="checkbox" id="cr-council" ${r.council ? 'checked' : ''}> GLOBAL COUNCIL</label>
      </div>
      <div class="row-btns"><button class="btn primary" id="cr-ffa">START FREE-FOR-ALL</button><button class="btn" id="cr-teams">START TEAMS</button><button class="btn" id="cr-watch">WATCH</button></div>`,
    (box, close) => {
      const bind = (id, key, fmt, num) => { const el = box.querySelector('#' + id); el.addEventListener('input', () => { r[key] = num ? Number(el.value) : el.value; const v = box.querySelector('#' + id + '-v'); if (v) v.textContent = fmt(r[key]); Menu.save(); }); };
      bind('cr-bots', 'bots', (v) => v, true); bind('cr-min', 'minutes', (v) => v + ':00', true); bind('cr-win', 'winPct', (v) => v + '%', true);
      bind('cr-peace', 'peaceMinutes', (v) => v + ':00', true); bind('cr-cr', 'startCredits', (v) => U.fmtK(v), true); bind('cr-diff', 'difficulty', (v) => v, false);
      for (const k of ['nukes', 'weather', 'council']) box.querySelector('#cr-' + k).addEventListener('change', (e) => { r[k] = e.target.checked; Menu.save(); });
      box.querySelector('#cr-ffa').onclick = () => { close(); Menu.startMatch(Menu.makeOpts('ffa')); };
      box.querySelector('#cr-teams').onclick = () => { close(); Menu.startMatch(Menu.makeOpts('teams')); };
      box.querySelector('#cr-watch').onclick = () => { close(); Menu.startMatch(Menu.makeOpts('watch')); };
    });
  };

  Menu.openHowTo = function () {
    MP.Advisor && MP.Advisor.event('menu.how_to_play', {});
    const def = (t) => C.DEFENSE[t];
    modal(`<div class="mh"><span class="tag">BRIEFING</span><h2>HOW TO PLAY</h2></div><div class="howto">
      <h4>SPAWN & EXPAND</h4><p>Click open land to choose where your nation begins (${C.SPAWN_SECONDS}s). Then click unclaimed land to expand; the attack presets (10–75%) set how many troops go. Click a neighbour's land to attack it; right-click any nation for orders (Info · Attack · Boat · Ally · Truce · Embargo · Gift · Focus).</p>
      <h4>LAND</h4><p>Old land is <b>dug in</b> — it costs ×${C.DUG_IN_MULT} the troops. <b>Striped</b> land was taken recently and is soft. Fallout softens any line. Highlands and mountains cost more and slow the advance. Attacks far from your cities and logistics hubs suffer <b>supply</b> penalties; pockets cut off from your capital starve, and fully encircled pockets are annexed.</p>
      <h4>BUILDINGS (1–8)</h4><p><b>City</b> +25k troop cap per level · <b>Port</b> trade ships & warships · <b>Factory</b> sends convoys to cities, ports and factories within ${C.FACTORY_RANGE} tiles (each level doubles convoys and gold) · <b>Logistics Hub</b> links everything within ${C.HUB_RANGE} tiles with white roads, convoys 25% faster and reach 2 stops · <b>Enrichment</b> must sit on a free ☢ deposit — without one uranium caps at ${C.URANIUM_CAP_NO_DEPOSIT} · <b>Fort</b> attackers pay ×5 troops and move ×3 slower within ${C.FORT_RADIUS} tiles (range doubles per level) · <b>Warship</b> picks its own targets, captures enemy trade ships; click it then click the sea to set a patrol · <b>Silo</b> launches missiles. Place a building on one of yours of the same type to upgrade it — same price as a new one.</p>
      <h4>DEFCON & THE CLOCK</h4><p>The Doomsday Clock starts at 12:00 to midnight. It drifts forward, jumps with every fallen nation, betrayal and strike, and is pulled back by interceptions, lasers and Council treaties. At 0:00 the Nuclear Winter ends the match with no winner. DEFCON 4 arrives when the peace timer expires; DEFCON 3 when anyone holds 10% or the first bomb falls; DEFCON 2 at 25% or 5:00 on the clock; DEFCON 1 at 2:00.</p>
      <h4>ARSENAL</h4><p>Research each weapon once (Z Airstrike, N Tactical, H Hypersonic, I ICBM, M MIRV, O Orbital, E EMP), then press its key and click a target. Shift-click or toggle <b>LAUNCH ALL</b> to fire every ready silo. MIRVs split into 5 warheads mid-flight.</p>
      <h4>DEFENCES</h4><p>Each defence level adds one more interception shot — nothing else. Each type covers specific warheads: <b>SAM</b> ${Object.entries(def('sam').vs).map(([k, v]) => k + ' ' + Math.round(v * 100) + '%').join(', ')} · <b>ABM</b> ${Object.entries(def('abm').vs).map(([k, v]) => k + ' ' + Math.round(v * 100) + '%').join(', ')} · <b>Laser</b> ${Object.entries(def('laser').vs).map(([k, v]) => k + ' ' + Math.round(v * 100) + '%').join(', ')} · <b>Aegis Net</b> ${Object.entries(def('aegis').vs).map(([k, v]) => k + ' ' + Math.round(v * 100) + '%').join(', ')}. <b>Radar</b> sees launches early; the earlier the warning, the better every interception roll (×${C.WARN.minF} with no warning up to ×${C.WARN.maxF}).</p>
      <h4>DIPLOMACY</h4><p>Alliances share no friendly fire; up to ${C.ALLIANCE_MAX} allies — or bring a party of ${C.PARTY_MAX} bots and forfeit alliances. Bots judge your offers by your position: strength, borders, shared enemies, betrayals. Truces last 3:00. Betrayal is rare but real. Embargoes stop convoys and trade ships.</p>
      <h4>NEW IN MIDNIGHT PROTOCOL</h4><p><b>Doctrines & field directives</b> · <b>Supply lines</b> · <b>Global Council</b> votes every ${C.COUNCIL_INTERVAL / 60} minutes · <b>EMP strikes</b> · <b>Weather fronts</b> · <b>Pause, 1–4× speed and save/resume</b>.</p>
      <h4>KEYS</h4><p>1–8 build · R T Y U J defences · Z N H I M O E weapons · L launch-all · Space pause · F find capital · WASD/arrows pan · wheel zoom · Esc cancel/settings · +/− attack ratio</p></div>`);
  };

  Menu.openSettings = function (inMatch) {
    const S = MP.settings;
    const voices = MP.Advisor && MP.Advisor.listVoices ? MP.Advisor.listVoices() : [];
    const cur = MP.Advisor && MP.Advisor.getVoiceName ? MP.Advisor.getVoiceName() : '';
    const sl = (key, label, def) => `<label>${label} <b>${Math.round(S.get(key, def) * 100)}</b><input type="range" min="0" max="1" step="0.05" value="${S.get(key, def)}" data-vol="${key}"></label>`;
    if (inMatch && MP.Game.running && !MP.Game.paused) { MP.Game.setPaused(true); Menu._resumeAfter = true; } else Menu._resumeAfter = false;
    modal(`<div class="mh"><span class="tag">SYSTEM</span><h2>SETTINGS</h2></div>
      ${inMatch ? `<div class="row-btns"><button class="btn primary" data-a="resume">RESUME</button><button class="btn" data-a="save">SAVE MATCH</button><button class="btn danger" data-a="quit">SAVE & QUIT TO MENU</button></div>` : ''}
      <div class="rules">
        ${sl('vol.master', 'MASTER', 0.8)}${sl('vol.sfx', 'EFFECTS', 0.8)}${sl('vol.voice', 'ADVISOR CUES', 0.9)}${sl('vol.music', 'MUSIC', 0.5)}${sl('vol.amb', 'AMBIENCE', 0.5)}
        <label class="ck"><input type="checkbox" id="st-mute" ${S.get('muted', false) ? 'checked' : ''}> MUTE ALL</label>
        <label class="ck"><input type="checkbox" id="st-voice" ${MP.Advisor && MP.Advisor.isVoiceEnabled() ? 'checked' : ''}> VESPER FEMALE VOICE</label>
        <label>VOICE <select id="st-vname"><option value="">AUTO (FEMALE)</option>${voices.map((v) => `<option value="${U.esc(v.name)}" ${v.name === cur ? 'selected' : ''}>${U.esc(v.name)} ${v.female ? '♀' : ''} (${v.lang})</option>`).join('')}</select></label>
        <label>SPEECH RATE <b id="st-rate-v">${S.get('advisor.rate', 1).toFixed ? Number(S.get('advisor.rate', 1)).toFixed(2) : 1}</b><input type="range" min="0.8" max="1.3" step="0.02" value="${S.get('advisor.rate', 1)}" id="st-rate"></label>
        <label class="ck"><input type="checkbox" id="st-tut" ${S.get('tutorial', true) ? 'checked' : ''}> TUTORIAL BRIEFINGS</label>
      </div>
      ${inMatch ? '' : '<div class="row-btns"><button class="btn danger" data-a="reset">RESET PROGRESS</button></div>'}`,
    (box, close) => {
      box.querySelectorAll('[data-vol]').forEach((el) => el.addEventListener('input', () => { S.set(el.dataset.vol, Number(el.value)); el.previousElementSibling.textContent = Math.round(el.value * 100); MP.audio.applyVolumes(); }));
      box.querySelector('#st-mute').onchange = (e) => { S.set('muted', e.target.checked); MP.audio.applyVolumes(); };
      box.querySelector('#st-voice').onchange = (e) => { MP.Advisor && MP.Advisor.setVoiceEnabled(e.target.checked); };
      box.querySelector('#st-vname').onchange = (e) => { MP.Advisor && MP.Advisor.setVoiceName(e.target.value || null); MP.Advisor && MP.Advisor.say('Voice check. Channel is clear.', { priority: 1 }); };
      box.querySelector('#st-rate').oninput = (e) => { S.set('advisor.rate', Number(e.target.value)); box.querySelector('#st-rate-v').textContent = Number(e.target.value).toFixed(2); MP.Advisor && MP.Advisor.setRate(Number(e.target.value)); };
      box.querySelector('#st-tut').onchange = (e) => S.set('tutorial', e.target.checked);
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'resume') { close(); }
        if (a === 'save') MP.Game.save(false);
        if (a === 'quit') { MP.Game.save(true).then(() => { close(); MP.Game.quitToMenu(); }); }
        if (a === 'reset') MP.HUD.confirm('Reset all progress?', 'Level, scrap, unlocks and records will be erased.', () => { localStorage.removeItem(PKEY); Menu.load(); close(); Menu.render(); });
      });
      const obs = new MutationObserver(() => { if (!box.isConnected) { obs.disconnect(); if (Menu._resumeAfter && MP.Game.running) MP.Game.setPaused(false); } });
      obs.observe(document.getElementById('modal-root'), { childList: true });
    });
  };

  // ---------------- animated wireframe globe ----------------
  Menu.frame = function (dt) {
    if (!globeCv || root.style.display === 'none') return;
    globeT += dt;
    const w = window.innerWidth, hh = window.innerHeight;
    if (globeCv.width !== w || globeCv.height !== hh) { globeCv.width = w; globeCv.height = hh; }
    const c = globeCtx;
    c.clearRect(0, 0, w, hh);
    const R = Math.min(w, hh) * 0.42, cx = w / 2, cy = hh * 0.53;
    const rot = globeT * 0.08;
    c.lineWidth = 1;
    const proj = (lon, lat) => {
      const l = lon + rot, cl = Math.cos(lat);
      const x = cl * Math.sin(l), y = Math.sin(lat), z = cl * Math.cos(l);
      return [cx + x * R, cy - y * R, z];
    };
    c.strokeStyle = 'rgba(255,210,31,0.10)';
    for (let lat = -75; lat <= 75; lat += 15) {
      c.beginPath(); let first = true;
      for (let lon = 0; lon <= 360; lon += 6) { const [x, y, z] = proj(lon * Math.PI / 180, lat * Math.PI / 180); if (z < 0) { first = true; continue; } if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); }
      c.stroke();
    }
    for (let lon = 0; lon < 360; lon += 20) {
      c.beginPath(); let first = true;
      for (let lat = -90; lat <= 90; lat += 6) { const [x, y, z] = proj(lon * Math.PI / 180, lat * Math.PI / 180); if (z < 0) { first = true; continue; } if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); }
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,210,31,0.22)'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
    // satellites / blips
    for (let k = 0; k < 14; k++) {
      const lon = (k * 47 + globeT * (6 + k % 5)) * Math.PI / 180, lat = ((k * 31) % 140 - 70) * Math.PI / 180;
      const [x, y, z] = proj(lon, lat);
      if (z < 0) continue;
      c.fillStyle = `rgba(255,210,31,${0.25 + 0.4 * z})`; c.beginPath(); c.arc(x, y, 2 + z * 2, 0, 7); c.fill();
    }
    // occasional arc (missile trail across the globe)
    const ph = (globeT % 7) / 7;
    if (ph < 0.6) {
      const a0 = proj(0.9, 0.7), a1 = proj(2.0, -0.2);
      if (a0[2] > 0 && a1[2] > 0) {
        c.strokeStyle = 'rgba(255,68,51,0.35)'; c.beginPath(); c.moveTo(a0[0], a0[1]);
        const mx = (a0[0] + a1[0]) / 2, my = Math.min(a0[1], a1[1]) - R * 0.35;
        const k = ph / 0.6;
        for (let s = 0; s <= 20; s++) { const t = s / 20 * k; const x = (1 - t) * (1 - t) * a0[0] + 2 * (1 - t) * t * mx + t * t * a1[0]; const y = (1 - t) * (1 - t) * a0[1] + 2 * (1 - t) * t * my + t * t * a1[1]; c.lineTo(x, y); }
        c.stroke();
      }
    }
  };
})();
