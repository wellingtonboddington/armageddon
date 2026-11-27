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
        <button class="btn sm" id="h-fs" title="Toggle fullscreen">⛶</button>
      </div>
    </div>

    <div class="hud-tr">
      <div class="panel lb brk" id="h-lb"><div class="lb-head"><span>#</span><span>NATION</span><span><img class="ico" src="${MP.Icons.url('flag', '#8d8670', 32)}"></span><span><img class="ico" src="${MP.Icons.url('troops', '#8d8670', 32)}"></span></div><div id="h-lb-rows"></div></div>
      <div class="panel target-chip brk" id="h-target" style="display:none"></div>
      <div class="panel attacks brk" id="h-attacks"><div class="ph"><span class="t">⊕ ATTACKS</span><span id="h-att-count">0 OUT</span></div><div id="h-att-rows"></div></div>
      <div class="panel effects brk" id="h-effects" style="display:none"></div>
    </div>

    <div class="hud-bl">
      <div id="h-divs" class="panel divs brk" style="display:none"></div>
      <div id="advisor-hud" class="panel brk"></div>
      <div class="panel wire brk"><div class="ph"><span class="t">WIRE // ALL SOURCES</span></div><div id="h-wire"></div></div>
    </div>

    <div class="hud-bc">
      <div id="h-front" class="front-panel"></div>
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
      <div class="capalert" id="h-capalert" style="display:none"></div>
      <div class="morale-chip" id="h-morale-wrap" style="display:none" title="Morale: a missile on your capital shakes the nation. Low morale slows recruiting, makes your attacks cost more and your land easier to take. It recovers while the capital stands."><b id="h-morale">100%</b></div>
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
      'h-tiles', 'h-uranium', 'h-ubar', 'h-dock', 'h-banner', 'h-banner-t', 'h-toasts', 'h-radial', 'h-tip', 'h-council', 'h-pause', 'h-effects', 'h-speed', 'h-mini', 'h-front', 'h-divs', 'h-capalert', 'h-morale', 'h-morale-wrap'].forEach((id) => { els[id] = q(id); });
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
      btn.addEventListener('mouseenter', (e) => HUD.showTip(e.currentTarget, buildTip(type), 'up'));
      btn.addEventListener('mouseleave', () => HUD.hideTip());
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
      btn.addEventListener('mouseenter', (e) => HUD.showTip(e.currentTarget, buildTip(type)));
      btn.addEventListener('mouseleave', () => HUD.hideTip());
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
  const BUILD_DESC = {
    city: 'Raises your troop cap by 25k per level. Convoys stop here.',
    port: 'Coastal only. Sends trade ships to friendly ports and builds warships. Convoys stop here.',
    factory: 'Sends convoys to cities, ports and factories within ' + C.FACTORY_RANGE + ' tiles — income for both ends. Each level doubles convoys and gold.',
    hub: 'Links factories, cities and ports within ' + C.HUB_RANGE + ' tiles with white roads: convoys 25% faster and reach two stops.',
    enrich: 'Must sit on a free ☢ deposit. Removes the 200 uranium cap and adds +' + C.ENRICH_RATE + ' U/s per level.',
    fort: 'Within ' + C.FORT_RADIUS + ' tiles (doubling per level) attackers pay ×5 troops and advance ×3 slower. Fortress: range stays 50 but each level adds ×5 / ×3 (max ×15). Trench: range up to 100, each level adds up to ×7 / ×7.',
    warship: 'Built at your nearest port. Hunts warships and transports, seizes enemy trade ships. Click it, then the sea, to set a patrol.',
    silo: 'Launches researched missiles. One ready missile per level; reloads in ' + C.SILO_RELOAD + 's.',
  };
  function buildTip(type) {
    const p = G.player(); const c = p ? G.structCost(p, type) : { credits: C.BUILD[type].base, u: C.BUILD[type].u };
    const up = p && type === 'fort' && G.has(p, 'fortFlat') ? G.structCost(p, type, true) : null;
    return `<b>${C.BUILD[type].name}</b> <span class="dim">[${C.BUILD[type].key}]</span><br>${BUILD_DESC[type] || defDesc(type)}<br><span class="y">${U.fmtK(c.credits)} credits${c.u ? ' · ' + c.u + ' U' : ''}</span> <span class="dim">· place on your own to upgrade${up ? ' (always ' + U.fmtK(up.credits) + ')' : ''}</span>`;
  }
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
      // MIDDLE click (or Alt+click on trackpads) opens the orders radial; right-click only cancels / sets patrols
      if (e.button === 1 || (e.button === 0 && e.altKey)) { e.preventDefault(); HUD.onRadialClick(e); return; }
      if (e.button === 0) down = { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey };
      if (e.button === 2) { HUD.onRightClick(e); }
    });
    cv.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
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
    document.getElementById('h-fs').addEventListener('click', () => MP.toggleFullscreen());
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
    if (up === 'T') { HUD.toggleFront(); return; }
    if (up === 'R') { HUD.dispatchDiv('arm'); return; }
    if (up === 'F') { HUD.dispatchDiv('inf'); return; }
    for (const t of C.BUILD_ORDER.concat(C.DEFENSE_ORDER)) if (C.BUILD[t].key === up) { HUD.setBuildMode(t); return; }
    for (const w of C.WEAPON_ORDER) if (C.WEAPON[w].key === up) { HUD.weaponClick(w); return; }
    if (k === '+' || k === '=') { HUD.ratio = Math.min(1, HUD.ratio + 0.05); HUD.syncRatio(); }
    if (k === '-' || k === '_') { HUD.ratio = Math.max(0.05, HUD.ratio - 0.05); HUD.syncRatio(); }
    if (up === 'C' || k === 'Home') { const p = G.player(); if (p && p.capital >= 0) MP.Render.centerOn(p.capX, p.capY, Math.max(4, MP.Render.cam.z)); }
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
    if (S.phase === 'spawn') { MP.Game.playerSpawn(H.t, e.shiftKey); return; }
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
    if (mode && mode.kind === 'div') {
      HUD.dispatchDiv(mode.type);
      if (!e.shiftKey) HUD.clearMode();
      return;
    }
    // divisions: click one to select it, then click the front to send it there
    if (p.divs && p.divs.length) {
      const hit = HUD.divAt(p, H.sx, H.sy);
      const selD = p.divs.find((d) => d.sel);
      if (hit) {
        // clicking a stack cycles through the divisions in it
        const stack = p.divs.filter((d) => d._sx === hit._sx && d._sy === hit._sy);
        const cur = stack.findIndex((d) => d.sel);
        for (const d of p.divs) d.sel = false;
        const nxt = stack[(cur + 1) % stack.length];
        if (cur === stack.length - 1 && stack.length === 1) { MP.SFX.play('close'); return; }
        nxt.sel = true; MP.SFX.play('click');
        HUD.toast(`${nxt.type === 'arm' ? 'Armoured' : 'Infantry'} division · ${nxt.gear} · ${U.fmtInt(nxt.size)}${nxt.trainedFull ? ' · trained' : ''} — click the front to send it there · right-click sends it home`, 'info');
        return;
      }
      if (selD && MP.Div.nearOwn(p.id, Math.floor(H.wx), Math.floor(H.wy), 45) >= 0) {
        selD.mode = 'garrison'; selD.sel = false;
        const r = MP.Div.dispatch(p, selD.type, H.wx, H.wy);
        MP.SFX.play(r.ok ? 'send' : 'error'); if (!r.ok) HUD.toast(r.reason, 'bad');
        return;
      }
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
    const H = MP.Render.hover;
    if (MP.War.bordersWith(p.id, o)) {
      // the click is the point of main effort: forces concentrate and break through toward it
      const at = MP.War.launch(p.id, o, troops, { fx: H.wx, fy: H.wy });
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
  HUD.clearMode = function () { HUD.mode = null; HUD.banner(null); HUD.syncSlots(); MP.SFX.play('close'); HUD.renderDivs && HUD.renderDivs(true); };
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
    const S = G.S;
    HUD.updateHover(e.clientX, e.clientY);
    const H = MP.Render.hover;
    if (!S || H.t < 0) return;
    if (HUD.mode) { HUD.clearMode(); return; }
    if (MP.Render.selectedShip && !World.land[H.t]) { MP.Naval.assignPatrol(MP.Render.selectedShip, H.wx, H.wy); MP.Render.selectedShip = null; HUD.toast('Patrol assigned', 'info'); return; }
    if (MP.Render.selectedShip) { MP.Render.selectedShip = null; return; }
    const p = G.player();
    if (p && p.divs && S.opts.mode !== 'watch') {
      const hit = HUD.divAt(p, H.sx, H.sy);
      if (hit) {
        const stack = p.divs.filter((d) => d._sx === hit._sx && d._sy === hit._sy && d.mode !== 'garrison').sort((a, b) => (b.holdAt || 0) - (a.holdAt || 0));
        const go = e.shiftKey ? stack : stack.slice(0, 1);
        for (const d of go) MP.Div.sendHome(d);
        MP.SFX.play('close');
        HUD.toast(go.length > 1 ? `${go.length} divisions return to reserve` : `${go[0].type === 'arm' ? 'Armoured' : 'Infantry'} division returns to reserve`, 'info');
        HUD.renderDivs(true);
        return;
      }
    }
    if (!HUD._rcHint) { HUD._rcHint = true; HUD.toast('Orders menu: middle-click a nation (or Alt+click)', 'info'); }
  };
  HUD.onRadialClick = function (e) {
    const S = G.S;
    HUD.updateHover(e.clientX, e.clientY);
    const H = MP.Render.hover;
    if (!S || H.t < 0) return;
    if (HUD.mode) { HUD.clearMode(); return; }
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
    if (!self && !watch && allied) {
      const team = n.team && n.team === p.team;
      opts.push({ id: 'gift', label: 'Gift', icon: 'troops' });
      opts.push({ id: 'askTroops', label: 'Ask Troops', icon: 'troops' });
      opts.push({ id: 'askCredits', label: 'Ask Credits', icon: 'coin' });
      if (n.puppet) opts.push({ id: 'cede', label: 'Cede ' + Math.round(MP.Diplo.cedeOdds(p, n) * 100) + '%', icon: 'capital' });
      else opts.push({ id: 'ally', label: team ? (n.partner ? 'Party' : 'Team') : 'Break', icon: 'flag', dis: team });
      opts.push({ id: 'embargo', label: p.embargo.has(o) ? 'Lift' : 'Embargo', icon: 'coin' });
    } else if (!self && !watch) {
      const hasFriends = G.alive().some((x) => x.id !== p.id && x.ai && G.isAllied(x.id, p.id));
      opts.push({ id: 'attack', label: 'Attack', icon: 'jet' });
      opts.push({ id: 'boat', label: 'Boat', icon: 'warship' });
      opts.push({ id: 'ally', label: 'Ally', icon: 'flag' });
      opts.push({ id: 'truce', label: 'Truce', icon: 'shield', dis: G.hasTruce(p.id, o) });
      opts.push({ id: 'target', label: p.targetId === o ? 'Untarget' : 'Target', icon: 'nuke', dis: !hasFriends });
      opts.push({ id: 'front', label: p.divPlan && p.divPlan.enemy === o ? 'Stand down' : 'Front (T)', icon: 'tank', dis: !MP.War.bordersWith(p.id, o) });
      opts.push({ id: 'embargo', label: p.embargo.has(o) ? 'Lift' : 'Embargo', icon: 'coin' });
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
      case 'askTroops': MP.Diplo.requestAid(p, n, 'troops'); break;
      case 'askCredits': MP.Diplo.requestAid(p, n, 'credits'); break;
      case 'target': MP.Diplo.setTarget(p, n); HUD.refresh(); break;
      case 'front': HUD.toggleFront(o); break;
      case 'cede': HUD.confirm(`Demand that ${n.name} cede?`, `${Math.round(MP.Diplo.cedeOdds(p, n) * 100)}% chance it signs everything over to you. If it refuses, it declares independence, goes to war with you and courts your enemies. Each gift you send it adds 5%.`, () => MP.Diplo.requestCede(p, n)); break;
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

  // ---------------- divisions: R armour · F infantry · T whole army ----------------
  HUD.divAt = function (p, sx, sy) {
    let hit = null, hd = 24 * 24;
    for (const d of p.divs) { if (d._hx == null) continue; const dd = (d._hx - sx) ** 2 + (d._hy - sy) ** 2; if (dd < hd) { hd = dd; hit = d; } }
    return hit;
  };
  HUD.dispatchDiv = function (type) {
    const S = G.S, p = G.player();
    if (!S || !p || !p.alive || S.phase !== 'play') return;
    const H = MP.Render.hover;
    if (H.t < 0) return;
    const r = MP.Div.dispatch(p, type, H.wx, H.wy);
    if (!r.ok) { MP.SFX.play('error'); HUD.toast(r.reason, 'bad'); return; }
    MP.SFX.play(type === 'arm' ? 'attack' : 'send');
    const d = r.div, o = d.front ? S.nations[d.front] : null;
    HUD.toast(`${type === 'arm' ? 'Armoured' : 'Infantry'} division → ${o ? 'the ' + o.name + ' front' : 'this spot'}${r.stack > 1 ? ` · STACK ${r.stack}/${C.DIV.stackMax}` : ' · press again here to stack'}`, 'good');
    MP.FX && MP.FX.ping(d.ax, d.ay, type === 'arm' ? [255, 176, 0] : [236, 230, 207]);
    HUD.renderDivs(true);
  };

  // ---------------- divisions / front planning (T) ----------------
  HUD.toggleFront = function (forceEnemy) {
    const S = G.S, p = G.player();
    if (!S || !p || !p.alive || S.phase !== 'play') return;
    const H = MP.Render.hover;
    const o = forceEnemy || (H.t >= 0 ? S.owner[H.t] : 0);
    if (p.divPlan && (!o || o === p.id || o === p.divPlan.enemy)) {
      const e = S.nations[p.divPlan.enemy];
      MP.Div.recall(p); MP.SFX.play('close');
      HUD.toast(`Divisions stand down from the ${e ? e.name : ''} front`, 'info');
      HUD.renderFront(true); return;
    }
    if (!o || o === p.id) { HUD.toast('Hover a neighbouring nation and press T to man that front', 'info'); return; }
    const r = MP.Div.togglePlan(p, o);
    const n = S.nations[o];
    if (r === 'busy') { HUD.toast(`Your divisions are on the ${S.nations[p.divPlan.enemy].name} front — RECALL them first`, 'bad'); MP.SFX.play('error'); }
    else if (r === 'nofront') { HUD.toast(G.isAllied(p.id, o) ? 'That nation is your ally' : 'You share no border with ' + n.name, 'bad'); MP.SFX.play('error'); }
    else if (r === 'on') {
      MP.SFX.play('attack');
      MP.Game.wire('IMINT', `YOUR DIVISIONS TAKE UP POSITIONS FACING ${n.name}${p.divPlan.prepared ? '' : ' · UNDER FIRE, NO TIME TO PREPARE'}`, p.divPlan.prepared ? 'good' : 'bad');
      MP.Game.notify('front.plan', { nation: n.name, text: p.divPlan.prepared ? `Divisions on the ${n.name} line. If they come, we are ready for them.` : `Divisions moving up under fire. No time to dig in properly.`, priority: 1 });
    }
    HUD.renderFront(true);
  };
  let frontSig = '';
  // the T plan: a slim banner over the build bar (the DIVISIONS panel holds everything else)
  HUD.renderFront = function (force) {
    const S = G.S, p = G.player(), box = els['h-front'];
    HUD.renderDivs(force);
    if (!box) return;
    const plan = p && p.alive && S && S.phase === 'play' ? p.divPlan : null;
    const sig = plan ? plan.enemy + ':' + plan.prepared : '';
    if (!force && sig === frontSig) return;
    frontSig = sig;
    if (!plan) { box.innerHTML = ''; return; }
    const e = S.nations[plan.enemy];
    box.innerHTML = `<div class="fp-mini"><img class="ico" src="${MP.Icons.url('tank', '#ffd21f', 32)}"> WHOLE ARMY ON THE ${MP.Flags.img(e.flag, 'flag xs')} <b>${U.esc(e.name)}</b> FRONT ·
      ${plan.prepared ? '<span class="g">PREPARED +' + (G.has(p, 'ironLine') ? 25 : 15) + '%</span>' : '<span class="amber">UNDER FIRE</span>'} · <span class="dim">T AGAIN TO STAND DOWN</span> <button class="btn sm danger" data-fa="recall">RECALL</button></div>`;
    box.onclick = (ev) => { if (ev.target.closest('[data-fa="recall"]')) HUD.toggleFront(plan.enemy); };
  };

  // the DIVISIONS panel: always on screen during a match — what you have, what it costs, how to use it
  let divSig = '';
  HUD.renderDivs = function (force) {
    const S = G.S, p = G.player(), box = els['h-divs'];
    if (!box) return;
    if (!S || !p || !p.alive || S.opts.mode === 'watch' || S.phase !== 'play') { if (box.style.display !== 'none') box.style.display = 'none'; divSig = ''; return; }
    const divs = p.divs || [];
    const arm = divs.filter((d) => d.type === 'arm'), inf = divs.filter((d) => d.type === 'inf');
    const free = (l) => l.filter((d) => d.mode === 'garrison').length;
    const untrained = divs.filter((d) => !d.trainedFull && !d.training).length;
    const training = divs.filter((d) => d.training).length, trained = divs.filter((d) => d.trainedFull).length;
    const total = divs.reduce((a, d) => a + d.size, 0);
    const tc = MP.Div.trainCost(p) * untrained, uc = MP.Div.upgradeCost(p), rc = MP.Div.raiseCost(p);
    const maxed = (p.divLevel || 0) >= C.DIV.upgradeMax;
    const sig = [divs.length, arm.length, free(arm), free(inf), untrained, training, p.divLevel || 0, Math.round(total / 500), p.credits >= tc, p.credits >= uc, p.credits >= rc, HUD.mode && HUD.mode.kind === 'div' ? HUD.mode.type : ''].join('|');
    if (!force && sig === divSig) return;
    divSig = sig;
    box.style.display = '';
    const md = HUD.mode && HUD.mode.kind === 'div' ? HUD.mode.type : '';
    const row = (type, list, key, label, icon) => `<button class="dv-row ${md === type ? 'on' : ''}" data-dv="${type}" title="Hover your front line and press ${key}, or click here then click the front">
        <img class="ico" src="${MP.Icons.url(icon, type === 'arm' ? '#ffb000' : '#ece6cf', 32)}"><b>${label}</b><span class="n">${list.length}</span>
        <span class="dim">${free(list)} IN RESERVE</span><span class="key">${key}</span></button>`;
    box.innerHTML = `<div class="ph"><span class="t">⚑ DIVISIONS</span><span class="dim">LV ${p.divLevel || 0} · ${U.fmtK(total)} TROOPS${trained ? ' · ' + trained + ' TRAINED' : ''}</span></div>
      ${row('arm', arm, 'R', 'ARMOUR', 'tank')}${row('inf', inf, 'F', 'INFANTRY', 'troops')}
      <div class="dv-btns">
        <button class="btn sm" data-fa="train" ${untrained && p.credits >= tc ? '' : 'disabled'} title="Fully trained divisions count double. Only divisions that are not trained yet can be trained.">TRAIN ALL · ${untrained ? U.fmtK(tc) : training ? training + ' TRAINING' : 'DONE'}</button>
        <button class="btn sm" data-fa="upgrade" ${!maxed && p.credits >= uc ? '' : 'disabled'} title="Every division gets bigger and stronger">${maxed ? 'MAX LEVEL' : 'UPGRADE · ' + U.fmtK(uc)}</button>
        <button class="btn sm" data-fa="raise" ${p.credits >= rc ? '' : 'disabled'} title="Raise one more division">+1 DIVISION · ${U.fmtK(rc)}</button>
      </div>
      <div class="dv-help">Hover your front and press <b>R</b> (armour) or <b>F</b> (infantry): that division goes there and buffs the land around it, attacking and defending. Press again on the same spot to <b>stack</b> up to 3. <b>T</b> sends the whole army to a front. Right-click a flag sends it home.</div>`;
    box.onclick = (ev) => {
      const dv = ev.target.closest('[data-dv]');
      if (dv) {
        const type = dv.dataset.dv;
        if (HUD.mode && HUD.mode.kind === 'div' && HUD.mode.type === type) { HUD.clearMode(); HUD.renderDivs(true); return; }
        HUD.mode = { kind: 'div', type };
        HUD.banner(`<img class="ico" src="${MP.Icons.url(type === 'arm' ? 'tank' : 'troops', '#ffd21f', 32)}"> Click your front line to send ${type === 'arm' ? 'an armoured' : 'an infantry'} division there · shift-click to send several`);
        MP.SFX.play('open'); HUD.renderDivs(true); return;
      }
      const b = ev.target.closest('[data-fa]'); if (!b || b.disabled) return;
      const a = b.dataset.fa;
      let r = null;
      if (a === 'train') r = MP.Div.trainAll(p);
      if (a === 'upgrade') r = MP.Div.upgrade(p);
      if (a === 'raise') r = MP.Div.raise(p);
      if (r) { if (r.ok) { MP.SFX.play('upgrade'); HUD.toast(a === 'train' ? `Training ${r.count} divisions (${C.DIV.trainTime}s)` : a === 'upgrade' ? `Divisions upgraded to level ${p.divLevel}` : 'New division raised — it waits in reserve', 'good'); } else { MP.SFX.play('error'); HUD.toast(r.reason, 'bad'); } }
      HUD.renderDivs(true);
    };
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
  HUD.showTip = function (anchor, html, dir) {
    const tip = els['h-tip'];
    tip.innerHTML = html; tip.style.display = '';
    const r = anchor.getBoundingClientRect();
    if (dir === 'up') {
      tip.style.left = Math.max(8, Math.min(window.innerWidth - 290, r.left + r.width / 2 - 140)) + 'px';
      tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + 'px';
    } else {
      tip.style.left = Math.max(8, Math.min(window.innerWidth - 290, r.left - 290)) + 'px';
      tip.style.top = Math.max(8, r.top - 10) + 'px';
    }
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

  // DOM writes only when the value actually changed: no style/layout work for identical refreshes,
  // and buttons inside the panels aren't rebuilt under the cursor.
  function setT(el, v) { if (el && el._mpT !== v) { el._mpT = v; el._mpH = undefined; el.textContent = v; } }
  function setH(el, v) { if (el && el._mpH !== v) { el._mpH = v; el._mpT = undefined; el.innerHTML = v; } }
  HUD.setT = setT; HUD.setH = setH;

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
    const q = MP.Render.quality;
    refreshT = q === 'low' ? 0.3 : q === 'balanced' ? 0.2 : 0.15;
    HUD.refresh();
  };

  HUD.refresh = function () {
    const S = G.S, p = G.player(), Game = MP.Game;
    // status
    const d = S.defcon;
    setT(els['h-defcon'], 'DEFCON ' + d);
    els['h-defcon'].className = 'defcon d' + d;
    const months = Math.floor(S.t / C.MONTH_SECONDS);
    setT(els['h-date'], U.MONTHS[months % 12] + ' ' + (C.START_YEAR + Math.floor(months / 12)));
    setT(els['h-match'], S.phase === 'spawn' ? U.fmtTime(S.matchSeconds) : U.fmtTime(Game.matchLeft()));
    const alive = G.alive().length;
    setT(els['h-alive'], alive);
    setT(els['h-clock'], U.fmtTime(S.clock));
    els['h-clock'].className = S.clock < 120 ? 'red' : S.clock < 300 ? 'amber' : '';
    setH(els['h-clockface'], clockFace(S.clock));
    if (S.phase === 'spawn') { setT(els['h-peace'], U.fmtTime(S.spawnLeft)); els['h-peace-wrap'].title = 'Choose your spawn'; }
    else if (S.alienId && !S.alienLanded) { setT(els['h-peace'], 'LANDFALL ' + U.fmtTime(S.alienLeft != null ? S.alienLeft : S.alienGrace)); els['h-peace-wrap'].title = 'The Void Armada lands when this reaches zero'; els['h-peace-ico'].src = MP.Icons.url('orbit', '#7dff5a', 32); }
    else if (S.defcon === 5 && S.opts.nukes !== false) { setT(els['h-peace'], U.fmtTime(Game.peaceLeft())); els['h-peace-wrap'].title = 'Peace timer — weapons unlock at DEFCON 4'; }
    else if (S.opts.council) { setT(els['h-peace'], S.council.active ? 'VOTE' : U.fmtTime(S.council.next)); els['h-peace-wrap'].title = 'Next Global Council session'; els['h-peace-ico'].src = MP.Icons.url('capital', '#ffd21f', 32); }
    else setT(els['h-peace'], '—');
    // spawn banner
    const pupN = S.puppetId ? S.nations[S.puppetId] : null;
    if (S.phase === 'spawn' && p && !HUD.mode) {
      if (S.opts.map === 'preset') HUD.banner(p.spawned ? (pupN ? `<b>YOU LEAD ${U.esc(p.name)}</b> · click another country for your PUPPET-STATE · shift-click re-picks yours · ${Math.ceil(S.spawnLeft)}s` : `<b>YOU LEAD ${U.esc(p.name)}</b> · shift-click another country to switch · ${Math.ceil(S.spawnLeft)}s`) : `<b>TAKE COMMAND</b> · click any country to lead it · ${Math.ceil(S.spawnLeft)}s`);
      else if (pupN && p.spawned) HUD.banner(`<b>PLACE YOUR PUPPET-STATE</b> · click land for ${U.esc(pupN.name)}${pupN.spawned ? ' (click again to move it)' : ''} · shift-click moves your nation · ${Math.ceil(S.spawnLeft)}s`);
      else HUD.banner(`<b>CHOOSE YOUR GROUND</b> · click land to place your nation · ${Math.ceil(S.spawnLeft)}s`);
    }
    else if (S.phase === 'play' && !HUD.mode && els['h-banner'].style.display !== 'none' && els['h-banner-t'].textContent.startsWith('CHOOSE')) HUD.banner(null);
    // land
    const pct = p ? 100 * p.tiles / S.landTotal : 0;
    const bloc = (S.blocSize || 1) > 1 ? S.blocPct || 0 : pct;
    els['h-landbar'].style.width = U.clamp(bloc / S.winPct * 100, 0, 100) + '%';
    setT(els['h-landpct'], (S.blocSize || 1) > 1 ? U.fmtPct(pct) + ' · ⛓' + U.fmtPct(bloc) : U.fmtPct(pct));
    els['h-landpct'].title = (S.blocSize || 1) > 1 ? `You hold ${U.fmtPct(pct)}; your alliance holds ${U.fmtPct(bloc)}. An alliance must take the whole world; any other bloc reaching ${S.winPct}% ends the match.` : `First to ${S.winPct}% of the world wins.`;
    root.querySelector('.ms.m10').style.left = (10 / S.winPct * 100) + '%';
    root.querySelector('.ms.m25').style.left = (25 / S.winPct * 100) + '%';
    // readout
    const H = MP.Render.hover;
    if (H.t >= 0) {
      const [lon, lat] = World.toLonLat(H.x + 0.5, H.y + 0.5);
      setT(els['h-coord'], `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`);
      if (World.land[H.t]) {
        setT(els['h-terrain'], World.terrainName(H.t));
        const dif = World.difficulty(H.t);
        setH(els['h-pips'], [0, 1, 2].map((i) => `<i class="${i < dif ? 'on' : ''}"></i>`).join(''));
      } else { setT(els['h-terrain'], World.ocean[H.t] ? 'SEA' : 'LAKE'); setH(els['h-pips'], ''); }
      const o = S.owner[H.t];
      if (o) {
        const n = S.nations[o];
        const soft = G.isSoft(H.t) || MP.Weapons.inFallout(H.x, H.y);
        const atWar = p && n.wars.has(p.id);
        const allies = Array.from(n.allies).map((a) => S.nations[a]).filter((x) => x && x.alive).slice(0, 6);
        setH(els['h-ro-nation'], `${MP.Flags.img(n.flag, 'flag sm')} <b style="color:${U.rgb(U.mix(n.color, [255, 255, 255], 0.35))}">${U.esc(n.name)}</b>` +
          (atWar ? ' <span class="red">⊕</span>' : '') + ` <span class="dim">≈${U.fmtK(n.troops)}</span> <span class="dim">▣ ${U.fmtK(n.tiles)}</span> ` +
          (soft ? '<span class="soft">SOFT ×1</span>' : `<span class="dug">DUG IN ×${C.DUG_IN_MULT}</span>`) +
          (n.capRuin ? ' <span class="red">CAPITAL IN RUINS</span>' : '') + (n.morale != null && n.morale < 0.95 ? ` <span class="amber">MORALE ${Math.round(n.morale * 100)}%</span>` : '') +
          (allies.length ? `<div class="ro-allies">${allies.map((a) => MP.Flags.img(a.flag, 'flag xs')).join('')}</div>` : ''));
      } else setH(els['h-ro-nation'], World.land[H.t] ? '<span class="dim">UNCLAIMED LAND</span>' : '');
    }
    // leaderboard
    const al = G.alive().sort((a, b) => b.tiles - a.tiles);
    let rows = '';
    const top = al.slice(0, 8);
    const pRank = p ? al.indexOf(p) : -1;
    const row = (n, i) => `<div class="lbr ${n === p ? 'me' : ''} ${n.partner ? 'partner' : ''}"><span>${n === p ? '›' : ''} ${i + 1}</span><span class="nm">${MP.Flags.img(n.flag, 'flag xs')} ${U.esc(n.name)}${n.puppet ? ' <i>PUPPET</i>' : n.isPlayer || n.partner ? ' <i>L' + (MP.Menu ? MP.Menu.level() : 1) + '</i>' : ''}</span><span>${U.fmtPct(100 * n.tiles / S.landTotal)}</span><span>${U.fmtK(n.troops)}</span></div>`;
    top.forEach((n, i) => { rows += row(n, i); });
    if (pRank >= 8) rows += row(p, pRank);
    setH(els['h-lb-rows'], rows);
    // attacks
    if (p) {
      const mine = S.attacks.filter((a) => a.from === p.id && !a.done);
      let attHtml = mine.map((a) => {
        const tn = a.to ? S.nations[a.to] : null;
        return `<div class="atr"><span class="nm">${tn ? MP.Flags.img(tn.flag, 'flag xs') + ' ' + U.esc(tn.name) : '<img class="ico" src="' + MP.Icons.url('flag', '#8d8670', 32) + '"> UNCLAIMED LAND'}</span><span class="tr">${U.fmtK(a.troops)}</span><button class="btn sm" data-recall="${a.id}">RECALL</button></div>`;
      }).join('') + S.ships.filter((s) => s.owner === p.id && s.kind === 'transport').map((s) => `<div class="atr"><span class="nm">⛴ TRANSPORT → ${s.target ? U.esc(S.nations[s.target].name) : 'COAST'}</span><span class="tr">${U.fmtK(s.troops)}</span><span></span></div>`).join('');
      const incoming = S.attacks.filter((a) => a.to === p.id && !a.done);
      attHtml += incoming.map((a) => {
        const an = S.nations[a.from];
        return `<div class="atr in"><span class="nm">▼ ${MP.Flags.img(an.flag, 'flag xs')} ${U.esc(an.name)}</span><span class="tr">${U.fmtK(a.troops)}${a.def > 0 ? ' <i class="def">⛨' + U.fmtK(a.def) + '</i>' : ''}</span><button class="btn sm defend" data-defend="${a.id}" title="Commit ${Math.round(HUD.ratio * 100)}% of your troops to hold this front">DEFEND</button></div>`;
      }).join('');
      setH(els['h-att-rows'], attHtml);
      setT(els['h-att-count'], mine.length + ' OUT' + (incoming.length ? ' · ' + incoming.length + ' IN' : ''));
      els['h-att-rows'].onclick = (e) => {
        const b = e.target.closest('[data-recall]');
        if (b) { const at = S.attacks.find((a) => a.id === Number(b.dataset.recall)); if (at) { MP.War.recall(at); MP.Game.notify('attack.recalled', {}); } return; }
        const d = e.target.closest('[data-defend]');
        if (d) {
          const at = S.attacks.find((a) => a.id === Number(d.dataset.defend));
          if (at) { const amt = MP.War.commitDefense(at, p.troops * HUD.ratio); if (amt) { MP.SFX.play('attack'); HUD.toast(`${U.fmtK(amt)} troops hold the line against ${S.nations[at.from].name}`, 'good'); } else { MP.SFX.play('error'); HUD.toast('Not enough troops to commit', 'bad'); } }
        }
      };
      document.getElementById('h-attacks').style.display = mine.length || incoming.length || S.ships.some((s) => s.owner === p.id && s.kind === 'transport') ? '' : 'none';
      // allied target chip
      const tgt = p.targetId && S.nations[p.targetId];
      const chip = document.getElementById('h-target');
      if (tgt && tgt.alive) { chip.style.display = ''; setH(chip, `<span class="t">⌖ ALLIED TARGET</span> ${MP.Flags.img(tgt.flag, 'flag xs')} <b>${U.esc(tgt.name)}</b> <button class="btn sm" data-untarget>✕</button>`); chip.onclick = (e) => { if (e.target.closest('[data-untarget]')) MP.Diplo.setTarget(p, tgt); }; }
      else { chip.style.display = 'none'; if (p.targetId && (!tgt || !tgt.alive)) p.targetId = 0; }
    } else document.getElementById('h-attacks').style.display = 'none';
    // council effects
    const ef = S.council.effects;
    const efEl = els['h-effects'];
    if (ef.length) { efEl.style.display = ''; setH(efEl, '<div class="ph"><span class="t">COUNCIL MANDATES</span></div>' + ef.map((e) => `<div class="efr"><span>${U.esc(e.name)}${e.target ? ' · ' + U.esc(S.nations[e.target].name) : ''}</span><span>${U.fmtTime(e.until - S.t)}</span></div>`).join('')); }
    else efEl.style.display = 'none';
    if (!p) return;
    // stats
    setT(els['h-troops'], U.fmtK(p.troops));
    setT(els['h-cap'], U.fmtK(p.cap));
    setT(els['h-grow'], (p.growth >= 0 ? '+' : '') + U.fmtK(p.growth) + '/s');
    els['h-grow'].className = p.growth >= 0 ? 'pos' : 'neg';
    els['h-troopbar'].style.width = U.clamp(100 * p.troops / p.cap, 0, 100) + '%';
    setT(els['h-send'], U.fmtK(p.troops * HUD.ratio));
    setT(els['h-credits'], U.fmtK(p.credits));
    setT(els['h-income'], '+' + U.fmtK(p.incomeAvg) + '/s');
    setT(els['h-tiles'], U.fmtInt(p.tiles));
    setT(els['h-uranium'], U.fmtInt(p.uranium));
    els['h-uranium'].classList.toggle('capped', !!p.uCapped && p.uranium >= C.URANIUM_CAP_NO_DEPOSIT - 0.5);
    els['h-ubar'].style.width = (p.uCapped ? U.clamp(100 * p.uranium / C.URANIUM_CAP_NO_DEPOSIT, 0, 100) : 100) + '%';
    els['h-ubar'].parentElement.title = p.uCapped ? 'No enrichment plant: uranium capped at 200' : `+${(p.uRate || 0).toFixed(1)} U/s`;
    HUD.syncSlots();
    HUD.renderFront();
    // capital in ruins: rebuild before the deadline or the government surrenders
    const mor = p.morale == null ? 1 : p.morale;
    els['h-morale-wrap'].style.display = mor < 0.995 ? '' : 'none';
    setT(els['h-morale'], 'MORALE ' + Math.round(mor * 100) + '%' + (p.capRuin ? ' · FALLING' : ' · RECOVERING'));
    els['h-morale-wrap'].className = 'morale-chip' + (mor < 0.5 ? ' low' : '');
    const ca = els['h-capalert'];
    if (p.capRuin) {
      const r = p.capRuin, left = Math.max(0, r.deadline - S.t), cost = MP.Game.rebuildCost(p);
      ca.style.display = '';
      setH(ca, r.rebuildUntil
        ? `<b>⚠ CAPITAL REBUILDING</b> · ready in ${Math.ceil(r.rebuildUntil - S.t)}s · deadline ${U.fmtTime(left)}`
        : `<b>⚠ CAPITAL IN RUINS</b> · the government surrenders in <b class="t">${U.fmtTime(left)}</b> unless it is rebuilt (${C.CAPITAL_STRIKE.rebuildTime}s) <button class="btn sm ${p.credits >= cost ? 'primary' : ''}" data-rebuild>REBUILD · ${U.fmtK(cost)}</button>`);
      ca.onclick = (e) => { if (!e.target.closest('[data-rebuild]')) return; const res = MP.Game.rebuildCapital(p); if (!res.ok) { MP.SFX.play('error'); HUD.toast(res.reason, 'bad'); } else HUD.toast('Rebuilding the capital', 'good'); };
    } else if (ca.style.display !== 'none') { ca.style.display = 'none'; setH(ca, ''); }
    // first war of the match: show how divisions work
    if (!S._divTip && S.phase === 'play' && p.divs && p.divs.length && S.attacks.some((a) => !a.done && a.to && (a.from === p.id || a.to === p.id))) {
      S._divTip = true;
      HUD.toast('DIVISIONS: hover the front and press R (armour) or F (infantry) to reinforce that spot. Press again on the same spot to stack. T sends the whole army.', 'info');
      MP.Game.wire('VESPER', 'FRONT ACTIVE — R SENDS ARMOUR, F SENDS INFANTRY TO THE CURSOR. PRESS AGAIN TO STACK.', 'good');
    }
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
