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
    CLOCK_DRIFT_PER_SEC: 0.08, // passive drift
    CLOCK: { nationFell: 1.5, betrayal: 5, intercept: -3, laserPerMin: -1, councilBan: -20,
             Tactical: 5, Hypersonic: 10, ICBM: 18, MIRV: 40, Orbital: 25, EMP: 3, Airstrike: 0 },

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
    CAPITAL_GUARD_R: 10, CAPITAL_GUARD_COST: 3, CAPITAL_GUARD_SLOW: 2, // capital garrison zone: beheading a nation takes real force
    SUPPLY_FREE: 120, SUPPLY_SPAN: 300, SUPPLY_MAX_PENALTY: 0.6,

    TERRAIN_COST: [2, 3, 3, 3],          // biome: plains, forest, desert, tundra (troops/tile, unclaimed)
    ELEV_COST: [1, 1.6, 3],              // lowland, highlands, mountains
    ELEV_SPEED: [1, 0.8, 0.5],
    DENSITY_COST: 1.0,                   // attacker troops per defender troop-density per tile
    DENSITY_LOSS: 0.7,                   // defender troops lost per tile captured × density
    ATTACK_SPEED_BASE: 17.5, ATTACK_SPEED_SQRT: 1 / 3.2, EXPAND_SPEED_MULT: 2.6, // +25% (designer)

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

  // ---------- divisions (front-line formations shown as flags) ----------
  C.DIV = {
    baseCount: 2, perSqrtTiles: 1 / 10, maxCount: 24,   // more territory → more divisions
    armorShare: 0.34,
    infSize: 1500, infCapShare: 0.02,                    // infantry size = 1500 + 2% of troop cap (× upgrades)
    armorSize: 0.25, armorPower: 10,                     // armour: ~200–1,000 troops that push like 2,000–10,000
    infPower: 1.0, gearBonus: { artillery: 0.35, drones: 0.25 },
    radius: 14, armorRadius: 18,
    moveInf: 3.2, moveArm: 6.5,                          // tiles per second
    refill: 0.006,                                       // share of max size per second from the pool
    trainCost: 2500, trainTime: 25, trainedMul: 2,
    upgradeCost: 6000, upgradeMax: 6, raiseCost: 10000,
    supplyFactory: 70, supplyHub: 300, unsupplied: 0.6,
    stackRange: 5, stackMax: 3,
    preparedBonus: 1.15, spawnEvery: 8, visibleFor: 6,
  };

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
    sam:     { key: 'G', name: 'SAM Site', icon: 'sam', base: 15000, a: 9000, p: 1.2, time: 6, u: 50, defense: true },
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
    { id: 'homeland', name: 'Homeland', icon: 'flag',
      desc: 'Attackers lose 15% more troops on your land · Land you lose stays fresh 2× longer · Retaking your homeland costs 25% fewer troops, is 3× faster and ignores forts you built there · Your attacks advance 10% slower',
      mods: { defendCost: 1.15, attackSpeed: 0.9, homeland: 1 } },
    { id: 'fortress', name: 'Fortress', icon: 'fort',
      desc: 'Forts cost half · Your attacks advance 10% slower',
      mods: { cost_fort: 0.5, attackSpeed: 0.9 } },
    { id: 'deterrence', name: 'Deterrence', icon: 'shield',
      desc: 'Defences and radar cost 30% less · Troops grow 15% slower',
      mods: { cost_defense: 0.7, growth: 0.85 } },
    { id: 'firststrike', name: 'First Strike', icon: 'silo',
      desc: 'Silos build 40% faster and reload 30% faster · 30% fewer starting troops',
      mods: { siloBuild: 0.6, siloReload: 0.7, startTroops: 0.7 } },
    { id: 'trench', name: 'Trench Warfare', icon: 'fort', original: true, quote: 'Fight me like a man.',
      desc: 'Land you take digs in instantly — you never hold fresh land · Land invaders take from you stays fresh 2× longer · Your forts crumble when occupied and rebuild themselves when you retake the ground · Counters Scorched Earth · Your attacks advance 15% slower',
      mods: { trench: 1, attackSpeed: 0.85 } },
    { id: 'scorched', name: 'Scorched Earth', icon: 'fire', original: true,
      desc: 'Land you lose stays fresh forever — an inverse fort — and its buildings burn · Retaking it costs half · Losing your capital does not end you: your pockets fight on · No other drawback',
      mods: { scorched: 1 } },
    { id: 'blitzkrieg', name: 'Blitzkrieg', icon: 'bolt', original: true,
      desc: 'Attacks advance 30% faster · Enemy pockets collapse 25% faster · Breakthroughs 50% stronger · Lose 50% more troops when you do not outnumber the enemy front',
      mods: { attackSpeed: 1.3, blitzkrieg: 1, breakthrough: 1.5 } },
    { id: 'blitz', name: 'Blitz', icon: 'bolt',
      desc: 'Attacks advance 15% faster · 10% lower troop cap',
      mods: { attackSpeed: 1.15, cap: 0.9 } },
    { id: 'signals', name: 'Signals', icon: 'radar', original: true,
      desc: 'Radar range +50% and earlier warnings · Income 10% lower',
      mods: { radarRange: 1.5, income: 0.9 } },
    { id: 'merchant', name: 'Merchant Marine', icon: 'port', original: true,
      desc: 'Trade ships pay 40% more · Warships cost 25% more',
      mods: { tradeShip: 1.4, cost_warship: 1.25 } },
    { id: 'industrialist', name: 'Industrialist', icon: 'factory',
      desc: 'Cities, ports, factories and logistics hubs cost 20% less · +10% income · Weapons research 25% slower',
      mods: { cost_city: 0.8, cost_port: 0.8, cost_factory: 0.8, cost_hub: 0.8, income: 1.1, research: 1.25 } },
    { id: 'bunker', name: 'Bunker State', icon: 'bunker', original: true,
      desc: 'Your land takes 40% less nuclear damage · Cities cost 20% more',
      mods: { nukeDamage: 0.6, cost_city: 1.2 } },
    { id: 'admiralty', name: 'Admiralty', icon: 'anchor',
      desc: 'Ports and warships cost 30% less · 10% lower troop cap',
      mods: { cost_port: 0.7, cost_warship: 0.7, cap: 0.9 } },
  ];
  for (const d of C.DOCTRINES) d.level = 1; // every doctrine is open from the start; levels buy skills instead

  // ---------- skill tree (levels grant skill points; original design) ----------
  // branch order = tree columns; `req` = skill that must be owned first
  C.SKILL_BRANCHES = [
    { id: 'war', name: 'WARFARE' }, { id: 'def', name: 'DEFENCE' }, { id: 'log', name: 'LOGISTICS' },
    { id: 'eco', name: 'ECONOMY' }, { id: 'state', name: 'STATECRAFT' }, { id: 'div', name: 'DIVISIONS' },
  ];
  C.SKILLS = [
    { id: 'shock', branch: 'war', cost: 1, name: 'Shock Assault', desc: 'Attacks cost 6% fewer troops.', mods: { attackCost: 0.94 } },
    { id: 'combined', branch: 'war', cost: 2, req: 'shock', name: 'Combined Arms', desc: 'Attacks advance 10% faster.', mods: { attackSpeed: 1.1 } },
    { id: 'spearhead', branch: 'war', cost: 2, req: 'combined', name: 'Spearhead', desc: 'Clicked breakthroughs pull 30% harder toward your mark.', mods: { breakthrough: 1.3 } },
    { id: 'motherland', branch: 'war', cost: 2, req: 'shock', name: 'Call for the Motherland', desc: 'Encircled troops in your own homeland break out: the pocket holds like a fort (stacking with your forts nearby) and fights its way back to your main force.', mods: { motherland: 1 } },
    { id: 'pincer', branch: 'war', cost: 3, req: 'spearhead', name: 'Pincer Doctrine', desc: 'Enemy pockets you encircle collapse 40% faster.', mods: { pincer: 1 } },
    { id: 'sandbags', branch: 'def', cost: 1, name: 'Sandbags', desc: 'Land you take digs in 30% faster.', mods: { digIn: 0.7 } },
    { id: 'bastion', branch: 'def', cost: 2, req: 'sandbags', name: 'Bastion Engineering', desc: 'Fort radius +25%.', mods: { fortRadius: 1.25 } },
    { id: 'earlywarn', branch: 'def', cost: 2, req: 'sandbags', name: 'Early Warning Net', desc: 'Radar range +30% and interception odds +8%.', mods: { radarRange: 1.3, intercept: 1.08 } },
    { id: 'hardened', branch: 'def', cost: 3, req: 'bastion', name: 'Hardened Sites', desc: 'Your land takes 20% less nuclear damage; silos reload 20% faster.', mods: { nukeDamage: 0.8, siloReload: 0.8 } },
    { id: 'kitchens', branch: 'log', cost: 1, name: 'Field Kitchens', desc: 'Troops grow 8% faster.', mods: { growth: 1.08 } },
    { id: 'depots', branch: 'log', cost: 2, req: 'kitchens', name: 'Forward Depots', desc: 'Supply lines reach 40% further.', mods: { supply: 1.4 } },
    { id: 'railgauge', branch: 'log', cost: 2, req: 'kitchens', name: 'Standard Gauge', desc: 'Convoys pay 15% more; hubs cost 20% less.', mods: { convoyPay: 1.15, cost_hub: 0.8 } },
    { id: 'conscripts', branch: 'log', cost: 3, req: 'depots', name: 'Total Mobilisation', desc: 'Troop cap +10%.', mods: { cap: 1.1 } },
    { id: 'wareco', branch: 'eco', cost: 1, name: 'War Economy', desc: 'Income +8%.', mods: { income: 1.08 } },
    { id: 'treasury', branch: 'eco', cost: 1, req: 'wareco', name: 'State Treasury', desc: 'Start every match with +10k credits.', mods: { startCredits: 1 } },
    { id: 'drilling', branch: 'eco', cost: 2, req: 'wareco', name: 'Deep Core Drilling', desc: 'Uranium output +25%.', mods: { uranium: 1.25 } },
    { id: 'tradefleet', branch: 'eco', cost: 2, req: 'drilling', name: 'Trade Fleet', desc: 'Trade ships pay 20% more.', mods: { tradeShip: 1.2 } },
    { id: 'tongue', branch: 'state', cost: 1, name: 'Silver Tongue', desc: 'Alliances, truces and aid requests are 12% more likely to be accepted.', mods: { diplomacy: 1 } },
    { id: 'patron', branch: 'state', cost: 2, req: 'tongue', name: 'Patronage', desc: 'Your puppet-state is 10% more likely to accept a CEDE.', mods: { cedeBonus: 1 } },
    { id: 'councilseat', branch: 'state', cost: 2, req: 'tongue', name: 'Permanent Seat', desc: 'Your Council vote counts three times.', mods: { councilVotes: 3 } },
    // ---- 20 skills added with the division system ----
    { id: 'armordoc', branch: 'div', cost: 1, name: 'Armoured Doctrine', desc: 'Armoured divisions advance 15% faster.', mods: { armorSpeed: 1.15 } },
    { id: 'barrage', branch: 'div', cost: 1, name: 'Rolling Barrage', desc: 'Infantry divisions (artillery & drones) hit 20% harder.', mods: { infPower: 1.2 } },
    { id: 'drones', branch: 'div', cost: 2, req: 'barrage', name: 'Drone Swarms', desc: 'Divisions influence the front 25% further around them.', mods: { divRadius: 1.25 } },
    { id: 'academy', branch: 'div', cost: 2, name: 'Military Academy', desc: 'Division training takes half the time.', mods: { trainTime: 0.5 } },
    { id: 'veterans', branch: 'div', cost: 3, req: 'academy', name: 'Veteran Cadres', desc: 'Fully trained divisions count ×2.4 instead of ×2.', mods: { veteran: 1 } },
    { id: 'depth', branch: 'div', cost: 2, req: 'armordoc', name: 'Defence in Depth', desc: 'Stacked divisions’ redundancy bonus is 15% stronger.', mods: { depth: 1.15 } },
    { id: 'rapid', branch: 'div', cost: 1, name: 'Rapid Response', desc: 'Divisions move 40% faster.', mods: { divMove: 1.4 } },
    { id: 'staff', branch: 'div', cost: 3, req: 'rapid', name: 'General Staff', desc: '+3 divisions.', mods: { generalStaff: 1 } },
    { id: 'armorbreak', branch: 'war', cost: 2, req: 'spearhead', name: 'Armoured Breakthrough', desc: 'Armour in a breakthrough advances another 20% faster.', mods: { armorBreak: 1.2 } },
    { id: 'airsup', branch: 'war', cost: 1, req: 'shock', name: 'Air Superiority', desc: 'Airstrikes cost 30% less.', mods: { airCost: 0.7 } },
    { id: 'counterbattery', branch: 'def', cost: 1, name: 'Counter-Battery', desc: 'Enemy divisions near your land lose 15% of their punch.', mods: { counterBattery: 1 } },
    { id: 'ironline', branch: 'def', cost: 2, req: 'sandbags', name: 'Iron Line', desc: 'A prepared front (T before they attack) defends 25% better instead of 15%.', mods: { ironLine: 1 } },
    { id: 'hedgehog', branch: 'def', cost: 2, req: 'bastion', name: 'Hedgehog Positions', desc: 'Enemies pay 10% more troops near your divisions.', mods: { hedgehog: 1.1 } },
    { id: 'kitchens2', branch: 'log', cost: 1, req: 'kitchens', name: 'Mobile Kitchens', desc: 'Divisions refill from your pool 50% faster.', mods: { divRefill: 1.5 } },
    { id: 'railmob', branch: 'log', cost: 2, req: 'depots', name: 'Rail Mobilisation', desc: 'Divisions move 40% faster; supply reaches 20% further.', mods: { divMove: 1.4, divSupply: 1.2 } },
    { id: 'fielddepot', branch: 'log', cost: 2, name: 'Field Depots', desc: 'Cut-off divisions keep 85% of their strength instead of 60%.', mods: { fieldDepot: 1 } },
    { id: 'armsind', branch: 'eco', cost: 1, req: 'wareco', name: 'Arms Industry', desc: 'Training and division upgrades cost 30% less.', mods: { divCost: 0.7 } },
    { id: 'reserve', branch: 'eco', cost: 2, req: 'treasury', name: 'National Reserve', desc: '+2 divisions.', mods: { reservePool: 1 } },
    { id: 'intel', branch: 'state', cost: 1, req: 'tongue', name: 'Intelligence Network', desc: 'Always see enemy divisions within 40 tiles of your border.', mods: { intel: 1 } },
    { id: 'propaganda', branch: 'state', cost: 1, name: 'Propaganda Bureau', desc: 'Troops grow 5% faster; income +4%.', mods: { growth: 1.05, income: 1.04 } },
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
