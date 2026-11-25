# VESPER — Advisor Module Interface (MIDNIGHT PROTOCOL)

VESPER is the player's Intelligence Advisor. She is an ORIGINAL female character
(designed for this game — not based on any existing character). She speaks in the
main menu and in-match, with a female browser voice (Web Speech API) and a typed
(typewriter) briefing panel.

## Files owned by the advisor module

- `src/advisor/advisor.css`  — all advisor styles (prefixed `.vsp-`)
- `src/advisor/advisor.js`   — plain ES2020 *classic script* (NOT an ES module), wrapped in
  an IIFE, attaching `window.MP.Advisor`. No external dependencies, no network, no files.
- Optional dev-only harness `src/advisor/harness.html` (never shipped).

The build (`tools/build.mjs`) concatenates all CSS into one `<style>` and all JS into one
`<script>` in a fixed order; the advisor files load AFTER `src/js/00_core.js` (which defines
`window.MP`, `MP.bus`, `MP.audio`) and BEFORE the game/menu code.

## What the host (game) provides

```js
window.MP = window.MP || {};
MP.bus = { on(evt, fn), off(evt, fn), emit(evt, data) };      // tiny event bus
MP.audio = {
  getCtx(),        // -> AudioContext or null (null until the user's first gesture unlocks audio)
  voiceOut(),      // -> GainNode routed to master (use for advisor cue tones); null if no ctx
  isMuted(),       // master mute
};
MP.settings = { get(key, def), set(key, val) };            // persisted (localStorage, safe)
```

Palette (CSS custom properties defined on `:root` by the host — use them):

```
--bg:#0a0a08  --panel:rgba(14,13,10,.92)  --panel2:#17150f  --line:#3a3524
--y:#ffd21f (hazard yellow)  --y2:#ffb000 (amber)  --y3:#7a6410 (dim yellow)
--text:#ece6cf  --dim:#8d8670  --red:#ff4433  --cyan:#3ee6ff  --green:#a6e35a
--mono: "JetBrains Mono","Cascadia Mono","Consolas","DejaVu Sans Mono",monospace
--head: "Bahnschrift","Arial Narrow","Roboto Condensed","DejaVu Sans Condensed",sans-serif
```

Host DOM mount points (empty divs; the advisor builds everything inside them):

- `#advisor-hud`  — bottom-left in-match panel, ~350px wide. Layout like a tactical radio:
  portrait (≈68px square) on the left; right side: `● VESPER // INTELLIGENCE` + animated
  signal bars, the typed line (2–3 lines max, ~13px mono), and a dim uppercase *hint* line
  under it (≈10px). A small voice toggle button (speaker icon) lives in this panel.
- `#advisor-menu` — main menu centre: large portrait (≈260px square, framed with corner
  brackets), name row `● VESPER ▮▮▮▮▮▮`, and one typed line centred beneath it.

## API to implement (`MP.Advisor`)

```js
MP.Advisor.init({ hudEl, menuEl })   // build DOM, load voices, read persisted settings
MP.Advisor.setMode(mode)             // 'menu' | 'game' | 'idle'  (which mount is live)
MP.Advisor.event(key, params)        // MAIN ENTRY: game reports an event by key (below);
                                     // advisor picks a line variant, fills {params},
                                     // applies priority / cooldown / de-dup, speaks + types it
MP.Advisor.say(text, opts)           // raw line. opts: {priority:0..3, hint:'', voice:true, key:''}
MP.Advisor.hint(text)                // set the dim subtitle hint line only
MP.Advisor.update(dt)                // called every animation frame by host (dt seconds)
MP.Advisor.reset()                   // new match: clear queue + cooldowns, keep settings
MP.Advisor.setVoiceEnabled(bool); MP.Advisor.isVoiceEnabled()
MP.Advisor.setVolume(0..1); MP.Advisor.setRate(0.8..1.3)
MP.Advisor.listVoices()              // -> [{name, lang, female:bool}]
MP.Advisor.setVoiceName(name|null)   // manual override (null = auto pick)
MP.Advisor.getVoiceName()
MP.Advisor.drawPortrait(ctx2d, x, y, size, opts)  // draw her portrait into any canvas
                                     // (used by host for end screen / dossier). opts:{talking,alert}
```

The advisor emits on `MP.bus`:

