/* MIDNIGHT PROTOCOL — diplomacy (alliances, truces, embargoes, gifts, betrayal) and the
   Global Council (original mechanic). */
(function () {
  'use strict';
  const MP = window.MP, U = MP.U, C = MP.CONFIG, G = MP.G, World = MP.World;

  const D = (MP.Diplo = {});

  function strength(n) { return n.tiles * 1.0 + n.troops / 60; }
  D.strength = strength;

  D.rankOf = function (id) {
    const al = G.alive().slice().sort((a, b) => b.tiles - a.tiles);
    return al.findIndex((n) => n.id === id) + 1;
  };
  function leaderInfo() {
    const al = G.alive().slice().sort((a, b) => b.tiles - a.tiles);
    return { first: al[0], second: al[1], list: al };
  }

  D.allianceCount = (n) => Array.from(n.allies).filter((id) => G.S.nations[id] && G.S.nations[id].alive).length;

  // probability that bot b accepts an alliance from a
  D.allianceOdds = function (a, b) {
    const S = G.S;
    if (a.wars.has(b.id) && b.lastHitBy === a.id && S.t - b.lastHitAt < 30) return 0.03;
    const pers = C.PERSONALITIES[b.personality] || C.PERSONALITIES.opportunist;
    let s = G.rel(b.id, a.id) / 100 * 0.9;
    const ratio = strength(a) / Math.max(1, strength(b));
    const neighbor = MP.War.bordersWith(a.id, b.id);
    if (neighbor) s += ratio > 1.4 ? 0.35 : ratio < 0.6 ? -0.25 : 0.05;   // a big neighbour: bandwagon for safety
    else s += ratio > 0.5 ? 0.15 : -0.15;                                 // distant partners judged by usefulness
    if (ratio < 0.25) s -= 0.3;                                           // too weak to matter
    const L = leaderInfo();
    if (L.first && L.first.id === a.id && L.second && a.tiles > L.second.tiles * 2) s -= 0.4; // fear of the runaway leader
    let common = 0; for (const e of a.wars) if (b.wars.has(e)) common++;
    s += Math.min(0.45, common * 0.15);
    if (a.traitorUntil > S.t) s -= 0.55;
    s -= D.allianceCount(b) * 0.08;
    s += (pers.ally - 0.6) * 0.5;
    if (b.wars.size > 2) s += 0.1; // stretched nations want friends
    const p = 1 / (1 + Math.exp(-s * 3.2)) + (G.has(a, 'diplomacy') ? 0.12 : 0);
    return U.clamp(p, 0.04, 0.95);
  };

  D.truceOdds = function (a, b) {
    const S = G.S;
    let s = 0;
    const ratio = strength(a) / Math.max(1, strength(b));
    s += (ratio - 1) * 0.8;                                    // weaker side wants peace
    if (b.lastHitBy === a.id && S.t - b.lastHitAt < 20) s += 0.35; // under active attack
    if (!a.wars.has(b.id)) s += 0.3;
    s += G.rel(b.id, a.id) / 120;
    if (a.traitorUntil > S.t) s -= 0.4;
    const pers = C.PERSONALITIES[b.personality] || C.PERSONALITIES.opportunist;
    s -= (pers.aggro - 0.5) * 0.8;
    return U.clamp(1 / (1 + Math.exp(-s * 2.6)) + (G.has(a, 'diplomacy') ? 0.12 : 0), 0.05, 0.95);
  };

  // ---------------- actions ----------------
  D.formAlliance = function (a, b) {
    const S = G.S;
    a.allies.add(b.id); b.allies.add(a.id);
    a.wars.delete(b.id); b.wars.delete(a.id);
    a.embargo.delete(b.id); b.embargo.delete(a.id);
    a.truces.delete(b.id); b.truces.delete(a.id);
    G.addRel(a.id, b.id, 25); G.addRel(b.id, a.id, 25);
    for (const at of S.attacks) if ((at.from === a.id && at.to === b.id) || (at.from === b.id && at.to === a.id)) MP.War.finish(at, true);
    S.roadsDirty = true;
    D.agg('ALLIANCES SIGNED');
    if (a.isPlayer || b.isPlayer) { S.stats.alliances++; MP.SFX.play('alliance'); }
  };

  D.breakAlliance = function (a, b, betrayal) {
    const S = G.S;
    if (!a.allies.has(b.id)) return;
    a.allies.delete(b.id); b.allies.delete(a.id);
    G.addRel(b.id, a.id, -60);
    S.roadsDirty = true;
    if (betrayal) {
      a.traitorUntil = S.t + 300;
      for (const o of S.nations) if (o && o.alive && o.id !== a.id) G.addRel(o.id, a.id, -15);
      S.clock -= C.CLOCK.betrayal;
      MP.Game.wire('CABLE', `${a.name} BROKE ITS ALLIANCE WITH ${b.name}`, 'betray');
      if (b.isPlayer) { MP.Game.notify('diplo.betrayed', { nation: a.name }); MP.SFX.play('betrayal'); S.stats.betrayals++; }
      if (a.isPlayer) { MP.Game.notify('diplo.we_betrayed', { nation: b.name }); MP.SFX.play('betrayal'); }
    } else D.agg('ALLIANCES BREAKING');
  };

  D.formTruce = function (a, b) {
    const S = G.S;
    const until = S.t + C.TRUCE_SECONDS;
    a.truces.set(b.id, until); b.truces.set(a.id, until);
    a.wars.delete(b.id); b.wars.delete(a.id);
    for (const at of S.attacks) if ((at.from === a.id && at.to === b.id) || (at.from === b.id && at.to === a.id)) MP.War.finish(at, true);
    G.addRel(a.id, b.id, 8); G.addRel(b.id, a.id, 8);
    D.agg('TRUCES AGREED');
  };

  D.toggleEmbargo = function (a, b) {
    if (a.embargo.has(b.id)) { a.embargo.delete(b.id); return false; }
    a.embargo.add(b.id); G.addRel(b.id, a.id, -10); G.S.roadsDirty = true;
    return true;
  };

  D.gift = function (a, b, kind, amount) {
    if (!G.isAllied(a.id, b.id)) return false;
    if (kind === 'troops') { amount = Math.min(amount, a.troops); a.troops -= amount; b.troops += amount; }
    else { amount = Math.min(amount, a.credits); a.credits -= amount; b.credits += amount; }
    G.addRel(b.id, a.id, 6);
    if (b.puppet && a.isPlayer && amount > 0) {         // your gifts are remembered (CEDE odds) and never auto-returned
      b.donations = (b.donations || 0) + 1;
      if (kind === 'troops') b.giftedT = (b.giftedT || 0) + amount; else b.giftedC = (b.giftedC || 0) + amount;
    }
    return amount;
  };

  // ---------------- PUPPET-STATE ----------------
  D.puppetOf = function (p) { const S = G.S; const n = S.puppetId ? S.nations[S.puppetId] : null; return n && n.alive && n.puppet ? n : null; };
  D.cedeOdds = function (p, n) {
    return Math.min(0.99, 0.65 + 0.05 * (n.donations || 0) + (G.has(p, 'cedeBonus') ? 0.1 : 0));
  };
  D.requestCede = function (p, n) {
    const S = G.S;
    if (!n.puppet) return;
    if (D.pending.some((x) => x.kind === 'cede' && x.to === n.id)) return;
    D.pending.push({ kind: 'cede', from: p.id, to: n.id, at: S.t + 2 + S.rng() * 1.5 });
    MP.Game.wire('CABLE', `YOU DEMAND THAT ${n.name} CEDE ITS SOVEREIGNTY`, 'cable');
    MP.Game.toast(`Cede demanded · ${Math.round(D.cedeOdds(p, n) * 100)}% chance`, 'info');
    MP.SFX.play('send');
  };
  function annexPuppet(p, n) {
    const S = G.S;
    n.capital = -1;
    for (const st of S.structs) if (st.owner === n.id) {           // buildings change hands intact
      const arr = n.st[st.type]; const i = arr.indexOf(st); if (i >= 0) arr.splice(i, 1);
      n.levels[st.type] = Math.max(0, (n.levels[st.type] || 0) - st.level);
      st.owner = p.id; p.st[st.type].push(st); p.levels[st.type] = (p.levels[st.type] || 0) + st.level;
    }
    for (let t = 0; t < World.N; t++) if (S.owner[t] === n.id) G.setOwner(t, p.id, 0);
    for (const sh of S.ships) if (sh.owner === n.id) sh.owner = p.id;
    for (const at of S.attacks) if (at.from === n.id) { at.from = p.id; War_refresh(at); }
    p.troops += n.troops; p.credits += n.credits; p.uranium += n.uranium;
    for (const w in n.research) p.research[w] = true;
    n.troops = 0; n.credits = 0; n.uranium = 0;
    n.alive = false; n.eliminatedAt = S.t;
    for (const o of S.nations) if (o) { o.allies.delete(n.id); o.truces.delete(n.id); o.wars.delete(n.id); o.embargo.delete(n.id); }
    S.roadsDirty = true;
    MP.Game.wire('FLASH', `${n.name} IS CEDED TO YOU — LAND, FORCES AND TREASURY TRANSFERRED`, 'good');
    MP.Game.notify('diplo.ceded', { nation: n.name, text: `${n.name} has signed. Its flag comes down without a shot.`, priority: 2 });
    MP.SFX.play('milestone');
  }
  function War_refresh(at) { MP.War.refreshFrontier(at); }
  function independence(p, n) {
    const S = G.S;
    n.puppet = false; n.partner = false; n.team = 0; S.puppetId = 0;
    p.allies.delete(n.id); n.allies.delete(p.id);
    G.S.relations[n.id * S.relN + p.id] = -100;
    n.personality = 'hawk';
    n.ai.grudge.set(p.id, 12);
    MP.War.declareWar(n.id, p.id);
    MP.Game.wire('FLASH', `${n.name} DECLARES INDEPENDENCE AND GOES TO WAR WITH YOU`, 'betray');
    MP.Game.notify('diplo.betrayed', { nation: n.name });
    MP.SFX.play('betrayal');
    // it courts your enemies first, then its nearest neighbours
    const cands = G.alive().filter((o) => o.id !== n.id && o.id !== p.id && !G.isAllied(o.id, p.id) && o.ai)
      .sort((a, b) => (b.wars.has(p.id) - a.wars.has(p.id)) || (U.dist2(a.capX, a.capY, n.capX, n.capY) - U.dist2(b.capX, b.capY, n.capX, n.capY)));
    let signed = 0;
    for (const o of cands.slice(0, 5)) {
      if (signed >= 3) break;
      if (S.rng() < (o.wars.has(p.id) ? 0.85 : 0.6)) { D.formAlliance(n, o); MP.War.declareWar(o.id, p.id); signed++; MP.Game.wire('CABLE', `${o.name} JOINS ${n.name} AGAINST YOU`, 'bad'); }
    }
    if (MP.War.bordersWith(n.id, p.id)) MP.War.launch(n.id, p.id, n.troops * 0.5, { fx: p.capX, fy: p.capY });
  }
  function answerCede(r, p, n) {
    if (!n.puppet || !n.alive) return;
    if (G.S.rng() < D.cedeOdds(p, n)) annexPuppet(p, n); else independence(p, n);
  }
  // runs once a second: keeps the puppet behind you and feeds your war effort
  D.tickPuppet = function () {
    const S = G.S, p = G.player();
    const n = D.puppetOf(p);
    if (!n || !p || !p.alive) return;
    // never stronger or richer than its master (gifts you made it are kept out of this)
    if (n.troops > p.troops) {
      const give = Math.min(n.troops - (n.giftedT || 0), (n.troops - p.troops) / 2 + n.troops * 0.03);
      if (give > 50) { n.troops -= give; p.troops += give; }
    }
    if (n.credits > p.credits) {
      const give = Math.min(n.credits - (n.giftedC || 0), (n.credits - p.credits) / 2 + n.credits * 0.03);
      if (give > 50) { n.credits -= give; p.credits += give; }
    }
    // follow the master into every war
    const targets = new Set();
    for (const at of S.attacks) if (at.from === p.id && at.to && !at.done) targets.add(at.to);
    if (p.targetId) targets.add(p.targetId);
    let focus = 0;
    for (const t of targets) { if (MP.War.bordersWith(n.id, t)) { focus = t; break; } if (!focus) focus = t; }
    if (focus) {
      n.ai.focus = focus; n.ai.focusUntil = S.t + 20; n.wars.add(focus);
      const reachable = MP.War.bordersWith(n.id, focus);
      // can't reach it on land: send troops home for the war effort
      if (!reachable && S.t - (n.ai.lastDonate || 0) > 8 && n.troops > n.cap * 0.25) {
        n.ai.lastDonate = S.t;
        const amt = n.troops * 0.12; n.troops -= amt; p.troops += amt;
        MP.Game.wire('CABLE', `${n.name} SENDS ${U.fmtK(amt)} TROOPS FOR THE WAR EFFORT`, 'good');
      }
    }
  };

  // ---------------- player requests (async bot answers) ----------------
  D.pending = [];
  D.requestAlliance = function (p, b) {
    const S = G.S;
    if (S.opts.party && S.opts.party.length) { MP.Game.notify('diplo.party_no_alliance', {}); MP.Game.toast('Your party forfeits alliances', 'bad'); return; }
    if (S.opts.mode === 'teams') { MP.Game.toast('Teams are fixed in this mode', 'bad'); return; }
    if (D.allianceCount(p) >= C.ALLIANCE_MAX) { MP.Game.notify('diplo.alliance_cap', {}); MP.Game.toast('Alliance limit reached (' + C.ALLIANCE_MAX + ')', 'bad'); return; }
    if (D.pending.some((x) => x.to === b.id && x.kind === 'ally')) return;
    D.pending.push({ kind: 'ally', from: p.id, to: b.id, at: S.t + 1 + S.rng() * 3 });
    MP.Game.toast(`Alliance proposed to ${b.name}`, 'info');
    MP.SFX.play('send');
  };
  D.requestTruce = function (p, b) {
    const S = G.S;
    if (D.pending.some((x) => x.to === b.id && x.kind === 'truce')) return;
    D.pending.push({ kind: 'truce', from: p.id, to: b.id, at: S.t + 1 + S.rng() * 3 });
    MP.Game.toast(`Truce proposed to ${b.name}`, 'info');
    MP.SFX.play('send');
  };

  D.tickPending = function () {
    const S = G.S;
    for (let i = D.pending.length - 1; i >= 0; i--) {
      const r = D.pending[i];
      if (r.at > S.t) continue;
      D.pending.splice(i, 1);
      const a = S.nations[r.from], b = S.nations[r.to];
      if (!a || !b || !a.alive || !b.alive) continue;
      if (r.kind === 'ally') {
        const p = D.allianceOdds(a, b);
        if (D.allianceCount(b) < C.ALLIANCE_MAX && S.rng() < p) { D.formAlliance(a, b); MP.Game.notify('diplo.accepted', { nation: b.name }); MP.Game.wire('CABLE', `${b.name} SIGNS AN ALLIANCE WITH YOU`, 'good'); }
        else { MP.Game.notify('diplo.declined', { nation: b.name }); MP.Game.wire('CABLE', `${b.name} DECLINES YOUR ALLIANCE`, 'cable'); G.addRel(b.id, a.id, -2); MP.SFX.play('decline'); }
      } else if (r.kind === 'aid') {
        answerAid(r, a, b);
      } else if (r.kind === 'cede') {
        answerCede(r, a, b);
      } else if (r.kind === 'truce') {
        const p = D.truceOdds(a, b);
        if (S.rng() < p) { D.formTruce(a, b); MP.Game.notify('diplo.truce', { nation: b.name }); MP.Game.wire('CABLE', `${b.name} AGREES TO A 3:00 TRUCE`, 'good'); MP.SFX.play('alliance'); }
        else { MP.Game.notify('diplo.truce_declined', { nation: b.name }); MP.Game.wire('CABLE', `${b.name} REJECTS A TRUCE`, 'cable'); MP.SFX.play('decline'); }
      }
    }
    // truce expiry notices for the player
    const p = G.player();
    if (p) for (const [id, until] of p.truces) {
      if (until <= S.t) { p.truces.delete(id); const o = S.nations[id]; if (o) { o.truces.delete(p.id); MP.Game.notify('diplo.truce_over', { nation: o.name }); } }
    }
    // offers to the player expire
    for (let i = S.offers.length - 1; i >= 0; i--) if (S.offers[i].until <= S.t) { S.offers.splice(i, 1); MP.HUD && MP.HUD.renderOffers(); }
  };

  // bot → player offer
  D.offerToPlayer = function (b, kind) {
    const S = G.S, p = G.player();
    if (!p || !p.alive) return;
    if (S.offers.some((o) => o.from === b.id && o.kind === kind)) return;
    if (kind === 'ally' && (D.allianceCount(p) >= C.ALLIANCE_MAX || (S.opts.party && S.opts.party.length) || S.opts.mode === 'teams')) return;
    S.offers.push({ kind, from: b.id, until: S.t + C.OFFER_SECONDS, total: C.OFFER_SECONDS });
    MP.Game.notify(kind === 'ally' ? 'diplo.offer' : 'diplo.truce_offer', { nation: b.name });
    MP.Game.wire('CABLE', `${b.name} OFFERS YOU ${kind === 'ally' ? 'AN ALLIANCE' : 'A TRUCE'}`, 'cable');
    MP.SFX.play('offer');
    MP.HUD && MP.HUD.renderOffers();
  };
  D.answerOffer = function (offer, yes) {
    const S = G.S, p = G.player(), b = S.nations[offer.from];
    const i = S.offers.indexOf(offer); if (i >= 0) S.offers.splice(i, 1);
    if (!b || !b.alive || !p) return;
    if (yes) {
      if (offer.kind === 'ally') {
        if (D.allianceCount(p) >= C.ALLIANCE_MAX) { MP.Game.toast('Alliance limit reached', 'bad'); return; }
        D.formAlliance(p, b); MP.Game.notify('diplo.accepted', { nation: b.name });
      } else { D.formTruce(p, b); MP.Game.notify('diplo.truce', { nation: b.name }); MP.SFX.play('alliance'); }
    } else { G.addRel(b.id, p.id, -6); MP.SFX.play('decline'); }
    MP.HUD && MP.HUD.renderOffers();
  };

  // ---------------- allied target (player marks an enemy for allies / party to focus) ----------------
  D.setTarget = function (p, n) {
    const S = G.S;
    if (p.targetId === n.id) {
      p.targetId = 0;
      for (const o of S.nations) if (o && o.ai && o.ai.focus === n.id) o.ai.focus = 0;
      MP.Game.wire('CABLE', `TARGET ON ${n.name} RESCINDED`, 'cable');
      MP.Game.toast('Allied target cleared', 'info');
      return;
    }
    const friends = G.alive().filter((o) => o.ai && o.id !== p.id && G.isAllied(o.id, p.id));
    if (!friends.length) { MP.Game.toast('You have no allies or party to direct', 'bad'); MP.SFX.play('error'); return; }
    p.targetId = n.id;
    let yes = 0;
    for (const o of friends) {
      if (G.isAllied(o.id, n.id)) continue;
      const odds = o.partner || (o.team && o.team === p.team) ? 0.97 : U.clamp(0.4 + G.rel(o.id, p.id) / 120 - G.rel(o.id, n.id) / 200, 0.1, 0.95);
      if (S.rng() < odds) { o.ai.focus = n.id; o.ai.focusUntil = S.t + 240; yes++; G.addRel(o.id, n.id, -10); }
    }
    MP.Game.wire('CABLE', yes ? `${yes} ${yes === 1 ? 'ALLY COMMITS' : 'ALLIES COMMIT'} TO THE STRIKE ON ${n.name}` : `YOUR ALLIES WILL NOT MOVE ON ${n.name}`, yes ? 'good' : 'cable');
    MP.Game.notify('diplo.target', { nation: n.name, text: yes ? `${n.name} is marked. ${yes} ${yes === 1 ? 'ally is' : 'allies are'} moving.` : `Nobody wants ${n.name} badly enough.`, priority: 1 });
    MP.SFX.play(yes ? 'alliance' : 'decline');
  };

  D.requestAid = function (p, ally, kind) {
    const S = G.S;
    p.aidCd = p.aidCd || {};
    const key = ally.id + kind;
    if ((p.aidCd[key] || 0) > S.t) { MP.Game.toast(`${ally.name} was asked recently — wait ${Math.ceil(p.aidCd[key] - S.t)}s`, 'bad'); return; }
    p.aidCd[key] = S.t + 45;
    D.pending.push({ kind: 'aid', what: kind, from: p.id, to: ally.id, at: S.t + 1 + S.rng() * 2.5 });
    MP.Game.toast(`Requested ${kind} from ${ally.name}`, 'info');
    MP.SFX.play('send');
  };
  function answerAid(r, a, b) {
    const S = G.S;
    if (!G.isAllied(a.id, b.id)) return;
    const partner = b.partner || (b.team && b.team === a.team);
    let odds = partner ? 0.8 : U.clamp(0.25 + G.rel(b.id, a.id) / 140, 0.05, 0.85);
    if (G.has(a, 'diplomacy')) odds += 0.12;
    if (b.puppet) odds = 9; // a puppet answers 99%: the roll below is overridden
    const underFire = S.t - b.lastHitAt < 10;
    if (r.what === 'troops') { odds += b.troops / Math.max(1, b.cap) > 0.55 ? 0.2 : -0.25; if (underFire) odds -= 0.35; }
    else odds += b.credits > 25000 ? 0.15 : -0.3;
    if (a.lastHitAt && S.t - a.lastHitAt < 15) odds += 0.15; // helping a friend under attack
    if (b.puppet ? S.rng() < 0.99 : S.rng() < odds) {
      const amt = r.what === 'troops' ? b.troops * (0.1 + S.rng() * 0.12) : b.credits * (0.12 + S.rng() * 0.15);
      const got = D.gift(b, a, r.what, amt);
      MP.Game.wire('CABLE', `${b.name} SENDS YOU ${U.fmtK(got)} ${r.what.toUpperCase()}`, 'good');
      MP.Game.notify('diplo.gift', { nation: b.name });
      MP.SFX.play(r.what === 'troops' ? 'alliance' : 'coin');
    } else {
      MP.Game.wire('CABLE', `${b.name} DECLINES YOUR REQUEST FOR ${r.what.toUpperCase()}`, 'cable');
      MP.SFX.play('decline');
    }
  }

  // ---------------- betrayal check (AI side) ----------------
  D.tickBetrayal = function () {
    const S = G.S;
    const L = leaderInfo();
    for (const a of S.nations) {
      if (!a || !a.alive || !a.ai || a.partner) continue;
      for (const bid of Array.from(a.allies)) {
        const b = S.nations[bid];
        if (!b || !b.alive) { a.allies.delete(bid); continue; }
        if (a.team && a.team === b.team) continue;
        const key = a.id + ':' + bid;
        S._betrayT = S._betrayT || {};
        if ((S._betrayT[key] || 0) > S.t) continue;
        S._betrayT[key] = S.t + 60 + S.rng() * 30;
        const pers = C.PERSONALITIES[a.personality];
        // temptation: a weak neighbouring ally, or an ally running away with the world
        const neighbor = MP.War.bordersWith(a.id, bid);
        const ratio = strength(a) / Math.max(1, strength(b));
        const runaway = L.first && L.first.id === bid && L.second && b.tiles > L.second.tiles * 1.6;
        let tempted = (neighbor && ratio > 1.6 && a.troops > a.cap * 0.55) || (runaway && S.t > 600);
        if (G.rel(a.id, bid) > 60) tempted = false;
        if (!tempted) continue;
        if (S.rng() < C.BETRAY_CHANCE * Math.min(1.2, pers.betray * 0.8)) {
          D.breakAlliance(a, b, true);
          if (neighbor) MP.War.launch(a.id, bid, a.troops * 0.4);
        }
      }
    }
  };

  // ---------------- wire aggregation ----------------
  D._agg = {};
  D.agg = function (label) { D._agg[label] = (D._agg[label] || 0) + 1; };
  D.flushAgg = function () {
    for (const k in D._agg) {
      const c = D._agg[k];
      MP.Game.wire('CABLE', c > 1 ? `${k} ×${c}` : k.replace(/S\b/, ''), 'cable');
    }
    D._agg = {};
  };

  // =============== GLOBAL COUNCIL ===============
  D.tickCouncil = function (dt) {
    const S = G.S, cn = S.council;
    if (!S.opts.council) return;
    for (let i = cn.effects.length - 1; i >= 0; i--) if (cn.effects[i].until <= S.t) {
      const e = cn.effects.splice(i, 1)[0];
      MP.Game.wire('COUNCIL', `${e.name.toUpperCase()} HAS LAPSED`, 'council');
      S.roadsDirty = true;
    }
    if (cn.active) {
      if (S.t >= cn.active.closes) D.closeSession();
      return;
    }
    if (S.phase !== 'play') return;
    cn.next -= dt;
    if (cn.next > 0) return;
    cn.next = C.COUNCIL_INTERVAL;
    D.openSession();
  };

  D.openSession = function () {
    const S = G.S, cn = S.council;
    const L = leaderInfo();
    const opts = C.RESOLUTIONS.filter((r) => {
      if (r.id === 'accord') return S.t > 25 * 60 && S.clock < 240;
      if (r.id === 'armsembargo') return G.alive().some((n) => n.launches > 0);
      if (r.id === 'testban') return S.defcon <= 4;
      return true;
    });
    const r = opts[S.rng.int(opts.length)];
    const res = { id: r.id, name: r.name, desc: r.desc, closes: S.t + C.COUNCIL_VOTE_SECONDS, total: C.COUNCIL_VOTE_SECONDS, votes: {}, target: 0 };
    if (r.id === 'sanctions' || r.id === 'accord') res.target = L.first ? L.first.id : 0;
    if (r.id === 'armsembargo') { let best = null; for (const n of G.alive()) if (!best || n.launches > best.launches) best = n; res.target = best ? best.id : 0; }
    if (res.target) res.targetName = S.nations[res.target].name;
    cn.active = res;
    MP.Game.wire('COUNCIL', `SESSION OPENS · ${r.name.toUpperCase()}${res.targetName ? ' · ' + res.targetName : ''}`, 'council');
    MP.Game.notify('council.session', { resolution: r.name });
    MP.Game.tut('tut.council');
    MP.SFX.play('council');
    // bots vote immediately (hidden until close)
    for (const n of G.alive()) if (n.ai) res.votes[n.id] = D.botVote(n, res, L);
    MP.HUD && MP.HUD.openCouncil(res);
  };

  D.botVote = function (n, res, L) {
    const S = G.S;
    const pers = C.PERSONALITIES[n.personality];
    let s = (S.rng() - 0.5) * 0.6;
    const rank = L.list.indexOf(n);
    switch (res.id) {
      case 'sanctions':
        if (n.id === res.target) return 'no';
        if (G.isAllied(n.id, res.target)) return 'no';
        s += 0.3 - G.rel(n.id, res.target) / 100; break;
      case 'testban': s += (n.research.ICBM || n.research.Hypersonic ? -0.4 : 0.35) - (pers.nuke - 0.6); break;
      case 'armsembargo':
        if (n.id === res.target || G.isAllied(n.id, res.target)) return 'no';
        s += 0.35 - G.rel(n.id, res.target) / 150; break;
      case 'ceasefire': s += (n.wars.size > 1 ? 0.3 : -0.1) + (rank > 5 ? 0.25 : -0.3) - (pers.aggro - 0.5); break;
      case 'quota': s += n.st.enrich.length ? -0.5 : 0.4; break;
      case 'relief': s += rank < 3 ? -0.8 : rank > L.list.length - 6 ? 0.6 : 0.1; break;
      case 'accord':
        if (n.id === res.target || G.isAllied(n.id, res.target)) return 'yes';
        s += (n.tiles < L.list[0].tiles * 0.25 ? 0.25 : -0.4) + (S.clock < 120 ? 0.3 : 0); break;
    }
    return s > 0.1 ? 'yes' : s < -0.1 ? 'no' : 'abstain';
  };

  D.playerVote = function (v) {
    const S = G.S, p = G.player();
    if (!S.council.active || !p) return;
    S.council.active.votes[p.id] = v;
    MP.SFX.play('click');
  };

  D.closeSession = function () {
    const S = G.S, cn = S.council, res = cn.active;
    cn.active = null;
    let yes = 0, no = 0;
    for (const id in res.votes) { const w = G.mod(S.nations[id], 'councilVotes'); if (res.votes[id] === 'yes') yes += w; else if (res.votes[id] === 'no') no += w; }
    res.yes = yes; res.no = no;
    const passed = yes > no;
    MP.HUD && MP.HUD.closeCouncil(res, passed);
    MP.Game.wire('COUNCIL', `${res.name.toUpperCase()} ${passed ? 'PASSES' : 'FAILS'} ${yes}–${no}`, 'council');
    MP.Game.notify(passed ? 'council.passed' : 'council.failed', { resolution: res.name });
    MP.SFX.play(passed ? 'councilPass' : 'councilFail');
    if (!passed) return;
    const until = S.t + C.COUNCIL_EFFECT;
    switch (res.id) {
      case 'sanctions': cn.effects.push({ id: 'sanctions', name: res.name, target: res.target, until }); S.roadsDirty = true; break;
      case 'testban': cn.effects.push({ id: 'testban', name: res.name, until }); S.clock = Math.min(C.CLOCK_START, S.clock - C.CLOCK.councilBan); break;
      case 'armsembargo': { const t = S.nations[res.target]; if (t) t.launchBanUntil = S.t + 90; cn.effects.push({ id: 'armsembargo', name: res.name, target: res.target, until: S.t + 90 }); break; }
      case 'ceasefire': {
        const al = G.alive();
        for (const a of al) for (const b of al) if (a.id < b.id && !G.isAllied(a.id, b.id)) {
          a.truces.set(b.id, S.t + 60); b.truces.set(a.id, S.t + 60);
        }
        for (const at of S.attacks) if (at.to) MP.War.finish(at, true);
        S.clock = Math.min(C.CLOCK_START, S.clock + 30);
        break;
      }
      case 'quota': cn.effects.push({ id: 'quota', name: res.name, until }); break;
      case 'relief': {
        const L = leaderInfo();
        const small = L.list[L.list.length - 1];
        for (const big of L.list.slice(0, 3)) { const amt = big.credits * 0.1; big.credits -= amt; if (small) small.credits += amt; }
        break;
      }
      case 'accord': MP.Game.endMatch('council'); break;
    }
  };

  // council truce check also respects ceasefire via truces map → canAttack
  D.tick = function (dt) {
    const S = G.S;
    D.tickPending();
    S._pupT = (S._pupT || 0) + dt;
    if (S._pupT >= 1) { S._pupT = 0; D.tickPuppet(); }
    S._betT = (S._betT || 0) + dt;
    if (S._betT >= 5) { S._betT = 0; D.tickBetrayal(); }
    S._aggT = (S._aggT || 0) + dt;
    if (S._aggT >= 8) { S._aggT = 0; D.flushAgg(); }
    D.tickCouncil(dt);
  };
})();
