# MIDNIGHT PROTOCOL

An original, fully offline real-time grand strategy game in a single HTML file. You place a nation on a real world map, expand, trade, fortify and negotiate against up to 99 AI commanders. Then you decide how close to midnight you are willing to push the Doomsday Clock.

**Modes:** Free-for-all, Teams, Custom rules, Watch, **PRE-SET COUNTRIES** (lead a real country on real borders) and **ALIEN INVASION** (the Void Armada lands after a grace period of 0:30 on pre-set countries or 5:00 with custom nations).

**Your progress:** level, skills, unlocks and settings are kept in your browser. SAVE FILE in the menu exports, imports or links a save file, so progress carries across new versions, browsers and computers.

**Play:** download [`index.html`](index.html) and open it in Chrome, Edge or Firefox. It doesn't need an internet connection, an install, a server or any other files. Progress, settings and the auto-save live in your browser's local storage. The game goes fullscreen on your first click; you can turn that off in Settings or use the ⛶ button.

**Slow computer?** Settings → GRAPHICS is on AUTO by default: if frames take too long it lowers render resolution and how often the map overlays, labels and minimap refresh. You can also pick HIGH, BALANCED or LOW yourself. No game mechanic changes with this setting.

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
  - Forts make attackers pay ×5 troops and advance ×3 slower. Their range doubles per level. Fortress forts keep a 50-tile range but every level adds ×5 cost and ×3 slow (up to ×15 / ×15); Trench forts reach 100 tiles at most and go up to ×7 / ×7.
  - Terrain affects the cost and speed of attacks.
  - Supply lines weaken attacks far from your cities and hubs. Cut-off pockets starve, and encircled ones are annexed.
  - Taking a capital pays loot, and a captured capital brings the whole nation down. Scorched Earth nations fight on from their pockets.
  - **Capital strikes:** a missile on a capital cuts the nation's morale (slower recruiting, costlier attacks, easier to invade). Half the time the government surrenders on the spot and the attacker takes everything. Otherwise the capital lies in ruins (it is not moved) and must be rebuilt within 3:00 with the REBUILD button, or the nation surrenders to whoever hit it.
  - Where you click is where your forces concentrate. Attacks break through toward the clicked point, and clicking again on the same spot pushes harder. That's how you punch through gaps between forts.
  - **Divisions** appear as a few big flags on the line: infantry (with artillery or drones) and armour (tanks or motorised). Armour is a small formation that hits like a big one: attacks advance 30% faster for each armoured division at the push, and breakthroughs get +20% more. More land and more credits mean more and bigger divisions. They draw on your troop pool and need supply from a factory, hub or capital in range; unsupplied divisions fight at 60%.
  - Divisions stay hidden in garrison until you press `T` on a front, attack, or get invaded. When you're invaded they jump straight onto the threatened line, and gaps between them are weak spots for the enemy.
  - Divisions are buffs on the land where they stand. Hover your front and press `R` to send an armoured division there, or `F` for an infantry division. Press again on the same spot to stack up to 3. `T` sends the whole army along the front with the nation under the cursor; `T` again stands down. Right-click a flag to send it back to reserve.
  - The DIVISIONS panel (left, above VESPER) shows armour and infantry and what is in reserve, with TRAIN ALL (a fully trained division counts ×2; only new divisions can be trained), UPGRADE and +1 DIVISION. You can also click ARMOUR or INFANTRY there and then click the front.
  - **Battle plans:** click a division's flag to select it (shift-click adds more). With divisions selected, a click is an order and never sends troops: enemy land sets an **objective**, an enemy division's flag means **engage** (they hunt it and fight it when in reach, until one side is destroyed), your land moves them. Divisions stand on your side of the line and move up as it advances. Pick an attack plan in the DIVISIONS panel (**SPEARHEAD**: drive at the objectives · **BROAD**: even pressure, 8% cheaper · **ENCIRCLE**: two prongs behind both ends of the front to close a pocket · **HOLD**: dig in, +15% defence, no advance) and press `X` to execute: one attack goes in with your attack % and follows the plan without more clicks.
  - A stack (up to 3 on one spot): the front division digs in 33% faster and attacks advance 10% faster; attackers pay 25% more troops and the defender loses ground 25% slower.
  - Divisions that were on the line before the enemy invaded defend 15% better and give ground 15% slower. That holds if you pressed `T` while the enemy wasn't attacking, including in a pause between their attacks.
  - The enemy sees divisions that are training or moving on your shared border, and you see theirs.
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
- **Doctrines:** all unlocked from the start. New ones are Trench Warfare ("Fight me like a man.") and Blitzkrieg; Scorched Earth and Homeland were reworked. Land a Homeland nation takes back from its original territory digs in at once; land a Scorched Earth nation retakes digs in after 5 s. Fortress and Trench Warfare forts cost half; Fortress fort upgrades always cost what your first fort did. A fort Scorched Earth loses becomes an inverse fort: inside its old range Scorched Earth pays 75% fewer troops and moves 3× faster. Scorched Earth pockets never surrender and cost ×5 to crush, and so does all its land once its capital has fallen.
- **Skill tree:** 50 skills in 6 branches, including a DIVISIONS branch; each level grants 1 point, and respec is free.
- **Features original to this game:** doctrines with field directives, supply lines, the Global Council (resolutions put to a vote), EMP strikes, drifting weather fronts, and pause / 1–4× speed / save & resume.
- **VESPER:** your intelligence advisor, an original character with procedural pixel art. She speaks in a female browser voice (Web Speech API) with typed briefings, in the menu and in matches. Sound cues play when speech is unavailable.
- **Sound:** all sound is synthesised with the Web Audio API: UI, hover ticks, building, invasions, radar, launches, sirens, detonations, naval alerts, ambience and menu music.
- **Progression:** levels, ranks, daily and weekly missions, scrap, an armory of cosmetics, 5 loadouts, 20 commendations and 8 endings.