- `'advisor:line'` `{ text, key, priority }` — every line actually delivered (host mirrors it into
  the WIRE feed with an `ADVISOR` tag).
- `'advisor:speaking'` `{ on:bool }`.

## Behaviour requirements

1. **Priority**: 0 tutorial/flavour, 1 info, 2 warning, 3 critical. Critical interrupts current speech
   (cancel + speak). Lower priority queues (max queue ~4; drop stale low-priority items older than
   ~8s). Per-key cooldowns (default ~12s; tutorial keys fire once per match; critical keys ~4s).
   Repeated same-key events inside the cooldown collapse (e.g. `×3` counter in the hint, not re-spoken).
2. **Voice**: `speechSynthesis`, handle `voiceschanged` async (and the case where voices never load).
   Auto-pick a FEMALE voice by name matching (e.g. Female, Samantha, Victoria, Karen, Moira, Tessa,
   Fiona, Serena, Zira, Hazel, Susan, Aria, Jenny, Libby, Sonia, Natasha, Clara, Emma, Ava, Allison,
   "Google UK English Female", "Google US English", Microsoft *Online (Natural)* female names…),
   prefer `en-GB`/`en-US`, prefer local/natural voices. Tune pitch (~1.0–1.12) / rate (~1.0–1.08)
   for a calm, clipped, slightly ominous delivery. Keep utterances short (Chrome cuts long ones;
   also call `resume()` defensively). Voice toggle + persistence via `MP.settings`.
3. **Fallback**: if speech is unavailable, has no voices, or voice is disabled — play a short
   Web Audio "radio comm" cue (chirp/blip pattern via `MP.audio.voiceOut()`), and still type the
   line. Typewriter ticks should be soft synthesized clicks (throttled), also via `voiceOut()`.
4. **Portrait** (her look — ORIGINAL design, must not resemble any existing character):
   a young woman intelligence officer rendered as crisp pixel art (draw procedurally on canvas,
   e.g. 64×64 logical pixels scaled with `imageSmoothingEnabled=false`). Strictly the game's
   yellow/black hazard palette (black, charcoal, hazard yellow, amber, a little warm white; red
   only for critical alert tint). Suggested identity: sharp asymmetric black bob with a single
   hazard-yellow streak, a slim headset with boom mic, a high-collared black field jacket with
   yellow hazard-stripe trim, calm narrow eyes. Animations: blink, subtle idle breathing / hair sway,
   mouth movement synced to speech (`onboundary` when available, else timed flaps), signal bars that
   pulse while speaking, CRT scanlines + light flicker, a glitch/red tint flash on critical alerts.
5. **Menu**: she talks in the menu. On `setMode('menu')` she greets (first boot vs returning, and a
   reaction to the last match result if host passes `menu.return_*` events). Idle chatter every
   ~35–60s while on the menu (short, in-character, lore-ish lines about the world in 2031, the clock,
   doctrines…). React to menu events (list below).
6. **Writing**: ALL lines are original. Tone: concise, dry, composed, a little ominous; never cute,
   never verbose. Mostly 3–14 words. 3–6 variants per key (more for frequent keys). Placeholders use
   `{name}` style. Also provide a short uppercase *hint* for tutorial keys (e.g.
   `FACTORY · CITIES AND PORTS WITHIN 60 TILES BECOME STOPS`).
7. Performance: `update(dt)` must be cheap; redraw the portrait only when the animation frame
   changes (≈12fps is fine); no layout thrash.

## Event catalogue (keys the host will send to `MP.Advisor.event`)

Params in braces. `nation` = display name string. `weapon` ∈ Airstrike, Tactical, Hypersonic,
ICBM, MIRV, Orbital, EMP.

### Menu
- `menu.boot` (first ever launch) · `menu.greet` (returning player) · `menu.idle`
- `menu.return_victory` {ending} · `menu.return_defeat` {ending} · `menu.return_winter`
- `menu.loadouts` · `menu.doctrine` {doctrine} · `menu.nation_saved` {name}
- `menu.party_add` {name} · `menu.party_remove` {name} · `menu.party_full`
- `menu.mission_done` {mission} · `menu.reroll` · `menu.level_up` {level} · `menu.unlock` {item}
- `menu.shop` · `menu.dossier` · `menu.how_to_play` · `menu.custom` · `menu.watch` · `menu.teams`

