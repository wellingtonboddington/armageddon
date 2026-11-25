# MIDNIGHT PROTOCOL — Design & Balance Notes

MIDNIGHT PROTOCOL is an original game. Its genre (real-time territory grand strategy) and the mechanics below were specified by the designer. Some numbers were read from reference HUD material ("obs") or given directly by the designer ("designer"). Everything marked **[INFERRED / ASSUMED]** is a tuned value. All constants live in `src/js/02_config.js`.

## Observed / designer-specified values

| System | Value |
|---|---|
| Nations | 100 (player + 99 AI) — obs |
| Match length | ~40:00 — obs |
| Calendar | Jan 2031 start, ~7.3 s per in-game month — obs |
| Doomsday Clock | starts 12:00 to midnight, drifts down over time — obs |
| Peace timer | ~5:00 after spawn → DEFCON 4 — obs |
| Base income | +250 credits/s — obs |
| Land states | DUG IN ×2 / SOFT ×1; striped = fresh — obs |
| Capital loot | +1,450 credits / +104 U seen on a small capital — obs (scaled to victim) |
| Attack presets | 10 / 25 / 35 / 50 / 75 % — obs |
| City | +25k troop cap per level — designer |
| Factory | stops = cities/ports/factories within 60 tiles; each level ×2 convoys & ×2 gold — designer |
| Logistics Hub | 300-tile network, white roads, +25 % convoy speed, convoys reach 2 stops — designer |
| Fort | 50-tile radius, doubles per level; attackers pay ×5 troops and move ×3 slower — designer |
| Uranium | capped at 200 without an enrichment plant on a free deposit — designer |
| Upgrades | build on your own building of the same type; same price as a new one — designer |
| Alliances | max 5 without a party; party = up to 2 bots and no alliances — designer |
| Betrayal | ~25 % chance when an AI is tempted — designer |
| Defences | one interception shot per level; Tactical 70 % for a SAM; types cover specific warheads — designer |
| Radar | earlier warning → higher interception odds — designer |
| Building cost ladders | City 3k→5k→9k→12k→21k→27k→39k · Port 4k→8k→16k→23k · Factory 6k→12k→18k · Hub 5k→10k→18k · Enrichment 5k→10k→15k→25k→35k · Fort 1.5k→3k→4.5k→6k · Warship 6k→12k — obs |
| Doctrines | Homeland, Fortress, Deterrence, First Strike, Industrialist (L8), Blitz (L12), Admiralty (L15) — designer favourites |

## Fitted formulas

| Formula | Value |
|---|---|
| Cost ladder | `base + a·n^p`; n = levels already owned; per-type a/p fitted to the ladders above |
| Troop cap | `40k + 1420·tiles^0.41 + 25k·cityLevels` — fitted to HUD readings (63k @ 898 tiles … 394k @ 36.5k tiles) |
| Troop growth (k/s) | `0.277·T^0.73·(1 − T/cap)` — fits every observed HUD sample within ~5 % |

## [INFERRED / ASSUMED]

| System | Value |
|---|---|
| Simulation | 10 Hz fixed step; render at display rate |
| Spawn | 15 s spawn phase; ~250-tile start blob; 20k troops, 5k credits, 25 U; 90 s spawn protection |
| Income | `+0.0075/tile/s` on top of base |
| Uranium | +0.33 U/s base; +1.5 U/s per enrichment level |
| Terrain costs | plains 3 · forest 4 · desert 4 · tundra 4 troops/tile; highlands ×1.6 cost / 0.8 speed; mountains ×3 / 0.5 |
| Enemy tiles | `terrain·dug + defenderDensity·1.0`; defender loses `density·0.7` per tile |
| Supply | full strength within 120 tiles of a capital/city/hub; up to +60 % cost beyond |
| Dig-in time | 45 s |
| Convoys | every 6 s per factory (÷2^(L−1)); pay 150·(1 + dist/60) to the factory owner, half that to the stop owner |
| Trade ships | port → port within 520 tiles, every 14 s; cargo 400·(1 + dist/300), 60 % to the receiver |
| Warship | 1,200 HP · 55 dps · 7-tile range · 90 s fuel away from port · 60-tile patrol |
| Transport | 400 HP |
| DEFCON | 4 when the peace timer ends · 3 at 10 % land or the first detonation · 2 at 25 % or clock ≤ 5:00 · 1 at clock ≤ 2:00 (weapons −25 %) |
| Clock | drift 0.08 s/s · nation falls +1.5 s · betrayal +5 s · Tactical 5 · Hypersonic 10 · ICBM 18 · MIRV 40 (8 per warhead) · Orbital 25 · EMP 3 · interception −3 s · lasers −0.5 s/min each |
| Weapons | Airstrike 8k, r6 · Tactical 5k+50U, r10 · Hypersonic 15k+150U, r14 · ICBM 25k+300U, r22 · MIRV 50k+600U, 5×r12 · Orbital 60k+200U, r18, 60 s cooldown · EMP 20k+80U, r30, 25 s shutdown |
| Research | Airstrike 8k/15 s · Tactical 20k+50U/25 s · Hypersonic 40k+150U/35 s · ICBM 60k+300U/45 s · MIRV 100k+600U/60 s · Orbital 150k+400U/60 s · EMP 30k+100U/30 s |
| Silos | 20k+100U, 10 s build, one ready missile per level, 30 s reload |
| SAM | Tactical 70 %, Airstrike 60 %, range 40 |
| ABM | ICBM 60 %, EMP 50 %, range 90 |
| Laser | Hypersonic 60 %, Orbital 40 %, range 50 |
| Aegis Net | MIRV warhead 55 %, range 70 |
| Radar | range 120 (+25 %/level) |
| Warning factor | ×0.80 (no radar) → ×1.25 (detected at launch); chances capped at 95 % |
| Fallout | 60 s, radius ×1.25, halves troop growth on covered land and keeps it soft |
| Council | session every 4:00, 20 s vote; mandates last 2:00 |
| Win | 80 % of the world's land, last nation/team standing, every survivor allied with you, or the largest nation when time runs out |

## Architecture

| Module | Role |
|---|---|
| `00_core` | `MP` namespace, event bus, settings, audio graph |
| `10_world` | land mask decode, procedural terrain, deposits, coasts, water components, 2×2 naval A* grid with route caching |
| `11_state` | match state, tile ownership (`Uint8Array` owners, `Float32Array` soft timers, FIFO dig-in queue), border sets, structures, capitals |
| `12_economy` | troops, income, uranium, construction, routes/roads, convoys |
| `13_combat` | spawning, frontier-queue attacks, forts, supply, pocket detection & annexation |
| `14_naval` | trade ships, warships, transports |
| `15_weapons` | research, silos, missiles, radar detection, interception, detonations, fallout, EMP |
| `16_diplo` | alliances, truces, embargoes, betrayal, Global Council |
| `17_weather` | storm fronts |
| `18_ai` | per-nation staggered AI (≈1 decision/s each) |
| `19_game` | phases, DEFCON/clock, milestones, endings, save/resume (IndexedDB) |
| `20_render` | cached terrain + incremental territory layer (dirty-chunk `putImageData`), overlays, labels, FX, minimap |
| `21_hud` / `22_menu` | interface |
| `05_sfx` | procedural audio |
| `advisor/` | VESPER |
