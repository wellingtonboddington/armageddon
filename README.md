# MIDNIGHT PROTOCOL

An original, fully offline real-time grand strategy game in a single HTML file. You place a nation on a real world map, expand, trade, fortify and negotiate against up to 99 AI commanders. Then you decide how close to midnight you are willing to push the Doomsday Clock.

**Play:** download [`index.html`](index.html) and open it in Chrome, Edge or Firefox. It doesn't need an internet connection, an install, a server or any other files. Progress, settings and the auto-save live in your browser's local storage. The game goes fullscreen on your first click; you can turn that off in Settings or use the ⛶ button.

## What's inside

- **World:** a 2000×948-tile world map rasterised from Natural Earth (public domain), with procedural terrain: plains, forest, desert, tundra, highlands and mountains. It has about 85 ☢ uranium deposits.
- **Nations:** up to 100 of them (you plus 99 AI), each with a personality, a difficulty level, a doctrine and a real or custom flag. You choose where you spawn.
- **Economy:**
  - Cities add +25k troop cap per level.
  - Factories send convoys to cities, ports and factories within 60 tiles. Each factory level doubles its output.
  - Logistics Hubs build 300-tile white road networks. Their convoys travel 25% faster and reach 2 stops.
  - Ports run trade ships.
  - Enrichment plants only work on free deposits. Without one, uranium caps at 200.
  - Placing a building on one of your own of the same type upgrades it.
- **Land war:**
  - Dug-in land costs ×2 troops to take; striped (fresh) land is soft.
  - Forts make attackers pay ×5 troops and advance ×3 slower. Their range doubles per level.
  - Terrain affects the cost and speed of attacks.
  - Supply lines weaken attacks far from your cities and hubs. Cut-off pockets starve, and encircled ones are annexed.
  - Taking a capital pays loot, and a captured capital brings the whole nation down. Scorched Earth nations fight on from their pockets.
  - Where you click is where your forces concentrate. Attacks break through toward the clicked point, and clicking again on the same spot pushes harder. That's how you punch through gaps between forts.
  - Front lines show each side's committed troops, as in war-map animations. The attacker's number appears as soon as they attack; a defender's number appears only once they commit troops (the DEFEND button on incoming attacks). Large cut-off pockets show "N Encircled" before they fall.
- **Navy:** warships run on patrol fuel, hunt transports and warships, and capture trade ships as prizes. Transports land troops on marked coasts.
- **Strategic weapons:** Airstrike, Tactical, Hypersonic, ICBM, MIRV (splits into 5 warheads), Orbital and EMP. Each is researched once, then fired from silos; `LAUNCH ALL` fires every ready silo.
- **Defences:**
  - SAM, ABM, Laser and Aegis Net each cover specific warhead types.
  - Each level adds one interception shot and nothing else.
  - Radar warns earlier, and earlier warning raises every interception roll.
- **DEFCON 5→1 and the Doomsday Clock:** the clock starts at 12:00 to midnight. If it reaches 0:00, Nuclear Winter ends the match with no winner.
- **Diplomacy:**
  - Alliances (up to 5), 3-minute truces, embargoes and gifts.
  - Betrayal is rare and flags the betrayer as a traitor.
  - Bots weigh your strength, borders and history before accepting an offer.
  - A party replaces your alliances. Either take 2 partner bots, whose doctrines and drop zones are assigned by the game, or 1 **PUPPET-STATE** whose doctrine you pick and whose location you click during spawn.
  - The puppet-state never betrays you and never outgrows or out-earns you; it hands over the excess. It follows you into every war, by land or with missiles, and sends troops when it can't reach the enemy. It says yes to aid requests 99% of the time.
  - **CEDE:** 65% chance (+5% for each gift you've sent it) that the puppet hands over everything. If it refuses, it declares independence, goes to war with you, and recruits your enemies.
  - Victory pools alliance land. Any bloc that isn't yours reaching the win % ends the match; your own alliance has to take the whole world.
  - **TARGET** (radial menu) marks an enemy for your allies and party to focus.
  - **Ask Troops / Ask Credits** requests aid from an ally, who may say no.
- **Doctrines:** all unlocked from the start. New ones are Trench Warfare ("Fight me like a man.") and Blitzkrieg; Scorched Earth and Homeland were reworked.
- **Skill tree:** 20 skills in 5 branches; each level grants 1 point, and respec is free.
- **Features original to this game:** doctrines with field directives, supply lines, the Global Council (resolutions put to a vote), EMP strikes, drifting weather fronts, and pause / 1–4× speed / save & resume.
- **VESPER:** your intelligence advisor, an original character with procedural pixel art. She speaks in a female browser voice (Web Speech API) with typed briefings, in the menu and in matches. Sound cues play when speech is unavailable.
- **Sound:** all sound is synthesised with the Web Audio API: UI, hover ticks, building, invasions, radar, launches, sirens, detonations, naval alerts, ambience and menu music.
- **Progression:** levels, ranks, daily and weekly missions, scrap, an armory of cosmetics, 5 loadouts, 20 commendations and 8 endings.

## Controls

| Input | Action |
|---|---|
| Left click | Spawn, expand, attack, place a building, fire a weapon |
| Right click | Radial orders on a nation (Info · Attack · Boat · Ally · Truce · Embargo · Gift · Focus) |
| Drag / wheel / minimap | Pan / zoom / jump |
| `1`–`8` | City, Port, Factory, Hub, Enrichment, Fort, Warship, Silo |
| `R` `T` `Y` `U` `J` | Radar, SAM, ABM, Laser, Aegis Net |
| `Z` `N` `H` `I` `M` `O` `E` | Airstrike, Tactical, Hypersonic, ICBM, MIRV, Orbital, EMP |
| `L` / Shift-click | Toggle LAUNCH ALL / launch all once |
| `Space` | Pause |
| `F` | Centre on your capital |
| `+` / `−` | Attack ratio |
| `Esc` | Cancel / settings |

## Development

The source is split under `src/`, and `tools/build.mjs` inlines it into `index.html`:

```bash
node tools/build.mjs
```

`tools/genmap.mjs` regenerates `src/js/01_mapdata.js` from the `world-atlas` npm package. See [docs/DESIGN.md](docs/DESIGN.md) for the balance table and system design, and [docs/ADVISOR_INTERFACE.md](docs/ADVISOR_INTERFACE.md) for the advisor module contract.
