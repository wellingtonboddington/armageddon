/* MIDNIGHT PROTOCOL — boot sequence and main loop */
(function () {
  'use strict';
  const MP = window.MP, C = MP.CONFIG;
  MP.FONT_MONO = '"JetBrains Mono","Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace';
  MP.FONT_HEAD = 'Bahnschrift,"Arial Narrow","Roboto Condensed","DejaVu Sans Condensed",Impact,sans-serif';

  const bootLines = [];
  function bootLog(text) {
    const el = document.getElementById('boot-log');
    if (!el) return;
    bootLines.push(text);
    el.textContent = bootLines.slice(-7).join('\n');
  }
  const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

  async function boot() {
    try {
      bootLog('> MIDNIGHT PROTOCOL // LOCAL NODE');
      bootLog('> DECODING COASTLINES ............');
      await frame();
      const t0 = performance.now();
      MP.World.load();
      bootLog(`> ${MP.World.landTotal.toLocaleString()} LAND TILES · ${MP.World.deposits.length} URANIUM DEPOSITS · ${Math.round(performance.now() - t0)}ms`);
      bootLog('> CHARTING SEA LANES · RAISING TERRAIN');
      await frame();
      MP.HUD.init();
      MP.Render.applyGfxSetting();
      document.getElementById('hud').style.display = 'none';
      bootLog('> RASTERISING FLAGS · ' + MP.Flags.list.length + ' NATIONS ON FILE');
      await frame();
      MP.Menu.init();
      MP.Menu.advEl = document.createElement('div');
      MP.Menu.advEl.id = 'advisor-menu';
      if (MP.Advisor && MP.Advisor.init) {
        try { MP.Advisor.init({ hudEl: document.getElementById('advisor-hud'), menuEl: MP.Menu.advEl }); } catch (e) { console.error('[advisor init]', e); }
      }
      MP.Menu.render();
      document.getElementById('menu').style.display = 'none';
      bootLog('> INTELLIGENCE ADVISOR · ONLINE');
      bootLog('> ALL SYSTEMS LOCAL · NO UPLINK REQUIRED');
      const go = document.getElementById('boot-go');
      go.style.display = '';
      const start = () => {
        window.removeEventListener('keydown', start);
        document.getElementById('boot').removeEventListener('click', start);
        MP.audio.unlock();
        if (MP.settings.get('fullscreen', true)) MP.enterFullscreen();
        MP.Menu.reconnectFile(); // linked save file: re-grant access inside this click, adopt newer progress
        MP.SFX.play('phase');
        const b = document.getElementById('boot');
        b.classList.add('out');
        setTimeout(() => b.remove(), 600);
        MP.Menu.show();
        const P = MP.Menu.profile();
        if (P.firstBoot) { P.firstBoot = false; MP.Menu.save(); }
      };
      document.getElementById('boot').addEventListener('click', start);
      window.addEventListener('keydown', start);
      MP.booted = true;
      requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      bootLog('! BOOT FAILURE: ' + (e && e.message));
    }
  }

  let last = performance.now(), acc = 0;
  function loop(now) {
    const work0 = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    const Game = MP.Game;
    try {
      if (Game.running && MP.G.S) {
        if (!Game.paused) {
          acc += dt * Game.speed;
          let steps = 0;
          const t0 = performance.now();
          while (acc >= C.TICK && steps < 16) {
            Game.tick(C.TICK);
            acc -= C.TICK; steps++;
            if (performance.now() - t0 > 40) { acc = Math.min(acc, C.TICK); break; } // never freeze the frame
          }
        }
        MP.Render.frame(dt);
        MP.HUD.frame(dt);
      } else {
        MP.Menu.frame(dt);
      }
    } catch (e) {
      console.error('[loop]', e);
      if (!loop._errShown) { loop._errShown = true; MP.HUD && MP.HUD.toast('Internal error: ' + e.message, 'bad'); setTimeout(() => { loop._errShown = false; }, 5000); }
    }
    if (MP.Render.reportFrame && MP.Game.running) MP.Render.reportFrame(performance.now() - work0, dt);
    // the advisor runs isolated: a fault there never stops the game (and vice versa)
    try { if (MP.Advisor && MP.Advisor.update) MP.Advisor.update(dt); } catch (e) { if (!loop._advErr) { loop._advErr = true; console.error('[advisor]', e); } }
    requestAnimationFrame(loop);
  }
  // last-resort error boundary: log, tell the player once, keep running
  let errShown = 0;
  const report = (msg) => { console.error('[MP]', msg); if (Date.now() - errShown > 8000 && MP.HUD && MP.HUD.toast) { errShown = Date.now(); try { MP.HUD.toast('Recovered from an internal error', 'bad'); } catch (e) { /* */ } } };
  window.addEventListener('error', (e) => report(e && (e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => report(e && e.reason));

  document.addEventListener('contextmenu', (e) => { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; e.preventDefault(); });
  // middle-click must never start the browser's autoscroll inside the game
  document.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });

  // auto-pause + save when the tab is hidden (handy for spotty connections / switching apps)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && MP.Game.running && !MP.Game.paused && MP.G.S && MP.G.S.phase === 'play' && MP.G.S.opts.mode !== 'watch') {
      MP.Game.setPaused(true);
    }
  });
  window.addEventListener('beforeunload', () => { if (MP.Game.running && MP.G.S && MP.G.S.phase === 'play') { try { MP.Game.save(true); } catch (e) { /* */ } } MP.settings.flush(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
