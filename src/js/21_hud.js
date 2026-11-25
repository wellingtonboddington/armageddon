/* MIDNIGHT PROTOCOL — in-match HUD, input handling, radial menu, panels, modals */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;
  const h = U.h;

  const HUD = (MP.HUD = { mode: null, ratio: 0.25, launchAll: false });
  let root, els = {};
  let refreshT = 0;

  // ---------------- build DOM ----------------
  HUD.init = function () {
    root = document.getElementById('hud');
    root.innerHTML = `
    <div class="hud-tl">
      <div class="panel status brk">
        <div class="st-row1"><span class="defcon" id="h-defcon">DEFCON 5</span><span class="date" id="h-date">JAN 2031</span></div>
        <div class="st-row2">
          <span class="chip" title="Match time remaining">${MP.Icons.svgIcon('hourglass_fallback', '#ece6cf', 16).replace('hourglass_fallback', '')}<b id="h-match">40:00</b></span>
          <span class="chip" title="Nations alive"><img class="ico" src="${MP.Icons.url('flag', '#ece6cf', 32)}"><b id="h-alive">100</b></span>
          <span class="chip clock" title="Doomsday Clock — minutes to midnight"><span class="clockface" id="h-clockface"></span><b id="h-clock">12:00</b></span>
          <span class="chip peace" title="Peace timer — weapons unlock at DEFCON 4" id="h-peace-wrap"><img class="ico" id="h-peace-ico" src="${MP.Icons.url('shield', '#6fb8ff', 32)}"><b id="h-peace">5:00</b></span>
        </div>
      </div>
      <div class="panel landbar brk"><img class="ico" src="${MP.Icons.url('flag', '#ffd21f', 32)}"><div class="bar"><i id="h-landbar"></i><span class="ms m10"></span><span class="ms m25"></span></div><b id="h-landpct">0%</b></div>
      <div class="panel readout brk" id="h-readout">
        <div class="ro-1"><span id="h-coord">—</span> <span id="h-terrain"></span> <span class="pips" id="h-pips"></span></div>
        <div class="ro-2" id="h-ro-nation"></div>
      </div>
      <div class="tl-buttons">
        <button class="btn icon" id="h-settings" title="Settings (Esc)">${MP.Icons.svgIcon('gear', '#ece6cf', 32)}</button>
        <button class="btn danger" id="h-resign">RESIGN</button>
        <div class="speed" id="h-speed">
          <button class="btn sm" data-sp="0" title="Pause (Space)">❚❚</button>
          <button class="btn sm" data-sp="1">1×</button>
          <button class="btn sm" data-sp="2">2×</button>
          <button class="btn sm" data-sp="4">4×</button>
        </div>
        <button class="btn sm" id="h-save" title="Save match">SAVE</button>
      </div>
    </div>

    <div class="hud-tr">
      <div class="panel lb brk" id="h-lb"><div class="lb-head"><span>#</span><span>NATION</span><span><img class="ico" src="${MP.Icons.url('flag', '#8d8670', 32)}"></span><span><img class="ico" src="${MP.Icons.url('troops', '#8d8670', 32)}"></span></div><div id="h-lb-rows"></div></div>
      <div class="panel attacks brk" id="h-attacks"><div class="ph"><span class="t">⊕ ATTACKS</span><span id="h-att-count">0 OUT</span></div><div id="h-att-rows"></div></div>
      <div class="panel effects brk" id="h-effects" style="display:none"></div>
    </div>

    <div class="hud-bl">
      <div id="advisor-hud" class="panel brk"></div>
      <div class="panel wire brk"><div class="ph"><span class="t">WIRE // ALL SOURCES</span></div><div id="h-wire"></div></div>
    </div>

    <div class="hud-bc">
      <div id="h-offers"></div>
      <div class="buildbar" id="h-build"></div>
      <div class="panel stats brk">
        <div class="stat troops"><div class="sl"><img class="ico" src="${MP.Icons.url('troops', '#8d8670', 32)}"> TROOPS <span class="pos" id="h-grow">+0/s</span></div>
          <div class="sv"><b id="h-troops">0</b><span class="dim"> / <span id="h-cap">0</span></span></div><div class="bar"><i id="h-troopbar"></i></div></div>
        <div class="stat attack"><div class="sl">⊕ ATTACK <span class="pct" id="h-ratio-pct">25%</span></div>
          <div class="presets"><button class="btn sm" data-r="-">−</button>${C.ATTACK_PRESETS.map((p) => `<button class="btn sm" data-r="${p}">${Math.round(p * 100)}%</button>`).join('')}<button class="btn sm" data-r="+">+</button></div>
          <div class="send"><img class="ico" src="${MP.Icons.url('troops', '#ff4433', 32)}"> <b id="h-send">0</b></div></div>
        <div class="stat credits"><div class="sl"><img class="ico" src="${MP.Icons.url('coin', '#8d8670', 32)}"> CREDITS <span class="pos" id="h-income">+0/s</span></div><div class="sv"><b id="h-credits">0</b></div></div>
        <div class="stat res"><div class="sv sm"><img class="ico" src="${MP.Icons.url('flag', '#ece6cf', 32)}"> <b id="h-tiles">0</b></div>
          <div class="sv sm"><img class="ico" src="${MP.Icons.url('nuke', '#ffd21f', 32)}"> <b class="u" id="h-uranium">0</b></div><div class="bar ubar"><i id="h-ubar"></i></div></div>
      </div>
    </div>

    <div class="hud-r">
      <div class="panel dock brk" id="h-dock"></div>
      <div class="panel minimap brk"><canvas id="h-mini" width="240" height="114"></canvas></div>
    </div>

    <div class="hud-tc">
      <div class="banner" id="h-banner" style="display:none"><span id="h-banner-t"></span><button class="x" id="h-banner-x">✕</button></div>
      <div id="h-toasts"></div>
    </div>
    <div id="h-radial" class="radial" style="display:none"></div>
    <div id="h-tip" class="tip" style="display:none"></div>
    <div id="h-council" class="council panel brk" style="display:none"></div>
    <div id="h-pause" class="pause" style="display:none"><div class="pz">PAUSED</div><div class="pzs">SPACE TO RESUME</div></div>
    `;
    const q = (id) => document.getElementById(id);
    ['h-defcon', 'h-date', 'h-match', 'h-alive', 'h-clock', 'h-clockface', 'h-peace', 'h-peace-wrap', 'h-peace-ico', 'h-landbar', 'h-landpct', 'h-coord', 'h-terrain', 'h-pips', 'h-ro-nation',
      'h-lb-rows', 'h-att-rows', 'h-att-count', 'h-wire', 'h-offers', 'h-build', 'h-grow', 'h-troops', 'h-cap', 'h-troopbar', 'h-ratio-pct', 'h-send', 'h-income', 'h-credits',
      'h-tiles', 'h-uranium', 'h-ubar', 'h-dock', 'h-banner', 'h-banner-t', 'h-toasts', 'h-radial', 'h-tip', 'h-council', 'h-pause', 'h-effects', 'h-speed', 'h-mini'].forEach((id) => { els[id] = q(id); });
    // hourglass icon (inline SVG — glyph set has none)
    root.querySelector('.st-row2 .chip').innerHTML = `<svg class="ico" viewBox="0 0 16 16"><path d="M4 2h8v2.5L9.3 8 12 11.5V14H4v-2.5L6.7 8 4 4.5z" fill="none" stroke="#ece6cf" stroke-width="1.4"/><path d="M6 12.5h4L8 10z" fill="#ffd21f"/></svg><b id="h-match">40:00</b>`;
    els['h-match'] = q('h-match');
    HUD.buildBuildBar();
    HUD.buildDock();
    HUD.bindInput();
    MP.Render.init(document.getElementById('map'), els['h-mini']);
  };

  HUD.buildBuildBar = function () {
    const bar = els['h-build'];
    bar.innerHTML = '';
    for (const type of C.BUILD_ORDER) {
      const b = C.BUILD[type];
      const btn = h('button', { class: 'bslot', 'data-type': type, title: b.name },
        h('span', { class: 'k' }, b.key),
        h('img', { class: 'gl', src: MP.Icons.url(b.icon, '#ece6cf', 40), draggable: 'false' }),
        h('span', { class: 'c', id: 'cost-' + type }, ''));
      btn.addEventListener('click', () => HUD.setBuildMode(type));
      bar.appendChild(btn);
    }
  };

  HUD.buildDock = function () {
    const d = els['h-dock'];
    d.innerHTML = `<div class="ph"><span class="t">ARSENAL</span><span class="dim" id="h-silos">0 SILOS</span></div>
      <div class="dock-row def" id="h-defrow"></div><div class="dock-row wpn" id="h-wpnrow"></div>
      <button class="btn launchall" id="h-launchall">LAUNCH ALL <span>OFF</span></button>`;
    const defrow = document.getElementById('h-defrow');
    for (const type of C.DEFENSE_ORDER) {
      const b = C.BUILD[type];
      const btn = h('button', { class: 'dslot', 'data-type': type, title: b.name + ' — ' + defDesc(type) },
        h('span', { class: 'k' }, b.key), h('img', { class: 'gl', src: MP.Icons.url(b.icon, '#ece6cf', 40), draggable: 'false' }), h('span', { class: 'c', id: 'cost-' + type }, ''));
      btn.addEventListener('click', () => HUD.setBuildMode(type));
      defrow.appendChild(btn);
    }
    const wrow = document.getElementById('h-wpnrow');
    for (const w of C.WEAPON_ORDER) {
      const def = C.WEAPON[w];
      const btn = h('button', { class: 'wslot locked', 'data-w': w, title: w },
        h('span', { class: 'k' }, def.key), h('img', { class: 'gl', src: MP.Icons.url(def.icon, '#ece6cf', 40), draggable: 'false' }),
        h('span', { class: 'lock' }, '🔒'), h('span', { class: 'c', id: 'wc-' + w }, ''), h('i', { class: 'prog', id: 'wp-' + w }));
      btn.addEventListener('click', () => HUD.weaponClick(w));
      btn.addEventListener('mouseenter', (e) => HUD.showTip(e.currentTarget, weaponTip(w)));
      btn.addEventListener('mouseleave', () => HUD.hideTip());
      wrow.appendChild(btn);
    }
    document.getElementById('h-launchall').addEventListener('click', () => { HUD.launchAll = !HUD.launchAll; MP.SFX.play('toggle'); HUD.syncLaunchAll(); });
  };
  function defDesc(type) {
    const d = C.DEFENSE[type];
    if (type === 'radar') return `detects launches within ${d.range} tiles — earlier warning raises every interception chance`;
    return 'intercepts ' + Object.entries(d.vs).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ') + ` · range ${d.range} · one shot per level`;
  }
  function weaponTip(w) {
    const p = G.player(); const def = C.WEAPON[w];
    const rc = p ? MP.Weapons.researchCost(p, w) : { credits: def.research[0], u: def.research[1], time: def.research[2] };
    const lc = p ? MP.Weapons.launchCost(p, w) : { credits: def.cost[0], u: def.cost[1] };
    const counters = Object.keys(C.DEFENSE).filter((k) => C.DEFENSE[k].vs && C.DEFENSE[k].vs[w]).map((k) => C.BUILD[k].name);
    return `<b>${w}</b> <span class="dim">· DEFCON ${def.defcon}</span><br>` +
      `Research: ${U.fmtK(rc.credits)}${rc.u ? ' · ' + rc.u + 'U' : ''} · ${Math.round(rc.time)}s<br>` +
      `Launch: ${U.fmtK(lc.credits)}${lc.u ? ' · ' + lc.u + 'U' : ''} · radius ${def.radius}${def.range ? ' · range ' + def.range : ''}` +
      (def.warheads ? `<br>Splits into ${def.warheads} warheads mid-flight` : '') +
      (def.from === 'silo' ? '<br>Fires from a ready silo' : def.from === 'city' ? '<br>Flies from your cities' : '<br>Orbital platform · 3s charge') +
      `<br><span class="dim">Countered by: ${counters.join(', ') || 'nothing'}</span>`;
  }

  // ---------------- input ----------------
  HUD.bindInput = function () {
    const cv = document.getElementById('map');
    let down = null, dragging = false;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('mousedown', (e) => {
      MP.audio.unlock();
      HUD.closeRadial(e.target);
      if (e.button === 1 || e.button === 0) down = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey };
      if (e.button === 2) { HUD.onRightClick(e); }
    });
    window.addEventListener('mousemove', (e) => {
      if (down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4)) dragging = true;
      if (down && dragging) { MP.Render.pan(e.movementX, e.movementY); }
      if (e.target === cv) HUD.updateHover(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', (e) => {
      if (down && !dragging && e.target === cv && down.b === 0) HUD.onClick(e);
      down = null; dragging = false;
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      MP.Render.zoomAt(e.clientX, e.clientY, Math.pow(1.0015, -e.deltaY));
    }, { passive: false });
    // touch: one-finger pan, pinch zoom, tap = click
    let touches = null;
    cv.addEventListener('touchstart', (e) => { MP.audio.unlock(); touches = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY })); touches.moved = false; }, { passive: true });
    cv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const ts = Array.from(e.touches).map((t) => ({ x: t.clientX, y: t.clientY }));
      if (!touches) { touches = ts; return; }
      if (ts.length === 1 && touches.length === 1) { MP.Render.pan(ts[0].x - touches[0].x, ts[0].y - touches[0].y); if (Math.hypot(ts[0].x - touches[0].x, ts[0].y - touches[0].y) > 2) touches.moved = true; }
      if (ts.length === 2 && touches.length === 2) {
        const d0 = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y), d1 = Math.hypot(ts[0].x - ts[1].x, ts[0].y - ts[1].y);
        MP.Render.zoomAt((ts[0].x + ts[1].x) / 2, (ts[0].y + ts[1].y) / 2, d1 / Math.max(1, d0)); touches.moved = true;
      }
      const moved = touches.moved; touches = ts; touches.moved = moved;
    }, { passive: false });
    cv.addEventListener('touchend', (e) => {
      if (touches && !touches.moved && touches.length === 1) { HUD.updateHover(touches[0].x, touches[0].y); HUD.onClick({ clientX: touches[0].x, clientY: touches[0].y, shiftKey: false }); }
      if (!e.touches.length) touches = null;
    });
    // minimap
    els['h-mini'].addEventListener('mousedown', (e) => {
      const r = e.target.getBoundingClientRect();
      const [wx, wy] = MP.Render.miniToWorld(e.clientX - r.left, e.clientY - r.top);
      MP.Render.centerOn(wx, wy, MP.Render.cam.z);
      MP.SFX.play('click');
    });
    // buttons
    document.getElementById('h-resign').addEventListener('click', () => HUD.confirm('Resign the match?', 'Your nation will surrender.', () => MP.Game.resign()));
    document.getElementById('h-settings').addEventListener('click', () => MP.Menu.openSettings(true));
    document.getElementById('h-save').addEventListener('click', () => MP.Game.save(false));
    document.getElementById('h-banner-x').addEventListener('click', () => HUD.clearMode());
    els['h-speed'].addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const sp = Number(b.dataset.sp);
      if (sp === 0) MP.Game.setPaused(!MP.Game.paused); else MP.Game.setSpeed(sp);
      MP.SFX.play('click');
    });
    root.querySelector('.presets').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const r = b.dataset.r;
      if (r === '-') HUD.ratio = Math.max(0.05, Math.round((HUD.ratio - 0.05) * 100) / 100);
      else if (r === '+') HUD.ratio = Math.min(1, Math.round((HUD.ratio + 0.05) * 100) / 100);
      else HUD.ratio = Number(r);
      MP.settings.set('ratio', HUD.ratio);
      MP.SFX.play('click');
      HUD.syncRatio();
    });
    // ui sounds: hover + click on any button
    document.addEventListener('mouseover', (e) => { const b = e.target.closest && e.target.closest('button, .clickable'); if (b && b !== HUD._lastHoverBtn) { HUD._lastHoverBtn = b; MP.SFX.play('hover'); } });
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b && !b.dataset.silent) MP.SFX.play('click'); }, true);
    window.addEventListener('keydown', HUD.onKey);
  };

  HUD.onKey = function (e) {
    if (!MP.Game.running) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    const k = e.key;
    const S = G.S;
    if (k === 'Escape') {
      if (HUD.mode || MP.Render.selectedShip) { HUD.clearMode(); MP.Render.selectedShip = null; return; }
      if (els['h-radial'].style.display !== 'none') { HUD.closeRadial(); return; }
      if (document.querySelector('.modal-wrap')) return;
      MP.Menu.openSettings(true); return;
    }
    if (k === ' ') { e.preventDefault(); MP.Game.setPaused(!MP.Game.paused); return; }
    if (S.opts.mode === 'watch') return;
    const up = k.toUpperCase();
    for (const t of C.BUILD_ORDER.concat(C.DEFENSE_ORDER)) if (C.BUILD[t].key === up) { HUD.setBuildMode(t); return; }
    for (const w of C.WEAPON_ORDER) if (C.WEAPON[w].key === up) { HUD.weaponClick(w); return; }
    if (k === '+' || k === '=') { HUD.ratio = Math.min(1, HUD.ratio + 0.05); HUD.syncRatio(); }
    if (k === '-' || k === '_') { HUD.ratio = Math.max(0.05, HUD.ratio - 0.05); HUD.syncRatio(); }
    if (up === 'F') { const p = G.player(); if (p && p.capital >= 0) MP.Render.centerOn(p.capX, p.capY, Math.max(4, MP.Render.cam.z)); }
    if (up === 'L') { HUD.launchAll = !HUD.launchAll; HUD.syncLaunchAll(); MP.SFX.play('toggle'); }
    const pan = 60 / MP.Render.cam.z;
    if (k === 'ArrowLeft' || up === 'A') MP.Render.pan(pan * MP.Render.cam.z, 0);
    if (k === 'ArrowRight' || up === 'D') MP.Render.pan(-pan * MP.Render.cam.z, 0);
    if (k === 'ArrowUp' || up === 'W') MP.Render.pan(0, pan * MP.Render.cam.z);
    if (k === 'ArrowDown' || up === 'S') MP.Render.pan(0, -pan * MP.Render.cam.z);
  };

  HUD.updateHover = function (sx, sy) {
    const [wx, wy] = MP.Render.s2w(sx, sy);
    const x = Math.floor(wx), y = Math.floor(wy);
    const H = MP.Render.hover;
    H.sx = sx; H.sy = sy; H.wx = wx; H.wy = wy;
    if (x < 0 || y < 0 || x >= World.W || y >= World.H) { H.t = -1; H.owner = 0; return; }
    const t = x + y * World.W;
    if (t !== H.t) {
      const S = G.S;
      const o = S ? S.owner[t] : 0;
      if (o !== H.owner) MP.SFX.play('hoverMap');
      H.owner = o;
    }
    H.t = t; H.x = x; H.y = y;
  };

  HUD.onClick = function (e) {
    const S = G.S, p = G.player(), H = MP.Render.hover;
    if (!S || H.t < 0 || S.phase === 'over') return;
    if (S.opts.mode === 'watch' || !p) {
      if (S.owner[H.t]) MP.Render.ping(H.x, H.y, S.nations[S.owner[H.t]].color);
      return;
    }
    if (S.phase === 'spawn') { MP.Game.playerSpawn(H.t); return; }
    if (!p.alive) return;
    const mode = HUD.mode;
    if (mode && mode.kind === 'build') {
      const s = MP.Eco.place(p, mode.type, H.t);
      if (s && !e.shiftKey) HUD.clearMode();
      return;
    }
    if (mode && mode.kind === 'weapon') {
      const all = HUD.launchAll || e.shiftKey;
      if (all) MP.Weapons.launchAll(p, mode.w, H.wx, H.wy); else MP.Weapons.launch(p, mode.w, H.wx, H.wy);
      if (!e.shiftKey) HUD.clearMode();
      return;
    }
    // select own warship?
    const R = MP.Render;
    for (const sh of S.ships) {
      if (sh.owner !== p.id || sh.kind !== 'warship' || sh._sx == null) continue;
      if (Math.hypot(sh._sx - H.sx, sh._sy - H.sy) < 14) { R.selectedShip = sh; MP.SFX.play('naval'); HUD.toast('Warship selected — click the sea to set its patrol', 'info'); return; }
    }
    if (R.selectedShip && !World.land[H.t]) {
      MP.Naval.assignPatrol(R.selectedShip, H.wx, H.wy); R.selectedShip = null; MP.SFX.play('send'); HUD.toast('Patrol assigned', 'info'); return;
    }
    R.selectedShip = null;
    if (!World.land[H.t]) return;
    const o = S.owner[H.t];
    if (o === p.id) return;
    HUD.orderAttack(o, H.t);
  };

  HUD.orderAttack = function (o, t) {
    const S = G.S, p = G.player();
    if (o && !G.canAttack(p.id, o)) { HUD.toast(G.isAllied(p.id, o) ? 'That nation is your ally' : G.protectedNow() ? 'Spawn protection — nations can only claim empty land for now' : 'Truce in effect', 'bad'); MP.SFX.play('error'); return; }
    const troops = p.troops * HUD.ratio;
    if (MP.War.bordersWith(p.id, o)) {
      const at = MP.War.launch(p.id, o, troops);
      if (at) {
        MP.SFX.play('attack');
        if (o) MP.Game.notify('attack.launched', { target: S.nations[o].name, troops: U.fmtK(troops) });
        else MP.Game.notify('attack.expand', { troops: U.fmtK(troops) });
        HUD.floatOrder(o ? `Attacking ${S.nations[o].name} with ${U.fmtK(troops)}` : `Expanding with ${U.fmtK(troops)}`);
      }
    } else if (World.coast[t] || nearCoast(t)) {
      const r = MP.Naval.launchTransport(p, t, troops);
      if (!r.ok) { HUD.toast(r.reason, 'bad'); MP.SFX.play('error'); }
      else { HUD.floatOrder(`Transport underway with ${U.fmtK(troops)}`); MP.Game.tut('tut.boat'); }
    } else { HUD.toast('No border there — land a transport on the coast instead', 'bad'); MP.SFX.play('error'); }
  };
  function nearCoast(t) { const w = World.W; for (let d = -3; d <= 3; d++) for (let e = -3; e <= 3; e++) { const u = t + d + e * w; if (u >= 0 && u < World.N && World.coast[u]) return true; } return false; }

  HUD.floatOrder = function (text) {
    const H = MP.Render.hover;
    const el = h('div', { class: 'order-float', style: { left: H.sx + 'px', top: (H.sy - 28) + 'px' } }, '⊕ ' + text);
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('out'), 1200);
    setTimeout(() => el.remove(), 1800);
  };

  // ---------------- modes ----------------
  HUD.setBuildMode = function (type) {
    const S = G.S, p = G.player();
    if (!S || !p || !p.alive || S.phase !== 'play') return;
    if (HUD.mode && HUD.mode.kind === 'build' && HUD.mode.type === type) { HUD.clearMode(); return; }
    HUD.mode = { kind: 'build', type };
    HUD.banner(`<img class="ico" src="${MP.Icons.url(C.BUILD[type].icon, '#ffd21f', 32)}"> Place ${C.BUILD[type].name}`);
    MP.SFX.play('open');
    const tutMap = { warship: 'tut.warship', silo: 'tut.silo', radar: 'tut.radar', sam: 'tut.defense', abm: 'tut.defense', laser: 'tut.defense', aegis: 'tut.defense', enrich: 'tut.enrich', hub: 'tut.hub', port: 'tut.port', fort: 'tut.fort', factory: 'tut.factory', city: 'tut.city' };
    if (tutMap[type]) MP.Game.tut(tutMap[type]);
    HUD.syncSlots();
  };
  HUD.weaponClick = function (w) {
    const S = G.S, p = G.player();
    if (!S || !p || !p.alive || S.phase !== 'play') return;
    if (!p.research[w]) {
      if (p.researching && p.researching.w === w) return;
      const r = MP.Weapons.startResearch(p, w);
      if (!r.ok) { HUD.toast(r.reason, 'bad'); MP.SFX.play('error'); }
      return;
    }
    if (HUD.mode && HUD.mode.kind === 'weapon' && HUD.mode.w === w) { HUD.clearMode(); return; }
    HUD.mode = { kind: 'weapon', w };
    HUD.banner(`<img class="ico" src="${MP.Icons.url(C.WEAPON[w].icon, '#ff4433', 32)}"> Target: ${w}${HUD.launchAll ? ' · LAUNCH ALL' : ''} <span class="dim">(shift = all)</span>`, 'red');
    MP.SFX.play('open');
    HUD.syncSlots();
  };
  HUD.clearMode = function () { HUD.mode = null; HUD.banner(null); HUD.syncSlots(); MP.SFX.play('close'); };
  HUD.banner = function (html, kind) {
    const b = els['h-banner'];
    if (!html) { b.style.display = 'none'; return; }
    b.style.display = ''; b.className = 'banner ' + (kind || '');
    els['h-banner-t'].innerHTML = html;
  };
  HUD.syncLaunchAll = function () {
    const b = document.getElementById('h-launchall');
    b.classList.toggle('on', HUD.launchAll);
    b.querySelector('span').textContent = HUD.launchAll ? 'ON' : 'OFF';
    if (HUD.mode && HUD.mode.kind === 'weapon') HUD.weaponClick(HUD.mode.w), HUD.weaponClick(HUD.mode.w);
  };
  HUD.syncRatio = function () {
    els['h-ratio-pct'].textContent = Math.round(HUD.ratio * 100) + '%';
    root.querySelectorAll('.presets button').forEach((b) => b.classList.toggle('on', Number(b.dataset.r) === HUD.ratio));
  };

  // ---------------- radial menu ----------------
  HUD.onRightClick = function (e) {
    const S = G.S, p = G.player();
    HUD.updateHover(e.clientX, e.clientY);
    const H = MP.Render.hover;
    if (!S || H.t < 0) return;
    if (HUD.mode) { HUD.clearMode(); return; }
    if (MP.Render.selectedShip && !World.land[H.t]) { MP.Naval.assignPatrol(MP.Render.selectedShip, H.wx, H.wy); MP.Render.selectedShip = null; HUD.toast('Patrol assigned', 'info'); return; }
    const o = S.owner[H.t];
    if (!o) return;
    HUD.openRadial(o, e.clientX, e.clientY, H.t);
  };
  HUD.openRadial = function (o, x, y, t) {
    const S = G.S, p = G.player(), n = S.nations[o];
    const rad = els['h-radial'];
    const self = p && o === p.id;
    const watch = !p || S.opts.mode === 'watch';
    const allied = p && G.isAllied(p.id, o);
    const opts = [];
    opts.push({ id: 'info', label: 'Info', icon: 'radar' });
    if (!self && !watch) {
      opts.push({ id: 'attack', label: 'Attack', icon: 'jet', dis: allied });
      opts.push({ id: 'boat', label: 'Boat', icon: 'warship', dis: allied });
      opts.push({ id: 'ally', label: allied ? (n.team && n.team === p.team ? 'Team' : 'Break') : 'Ally', icon: 'flag', dis: n.team && n.team === p.team });
      opts.push({ id: 'truce', label: 'Truce', icon: 'shield', dis: allied || G.hasTruce(p.id, o) });
      opts.push({ id: 'embargo', label: p.embargo.has(o) ? 'Lift' : 'Embargo', icon: 'coin' });
      opts.push({ id: 'gift', label: 'Gift', icon: 'troops', dis: !allied });
    }
    opts.push({ id: 'focus', label: 'Focus', icon: 'capital' });
    const R = 92;
    rad.innerHTML = `<div class="rchip">${MP.Flags.img(n.flag, 'flag sm')} ${U.esc(n.name)}</div><button class="rc" data-id="close">✕</button>` +
      opts.map((op, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / opts.length;
        return `<button class="ropt ${op.dis ? 'dis' : ''}" data-id="${op.id}" style="left:${Math.cos(a) * R}px;top:${Math.sin(a) * R}px"><img src="${MP.Icons.url(op.icon, '#ece6cf', 32)}"><span>${op.label}</span></button>`;
      }).join('');
    rad.style.left = U.clamp(x, 130, window.innerWidth - 130) + 'px'; rad.style.top = U.clamp(y, 130, window.innerHeight - 130) + 'px';
    rad.style.display = '';
    MP.SFX.play('open');
    rad.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const id = b.dataset.id;
      if (b.classList.contains('dis')) { MP.SFX.play('error'); return; }
      HUD.closeRadial();
      HUD.radialAction(id, o, t);
    };
  };
  HUD.closeRadial = function (target) {
    const rad = els['h-radial'];
    if (target && rad.contains(target)) return;
    if (rad.style.display !== 'none') rad.style.display = 'none';
  };
  HUD.radialAction = function (id, o, t) {
    const S = G.S, p = G.player(), n = S.nations[o];
    switch (id) {
      case 'info': HUD.showNationInfo(o); break;
      case 'focus': { const c = n.label || { x: n.capX, y: n.capY }; MP.Render.centerOn(c.x, c.y, Math.max(3, MP.Render.cam.z)); MP.Render.ping(n.capX, n.capY, n.color); break; }
      case 'attack': HUD.orderAttack(o, t); break;
      case 'boat': {
        const r = MP.Naval.launchTransport(p, t, p.troops * HUD.ratio);
        if (!r.ok) { HUD.toast(r.reason, 'bad'); MP.SFX.play('error'); } else HUD.floatOrder(`Transport underway with ${U.fmtK(r.ship.troops)}`);
        break;
      }
      case 'ally':
        if (G.isAllied(p.id, o)) HUD.confirm(`Break your alliance with ${n.name}?`, 'The world will remember. You will be flagged as a traitor.', () => MP.Diplo.breakAlliance(p, n, true));
        else MP.Diplo.requestAlliance(p, n);
        break;
      case 'truce': MP.Diplo.requestTruce(p, n); break;
      case 'embargo': {
        const on = MP.Diplo.toggleEmbargo(p, n);
        MP.Game.wire('CABLE', on ? `EMBARGO ON ${n.name}` : `EMBARGO ON ${n.name} LIFTED`, 'embargo');
        if (on) MP.Game.notify('diplo.embargo_them', { nation: n.name });
        break;
      }
      case 'gift': HUD.giftDialog(n); break;
    }
  };

  HUD.giftDialog = function (n) {
    const p = G.player();
    HUD.modal(`<div class="mh"><span class="tag">LOGISTICS</span><h2>Gift to ${U.esc(n.name)}</h2></div>
      <div class="gift-row"><button class="btn" data-k="troops" data-f="0.1">10% troops (${U.fmtK(p.troops * 0.1)})</button><button class="btn" data-k="troops" data-f="0.25">25% troops (${U.fmtK(p.troops * 0.25)})</button></div>
      <div class="gift-row"><button class="btn" data-k="credits" data-f="0.1">10% credits (${U.fmtK(p.credits * 0.1)})</button><button class="btn" data-k="credits" data-f="0.25">25% credits (${U.fmtK(p.credits * 0.25)})</button></div>`,
    (box, close) => {
      box.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-k]'); if (!b) return;
        const k = b.dataset.k, f = Number(b.dataset.f);
        const amt = MP.Diplo.gift(p, n, k, (k === 'troops' ? p.troops : p.credits) * f);
        if (amt) { MP.Game.wire('CABLE', `YOU SEND ${U.fmtK(amt)} ${k.toUpperCase()} TO ${n.name}`, 'good'); MP.SFX.play('send'); }
        close();
      });
    });
  };

  HUD.showNationInfo = function (o) {
    const S = G.S, n = S.nations[o], p = G.player();
    const doc = C.DOCTRINES.find((d) => d.id === n.doctrine);
    const rel = p && p.id !== o ? G.rel(o, p.id) : null;
    const relTxt = rel == null ? '' : rel > 40 ? 'FRIENDLY' : rel > 10 ? 'CORDIAL' : rel > -20 ? 'NEUTRAL' : rel > -50 ? 'HOSTILE' : 'HATEFUL';
    const allies = Array.from(n.allies).map((a) => S.nations[a]).filter((x) => x && x.alive);
    const wars = Array.from(n.wars).map((a) => S.nations[a]).filter((x) => x && x.alive);
    const cnt = (t) => n.st[t].reduce((a, s) => a + s.level, 0);
    const research = Object.keys(n.research);
    const odds = p && p.id !== o && !G.isAllied(p.id, o) ? Math.round(MP.Diplo.allianceOdds(p, n) * 100) : null;
    HUD.modal(`<div class="mh"><span class="tag">DOSSIER · ${n.isPlayer ? 'YOU' : n.partner ? 'PARTNER' : 'FOREIGN NATION'}</span>
      <div class="ni-head">${MP.Flags.img(n.flag, 'flag lg')}<div><h2>${U.esc(n.name)}</h2><div class="dim">${doc ? doc.name.toUpperCase() : ''} ${n.ai ? '· ' + n.personality.toUpperCase() : ''} ${n.traitorUntil > S.t ? '· <span class="red">TRAITOR</span>' : ''}</div></div></div></div>
      <div class="ni-grid">
        <div><span>Rank</span><b>#${n.rank || '-'}</b></div><div><span>Land</span><b>${U.fmtPct(100 * n.tiles / S.landTotal)}</b></div>
        <div><span>Troops</span><b>${U.fmtK(n.troops)}</b></div><div><span>Credits</span><b>${U.fmtK(n.credits)}</b></div>
        <div><span>Cities</span><b>${cnt('city')}</b></div><div><span>Factories</span><b>${cnt('factory')}</b></div>
        <div><span>Forts</span><b>${cnt('fort')}</b></div><div><span>Silos</span><b>${cnt('silo')}</b></div>
        <div><span>Defences</span><b>${cnt('sam') + cnt('abm') + cnt('laser') + cnt('aegis')}</b></div><div><span>Radar</span><b>${cnt('radar')}</b></div>
        ${rel != null ? `<div><span>Attitude</span><b>${relTxt}</b></div>` : ''}${odds != null ? `<div><span>Alliance odds</span><b>${odds}%</b></div>` : ''}
      </div>
      <div class="ni-list"><span>Arsenal</span>${research.length ? research.join(' · ') : '<i class="dim">none known</i>'}</div>
      <div class="ni-list"><span>Allies</span>${allies.length ? allies.map((a) => MP.Flags.img(a.flag, 'flag sm') + ' ' + U.esc(a.name)).join(', ') : '<i class="dim">none</i>'}</div>
      <div class="ni-list"><span>At war with</span>${wars.length ? wars.slice(0, 8).map((a) => U.esc(a.name)).join(', ') : '<i class="dim">nobody</i>'}</div>`);
  };

  // ---------------- offers / council / directives ----------------
  HUD.renderOffers = function () {
    const S = G.S, box = els['h-offers'];
    if (!S) { box.innerHTML = ''; return; }
    box.innerHTML = '';
    for (const of of S.offers.slice(-3)) {
      const n = S.nations[of.from];
      if (!n) continue;
      const el = h('div', { class: 'offer panel brk' },
        h('div', { class: 'of-l' }, h('img', { src: MP.Icons.url(of.kind === 'ally' ? 'flag' : 'shield', '#3ee6ff', 32), class: 'ico' }),
          h('div', null, h('div', { class: 'of-n', html: MP.Flags.img(n.flag, 'flag sm') + ' ' + U.esc(n.name) }), h('div', { class: 'of-k' }, of.kind === 'ally' ? 'OFFERS AN ALLIANCE' : 'OFFERS A TRUCE'),
            h('div', { class: 'of-bar' }, h('i', { 'data-offer': '1' })))),
        h('button', { class: 'btn accept', onclick: () => MP.Diplo.answerOffer(of, true) }, '✔ ACCEPT'),
        h('button', { class: 'btn decline', onclick: () => MP.Diplo.answerOffer(of, false) }, '✕ DECLINE'),
        h('button', { class: 'btn sm info', title: 'Dossier', onclick: () => HUD.showNationInfo(n.id) }, 'i'));
      el._offer = of;
      box.appendChild(el);
    }
  };

  HUD.openCouncil = function (res) {
    const el = els['h-council'];
    el.style.display = '';
    el.innerHTML = `<div class="ph"><span class="t">GLOBAL COUNCIL · SESSION</span><span id="cc-t"></span></div>
      <h3>${U.esc(res.name)}</h3><p>${U.esc(res.desc)}</p>${res.targetName ? `<p class="dim">Subject: <b>${U.esc(res.targetName)}</b></p>` : ''}
      <div class="cc-bar"><i id="cc-bar"></i></div>
      <div class="cc-votes">${G.player() && G.player().alive && G.S.opts.mode !== 'watch' ? `<button class="btn yes" data-v="yes">AYE</button><button class="btn no" data-v="no">NAY</button><button class="btn" data-v="abstain">ABSTAIN</button>` : '<span class="dim">OBSERVING</span>'}</div>`;
    el.onclick = (e) => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      MP.Diplo.playerVote(b.dataset.v);
      el.querySelectorAll('button[data-v]').forEach((x) => x.classList.toggle('on', x === b));
    };
    el._res = res;
  };
  HUD.closeCouncil = function (res, passed) {
    const el = els['h-council'];
    el.innerHTML = `<div class="ph"><span class="t">GLOBAL COUNCIL · RESULT</span></div><h3>${U.esc(res.name)}</h3>
      <div class="cc-result ${passed ? 'pass' : 'fail'}">${passed ? 'PASSED' : 'FAILED'} <b>${res.yes}</b> – <b>${res.no}</b></div>`;
    el._res = null;
    setTimeout(() => { if (!el._res) el.style.display = 'none'; }, 5000);
  };

  HUD.offerDirective = function () {
    const S = G.S;
    const taken = new Set(G.player().directives);
    const pool = C.DIRECTIVES.filter((d) => !taken.has(d.id));
    const pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice(S.rng.int(pool.length), 1)[0]);
    HUD.modal(`<div class="mh"><span class="tag">FIELD DIRECTIVE</span><h2>Choose a directive</h2><p class="dim">Your reach has grown. Commit to one standing order for the rest of the war.</p></div>
      <div class="cards">${pick.map((d) => `<button class="card" data-id="${d.id}"><b>${d.name}</b><span>${d.desc}</span></button>`).join('')}</div>`,
    (box, close) => {
      box.addEventListener('click', (e) => {
        const b = e.target.closest('.card'); if (!b) return;
        const p = G.player();
        p.directives.push(b.dataset.id); p.mods = G.computeMods(p);
        MP.Game.wire('ADVISOR', `DIRECTIVE ADOPTED · ${C.DIRECTIVES.find((d) => d.id === b.dataset.id).name.toUpperCase()}`, 'advisor');
        MP.SFX.play('researchDone');
        close();
      });
    }, { noClose: true });
  };

  // ---------------- generic modal / confirm / toast / tooltip ----------------
  HUD.modal = function (html, setup, opts) {
    const wrap = h('div', { class: 'modal-wrap' });
    const box = h('div', { class: 'modal panel brk', html: html + (opts && opts.noClose ? '' : '<button class="btn icon mclose">✕</button>') });
    wrap.appendChild(box);
    document.getElementById('modal-root').appendChild(wrap);
    MP.SFX.play('open');
    const close = () => { wrap.remove(); MP.SFX.play('close'); };
    const x = box.querySelector('.mclose');
    if (x) x.addEventListener('click', close);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && !(opts && opts.noClose)) close(); });
    if (setup) setup(box, close);
    return { box, close };
  };
  HUD.confirm = function (title, text, yes) {
    HUD.modal(`<div class="mh"><span class="tag">CONFIRM</span><h2>${U.esc(title)}</h2><p class="dim">${U.esc(text)}</p></div><div class="row-btns"><button class="btn danger" data-y>CONFIRM</button><button class="btn" data-n>CANCEL</button></div>`,
      (box, close) => { box.querySelector('[data-y]').onclick = () => { close(); yes(); }; box.querySelector('[data-n]').onclick = close; });
  };
  HUD.toast = function (text, kind) {
    const box = els['h-toasts'];
    if (!box) return;
    const el = h('div', { class: 'toast ' + (kind || '') }, text);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2400);
    setTimeout(() => el.remove(), 3000);
  };
  HUD.showTip = function (anchor, html) {
    const tip = els['h-tip'];
    tip.innerHTML = html; tip.style.display = '';
    const r = anchor.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - 290, r.left - 290)) + 'px';
    tip.style.top = Math.max(8, r.top - 10) + 'px';
  };
  HUD.hideTip = function () { els['h-tip'].style.display = 'none'; };
  HUD.savedIndicator = function (ok) { HUD.toast(ok ? 'Match saved' : 'Save failed — storage blocked', ok ? 'good' : 'bad'); };
  HUD.flashDefcon = function () { els['h-defcon'].classList.remove('flash'); void els['h-defcon'].offsetWidth; els['h-defcon'].classList.add('flash'); };

  // ---------------- wire ----------------
  const TAG_ICON = { FLASH: 'emp', CABLE: 'flag', RADAR: 'radar', IMINT: 'shield', OSINT: 'flag', ADVISOR: 'radar', COUNCIL: 'capital' };
  HUD.pushWire = function (item) {
    const box = els['h-wire'];
    if (!box) return;
    const el = h('div', { class: 'wi ' + item.cls },
      h('img', { class: 'ico', src: MP.Icons.url(TAG_ICON[item.tag] || 'flag', '#8d8670', 32) }),
      h('span', { class: 'wt' }, U.fmtTime(MP.Game.elapsed ? Math.max(0, item.t - (G.S.playStart || 0)) : item.t)),
      h('span', { class: 'wtag tag-' + item.tag.toLowerCase() }, item.tag === 'ADVISOR' ? 'VESPER' : item.tag),
      h('span', { class: 'wx' }, item.text));
    box.appendChild(el);
    while (box.children.length > 7) box.firstChild.remove();
  };

  // ---------------- per-frame / periodic refresh ----------------
  HUD.startMatch = function () {
    document.body.classList.add('in-match');
    root.style.display = '';
    els['h-wire'].innerHTML = '';
    els['h-offers'].innerHTML = '';
    els['h-council'].style.display = 'none';
    HUD.mode = null; HUD.banner(null);
    HUD.ratio = MP.settings.get('ratio', 0.25);
    HUD.syncRatio(); HUD.syncSpeed(); HUD.syncLaunchAll();
    const watch = G.S.opts.mode === 'watch';
    document.body.classList.toggle('watch', watch);
    MP.bus.off('advisor:line', HUD._onLine);
    HUD._onLine = (d) => { if (d && d.text && d.priority >= 1) HUD.pushWire({ t: G.S ? G.S.t : 0, tag: 'ADVISOR', text: d.text.toUpperCase(), cls: 'advisor' }); };
    MP.bus.on('advisor:line', HUD._onLine);
  };
  HUD.stopMatch = function () {
    document.body.classList.remove('in-match', 'watch');
    root.style.display = 'none';
    document.getElementById('modal-root').innerHTML = '';
  };
  HUD.syncSpeed = function () {
    els['h-speed'].querySelectorAll('button').forEach((b) => {
      const sp = Number(b.dataset.sp);
      b.classList.toggle('on', sp === 0 ? MP.Game.paused : (!MP.Game.paused && MP.Game.speed === sp));
    });
    els['h-pause'].style.display = MP.Game.paused && MP.Game.running ? '' : 'none';
  };

  HUD.syncSlots = function () {
    const p = G.player();
    if (!p) return;
    for (const type of C.BUILD_ORDER.concat(C.DEFENSE_ORDER)) {
      const c = G.structCost(p, type);
      const el = document.getElementById('cost-' + type);
      if (!el) continue;
      el.textContent = U.fmtK(c.credits) + (c.u ? '·' + c.u + 'U' : '');
      const slot = el.parentElement;
      const afford = p.credits >= c.credits && p.uranium >= c.u;
      slot.classList.toggle('poor', !afford);
      slot.classList.toggle('on', !!(HUD.mode && HUD.mode.kind === 'build' && HUD.mode.type === type));
    }
    for (const w of C.WEAPON_ORDER) {
      const slot = root.querySelector(`.wslot[data-w="${w}"]`);
      const def = C.WEAPON[w];
      const unlocked = G.S.defcon <= def.defcon && G.S.opts.nukes !== false;
      const res = !!p.research[w];
      const resing = p.researching && p.researching.w === w;
      slot.classList.toggle('locked', !res);
      slot.classList.toggle('sealed', !unlocked);
      slot.classList.toggle('on', !!(HUD.mode && HUD.mode.kind === 'weapon' && HUD.mode.w === w));
      const cEl = document.getElementById('wc-' + w);
      const prog = document.getElementById('wp-' + w);
      if (res) {
        const lc = MP.Weapons.launchCost(p, w);
        cEl.textContent = U.fmtK(lc.credits) + (lc.u ? '·' + lc.u + 'U' : '');
        slot.classList.toggle('poor', p.credits < lc.credits || p.uranium < lc.u);
        prog.style.width = '0';
      } else if (resing) {
        cEl.textContent = Math.ceil(p.researching.total - p.researching.t) + 's';
        prog.style.width = (100 * p.researching.t / p.researching.total) + '%';
      } else {
        const rc = MP.Weapons.researchCost(p, w);
        cEl.textContent = unlocked ? (rc.u ? rc.u + 'U' : U.fmtK(rc.credits)) : 'D' + def.defcon;
        slot.classList.toggle('poor', p.credits < rc.credits || p.uranium < rc.u);
        prog.style.width = '0';
      }
    }
    const ready = p.st.silo.reduce((a, s) => a + (G.isActive(s) ? s.ready : 0), 0);
    document.getElementById('h-silos').textContent = `${p.st.silo.length} SILO${p.st.silo.length === 1 ? '' : 'S'} · ${ready} READY`;
  };

  function clockFace(sec) {
    // small analog face: minute hand toward 12 as clock drops
    const frac = U.clamp(sec / (12 * 60), 0, 1);
    const ang = -frac * Math.PI * 2 * (12 / 60) * 5; // 12 min → 60° from top
    const x = 8 + Math.sin(ang) * 5.5, y = 8 - Math.cos(ang) * 5.5;
    const col = sec < 120 ? '#ff4433' : sec < 300 ? '#ffb000' : '#ece6cf';
    return `<svg class="ico" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="none" stroke="${col}" stroke-width="1.3"/><line x1="8" y1="8" x2="8" y2="2.6" stroke="${col}" stroke-width="1.3"/><line x1="8" y1="8" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#ffd21f" stroke-width="1.1"/></svg>`;
  }

  HUD.frame = function (dt) {
    if (!MP.Game.running || !G.S) return;
    refreshT -= dt;
    // offer timers (smooth)
    const S = G.S;
    els['h-offers'].querySelectorAll('.offer').forEach((el) => {
      const of = el._offer; if (!of) return;
      const bar = el.querySelector('i[data-offer]');
      if (bar) bar.style.width = (100 * Math.max(0, of.until - S.t) / of.total) + '%';
    });
    if (S.council.active) { const b = document.getElementById('cc-bar'); if (b) b.style.width = (100 * Math.max(0, S.council.active.closes - S.t) / S.council.active.total) + '%'; const t = document.getElementById('cc-t'); if (t) t.textContent = U.fmtTime(S.council.active.closes - S.t); }
    if (refreshT > 0) return;
    refreshT = 0.15;
    HUD.refresh();
  };

  HUD.refresh = function () {
    const S = G.S, p = G.player(), Game = MP.Game;
    // status
    const d = S.defcon;
    els['h-defcon'].textContent = 'DEFCON ' + d;
    els['h-defcon'].className = 'defcon d' + d;
    const months = Math.floor(S.t / C.MONTH_SECONDS);
    els['h-date'].textContent = U.MONTHS[months % 12] + ' ' + (C.START_YEAR + Math.floor(months / 12));
    els['h-match'].textContent = S.phase === 'spawn' ? U.fmtTime(S.matchSeconds) : U.fmtTime(Game.matchLeft());
    const alive = G.alive().length;
    els['h-alive'].textContent = alive;
    els['h-clock'].textContent = U.fmtTime(S.clock);
    els['h-clock'].className = S.clock < 120 ? 'red' : S.clock < 300 ? 'amber' : '';
    els['h-clockface'].innerHTML = clockFace(S.clock);
    if (S.phase === 'spawn') { els['h-peace'].textContent = U.fmtTime(S.spawnLeft); els['h-peace-wrap'].title = 'Choose your spawn'; }
    else if (S.defcon === 5 && S.opts.nukes !== false) { els['h-peace'].textContent = U.fmtTime(Game.peaceLeft()); els['h-peace-wrap'].title = 'Peace timer — weapons unlock at DEFCON 4'; }
    else if (S.opts.council) { els['h-peace'].textContent = S.council.active ? 'VOTE' : U.fmtTime(S.council.next); els['h-peace-wrap'].title = 'Next Global Council session'; els['h-peace-ico'].src = MP.Icons.url('capital', '#ffd21f', 32); }
    else els['h-peace'].textContent = '—';
    // spawn banner
    if (S.phase === 'spawn' && p && !HUD.mode) HUD.banner(`<b>CHOOSE YOUR GROUND</b> · click land to place your nation · ${Math.ceil(S.spawnLeft)}s`);
    else if (S.phase === 'play' && !HUD.mode && els['h-banner'].style.display !== 'none' && els['h-banner-t'].textContent.startsWith('CHOOSE')) HUD.banner(null);
    // land
    const pct = p ? 100 * p.tiles / S.landTotal : 0;
    els['h-landbar'].style.width = U.clamp(pct / S.winPct * 100, 0, 100) + '%';
    els['h-landpct'].textContent = U.fmtPct(pct);
    root.querySelector('.ms.m10').style.left = (10 / S.winPct * 100) + '%';
    root.querySelector('.ms.m25').style.left = (25 / S.winPct * 100) + '%';
    // readout
    const H = MP.Render.hover;
    if (H.t >= 0) {
      const [lon, lat] = World.toLonLat(H.x + 0.5, H.y + 0.5);
      els['h-coord'].textContent = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
      if (World.land[H.t]) {
        els['h-terrain'].textContent = World.terrainName(H.t);
        const dif = World.difficulty(H.t);
        els['h-pips'].innerHTML = [0, 1, 2].map((i) => `<i class="${i < dif ? 'on' : ''}"></i>`).join('');
      } else { els['h-terrain'].textContent = World.ocean[H.t] ? 'SEA' : 'LAKE'; els['h-pips'].innerHTML = ''; }
      const o = S.owner[H.t];
      if (o) {
        const n = S.nations[o];
        const soft = G.isSoft(H.t) || MP.Weapons.inFallout(H.x, H.y);
        const atWar = p && n.wars.has(p.id);
        const allies = Array.from(n.allies).map((a) => S.nations[a]).filter((x) => x && x.alive).slice(0, 6);
        els['h-ro-nation'].innerHTML = `${MP.Flags.img(n.flag, 'flag sm')} <b style="color:${U.rgb(U.mix(n.color, [255, 255, 255], 0.35))}">${U.esc(n.name)}</b>` +
          (atWar ? ' <span class="red">⊕</span>' : '') + ` <span class="dim">≈${U.fmtK(n.troops)}</span> <span class="dim">▣ ${U.fmtK(n.tiles)}</span> ` +
          (soft ? '<span class="soft">SOFT ×1</span>' : `<span class="dug">DUG IN ×${C.DUG_IN_MULT}</span>`) +
          (allies.length ? `<div class="ro-allies">${allies.map((a) => MP.Flags.img(a.flag, 'flag xs')).join('')}</div>` : '');
      } else els['h-ro-nation'].innerHTML = World.land[H.t] ? '<span class="dim">UNCLAIMED LAND</span>' : '';
    }
    // leaderboard
    const al = G.alive().sort((a, b) => b.tiles - a.tiles);
    let rows = '';
    const top = al.slice(0, 8);
    const pRank = p ? al.indexOf(p) : -1;
    const row = (n, i) => `<div class="lbr ${n === p ? 'me' : ''} ${n.partner ? 'partner' : ''}"><span>${n === p ? '›' : ''} ${i + 1}</span><span class="nm">${MP.Flags.img(n.flag, 'flag xs')} ${U.esc(n.name)}${n.isPlayer || n.partner ? ' <i>L' + (MP.Menu ? MP.Menu.level() : 1) + '</i>' : ''}</span><span>${U.fmtPct(100 * n.tiles / S.landTotal)}</span><span>${U.fmtK(n.troops)}</span></div>`;
    top.forEach((n, i) => { rows += row(n, i); });
    if (pRank >= 8) rows += row(p, pRank);
    els['h-lb-rows'].innerHTML = rows;
    // attacks
    if (p) {
      const mine = S.attacks.filter((a) => a.from === p.id && !a.done);
      els['h-att-count'].textContent = mine.length + ' OUT';
      els['h-att-rows'].innerHTML = mine.map((a) => {
        const tn = a.to ? S.nations[a.to] : null;
        return `<div class="atr"><span class="nm">${tn ? MP.Flags.img(tn.flag, 'flag xs') + ' ' + U.esc(tn.name) : '<img class="ico" src="' + MP.Icons.url('flag', '#8d8670', 32) + '"> UNCLAIMED LAND'}</span><span class="tr">${U.fmtK(a.troops)}</span><button class="btn sm" data-recall="${a.id}">RECALL</button></div>`;
      }).join('') + S.ships.filter((s) => s.owner === p.id && s.kind === 'transport').map((s) => `<div class="atr"><span class="nm">⛴ TRANSPORT → ${s.target ? U.esc(S.nations[s.target].name) : 'COAST'}</span><span class="tr">${U.fmtK(s.troops)}</span><span></span></div>`).join('');
      els['h-att-rows'].onclick = (e) => {
        const b = e.target.closest('[data-recall]'); if (!b) return;
        const at = S.attacks.find((a) => a.id === Number(b.dataset.recall));
        if (at) { MP.War.recall(at); MP.Game.notify('attack.recalled', {}); }
      };
      document.getElementById('h-attacks').style.display = mine.length || S.ships.some((s) => s.owner === p.id && s.kind === 'transport') ? '' : 'none';
    } else document.getElementById('h-attacks').style.display = 'none';
    // council effects
    const ef = S.council.effects;
    const efEl = els['h-effects'];
    if (ef.length) { efEl.style.display = ''; efEl.innerHTML = '<div class="ph"><span class="t">COUNCIL MANDATES</span></div>' + ef.map((e) => `<div class="efr"><span>${U.esc(e.name)}${e.target ? ' · ' + U.esc(S.nations[e.target].name) : ''}</span><span>${U.fmtTime(e.until - S.t)}</span></div>`).join(''); }
    else efEl.style.display = 'none';
    if (!p) return;
    // stats
    els['h-troops'].textContent = U.fmtK(p.troops);
    els['h-cap'].textContent = U.fmtK(p.cap);
    els['h-grow'].textContent = (p.growth >= 0 ? '+' : '') + U.fmtK(p.growth) + '/s';
    els['h-grow'].className = p.growth >= 0 ? 'pos' : 'neg';
    els['h-troopbar'].style.width = U.clamp(100 * p.troops / p.cap, 0, 100) + '%';
    els['h-send'].textContent = U.fmtK(p.troops * HUD.ratio);
    els['h-credits'].textContent = U.fmtK(p.credits);
    els['h-income'].textContent = '+' + U.fmtK(p.incomeAvg) + '/s';
    els['h-tiles'].textContent = U.fmtInt(p.tiles);
    els['h-uranium'].textContent = U.fmtInt(p.uranium);
    els['h-uranium'].classList.toggle('capped', !!p.uCapped && p.uranium >= C.URANIUM_CAP_NO_DEPOSIT - 0.5);
    els['h-ubar'].style.width = (p.uCapped ? U.clamp(100 * p.uranium / C.URANIUM_CAP_NO_DEPOSIT, 0, 100) : 100) + '%';
    els['h-ubar'].parentElement.title = p.uCapped ? 'No enrichment plant: uranium capped at 200' : `+${(p.uRate || 0).toFixed(1)} U/s`;
    HUD.syncSlots();
  };

  // ---------------- end screen ----------------
  HUD.showEnd = function (kind, win, result) {
    const S = G.S, p = G.player();
    const E = MP.Game.ENDINGS[kind];
    const al = G.alive().sort((a, b) => b.tiles - a.tiles);
    const st = S.stats;
    const winner = S.nations[S.winner];
    const html = `<div class="end ${win ? 'win' : 'lose'} ${kind}">
      <div class="end-top"><canvas class="end-portrait" width="160" height="160"></canvas>
        <div><span class="tag">${win ? 'MISSION COMPLETE' : kind === 'winter' ? 'NO WINNERS' : 'MISSION FAILED'} · ENDING ${Object.keys(MP.Game.ENDINGS).indexOf(kind) + 1}</span>
        <h1>${E.title}</h1><p>${E.desc}</p>${winner && kind !== 'winter' ? `<p class="dim">Largest nation: ${MP.Flags.img(winner.flag, 'flag xs')} ${U.esc(winner.name)}</p>` : ''}</div></div>
      <div class="end-grid">
        <div><span>Peak land</span><b>${U.fmtPct(st.peakPct)}</b></div><div><span>Final rank</span><b>${p && p.alive ? '#' + (al.indexOf(p) + 1) : '—'}</b></div>
        <div><span>Capitals taken</span><b>${st.capitals}</b></div><div><span>Nations ended</span><b>${st.eliminated}</b></div>
        <div><span>Strikes launched</span><b>${st.launched}</b></div><div><span>Intercepts</span><b>${st.intercepted}</b></div>
        <div><span>Ships sunk</span><b>${st.sunk}</b></div><div><span>Prizes seized</span><b>${st.prizes}</b></div>
        <div><span>Alliances</span><b>${st.alliances}</b></div><div><span>Clock at end</span><b>${U.fmtTime(S.clock)}</b></div>
      </div>
      ${result ? `<div class="end-xp"><span>+${result.xp} XP · +${result.scrap} SCRAP</span><div class="bar"><i style="width:${result.levelPct}%"></i></div><span>LEVEL ${result.level}${result.leveled ? ' · LEVEL UP' : ''}</span>${result.newEnding ? '<div class="newend">NEW ENDING DISCOVERED</div>' : ''}${result.commends.length ? '<div class="newend">COMMENDATION: ' + result.commends.map(U.esc).join(', ') + '</div>' : ''}</div>` : ''}
      <div class="row-btns"><button class="btn primary" data-menu>MAIN MENU</button>${kind === 'eliminated' ? '<button class="btn" data-watch>KEEP WATCHING</button>' : ''}<button class="btn" data-again>PLAY AGAIN</button></div></div>`;
    const m = HUD.modal(html, (box, close) => {
      const cv = box.querySelector('.end-portrait');
      if (cv && MP.Advisor && MP.Advisor.drawPortrait) {
        const ctx = cv.getContext('2d');
        let t = 0; const iv = setInterval(() => { if (!cv.isConnected) { clearInterval(iv); return; } t++; ctx.clearRect(0, 0, 160, 160); try { MP.Advisor.drawPortrait(ctx, 0, 0, 160, { talking: t < 40 && t % 4 < 2, alert: !win }); } catch (e) { clearInterval(iv); } }, 100);
      }
      box.querySelector('[data-menu]').onclick = () => { close(); MP.Game.quitToMenu(); };
      box.querySelector('[data-again]').onclick = () => { close(); MP.Game.quitToMenu(); MP.Menu.startMatch(MP.Menu.lastOpts); };
      const w = box.querySelector('[data-watch]');
      if (w) w.onclick = () => { close(); G.S.phase = 'play'; G.S.opts.mode = 'watch'; document.body.classList.add('watch'); MP.Game.running = true; };
    }, { noClose: true });
    return m;
  };
})();
