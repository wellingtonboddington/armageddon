/* MIDNIGHT PROTOCOL — balance constants. Values marked "obs" were read from reference
   material or given by the designer; everything else is a tuned assumption. */
(function () {
  'use strict';
  const MP = window.MP;

  const C = (MP.CONFIG = {
    TICK: 0.1,                 // sim step (s) — 10 Hz
    MATCH_SECONDS: 40 * 60,    // obs ~40:00 match timer
    SPAWN_SECONDS: 15,
    PEACE_SECONDS: 5 * 60,     // obs ~5:00 shield timer after spawn phase → DEFCON 4
    MONTH_SECONDS: 7.3,        // obs calendar pace (Jan 2031 start)
    START_YEAR: 2031,

    CLOCK_START: 12 * 60,      // obs 12:00 to midnight
    CLOCK_DRIFT_PER_SEC: 0.1,  // passive drift
    CLOCK: { nationFell: 1.5, betrayal: 5, intercept: -3, laserPerMin: -1, councilBan: -20,
             Tactical: 8, Hypersonic: 15, ICBM: 25, MIRV: 50, Orbital: 35, EMP: 4, Airstrike: 0 },

    START_TROOPS: 20000,
    START_CREDITS: 5000,
    START_URANIUM: 25,
    SPAWN_RADIUS: 9,
    PROTECT_SECONDS: 90,       // early spawn protection: nations can only take unclaimed land
    BASE_INCOME: 250,          // obs +250/s
    INCOME_PER_TILE: 0.0075,
    URANIUM_BASE_RATE: 0.33,
    URANIUM_CAP_NO_DEPOSIT: 200, // obs (designer)
    ENRICH_RATE: 1.5,          // U/s per enrichment level

    // troop cap = 40k + 1420·tiles^0.41 + 25k·city levels (fit to observed HUD values)
    CAP_BASE: 40000, CAP_LAND_K: 1420, CAP_LAND_P: 0.41, CITY_CAP: 25000,
    // growth (k/s) = 0.277·T^0.73·(1−T/cap) (T in thousands) — fit to observed HUD values
    GROW_K: 0.277, GROW_P: 0.73, GROW_FLOOR: 300,

    DUG_IN_SECONDS: 45,        // fresh (striped) land hardens after this
    DUG_IN_MULT: 2,            // obs ×2
    FORT_COST_MULT: 5, FORT_SLOW: 3, FORT_RADIUS: 50, // designer
    SUPPLY_FREE: 120, SUPPLY_SPAN: 300, SUPPLY_MAX_PENALTY: 0.6,

    TERRAIN_COST: [3, 4, 4, 4],          // biome: plains, forest, desert, tundra (troops/tile, unclaimed)
    ELEV_COST: [1, 1.6, 3],              // lowland, highlands, mountains
    ELEV_SPEED: [1, 0.8, 0.5],
    DENSITY_COST: 1.0,                   // attacker troops per defender troop-density per tile
    DENSITY_LOSS: 0.7,                   // defender troops lost per tile captured × density
    ATTACK_SPEED_BASE: 8, ATTACK_SPEED_SQRT: 1 / 6, EXPAND_SPEED_MULT: 1.5,

    CAPITAL_LOOT_CREDITS: 0.25, CAPITAL_LOOT_URANIUM: 0.3, // obs +1,450 / +104 on a small capital
    ATTACK_PRESETS: [0.10, 0.25, 0.35, 0.50, 0.75],          // obs

    FACTORY_RANGE: 60,         // designer
    HUB_RANGE: 300,            // designer
    HUB_SPEED: 1.25,           // designer
    CONVOY_INTERVAL: 6, CONVOY_PAY: 150, CONVOY_SPEED: 6, CONVOY_FOREIGN_SHARE: 0.5,
    TRADE_SHIP_INTERVAL: 14, TRADE_SHIP_PAY: 400, TRADE_SHIP_SPEED: 4, TRADE_RANGE: 520,
    WARSHIP: { hp: 1200, dps: 55, range: 7, speed: 3.2, fuel: 90, patrol: 60, sight: 40 },
    TRANSPORT: { hp: 400, speed: 1.6 },
    TRADE_SHIP_HP: 250,

    TRUCE_SECONDS: 180,        // obs 3-minute truce
    ALLIANCE_MAX: 5,           // designer (no party)
    PARTY_MAX: 2,              // designer
    BETRAY_CHANCE: 0.25,       // designer: ~25% when tempted
    OFFER_SECONDS: 20,

    COUNCIL_INTERVAL: 240, COUNCIL_VOTE_SECONDS: 20, COUNCIL_EFFECT: 120,
    WEATHER_MAX: 4,
    EMP_SECONDS: 25,
    FALLOUT_SECONDS: 60,
    WIN_PCT: 80,
    MILESTONES: [10, 25, 50],
  });

  // ---------- buildings ----------
  // cost(n) = base + a·n^p (n = total levels already owned) — fit to observed cost ladders
  C.BUILD = {
    city:    { key: '1', name: 'City', icon: 'city', base: 3000, a: 2050, p: 1.6, time: 4, u: 0 },
    port:    { key: '2', name: 'Port', icon: 'port', base: 4000, a: 4000, p: 1.5, time: 5, u: 0 },
    factory: { key: '3', name: 'Factory', icon: 'factory', base: 6000, a: 6000, p: 1.2, time: 5, u: 0 },
    hub:     { key: '4', name: 'Logistics Hub', icon: 'hub', base: 5000, a: 5000, p: 1.4, time: 6, u: 0 },
    enrich:  { key: '5', name: 'Enrichment', icon: 'enrich', base: 5000, a: 5000, p: 1.25, time: 6, u: 0 },
    fort:    { key: '6', name: 'Fort', icon: 'fort', base: 1500, a: 1500, p: 1.0, time: 4, u: 0 },
    warship: { key: '7', name: 'Warship', icon: 'warship', base: 6000, a: 6000, p: 1.0, time: 8, u: 0, unit: true },
    silo:    { key: '8', name: 'Missile Silo', icon: 'silo', base: 20000, a: 12000, p: 1.2, time: 10, u: 100 },
    radar:   { key: 'R', name: 'Radar', icon: 'radar', base: 12000, a: 7000, p: 1.2, time: 6, u: 0, defense: true },
    sam:     { key: 'T', name: 'SAM Site', icon: 'sam', base: 15000, a: 9000, p: 1.2, time: 6, u: 50, defense: true },
    abm:     { key: 'Y', name: 'ABM Site', icon: 'abm', base: 30000, a: 18000, p: 1.2, time: 8, u: 150, defense: true },
    laser:   { key: 'U', name: 'Laser Array', icon: 'laser', base: 45000, a: 25000, p: 1.2, time: 10, u: 250, defense: true },
    aegis:   { key: 'J', name: 'Aegis Net', icon: 'aegis', base: 40000, a: 22000, p: 1.2, time: 10, u: 200, defense: true },
  };
  C.BUILD_ORDER = ['city', 'port', 'factory', 'hub', 'enrich', 'fort', 'warship', 'silo'];
  C.DEFENSE_ORDER = ['radar', 'sam', 'abm', 'laser', 'aegis'];
  C.STRUCT_SPACING = 6;

  // Defences: interception chance per warhead type. One shot per level (designer); radar lead
  // time scales chance (designer: earlier warning → better odds).
  C.DEFENSE = {
    radar: { range: 120 },
    sam:   { range: 40, reload: 12, vs: { Tactical: 0.70, Airstrike: 0.60 } },
    abm:   { range: 90, reload: 14, vs: { ICBM: 0.60, EMP: 0.50 } },
    laser: { range: 50, reload: 4,  vs: { Hypersonic: 0.60, Orbital: 0.40 } },
    aegis: { range: 70, reload: 6,  vs: { MIRV: 0.55 } },
  };
  C.WARN = { noRadarLead: 0.15, minF: 0.8, maxF: 1.25, cap: 0.95 };

  // ---------- strategic weapons ----------
  C.WEAPON = {
    Airstrike:  { key: 'Z', defcon: 4, research: [8000, 0, 15],  cost: [8000, 0],    radius: 6,  speed: 40, range: 160, arc: 0.12, from: 'city', nuclear: false, icon: 'jet' },
    Tactical:   { key: 'N', defcon: 4, research: [20000, 50, 25], cost: [5000, 50],   radius: 10, speed: 28, range: 300, arc: 0.3, from: 'silo', nuclear: true, icon: 'tac' },
    Hypersonic: { key: 'H', defcon: 3, research: [40000, 150, 35], cost: [15000, 150], radius: 14, speed: 90, range: 700, arc: 0.08, from: 'silo', nuclear: true, icon: 'hyp' },
    ICBM:       { key: 'I', defcon: 3, research: [60000, 300, 45], cost: [25000, 300], radius: 22, speed: 34, range: 0, arc: 0.45, from: 'silo', nuclear: true, icon: 'icbm' },
    MIRV:       { key: 'M', defcon: 2, research: [100000, 600, 60], cost: [50000, 600], radius: 12, speed: 30, range: 0, arc: 0.5, from: 'silo', nuclear: true, icon: 'mirv', warheads: 5, spread: 30 },
    Orbital:    { key: 'O', defcon: 2, research: [150000, 400, 60], cost: [60000, 200], radius: 18, speed: 0, range: 0, arc: 0, from: 'orbit', nuclear: false, icon: 'orbit', charge: 3, cooldown: 60 },
    EMP:        { key: 'E', defcon: 4, research: [30000, 100, 30], cost: [20000, 80],  radius: 30, speed: 32, range: 500, arc: 0.35, from: 'silo', nuclear: false, icon: 'emp' },
  };
  C.WEAPON_ORDER = ['Airstrike', 'Tactical', 'Hypersonic', 'ICBM', 'MIRV', 'Orbital', 'EMP'];
  C.SILO_RELOAD = 30;
  C.DEFCON_DISCOUNT = 0.75; // DEFCON 1

  // ---------- doctrines ----------
  // mods: multiplicative unless noted
  C.DOCTRINES = [
    { id: 'homeland', name: 'Homeland', level: 1, icon: 'flag',
      desc: 'Attackers lose 15% more troops on your land · Your attacks advance 10% slower',
      mods: { defendCost: 1.15, attackSpeed: 0.9 } },
    { id: 'fortress', name: 'Fortress', level: 1, icon: 'fort',
      desc: 'Forts cost half · Your attacks advance 10% slower',
      mods: { cost_fort: 0.5, attackSpeed: 0.9 } },
    { id: 'deterrence', name: 'Deterrence', level: 1, icon: 'shield',
      desc: 'Defences and radar cost 30% less · Troops grow 15% slower',
      mods: { cost_defense: 0.7, growth: 0.85 } },
    { id: 'firststrike', name: 'First Strike', level: 1, icon: 'silo',
      desc: 'Silos build 40% faster and reload 30% faster · 30% fewer starting troops',
      mods: { siloBuild: 0.6, siloReload: 0.7, startTroops: 0.7 } },
    { id: 'signals', name: 'Signals', level: 3, icon: 'radar', original: true,
      desc: 'Radar range +50% and earlier warnings · Income 10% lower',
      mods: { radarRange: 1.5, income: 0.9 } },
    { id: 'merchant', name: 'Merchant Marine', level: 5, icon: 'port', original: true,
      desc: 'Trade ships pay 40% more · Warships cost 25% more',
      mods: { tradeShip: 1.4, cost_warship: 1.25 } },
    { id: 'industrialist', name: 'Industrialist', level: 8, icon: 'factory',
      desc: 'Cities, ports, factories and logistics hubs cost 20% less · +10% income · Weapons research 25% slower',
      mods: { cost_city: 0.8, cost_port: 0.8, cost_factory: 0.8, cost_hub: 0.8, income: 1.1, research: 1.25 } },
    { id: 'bunker', name: 'Bunker State', level: 10, icon: 'bunker', original: true,
      desc: 'Your land takes 40% less nuclear damage · Cities cost 20% more',
      mods: { nukeDamage: 0.6, cost_city: 1.2 } },
    { id: 'blitz', name: 'Blitz', level: 12, icon: 'bolt',
      desc: 'Attacks advance 15% faster · 10% lower troop cap',
      mods: { attackSpeed: 1.15, cap: 0.9 } },
    { id: 'scorched', name: 'Scorched Earth', level: 14, icon: 'fire', original: true,
      desc: 'Land you lose stays fresh for the enemy and its buildings burn · 10% lower troop cap',
      mods: { scorched: 1, cap: 0.9 } },
    { id: 'admiralty', name: 'Admiralty', level: 15, icon: 'anchor',
      desc: 'Ports and warships cost 30% less · 10% lower troop cap',
      mods: { cost_port: 0.7, cost_warship: 0.7, cap: 0.9 } },
  ];

  // field directives — picked at 10% and 25% land (original mechanic)
  C.DIRECTIVES = [
    { id: 'conscription', name: 'Conscription', desc: '+12% troop cap', mods: { cap: 1.12 } },
    { id: 'war_bonds', name: 'War Bonds', desc: '+15% income', mods: { income: 1.15 } },
    { id: 'rail_corps', name: 'Rail Corps', desc: 'Supply lines reach 60% further', mods: { supply: 1.6 } },
    { id: 'shock_troops', name: 'Shock Troops', desc: 'Attacks cost 10% fewer troops', mods: { attackCost: 0.9 } },
    { id: 'deep_mines', name: 'Deep Mines', desc: '+40% uranium output', mods: { uranium: 1.4 } },
    { id: 'civil_defense', name: 'Civil Defence', desc: 'Interception odds +10%', mods: { intercept: 1.1 } },
    { id: 'drydocks', name: 'Drydocks', desc: 'Warships build twice as fast and have +30% HP', mods: { shipHp: 1.3, shipBuild: 0.5 } },
    { id: 'skunkworks', name: 'Skunkworks', desc: 'Weapons research 30% faster', mods: { research: 0.7 } },
  ];

  // ---------- AI personalities ----------
  C.PERSONALITIES = {
    expansionist: { aggro: 0.75, build: 0.8, nuke: 0.5, trade: 0.5, defense: 0.4, naval: 0.5, ally: 0.5, betray: 1.3 },
    turtle:       { aggro: 0.35, build: 1.1, nuke: 0.3, trade: 0.7, defense: 1.0, naval: 0.3, ally: 0.8, betray: 0.6 },
    trader:       { aggro: 0.45, build: 1.2, nuke: 0.3, trade: 1.2, defense: 0.6, naval: 0.9, ally: 0.9, betray: 0.7 },
    hawk:         { aggro: 0.85, build: 0.8, nuke: 1.2, trade: 0.4, defense: 0.6, naval: 0.6, ally: 0.4, betray: 1.4 },
    opportunist:  { aggro: 0.6, build: 0.9, nuke: 0.7, trade: 0.7, defense: 0.6, naval: 0.7, ally: 0.7, betray: 1.6 },
  };
  C.DIFFICULTY = {
    recruit: { think: 1.6, eff: 0.85, nukeMul: 0.6 },
    regular: { think: 1.0, eff: 1.0, nukeMul: 1.0 },
    veteran: { think: 0.75, eff: 1.12, nukeMul: 1.2 },
    nightmare: { think: 0.55, eff: 1.25, nukeMul: 1.4 },
  };

  // ---------- Council resolutions (original mechanic) ----------
  C.RESOLUTIONS = [
    { id: 'sanctions', name: 'Sanctions on the Leader', desc: 'Every member embargoes the largest nation for 2:00.' },
    { id: 'testban', name: 'Test Ban Treaty', desc: 'Doomsday Clock frozen and pulled back 0:20. Nuclear launches cost 50% more for 2:00.' },
    { id: 'armsembargo', name: 'Arms Embargo', desc: 'The nation with the most strikes cannot launch for 1:30.' },
    { id: 'ceasefire', name: 'Global Ceasefire', desc: 'All wars pause: a 60-second truce between every nation.' },
    { id: 'quota', name: 'Uranium Quota', desc: 'Uranium output halved for everyone for 2:00.' },
    { id: 'relief', name: 'Reconstruction Fund', desc: 'The three largest nations pay 10% of their credits to the smallest.' },
    { id: 'accord', name: 'Midnight Accord', desc: 'End the war now. The largest nation is recognised as the victor.', late: true },
  ];

  // ---------- cosmetics ----------
  C.TERRITORY_COLORS = [
    { id: 'signal', name: 'Signal', rgb: [255, 196, 40], price: 0 },
    { id: 'ember', name: 'Ember', rgb: [255, 122, 48], price: 0 },
    { id: 'reactor', name: 'Reactor', rgb: [140, 255, 90], price: 300 },
    { id: 'glacier', name: 'Glacier', rgb: [110, 220, 255], price: 300 },
    { id: 'crimson', name: 'Crimson', rgb: [255, 70, 70], price: 400 },
    { id: 'ivory', name: 'Ivory', rgb: [240, 236, 220], price: 500 },
    { id: 'violet', name: 'Ultraviolet', rgb: [190, 120, 255], price: 600 },
    { id: 'magenta', name: 'Magenta', rgb: [255, 90, 200], price: 600 },
  ];
  C.PATTERNS = [
    { id: 'none', name: 'Solid', price: 0 },
    { id: 'hazard', name: 'Hazard', price: 0 },
    { id: 'grid', name: 'Grid', price: 250 },
    { id: 'dots', name: 'Dots', price: 250 },
    { id: 'chevron', name: 'Chevron', price: 400 },
    { id: 'scan', name: 'Scanline', price: 400 },
  ];
  C.MISSILE_STYLES = [
    { id: 'standard', name: 'Standard', price: 0 },
    { id: 'comet', name: 'Comet', price: 350 },
    { id: 'ghost', name: 'Ghost', price: 450 },
    { id: 'tracer', name: 'Tracer', price: 450 },
  ];
  C.DETONATIONS = [
    { id: 'white', name: 'White Flash', rgb: [255, 250, 230], price: 0 },
    { id: 'amber', name: 'Amber Bloom', rgb: [255, 180, 40], price: 0 },
    { id: 'violet', name: 'Violet Fire', rgb: [190, 110, 255], price: 500 },
    { id: 'toxic', name: 'Toxic Green', rgb: [140, 255, 80], price: 500 },
    { id: 'crimson', name: 'Crimson', rgb: [255, 60, 50], price: 600 },
  ];

  // bot codenames (original list)
  C.BOT_NAMES = ('KESTREL ONYX TALON MERIDIAN BASTION CINDER VORTEX HALCYON OBELISK TUNDRA ' +
    'CORSAIR AURORA BRIMSTONE CITADEL ZEPHYR MONSOON GRANITE QUASAR SENTINEL VANGUARD ' +
    'HARBINGER ANVIL SPECTRE CALDERA NOMAD PARAGON RAMPART SOLSTICE TEMPEST UMBRA ' +
    'VALKYRIE WARDEN XENITH YARROW ZENOBIA ARGENT BOREAL COBALT DYNAMO EQUINOX ' +
    'FALCON GLACIER HELIOS ICARUS JACKAL KRAKEN LANTERN MAGNETAR NEBULA OSPREY ' +
    'PHALANX QUARRY RAVEN SABLE TITAN UPLINK VECTOR WOLFRAM AXIOM BULWARK ' +
    'CHIMERA DELTA ECLIPSE FROSTLINE GOLIATH HORIZON IRONWOOD JUNIPER KODIAK LYNX ' +
    'MAMMOTH NOCTURNE ORACLE PYLON QUILL RHINO SALVO THRESHER URSA VIPER ' +
    'WRAITH YUKON ZEALOT ATLAS BEACON CRUCIBLE DRIFTWOOD EMBER FORGE GALLEON ' +
    'HALBERD INDIGO JAVELIN KARST LODESTAR MISTRAL NORTHWIND OUTPOST PRISM REDWOOD ' +
    'SCARAB TRIDENT UNION VERDANT WINTERHAVEN').split(/\s+/);

  C.NATION_PALETTE = [
    [96, 200, 150], [210, 110, 120], [120, 160, 230], [220, 170, 90], [160, 120, 210],
    [90, 190, 200], [200, 140, 100], [150, 200, 90], [230, 120, 170], [110, 130, 190],
    [190, 190, 110], [100, 170, 120], [200, 100, 90], [140, 180, 220], [180, 130, 160],
    [120, 200, 180], [220, 150, 140], [160, 160, 230], [200, 200, 160], [130, 110, 150],
  ];
})();