### Tutorial (once per match; host sends at the right moment; include hint text)
- `tut.spawn` (click land to place your nation) · `tut.expand` (click empty land; presets set troops)
- `tut.attack` (click a neighbour's land to attack; right-click for more orders)
- `tut.city` (+25k troop cap per level) · `tut.factory` (cities/ports within 60 tiles become stops)
- `tut.hub` (300-tile network, white roads, convoys 25% faster and reach 2 stops)
- `tut.port` (ports trade by sea and build warships) · `tut.enrich` (only on a ☢ deposit; no deposit caps uranium at 200)
- `tut.fort` (attackers pay 5× troops and move 3× slower within range)
- `tut.upgrade` (place a building on your own of the same type to upgrade; same price)
- `tut.warship` (picks its own targets; give it a patrol worth the fuel)
- `tut.silo` · `tut.research` · `tut.radar` (earlier warning = better interception odds)
- `tut.defense` (each level adds a shot; each type covers specific warheads)
- `tut.dugin` (old land is dug in — costs twice the troops; striped land is fresh; fallout softens a line)
- `tut.supply` (attacks weaken far from cities/hubs; cut-off pockets starve)
- `tut.council` · `tut.weather` · `tut.boat` · `tut.alliance`

### Match flow
- `game.start` · `game.spawned` · `game.partner_spawned` {name} · `game.peace_end`
- `defcon.4` · `defcon.3` · `defcon.2` · `defcon.1`
- `clock.5min` · `clock.2min` · `clock.1min` · `clock.pulled_back`
- `milestone.10` · `milestone.25` · `milestone.50` · `rank.top3` · `rank.first`
- `game.paused` · `game.saved` · `game.loaded` · `game.speed` {speed}

### Land war
- `attack.incoming` {nation, troops} · `attack.repelled` {nation} · `attack.launched` {target, troops}
- `attack.expand` {troops} · `attack.stalled` · `attack.recalled`
- `land.lost_big` {nation} · `capital.taken` {nation, credits, uranium} · `capital.lost` {nation}
- `nation.fell` {nation} · `nation.fell_us` {nation} (we eliminated them) · `pocket.cut` · `supply.overextended`

### Building / economy
- `build.done` {type, level} · `build.upgraded` {type, level} · `build.lost` {type, nation}
- `build.cant_afford` {type} · `build.bad_spot` {reason} · `build.need_deposit`
- `econ.convoy_blocked` {nation} · `econ.uranium_capped` · `econ.rich`

### Naval
- `naval.transport_inbound` {nation} · `naval.transport_sunk_enemy` {nation} · `naval.our_transport_sunk`
- `naval.landing` · `naval.warship_ready` · `naval.warship_lost` · `naval.prize` {nation, amount}
- `naval.our_trade_seized` {nation}

### Strategic weapons
- `research.started` {weapon} · `research.done` {weapon}
- `missile.launched` {weapon, nation} · `missile.launch_all` {count, weapon}
- `missile.inbound` {weapon, nation, eta} (priority 3) · `radar.early_warning` {weapon, nation}
- `missile.intercepted` {weapon} · `missile.impact_us` {weapon} · `missile.hit_enemy` {weapon, nation}
- `missile.world_first` (first nuclear detonation anywhere) · `fallout.us` · `emp.us`

### Diplomacy
- `diplo.offer` {nation} (they offer us an alliance) · `diplo.accepted` {nation} · `diplo.declined` {nation}
- `diplo.betrayed` {nation} (an ally broke with us — priority 3) · `diplo.we_betrayed` {nation}
- `diplo.truce_offer` {nation} · `diplo.truce` {nation} · `diplo.truce_declined` {nation} · `diplo.truce_over` {nation}
- `diplo.embargo_us` {nation} · `diplo.embargo_them` {nation} · `diplo.ally_attacked` {nation}
- `diplo.alliance_cap` · `diplo.party_no_alliance` · `diplo.gift` {nation}

### Council / weather
- `council.session` {resolution} · `council.passed` {resolution} · `council.failed` {resolution}
- `weather.storm` · `weather.storm_us`

### Endings
- `end.victory` · `end.defeat` · `end.winter` · `end.timeout_win` · `end.timeout_loss` · `end.resign`
- `end.alliance_win` · `end.council`

Unknown keys must not throw (ignore, or `say` a generic line if params.text is given).
