/* MIDNIGHT PROTOCOL — weather fronts (original mechanic): drifting storms slow attacks,
   ground airstrikes and blind radar while they pass. */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, World = MP.World, G = MP.G;
  const Wx = (MP.Weather = {});

  Wx.stormAt = function (x, y) {
    const S = G.S;
    if (!S || !S.storms.length) return false;
    for (const s of S.storms) if (U.dist2(s.x, s.y, x, y) <= s.r * s.r * s.k * s.k) return true;
    return false;
  };

  Wx.tick = function (dt) {
    const S = G.S;
    if (!S.opts.weather) return;
    S._wxT = (S._wxT || 40) - dt;
    if (S._wxT <= 0 && S.storms.length < C.WEATHER_MAX) {
      S._wxT = 60 + S.rng() * 70;
      // spawn over land-ish latitudes, drifting with the westerlies / trade winds
      const y = 120 + S.rng() * (World.H - 260);
      const lat = World.rowLat[Math.round(y)];
      const dir = Math.abs(lat) > 28 ? 1 : -1;
      const x = dir > 0 ? S.rng() * World.W * 0.8 : World.W * 0.2 + S.rng() * World.W * 0.8;
      S.storms.push({ id: (S._wxId = (S._wxId || 0) + 1), x, y, r: 45 + S.rng() * 55, vx: dir * (2 + S.rng() * 2.5), vy: (S.rng() - 0.5) * 0.8,
        born: S.t, life: 120 + S.rng() * 90, k: 0, seed: S.rng() * 1000 });
      MP.Game.tut('tut.weather');
    }
    const p = G.player();
    for (let i = S.storms.length - 1; i >= 0; i--) {
      const s = S.storms[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      const age = S.t - s.born;
      s.k = Math.min(1, age / 12, (s.life - age) / 12);
      if (age > s.life || s.x < -100 || s.x > World.W + 100) { S.storms.splice(i, 1); continue; }
      if (p && p.alive && p.capital >= 0 && !s.warned && U.dist2(s.x, s.y, p.capX, p.capY) < (s.r + 40) * (s.r + 40)) {
        s.warned = true;
        MP.Game.notify('weather.storm_us', {});
        MP.Game.wire('OSINT', 'STORM FRONT OVER YOUR TERRITORY', 'osint');
        MP.SFX.play('thunder');
      }
    }
  };
})();