## Controls

| Input | Action |
|---|---|
| Left click | Spawn, expand, attack, place a building, fire a weapon |
| Middle click (or Alt+click) | Orders menu on a nation (Info · Attack · Boat · Ally · Truce · Target · Embargo · Gift · Ask · Cede · Focus) |
| Right click | Cancel the current mode / set a selected warship's patrol |
| Drag / wheel / minimap | Pan / zoom / jump |
| `1`–`8` | City, Port, Factory, Hub, Enrichment, Fort, Warship, Silo |
| `R` / `F` | Send an armoured / infantry division to the spot under the cursor (again = stack) |
| `T` | Whole army to the front with the nation under the cursor; again = stand down |
| Click a division flag | Select it (Shift adds); then click enemy land = objective, an enemy flag = engage, your land = move — no troops are sent |
| `X` | Execute the battle plan (one attack that follows your objectives) |
| Right click a division flag | Send it back to reserve (Shift = the whole stack) |
| `K` `G` `Y` `U` `J` | Radar, SAM, ABM, Laser, Aegis Net |
| `Z` `N` `H` `I` `M` `O` `E` | Airstrike, Tactical, Hypersonic, ICBM, MIRV, Orbital, EMP |
| `L` / Shift-click | Toggle LAUNCH ALL / launch all once |
| `Space` | Pause |
| `C` / `Home` | Centre on your capital |
| `+` / `−` | Attack ratio |
| `Esc` | Cancel / settings |

## Development

The source is split under `src/`, and `tools/build.mjs` inlines it into `index.html`:

```bash
node tools/build.mjs
```

`tools/genmap.mjs` regenerates `src/js/01_mapdata.js` from the `world-atlas` npm package. See [docs/DESIGN.md](docs/DESIGN.md) for the balance table and system design, and [docs/ADVISOR_INTERFACE.md](docs/ADVISOR_INTERFACE.md) for the advisor module contract.
