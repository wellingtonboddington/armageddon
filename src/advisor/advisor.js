/* MIDNIGHT PROTOCOL — VESPER, intelligence advisor.
 * Procedural pixel-art portrait, typed briefings, Web Speech voice with a Web Audio radio-cue
 * fallback, and a priority / cooldown / de-dup line queue.
 * Classic script (no modules), attaches window.MP.Advisor. No external resources of any kind.
 * Contract: docs/ADVISOR_INTERFACE.md
 */
(function () {
  'use strict';
  const MP = (window.MP = window.MP || {});
  if (MP.Advisor && MP.Advisor.__vesper) return;

  /* =========================================================================================
   * utilities
   * ======================================================================================= */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const nowS = () => ((window.performance && performance.now) ? performance.now() : Date.now()) / 1000;
  function sget(k, d) { try { return MP.settings ? MP.settings.get(k, d) : d; } catch (e) { return d; } }
  function sset(k, v) { try { if (MP.settings) MP.settings.set(k, v); } catch (e) { /* storage blocked */ } }
  function emit(evt, data) { try { if (MP.bus) MP.bus.emit(evt, data); } catch (e) { /* host handler threw */ } }
  function warn(e) { try { console.warn('[VESPER]', e); } catch (_) { /* no console */ } }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* =========================================================================================
   * LINE LIBRARY — every key in the event catalogue.
   * p: priority 0..3 · cd: per-key cooldown (s) · tut: once per match · hint: uppercase subtitle
   * rep: a newer event of the same key replaces the pending one (selection-style events)
   * intr: interrupts like a critical line, without the red alert treatment
   * ======================================================================================= */
  const D = (p, cd, v, o) => Object.assign({ p: p, cd: cd, v: v }, o || {});
  const T = (hint, v) => ({ p: 0, cd: 0, tut: true, hint: hint, v: v, ttl: 25 });

  const LINES = {
    /* ---------------- menu ---------------- */
    'menu.boot': D(1, 30, [
      'Channel open. VESPER, intelligence. I\'ll be in your ear.',
      'First contact logged. I\'m VESPER. I read the wire so you can act.',
      'New commander on file. VESPER, your intelligence officer.',
      'Signal\'s clean. I\'m VESPER. The clock is already running.',
      'Welcome to 2031. I\'m VESPER. Mind the clock.',
    ]),
    'menu.greet': D(1, 30, [
      'Welcome back, Commander. The clock kept running.',
      'You\'re back. The world isn\'t any calmer.',
      'Channel restored. Minutes to midnight, as usual.',
      'Back on the wire. Nothing has improved.',
      'Commander. I kept your seat warm and the files cold.',
      'Good timing. The Council is arguing again.',
    ]),
    'menu.idle': D(0, 0, [
      '2031. Every capital keeps a hand near the button.',
      'The clock moved overnight. Nobody announced it.',
      'The Council met today. They agreed to meet again.',
      'Doctrine is just fear with a filing system.',
      'Uranium prices are up. That\'s never good news.',
      'The wire\'s quiet. I don\'t trust quiet.',
      'Somewhere, a silo crew is running drills. They always are.',
      'Radar sees everything. Deciding what it means is my job.',
      'Every alliance has an expiry date. Few print it.',
      'Deterrence works right up until it doesn\'t.',
      'Midnight isn\'t a time. It\'s a verdict.',
      'Ports are the real borders. Everything moves by sea.',
      'The last arms treaty lapsed in \'29. Nobody renewed it.',
      'Factories win wars. Silos end them.',
      'A truce is a pause with paperwork.',
      'The clock has never moved backward on its own.',
      'Every map is out of date by the time it prints.',
      'Somebody always blinks. Make sure it isn\'t you.',
      'Hypersonics turned warning time into a rounding error.',
      'An EMP is quiet. That\'s what makes it cruel.',
      'Nuclear winter is a slow ending. I\'ve read the models.',
      'Trust the radar. Doubt the diplomats.',
      'Three capitals leaking rumours tonight. Two are lying.',
      'Every doctrine promises a short war.',
      'Nobody wins a winter. Some just lose slower.',
      'Recon flights over the border again. Routine, they say.',
      'Storm season over the Pacific. Convoys will feel it.',
      'Supply lines decide more wars than generals do.',
      'The Council calls it peacekeeping. The wire calls it Tuesday.',
      'Signal integrity nominal. Global sanity unconfirmed.',
      'Intercepts say everyone is planning for the worst.',
      'Someone just bought a lot of concrete. Bunkers, probably.',
      'Fallout maps update hourly. Hope you never need one.',
      'I keep a list of every nation that swore it wouldn\'t.',
      'Quiet borders are just wars that haven\'t started.',
      'Ten seconds of radar can be worth a city.',
    ]),
    'menu.return_victory': D(2, 10, [
      'Victory logged: {ending}. The world is quieter. For now.',
      'Clean result. {ending}. I\'ve filed it under rare.',
      '{ending}. History gets written your way.',
      'Debrief complete. {ending}. Well executed, Commander.',
      'Victory on file. Let\'s not get comfortable.',
    ]),
    'menu.return_defeat': D(2, 10, [
      'Defeat recorded: {ending}. We learn, or we repeat.',
      '{ending}. Not our finest hour. Debrief when ready.',
      'Loss logged. The clock doesn\'t care. I do.',
      'That one\'s in the archive now. Let\'s not repeat it.',
      'We lost the map, not the lesson. Again?',
    ]),
    'menu.return_winter': D(2, 10, [
      'Nuclear winter. Nobody won that one.',
      'The sky went dark. The archive calls it a draw. I don\'t.',
      'Ash over every capital. That\'s what midnight looks like.',
      'Everyone lost. The clock finally stopped.',
      'Winter came early. It always does, after enough launches.',
    ]),
    'menu.loadouts': D(0, 20, [
      'Loadouts. Bring what you\'d regret leaving behind.',
      'Kit check. Pick what wins, not what shines.',
      'Every slot is a decision. Choose cold.',
      'Loadout bay. The map punishes vanity.',
    ]),
    'menu.doctrine': D(1, 2, [
      'Doctrine set: {doctrine}. Commit to it.',
      '{doctrine}. Noted in your file.',
      '{doctrine}. A clear philosophy. Let\'s see it survive contact.',
      '{doctrine}. I\'ll adjust my briefings.',
      'Doctrine changed. I\'ll rewrite the contingencies.',
    ], { rep: true }),
    'menu.nation_saved': D(1, 6, [
      '{name} is on file. Flag and all.',
      'Nation registered: {name}. I\'ve opened a dossier.',
      '{name}. Good name. It\'ll carry on the wire.',
      'Saved. {name} exists, at least on paper.',
      'Nation saved. Dossier opened.',
    ]),
    'menu.party_add': D(1, 3, [
      '{name} joined the channel.',
      '{name} is in. Coordinate early.',
      '{name} on the line. Shared map, shared risk.',
      'Party grows. {name} is with us.',
      'New operator on the channel.',
    ]),
    'menu.party_remove': D(1, 3, [
      '{name} left the channel.',
      '{name} is out. Adjust the plan.',
      '{name} has gone dark.',
      'An operator left the channel.',
    ]),
    'menu.party_full': D(1, 8, [
      'Party\'s full. No more seats.',
      'Roster maxed. Someone stays home.',
      'No room left on this channel.',
    ]),
    'menu.mission_done': D(1, 3, [
      'Mission complete: {mission}.',
      '{mission}: done. Reward\'s in your account.',
      'Objective met. {mission}, closed.',
      'Signed off: {mission}. Next.',
      'Mission complete. Reward logged.',
    ]),
    'menu.reroll': D(0, 2, [
      'New orders on the board.',
      'Rerolled. Different job, same clock.',
      'Fresh assignment. Let\'s hope it\'s an improvement.',
    ], { rep: true }),
    'menu.level_up': D(2, 4, [
      'Clearance level {level}. Access widened.',
      'Level {level}. They\'ll show you more now.',
      'Promotion logged. Level {level}.',
      'Level {level}. More files, fewer excuses.',
      'Promotion logged. Clearance widened.',
    ]),
    'menu.unlock': D(1, 3, [
      'Unlocked: {item}. Use it well.',
      '{item} cleared for use.',
      'New asset on file: {item}.',
      '{item} approved. Don\'t waste it.',
      'New asset cleared for use.',
    ]),
    'menu.shop': D(0, 30, [
      'Requisitions. Spend where it matters.',
      'Quartermaster\'s open. Budget like it\'s wartime.',
      'The depot. Everything here has a price.',
    ]),
    'menu.dossier': D(0, 30, [
      'Your dossier. Accurate, not flattering.',
      'The file on you. It\'s getting thicker.',
      'Every win, every loss. All filed.',
    ]),
    'menu.how_to_play': D(0, 30, [
      'Field manual. Short version: expand, build, deter.',
      'Read it once. The map teaches the rest.',
      'Basics first. Midnight doesn\'t grade on a curve.',
    ]),
    'menu.custom': D(0, 30, [
      'Custom scenario. Your rules, same consequences.',
      'Build your own world. Then try to keep it.',
      'Set the board however you like.',
    ]),
    'menu.watch': D(0, 30, [
      'Observer mode. Watch how others fail.',
      'Spectating. Take notes. I will.',
      'Eyes only. No hands on the button.',
    ]),
    'menu.teams': D(0, 30, [
      'Teams. Pick who you\'d trust at DEFCON 1.',
      'Fixed sides. Loyalty, for once, is mandatory.',
      'Choose your team. Betrayal is off the menu.',
    ]),

    /* ---------------- tutorial (once per match) ---------------- */
    'tut.spawn': T('CLICK ANY LAND TO PLACE YOUR NATION', [
      'Pick your ground. Click any land to place your nation.',
      'Choose a homeland. Click open land to deploy.',
      'Coast or interior, your call. Click land to begin.',
    ]),
    'tut.expand': T('CLICK EMPTY LAND TO EXPAND · PRESETS SET HOW MANY TROOPS GO', [
      'Unclaimed land is cheap. Click it to expand.',
      'Grow while it\'s quiet. Click empty land.',
      'Expand into neutral ground. The presets decide how many go.',
    ]),
    'tut.attack': T('CLICK A NEIGHBOUR\'S LAND TO ATTACK · RIGHT-CLICK FOR MORE ORDERS', [
      'To attack, click a neighbour\'s land. Right-click for more orders.',
      'Hostile border. Click their land to push in.',
      'Their territory, your click. Right-click for options.',
    ]),
    'tut.city': T('CITY · +25K TROOP CAP PER LEVEL', [
      'Cities raise your troop cap. Twenty-five thousand per level.',
      'More cities, bigger army. Simple arithmetic.',
      'Build cities. Every level holds more troops.',
    ]),
    'tut.factory': T('FACTORY · CITIES AND PORTS WITHIN 60 TILES BECOME STOPS', [
      'Factories run convoys. Nearby cities and ports become stops.',
      'A factory ties together everything within sixty tiles.',
      'Convoys need a factory. Cities and ports nearby join the route.',
    ]),
    'tut.hub': T('HUB · 300-TILE NETWORK · WHITE ROADS · CONVOYS 25% FASTER, REACH 2 STOPS', [
      'Hubs build road networks. Convoys run faster and further.',
      'A hub links three hundred tiles. Watch for the white roads.',
      'Hub online. Quicker convoys, two stops per run.',
    ]),
    'tut.port': T('PORT · TRADES BY SEA · BUILDS WARSHIPS', [
      'Ports trade by sea and build warships.',
      'Coastline is leverage. Ports open trade and a navy.',
      'A port turns water into income. And into warships.',
    ]),
    'tut.enrich': T('ENRICHMENT · ONLY ON A ☢ DEPOSIT · NO DEPOSIT CAPS URANIUM AT 200', [
      'Enrichment only works on a uranium deposit.',
      'Find a deposit before you enrich. Without one, uranium caps at two hundred.',
      'No deposit, no real stockpile. Two hundred is the ceiling.',
    ]),
    'tut.fort': T('FORT · ATTACKERS PAY 5× TROOPS AND MOVE 3× SLOWER IN RANGE', [
      'Forts make attackers pay five times the troops.',
      'Inside fort range, enemies crawl. Three times slower.',
      'A fort turns a border into a wall.',
    ]),
    'tut.upgrade': T('BUILD ON YOUR OWN BUILDING OF THE SAME TYPE TO UPGRADE · SAME PRICE', [
      'To upgrade, build on top of the same type. Same price.',
      'Stack a building on its twin to raise its level.',
      'Upgrades cost the same as new. Build on what you have.',
    ]),
    'tut.warship': T('WARSHIP · PICKS ITS OWN TARGETS · SET A PATROL WORTH THE FUEL', [
      'Warships choose their own targets. Give them a patrol worth the fuel.',
      'A warship hunts on its own. Point it somewhere useful.',
      'Set a patrol route. The ship handles the rest.',
    ]),
    'tut.silo': T('SILO · LAUNCHES THE WARHEADS YOU HAVE RESEARCHED', [
      'A silo. You can launch now. Think first.',
      'Silo online. The button is real now.',
      'Silos fire what research unlocks. Deterrence starts here.',
    ]),
    'tut.research': T('RESEARCH · UNLOCKS NEW WARHEAD CLASSES FOR YOUR SILOS', [
      'Research unlocks new warheads. Each one changes the math.',
      'Fund the lab. Better weapons, worse consequences.',
      'The lab decides what your silos can carry.',
    ]),
    'tut.radar': T('RADAR · EARLIER WARNING = BETTER INTERCEPTION ODDS', [
      'Radar buys warning time. Warning time buys intercepts.',
      'Earlier warning, better odds. Build radar.',
      'Radar sees launches early. Early is survivable.',
    ]),
    'tut.defense': T('DEFENSE · EACH LEVEL ADDS A SHOT · EACH TYPE COVERS SPECIFIC WARHEADS', [
      'Each defense level adds a shot. Each type covers certain warheads.',
      'Layer your defenses. No single system stops everything.',
      'Check coverage. Not every interceptor stops every threat.',
    ]),
    'tut.dugin': T('DUG-IN LAND COSTS 2× TROOPS · STRIPED LAND IS FRESH · FALLOUT SOFTENS A LINE', [
      'Old land is dug in. It costs twice the troops to take.',
      'Striped ground is fresh. It isn\'t dug in yet.',
      'Entrenched lines cost double. Fallout softens them.',
    ]),
    'tut.supply': T('ATTACKS WEAKEN FAR FROM CITIES AND HUBS · CUT-OFF POCKETS STARVE', [
      'Attacks weaken far from cities and hubs.',
      'Watch supply. Pockets that get cut off starve.',
      'Overreach, and the front goes hungry.',
    ]),
    'tut.council': T('COUNCIL · RESOLUTIONS GO TO A VOTE · WHAT PASSES BINDS EVERYONE', [
      'The Council is in session. Resolutions change the rules.',
      'World Council. Votes here move armies elsewhere.',
      'Watch the Council. What passes binds everyone.',
    ]),
    'tut.weather': T('WEATHER · STORMS DISRUPT OPERATIONS IN THEIR PATH', [
      'Weather is live. Storms disrupt whatever they cross.',
      'Storm systems move across the map. Plan around them.',
      'Watch the sky. Storms don\'t pick sides.',
    ]),
    'tut.boat': T('TRANSPORT · SEND TROOPS ACROSS WATER TO A DISTANT COAST', [
      'Transports carry troops across water.',
      'Water isn\'t a wall. Send a landing party.',
      'Target a distant coast. The boats do the crossing.',
    ]),
    'tut.alliance': T('ALLIANCE · ALLIES DON\'T FIGHT EACH OTHER · BREAKING A PACT IS NOTICED', [
      'Alliances keep a border quiet. Choose partners carefully.',
      'A pact buys safety. Breaking one costs trust.',
      'Allies share enemies. Usually.',
    ]),

    /* ---------------- match flow ---------------- */
    'game.start': D(1, 20, [
      'Operation underway. The clock is running.',
      'We\'re live. Find ground, then find leverage.',
      'Channel open. All eyes on the map.',
      'Match live. Every minute brings midnight closer.',
      'Clock\'s started. Let\'s be efficient.',
    ]),
    'game.spawned': D(1, 20, [
      'Flag planted. Now make it worth defending.',
      'We\'re on the map. Expand while it\'s quiet.',
      'Position confirmed. The neighbours will notice.',
      'Home soil established. Build, then grow.',
    ]),
    'game.partner_spawned': D(1, 3, [
      '{name} is on the map. Friendly flag.',
      '{name} has landed. Coordinate.',
      'Partner confirmed: {name}. Cover each other.',
      'Our partner is on the map. Coordinate.',
    ]),
    'game.peace_end': D(2, 30, [
      'Grace period over. Borders are live.',
      'Peace window closed. Expect contact.',
      'The quiet\'s over. Weapons free, everyone.',
      'Ceasefire expired. Anyone can attack now.',
    ]),
    'defcon.4': D(1, 30, [
      'DEFCON 4. Chatter\'s rising.',
      'DEFCON 4. Heightened watch.',
      'DEFCON 4. Nothing\'s fired. Everyone\'s looking.',
    ]),
    'defcon.3': D(2, 30, [
      'DEFCON 3. Forces on alert. Silos warming.',
      'DEFCON 3. This is where mistakes get expensive.',
      'DEFCON 3. Round-the-clock readiness.',
    ]),
    'defcon.2': D(2, 30, [
      'DEFCON 2. One step from launch.',
      'DEFCON 2. Crews are in the silos.',
      'DEFCON 2. Every radar return matters now.',
    ]),
    'defcon.1': D(3, 30, [
      'DEFCON 1. Launches authorised.',
      'DEFCON 1. This is it.',
      'DEFCON 1. The world is holding its breath.',
    ]),
    'clock.5min': D(2, 30, [
      'Five minutes to midnight.',
      'Five minutes. Make them count.',
      'Clock reads five to twelve. Position yourself.',
    ]),
    'clock.2min': D(2, 30, [
      'Two minutes to midnight.',
      'Two minutes. No more long plans.',
      'Two minutes left. Whatever you\'re planning, start.',
    ]),
    'clock.1min': D(3, 30, [
      'One minute to midnight.',
      'Sixty seconds. Final moves.',
      'One minute. Hold what you have.',
    ]),
    'clock.pulled_back': D(1, 15, [
      'The clock just moved back. Someone blinked.',
      'Clock pulled back. A little breathing room.',
      'Minutes returned. Don\'t waste the reprieve.',
    ]),
    'milestone.10': D(1, 30, [
      'Ten percent of the map. Others are noticing.',
      'We hold a tenth of the world. A start.',
      'Ten percent. Enough to be a target.',
    ]),
    'milestone.25': D(1, 30, [
      'A quarter of the map is ours.',
      'Twenty-five percent. We\'re a power now.',
      'A quarter of the world. Expect coalitions.',
    ]),
    'milestone.50': D(1, 30, [
      'Half the world flies our flag.',
      'Fifty percent. Everyone else is the minority.',
      'Half the map. They\'ll unite against us.',
    ]),
    'rank.top3': D(1, 60, [
      'We\'re top three. That paints a target.',
      'Top three. Visibility cuts both ways.',
      'Podium position. Hold it.',
    ]),
    'rank.first': D(1, 60, [
      'We\'re first. Everyone\'s aiming at us now.',
      'Number one. Stay paranoid.',
      'Leading the world. Don\'t relax.',
    ]),
    'game.paused': D(0, 3, [
      'Paused. The clock waits. This once.',
      'Holding. Take your time.',
      'Freeze frame. Think it through.',
    ]),
    'game.saved': D(0, 3, [
      'Saved. Your history is on file.',
      'Snapshot stored.',
      'Progress saved. In case midnight comes early.',
    ]),
    'game.loaded': D(1, 3, [
      'Situation restored. Picking up where we left off.',
      'Loaded. The world remembers.',
      'Back in the room. Same clock, same enemies.',
    ]),
    'game.speed': D(0, 2, [
      'Now running at {speed}.',
      'Set to {speed}. Keep up.',
      'Tempo changed: {speed}. The world runs to match.',
      'Tempo adjusted.',
    ], { rep: true }),

    /* ---------------- land war ---------------- */
    'attack.incoming': D(2, 10, [
      '{nation} is attacking. {troops} troops.',
      'Incoming: {nation}, {troops} strong.',
      '{nation} crossed the border with {troops} troops.',
      'Border breach. {nation}, {troops} troops.',
      'Hostile push from {nation}.',
      'We\'re under attack. Border breached.',
    ]),
    'attack.repelled': D(1, 12, [
      '{nation}\'s attack broke on our line.',
      'Repelled. {nation} pulled back.',
      'The line held against {nation}.',
      '{nation} tested us. They failed.',
      'Attack repelled. Line intact.',
    ]),
    'attack.launched': D(0, 15, [
      '{troops} troops into {target}.',
      'Attack underway. {target}, {troops} strong.',
      'Committing {troops} troops against {target}.',
      'Orders sent. {target} will feel it.',
      'Advance on {target} confirmed.',
      'Attack underway.',
    ]),
    'attack.expand': D(0, 30, [
      'Expanding with {troops} troops.',
      '{troops} troops into open land.',
      'Claiming ground. {troops} moving.',
      'Expansion underway.',
      'Taking open ground while it\'s free.',
    ]),
    'attack.stalled': D(1, 20, [
      'Our attack has stalled.',
      'The push stopped. Reinforce or recall.',
      'Momentum\'s gone. We\'re bleeding troops.',
    ]),
    'attack.recalled': D(0, 10, [
      'Recalled. Troops returning.',
      'Pulling them back.',
      'Attack called off.',
    ]),
    'land.lost_big': D(2, 20, [
      'We\'re losing ground fast to {nation}.',
      '{nation} is cutting deep. Respond.',
      'Heavy losses on the {nation} front.',
      '{nation} just took a large piece of us.',
      'We\'re losing ground fast.',
    ]),
    'capital.taken': D(2, 5, [
      '{nation}\'s capital is ours. {credits} credits, {uranium} uranium seized.',
      'Capital captured. {nation} pays {credits} credits.',
      'We hold {nation}\'s capital. Treasury secured.',
      'Our flag over {nation}\'s capital.',
      'Enemy capital taken. Treasury seized.',
    ]),
    'capital.lost': D(3, 10, [
      'Our capital has fallen to {nation}.',
      'Capital lost. {nation} holds it.',
      '{nation} is in the capital.',
      'We\'ve lost the capital.',
    ]),
    'nation.fell': D(1, 6, [
      '{nation} has fallen.',
      '{nation} is gone from the map.',
      'Another flag down. {nation}.',
      '{nation} collapsed. Their land is open.',
      'One less player. {nation} is finished.',
      'Another nation has fallen.',
    ]),
    'nation.fell_us': D(2, 4, [
      '{nation} eliminated. Their file is closed.',
      'We finished {nation}.',
      '{nation} is no more. Our doing.',
      'Struck {nation} from the map.',
      'Target nation eliminated. File closed.',
    ]),
    'pocket.cut': D(2, 20, [
      'One of our pockets is cut off. It\'ll starve.',
      'Encirclement. Those troops have no supply.',
      'A pocket\'s been severed. Break through or lose it.',
    ]),
    'supply.overextended': D(1, 30, [
      'We\'re overextended. Attacks are losing strength.',
      'Supply\'s thin out there. Build closer or pull back.',
      'Too far from our cities. The front is starving.',
    ]),

    /* ---------------- building / economy ---------------- */
    'build.done': D(0, 10, [
      '{type} complete.',
      '{type} online.',
      'Construction finished. {type} operational.',
      '{type} is up.',
      'Level {level} {type} online.',
      'Construction complete.',
    ]),
    'build.upgraded': D(0, 10, [
      '{type} upgraded to level {level}.',
      '{type} now level {level}.',
      'Level {level} {type}. Stronger.',
      'Upgrade complete. {type}.',
      'Upgrade complete.',
    ]),
    'build.lost': D(2, 12, [
      '{type} lost to {nation}.',
      '{nation} destroyed our {type}.',
      '{type} gone. {nation}\'s work.',
      '{type} destroyed.',
      'We lost a structure.',
    ]),
    'build.cant_afford': D(1, 8, [
      'Can\'t afford the {type}.',
      'Insufficient funds. {type} on hold.',
      'Treasury says no to the {type}.',
      'Not enough credits.',
    ]),
    'build.bad_spot': D(1, 6, [
      'Can\'t build there. {reason}.',
      'Invalid site: {reason}.',
      'Not there. {reason}.',
      'That site won\'t work.',
    ]),
    'build.need_deposit': D(1, 8, [
      'Enrichment needs a uranium deposit.',
      'No deposit there. Find the uranium marker.',
      'That ground has no ore. Build on a deposit.',
    ]),
    'econ.convoy_blocked': D(1, 25, [
      '{nation} is blocking our convoys.',
      'Convoy route cut by {nation}.',
      'Trade stalled. {nation} territory in the way.',
      'A convoy route is blocked.',
    ]),
    'econ.uranium_capped': D(1, 45, [
      'Uranium capped. We need a deposit and enrichment.',
      'Stockpile at the limit. Enrich on a deposit to go higher.',
      'Uranium storage maxed out.',
    ]),
    'econ.rich': D(0, 60, [
      'The treasury is overflowing. Spend it.',
      'Credits piling up. Idle money wins nothing.',
      'We\'re rich. Turn it into something that shoots.',
    ]),

    /* ---------------- naval ---------------- */
    'naval.transport_inbound': D(2, 12, [
      'Transport inbound from {nation}. Landing party.',
      '{nation} boats approaching our coast.',
      'Amphibious contact. {nation} is coming by sea.',
      'Enemy transport closing on our coast.',
    ]),
    'naval.transport_sunk_enemy': D(1, 10, [
      'Sunk a {nation} transport. Nobody\'s landing.',
      '{nation} transport down. All hands.',
      'Their landing failed at sea. {nation} lost a transport.',
      'Enemy transport sunk. Nobody\'s landing.',
    ]),
    'naval.our_transport_sunk': D(2, 10, [
      'We lost a transport. The landing is off.',
      'Our transport went down.',
      'Transport sunk. Those troops are gone.',
    ]),
    'naval.landing': D(1, 10, [
      'Troops ashore. Beachhead established.',
      'Landing successful.',
      'We\'re on their coast.',
    ]),
    'naval.warship_ready': D(1, 10, [
      'Warship commissioned. She\'s hunting.',
      'New warship at sea.',
      'Warship ready. Give it a patrol.',
    ]),
    'naval.warship_lost': D(2, 10, [
      'We lost a warship.',
      'Warship down.',
      'One of our ships is gone. Check those waters.',
    ]),
    'naval.prize': D(1, 10, [
      'Seized a {nation} freighter. {amount} credits.',
      'Prize taken from {nation}: {amount} credits.',
      'Our navy took {amount} credits from {nation} shipping.',
      'Prize ship taken.',
    ]),
    'naval.our_trade_seized': D(2, 15, [
      '{nation} seized one of our trade ships.',
      'Piracy, technically. {nation} took our cargo.',
      'Trade vessel lost to {nation}.',
      'One of our trade ships was seized.',
    ]),

    /* ---------------- strategic weapons ---------------- */
    'research.started': D(0, 5, [
      'Research underway: {weapon}.',
      'Labs are on {weapon}.',
      '{weapon} program started.',
      'Research underway.',
    ]),
    'research.done': D(1, 5, [
      '{weapon} research complete.',
      '{weapon} is ready for the silos.',
      'We have {weapon} capability now.',
      'Research complete. New warhead class available.',
    ]),
    'missile.launched': D(1, 6, [
      '{weapon} away. Target: {nation}.',
      'Launch confirmed. {weapon} toward {nation}.',
      '{weapon} in flight to {nation}.',
      'It\'s done. {weapon} launched at {nation}.',
      'Launch confirmed.',
    ]),
    'missile.launch_all': D(2, 6, [
      'Full salvo. {count} {weapon} launches.',
      'All silos firing. {count} away.',
      '{count} {weapon} launches confirmed.',
      'Salvo of {count}. There\'s no recalling these.',
      'Full salvo away.',
    ]),
    'missile.inbound': D(3, 4, [
      '{weapon} inbound from {nation}. Impact in {eta}.',
      'Launch detected. {nation}, {weapon}. {eta} out.',
      'Incoming {weapon} from {nation}. {eta} to impact.',
      'Missile inbound. {nation}.',
      '{weapon} inbound. Brace.',
      'Missile inbound. Brace for impact.',
    ]),
    'radar.early_warning': D(2, 6, [
      'Radar has a {weapon} launch from {nation}. Early warning.',
      'Early warning: {nation} launched. {weapon} class.',
      'Radar caught it early. {weapon} from {nation}.',
      'Early warning. Launch detected.',
    ]),
    'missile.intercepted': D(1, 5, [
      'Intercept confirmed. {weapon} down.',
      '{weapon} destroyed in flight.',
      'Splash one {weapon}.',
      'Got it. {weapon} neutralised.',
      'Intercepted.',
      'Clean intercept.',
    ]),
    'missile.impact_us': D(3, 4, [
      'Impact. {weapon} hit our territory.',
      'We\'ve been hit. {weapon}.',
      '{weapon} detonation on our soil.',
      'Impact on our territory.',
    ]),
    'missile.hit_enemy': D(1, 6, [
      '{weapon} impact confirmed on {nation}.',
      'Direct hit. {nation} felt the {weapon}.',
      '{nation} struck. Damage assessment pending.',
      'Direct hit confirmed. Damage assessment pending.',
    ]),
    'missile.world_first': D(3, 60, [
      'First detonation. The taboo is broken.',
      'Someone used one. The world just changed.',
      'A nuclear detonation. Nothing is off the table now.',
      'First nuke of the war. The clock will remember.',
    ]),
    'fallout.us': D(2, 20, [
      'Fallout over our territory.',
      'Radiation drifting across our land.',
      'Fallout on our side of the line. Growth will suffer.',
    ]),
    'emp.us': D(3, 10, [
      'EMP. Systems going dark.',
      'Electromagnetic pulse. We\'re blind for now.',
      'EMP hit. Grids and radar down.',
    ]),

    /* ---------------- diplomacy ---------------- */
    'diplo.offer': D(1, 6, [
      '{nation} offers an alliance.',
      'Alliance proposal from {nation}.',
      '{nation} wants to be friends. Officially.',
      '{nation} is asking for a pact.',
      'Alliance proposal received.',
    ]),
    'diplo.accepted': D(1, 4, [
      '{nation} accepted. We\'re allied.',
      'Alliance signed with {nation}.',
      '{nation} is with us. For now.',
      'Proposal accepted. We\'re allied.',
    ]),
    'diplo.declined': D(1, 4, [
      '{nation} declined.',
      '{nation} said no. Noted.',
      'No pact with {nation}. Their loss, probably.',
      'Our proposal was declined.',
    ]),
    'diplo.betrayed': D(3, 6, [
      '{nation} broke the alliance. They\'re hostile.',
      'Betrayal. {nation} turned on us.',
      '{nation} tore up the pact. Expect an attack.',
      'Our ally {nation} just became our enemy.',
      'An ally broke the pact. They\'re hostile now.',
    ]),
    'diplo.we_betrayed': D(1, 6, [
      'Alliance with {nation} ended. They\'ll remember.',
      'We broke with {nation}. Everyone saw.',
      'Pact with {nation} dissolved. Trust is a currency.',
      'Alliance dissolved. They\'ll remember.',
    ]),
    'diplo.truce_offer': D(1, 6, [
      '{nation} wants a truce.',
      'Truce offer from {nation}.',
      '{nation} is asking for a ceasefire.',
      'Truce offer on the table.',
    ]),
    'diplo.truce': D(1, 4, [
      'Truce with {nation} in effect.',
      'Ceasefire with {nation}. Temporary.',
      'Guns down on the {nation} border.',
      'Truce in effect. Temporary.',
    ]),
    'diplo.truce_declined': D(1, 4, [
      '{nation} refused the truce.',
      'No truce. {nation} wants to keep fighting.',
      '{nation} declined. The front stays hot.',
      'Truce refused. They want to keep fighting.',
    ]),
    'diplo.truce_over': D(2, 6, [
      'Truce with {nation} expired.',
      'Ceasefire\'s over. {nation} is fair game. So are we.',
      '{nation} truce ended. Watch that border.',
      'The truce has expired.',
    ]),
    'diplo.embargo_us': D(1, 8, [
      '{nation} embargoed us.',
      'Trade sanctions from {nation}.',
      '{nation} cut trade with us.',
      'We\'ve been embargoed.',
    ]),
    'diplo.embargo_them': D(1, 4, [
      'Embargo on {nation} in place.',
      '{nation} is cut off from our trade.',
      'Sanctions on {nation}. Let them feel it.',
      'Embargo in place.',
    ]),
    'diplo.ally_attacked': D(2, 15, [
      'Our ally {nation} is under attack.',
      '{nation} needs support. They\'re being hit.',
      '{nation} is taking fire. Allies notice who helps.',
      'An ally is under attack.',
    ]),
    'diplo.alliance_cap': D(1, 10, [
      'We\'re at the alliance limit.',
      'No room for more pacts.',
      'Alliance cap reached. Choose friends carefully.',
    ]),
    'diplo.party_no_alliance': D(1, 10, [
      'Party rules. No outside alliances.',
      'Not in party play. Sides are fixed.',
      'Alliances are locked in party matches.',
    ]),
    'diplo.gift': D(1, 8, [
      '{nation} sent a gift.',
      'A gift from {nation}. Check for strings.',
      '{nation} is being generous. Suspiciously.',
      'A gift arrived. Nobody gives for free.',
    ]),

    /* ---------------- council / weather ---------------- */
    'council.session': D(1, 8, [
      'Council in session. On the agenda: {resolution}.',
      'The Council convenes on {resolution}.',
      'Council vote pending: {resolution}.',
      'The Council is in session.',
    ]),
    'council.passed': D(2, 4, [
      'Resolution passed: {resolution}.',
      '{resolution} carried. It\'s binding.',
      'The Council approved {resolution}.',
      'Resolution passed. It\'s binding.',
    ]),
    'council.failed': D(1, 4, [
      '{resolution} failed in Council.',
      'Resolution rejected: {resolution}.',
      'The Council couldn\'t agree. {resolution} is dead.',
      'Resolution failed.',
    ]),
    'weather.storm': D(1, 30, [
      'Storm front forming.',
      'Weather turning. Storm system on the map.',
      'Storm developing. Expect disruption.',
    ]),
    'weather.storm_us': D(2, 30, [
      'Storm over our territory.',
      'We\'re under the storm.',
      'Weather hit us. Operations will slow.',
    ]),

    /* ---------------- endings ---------------- */
    'end.victory': D(2, 10, [
      'Victory. The map is ours.',
      'It\'s over. We won.',
      'Victory confirmed. Midnight passes us by.',
      'We\'re the last ones standing.',
    ], { intr: true }),
    'end.defeat': D(2, 10, [
      'We\'ve lost. Channel closing.',
      'Defeat. They have the map.',
      'It\'s over. Not the ending we wanted.',
    ], { intr: true }),
    'end.winter': D(2, 10, [
      'Nuclear winter. Nobody wins.',
      'The sky\'s gone dark. Game over, for everyone.',
      'Too many detonations. The winter starts now.',
    ], { intr: true }),
    'end.timeout_win': D(2, 10, [
      'Midnight. We hold the lead. Victory on points.',
      'Time. We\'re ahead. That counts.',
      'The clock ran out in our favour.',
    ], { intr: true }),
    'end.timeout_loss': D(2, 10, [
      'Midnight. We came up short.',
      'Time\'s up. Someone else led.',
      'The clock ran out. Not on our side.',
    ], { intr: true }),
    'end.resign': D(2, 10, [
      'Resignation accepted. Channel closing.',
      'Standing down. Understood.',
      'We withdraw. I\'ll file the report.',
    ], { intr: true }),
    'end.alliance_win': D(2, 10, [
      'Alliance victory. Shared, but ours.',
      'The coalition holds the world. We won together.',
      'Victory with allies. Remember who stood with us.',
    ], { intr: true }),
    'end.council': D(2, 10, [
      'The Council has decided the outcome.',
      'A Council resolution ends the war.',
      'Diplomacy closed it out. The Council has spoken.',
    ], { intr: true }),

    /* ---------------- internal (not in the host catalogue) ---------------- */
    'sys.voice_on': D(1, 1, ['Voice channel open.', 'Back on voice.', 'Audio link restored.'], { rep: true }),
    'sys.voice_off': D(1, 1, ['Voice off. Text only.', 'Going quiet. Text channel only.'], { rep: true }),
  };

  // dim category label shown in the hint row when a line has no explicit hint
  const TAGS = {
    menu: '', sys: 'CHANNEL', tut: 'FIELD MANUAL', game: 'OPERATIONS', defcon: 'READINESS', clock: 'DOOMSDAY CLOCK',
    milestone: 'TERRITORY', rank: 'STANDINGS', attack: 'LAND WAR', land: 'LAND WAR', capital: 'LAND WAR', nation: 'WORLD',
    pocket: 'LAND WAR', supply: 'LOGISTICS', build: 'CONSTRUCTION', econ: 'ECONOMY', naval: 'NAVAL', research: 'RESEARCH',
    missile: 'STRATEGIC', radar: 'EARLY WARNING', fallout: 'STRATEGIC', emp: 'STRATEGIC', diplo: 'DIPLOMACY',
    council: 'COUNCIL', weather: 'WEATHER', end: 'FINAL REPORT',
  };
  // used only when no variant fits the params that were supplied
  const PDEF = {
    nation: 'a hostile power', target: 'the target', troops: 'several thousand', weapon: 'warhead', eta: 'seconds',
    type: 'Structure', level: 'next', reason: 'the site is unsuitable', doctrine: 'the new doctrine', name: 'unnamed',
    mission: 'the mission', item: 'new equipment', ending: 'the archive', speed: 'adjusted', resolution: 'the resolution',
    credits: 'their', uranium: 'their', amount: 'undisclosed', count: 'several',
  };

  /* ---------------- template filling ---------------- */
  const PH = /\{(\w+)\}/g;
  function fmtNum(n, speech) {
    const a = Math.abs(n);
    if (a >= 1e6) { const s = (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, ''); return speech ? s + ' million' : s + 'M'; }
    if (a >= 1e4) { const s = (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, ''); return speech ? s + ' thousand' : s + 'K'; }
    return Math.round(n).toLocaleString('en-US');
  }
  function fmtParam(name, v, speech) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
      if (!isFinite(v)) return null;
      if (name === 'eta') { const s = Math.max(1, Math.round(v)); return speech ? s + (s === 1 ? ' second' : ' seconds') : s + 's'; }
      if (name === 'speed') {
        const s = String(Math.round(v * 100) / 100);
        if (!speech) return s + '×';
        return ({ 0.25: 'quarter speed', 0.5: 'half speed', 1: 'normal speed', 2: 'double speed', 3: 'triple speed' })[s] || (s + ' times speed');
      }
      if (name === 'level' || name === 'count') return String(Math.round(v));
      return fmtNum(v, speech);
    }
    const s = String(v).replace(/\s+/g, ' ').trim().slice(0, 80);
    return s || null;
  }
  function paramFit(tpl, params) { // -> [missing, used]
    let miss = 0, used = 0;
    tpl.replace(PH, function (m, k) { if (fmtParam(k, params[k], false) == null) miss++; else used++; return m; });
    return [miss, used];
  }
  function tidy(s) {
    return s.replace(/\s+/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/([.!?])\.+/g, '$1')
      .replace(/([.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); })
      .replace(/^\s*([a-z])/, function (m, a) { return a.toUpperCase(); })
      .trim();
  }
  function toSpeech(s) {
    return s.replace(/[☢▮●·•▸►◆▲■□|]/g, ' ')
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/\bMIRV(s?)\b/g, 'merv$1')
      .replace(/\bVESPER\b/g, 'Vesper')
      .replace(/(^|\s)'(\d\d)\b/g, function (m, a, yy) { return a + '20' + yy; })   // '29 -> 2029
      .replace(/×/g, ' times ')
      .replace(/\s+/g, ' ').trim();
  }
  function fill(tpl, params) {
    const f = function (speech) {
      return tidy(tpl.replace(PH, function (m, k) { const r = fmtParam(k, params[k], speech); return r == null ? (PDEF[k] || '') : r; }));
    };
    return { text: f(false), speech: toSpeech(f(true)) };
  }
  // shuffle-bag variant picker: cycles through all variants before repeating, never repeats back-to-back,
  // and only considers the variants missing the fewest {params}; param-free variants are fallbacks for when the
  // host supplied nothing they could use.
  const bags = Object.create(null), lastIdx = Object.create(null);
  function pickVariant(key, v, params) {
    let pool = [], best = 1e9, useful = false;
    const fit = v.map(function (tpl) { return paramFit(tpl, params); });
    for (let i = 0; i < v.length; i++) best = Math.min(best, fit[i][0]);
    for (let i = 0; i < v.length; i++) if (fit[i][0] === best && fit[i][1] > 0) useful = true;
    for (let i = 0; i < v.length; i++) if (fit[i][0] === best && (!useful || fit[i][1] > 0)) pool.push(i);
    for (let round = 0; round < 2; round++) {
      let bag = bags[key];
      if (!bag || !bag.length) {
        bag = bags[key] = shuffle(v.map(function (_, i) { return i; }));
        if (bag.length > 1 && bag[bag.length - 1] === lastIdx[key]) bag.unshift(bag.pop());
      }
      for (let j = bag.length - 1; j >= 0; j--) {
        if (pool.indexOf(bag[j]) >= 0 && (pool.length < 2 || bag[j] !== lastIdx[key])) { const idx = bag.splice(j, 1)[0]; lastIdx[key] = idx; return idx; }
      }
      bag.length = 0;
    }
    const idx = pool[(Math.random() * pool.length) | 0];
    lastIdx[key] = idx;
    return idx;
  }

  /* =========================================================================================
   * PORTRAIT — 64×64 hand-placed pixel art, composed per animation frame into an ImageData
   * and scaled with nearest-neighbour. Glyph → colour table below; '.' is the procedural backdrop.
   * ======================================================================================= */
  const ART = [
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '............................hHHHHHH.............................',
    '.........................hhHGGGHkkkHHj.yY.......................',
    '.......................hhHHkHHhkhkkkkyYGHjN.....................',
    '.....................hhhhkkkkkkkkkzyYkkkGHNj....................',
    '....................hkhkkkkkkkkkkzyYkkkkkGhNj...................',
    '...................hkkkkkkkkkkkzyYkkkkkkkkHkNj..................',
    '..................hkkkkkkhkkkzyYkkkhkkkkkkkHMj..................',
    '..................hkkkkkhkkkzyYkkkhkkkkkkkHhkMj.................',
    '.................hkkkkkhkkzyYkkkkhkkkkkkkHkkhMj.................',
    '.................hkkkkhkkzyYkkkkhkkkkkkkHkkkhMj.................',
    '.................hkkkhkkzyYkkkkhkkkkkkkHkkkhkHM.................',
    '.................hkhhkkzyYkkkkhkkkkKKKkKKkkhkHM.................',
    '.................hkhhzyYkkkkkkkKKkK555K55KhkkHMj................',
    '.................hkhzyYkkkkkKKK45K56675664KkkHMj................',
    '.................hkhzyYkkKKK44455566666665KkkHMj................',
    '.................hkzyYkKK34K55555566666665KXMMXj................',
    '.................hkzyYK234bbbb35553bbbb665XmmMNX................',
    '.................hzyYkK23b4444455655555b65XmmmMX................',
    '.................hkzykK2KKKKKK35563KKKKKK5XmmmMX................',
    '.................hkzykK227eeW7555557eeW735XmLmMX................',
    '.................hkzyhK233eee4555664eee365XmmmMX................',
    '.................hkzzhK2344555545666667765XmmmMX................',
    '................hkkzzkK2344555545766677765XmmmMX................',
    '................hkkzzhK2344555545766667665XmmmMX................',
    '................hkkhkhK2334455556766666665NXmmXj................',
    '................hkkhkhK233444553345666665NMkkkkj................',
    '................hkkhkhkK3344454444566665NMkkkj..................',
    '................hkkhkkkK334444321234qmNM4Kkj....................',
    '................hkkkkhkkK33445456655mm54K.......................',
    '.................hkhkhkkkK3344544456654K........................',
    '..................hhkhkkkkK34455665543..........................',
    '...................hkhkkkkkK344566543KKKK.......................',
    '....................hHkkkkkkkK233322xxxxx.......................',
    '......................hHkkkkku0000ttTTttT.......................',
    '......................tuHHkkkkt11ttTTttTTt......................',
    '.....................tuuttHHkku11tTTttTTttT.....................',
    '.....................uuttuutHHu11TcccccccTT.....................',
    '..................CCuuccuuttuu1111DcccccccttDE..................',
    '...............CCCcCucccccccccccDccccccccccTCDDDE...............',
    '............CCCccCCcccccccccccccCcccccccccccCCDDCDDE............',
    '..........CCxxcCCcccccccccccccccCccccccccccccCCCDDCCDE..........',
    '........CCxxxCCcccccccccccccccccDccccccccccccCCCCCDDCCDE........',
    '.......CxxxCCcccccccccccccccccccCcccccccccccccCCCCCCDDCCE.......',
    '......CxxxCxccccccccccccccccccccCcccccxxxxxxxccCCCCCCCDCCE......',
    '.....CxxCCxxccccccccccDDDDDDccccDcccccxBBBBBxcccCCCCCCCDDCE.....',
    '...CCxxCxxxcccccccccccCZCZZCccccCcccccxnnnnnxccccCCCCCCCCDCDE...',
    '...xxxxxxxxcccccccccccDDDDDDccccCcccccxBBBBBxcccccCCCCCCCCCCE...',
    '..CxxxxxxxccccccccccccccccccccccDcccccxxxxxxxcccccCCCCCCCCCCCE..',
    '..xxxxxxxxccccccccccccccccccccccCccccccccccccccccccCCCCCCCCCCE..',
    '.CxxxxxxxcccccccccccccccccccccccCcccccccccccccccccccCCCCCCCCCCE.',
    '.xxxxxxxxcccccccccccccccccccccccDccccccccccccccccccccCCCCCCCCCE.',
    '.xxxxxxxxcccccccccccccccccccccccCcccccccccccccccccccccCCCCCCCCE.',
    '.xxxxxxxxcccccccccccccccccccccccCccccccccccccccccccccccCCCCCCCE.',
    '.xxxxxxcxcccccccccccccccccccccccDccccccccccccccccccccccCCCCCCCE.',
    '.xxxxxxcxcccccccccccccccccccccccCcccccccccccccccccccccccCCCCCCE.',
    'CxxxxxccxcccccccccccccccccccccccCcccccccccccccccccccccccCCCCCCCE',
    'xxxxxxccxcccccccccccccccccccccccDcccccccccccccccccccccccCcCCCCCE',
    'xxxxxcccxcccccccccccccccccccccccCcccccccccccccccccccccccCccCCCCE',
    'xxxxxcccxcccccccccccccccccccccccCcccccccccccccccccccccccCcccCCCE',
    'xxxxccccxcccccccccccccccccccccccDcccccccccccccccccccccccCcccCCCE'
  ];
  const PAL = {
    // hair: near-black with olive-charcoal sheen, dim-yellow rim light
    K: '#040302', k: '#0e0c08', h: '#1f1b12', H: '#353020', G: '#4d4630', j: '#5c4c0e',
    // the hazard-yellow streak
    Y: '#ffd21f', y: '#e0a812', z: '#8a6a0c',
    // skin ramp: umber shadows -> amber -> hazard yellow -> warm white
    0: '#1b1404', 1: '#2c2006', 2: '#48340a', 3: '#6f520d', 4: '#9a7210', 5: '#c69215', 6: '#e8ac1a', 7: '#ffcc24', 8: '#ffe38a', W: '#fff4d6',
    e: '#0b0804', b: '#1d1508', o: '#2a1805',
    // field jacket, collar hazard trim, rank bars, name tape (torso layer)
    x: '#050403', c: '#100e0a', C: '#1c1912', D: '#2d291d', E: '#46402d',
    T: '#ffd21f', u: '#c99a10', t: '#0a0906', B: '#ffb000', n: '#16120a', Z: '#8a6a0c',
    // headset
    X: '#050403', m: '#18160f', M: '#36312a', N: '#5e5642', L: '#ffb000', l: '#5a4708', q: '#7a6410',
  };
  const TORSO_GLYPHS = 'xcCDETutBnZ';
  // animation sprites: '.' keeps the base pixel
  const EYE_L = { x: 24, y: 22, f: [
    null,                                     // 0 open (base art)
    ['3444444', 'KKKKKK3', '33eee45'],        // 1 half
    ['3444444', 'K444444', '3KKKKK5'],        // 2 closed
    ['.......', '2eeW775', '3eee445'],        // 3 glance left
    ['.......', '277eeW5', '334eee5'],        // 4 glance right
  ] };
  const EYE_R = { x: 34, y: 22, f: [
    null,
    ['5555556', '3KKKKKK', '64eee36'],
    ['5555556', '555555K', '6KKKKK6'],
    ['.......', '5eeW773', '6eee436'],
    ['.......', '577eeW3', '644eee6'],
  ] };
  const MOUTH = { x: 29, y: 30, f: [
    null,                                                   // 0 closed (base art)
    ['5444456', '4310134', '5421245', '4456656', '4544455'],   // 1 parted
    ['5444456', '4310134', '4200o24', '4456654', '4544455'],   // 2 open
    ['5443456', '4431344', '4410144', '4456544', '4544455'],   // 3 rounded
  ] };
  // long-side lock tips flare out by a pixel on the sway beat
  const SWAY = [[18, 35, 'h'], [19, 35, 'k'], [19, 36, 'h'], [20, 36, 'k'], [21, 37, 'h'], [22, 37, 'H'], [23, 38, 'h'], [24, 38, 'H'], [25, 39, 'h'], [26, 39, 'H'], [27, 40, 'h'], [28, 40, 'H']];
  const LED_XY = [44, 23];

  const P = { ready: false };
  function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function tintRGB(c, k) { // mix toward a luminance-matched red ramp (critical alert)
    if (!k) return c;
    const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    const R = Math.min(255, l * 1.55 + 14), G = l * 0.3, B = l * 0.22;
    return [c[0] + (R - c[0]) * k, c[1] + (G - c[1]) * k, c[2] + (B - c[2]) * k];
  }
  function bgRGB(x, y) { // dark field, soft halo behind the head, radar ring, faint grid
    const dx = x - 32, dy = y - 24, d = Math.sqrt(dx * dx + dy * dy);
    let c = d < 21 ? [27, 24, 16] : d < 26 ? [22, 20, 13] : d < 31 ? [17, 15, 10] : [12, 11, 8];
    if (Math.abs(d - 26.2) < 0.55) c = [44, 38, 20];
    if ((x % 8 === 4 && y % 2 === 0) || (y % 8 === 4 && x % 2 === 0)) c = [c[0] + 5, c[1] + 5, c[2] + 5];
    return c;
  }
  function buildPortrait() {
    if (P.ready) return true;
    try {
      const le = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
      const pack = function (c) {
        const r = c[0] | 0, g = c[1] | 0, b = c[2] | 0;
        return le ? (((255 << 24) | (b << 16) | (g << 8) | r) >>> 0) : (((r << 24) | (g << 16) | (b << 8) | 255) >>> 0);
      };
      const glyphs = Object.keys(PAL), ci = Object.create(null), rgb = [[0, 0, 0]];
      glyphs.forEach(function (g) { ci[g] = rgb.length; rgb.push(hexRGB(PAL[g])); });
      const LEVELS = [0, 0.5, 1];
      P.pal = LEVELS.map(function (k) { return Uint32Array.from(rgb.map(function (c) { return pack(tintRGB(c, k)); })); });
      P.isT = new Uint8Array(rgb.length);
      for (const g of TORSO_GLYPHS) if (ci[g]) P.isT[ci[g]] = 1;
      P.base = new Uint8Array(4096);
      for (let y = 0; y < 64; y++) { const row = ART[y] || ''; for (let x = 0; x < 64; x++) { const g = row[x]; P.base[y * 64 + x] = (g && g !== '.' && ci[g]) ? ci[g] : 0; } }
      P.bg = LEVELS.map(function (k) { const a = new Uint32Array(4096); for (let i = 0; i < 4096; i++) a[i] = pack(tintRGB(bgRGB(i & 63, i >> 6), k)); return a; });
      P.edge = LEVELS.map(function (k) { const c = tintRGB([12, 11, 8], k); return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; });
      const comp = function (spr, ox, oy) { // sprite -> flat [index, colour, index, colour...]
        if (!spr) return null; const out = [];
        spr.forEach(function (r, j) { for (let i = 0; i < r.length; i++) if (r[i] !== '.' && ci[r[i]]) out.push((oy + j) * 64 + ox + i, ci[r[i]]); });
        return out;
      };
      P.eyeL = EYE_L.f.map(function (s) { return comp(s, EYE_L.x, EYE_L.y); });
      P.eyeR = EYE_R.f.map(function (s) { return comp(s, EYE_R.x, EYE_R.y); });
      P.mouth = MOUTH.f.map(function (s) { return comp(s, MOUTH.x, MOUTH.y); });
      P.sway = []; SWAY.forEach(function (p) { P.sway.push(p[1] * 64 + p[0], ci[p[2]]); });
      P.led = LED_XY[1] * 64 + LED_XY[0];
      P.ledC = [ci.m, ci.l, ci.L];
      P.off = document.createElement('canvas'); P.off.width = P.off.height = 64;
      P.octx = P.off.getContext('2d');
      P.img = P.octx.createImageData(64, 64);
      P.buf = new Uint32Array(P.img.data.buffer);
      P.hostOff = document.createElement('canvas'); P.hostOff.width = P.hostOff.height = 64;
      P.hctx = P.hostOff.getContext('2d');
      P.himg = P.hctx.createImageData(64, 64);
      P.hbuf = new Uint32Array(P.himg.data.buffer);
      P.ready = !!(P.octx && P.hctx);
    } catch (e) { warn(e); P.ready = false; }
    return P.ready;
  }
  function stampFlat(buf, pal, flat) { if (flat) for (let i = 0; i < flat.length; i += 2) buf[flat[i]] = pal[flat[i + 1]]; }
  // st: { eye 0..4, mouth 0..3, breath 0|1, sway 0|1, led 0..2, alert 0..2, glitch seed|0 }
  function compose(st, buf, clearBg) {
    const pal = P.pal[st.alert], bg = P.bg[st.alert], base = P.base, isT = P.isT, br = st.breath;
    for (let i = 0; i < 4096; i++) {
      const c = base[i];
      if (c && !isT[c]) { buf[i] = pal[c]; continue; }          // head layer (hair, skin, headset)
      let tc = c;                                                  // torso layer, risen 1px on the inhale
      if (br && i < 4032) { const c2 = base[i + 64]; if (c2 && isT[c2]) tc = c2; }
      buf[i] = tc ? pal[tc] : (clearBg ? 0 : bg[i]);
    }
    if (st.sway) stampFlat(buf, pal, P.sway);
    stampFlat(buf, pal, P.eyeL[st.eye]); stampFlat(buf, pal, P.eyeR[st.eye]);
    stampFlat(buf, pal, P.mouth[st.mouth]);
    buf[P.led] = pal[P.ledC[st.led]];
    if (st.glitch) glitch(buf, st.glitch, pal);
  }
  function glitch(buf, seed, pal) { // horizontal tearing + a hot scanline, deterministic per seed
    let s = (seed * 7919) % 233280;
    const rnd = function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const bands = 2 + ((rnd() * 3) | 0), tmp = new Uint32Array(64);
    for (let b = 0; b < bands; b++) {
      const y0 = (rnd() * 62) | 0, h = 1 + ((rnd() * 4) | 0), dx = ((rnd() * 9) | 0) - 4 || 3;
      for (let y = y0; y < Math.min(64, y0 + h); y++) {
        const o = y * 64; for (let x = 0; x < 64; x++) tmp[x] = buf[o + x];
        for (let x = 0; x < 64; x++) buf[o + x] = tmp[(x - dx + 64) & 63];
      }
    }
    if (rnd() < 0.6) { const y = (rnd() * 64) | 0, hot = pal[1 + ((rnd() * 4) | 0)] || buf[0]; for (let x = (rnd() * 20) | 0; x < 64; x += 1 + ((rnd() * 3) | 0)) buf[y * 64 + x] = hot; }
  }
  function blit(cv, src, alert) {
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const W = cv.width, H = cv.height; if (!W || !H) return;
    let s = Math.min(W, H) / 64; const fs = Math.floor(s);
    if (fs >= 1 && fs / s >= 0.86) s = fs;                    // integer scale when it costs <14% size
    const w = Math.round(64 * s), ox = (W - w) >> 1, oy = (H - w) >> 1;
    ctx.imageSmoothingEnabled = false;
    if (ox > 0 || oy > 0) { ctx.fillStyle = P.edge[alert || 0]; ctx.fillRect(0, 0, W, H); }
    ctx.drawImage(src, 0, 0, 64, 64, ox, oy, w, w);
  }
  function talkMouth(t) { const k = Math.floor(t * 9) % 6; return [1, 2, 0, 3, 1, 2][k]; }
  function drawPortrait(ctx, x, y, size, opts) {
    try {
      if (!ctx || typeof ctx.drawImage !== 'function' || !buildPortrait()) return false;
      opts = opts || {};
      size = Math.max(1, +size || 64); x = +x || 0; y = +y || 0;
      const t = opts.t != null ? +opts.t : nowS();
      const alert = opts.alert ? ((opts.alert === true || opts.alert >= 1) ? 2 : 1) : 0;
      const st = {
        eye: opts.blink ? 2 : (opts.gaze < 0 ? 3 : opts.gaze > 0 ? 4 : 0),
        mouth: opts.mouth != null ? clamp(opts.mouth | 0, 0, 3) : (opts.talking ? talkMouth(t) : 0),
        breath: opts.breath ? 1 : 0, sway: opts.sway ? 1 : 0, led: opts.talking ? 2 : 1, alert: alert,
        glitch: opts.glitch ? (1 + ((t * 18) | 0)) : 0,
      };
      compose(st, P.hbuf, opts.bg === false);
      P.hctx.putImageData(P.himg, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(P.hostOff, 0, 0, 64, 64, x, y, size, size);
      if (opts.crt !== false && size >= 32) {
        const step = Math.max(2, Math.round(size / 96));
        ctx.fillStyle = 'rgba(0,0,0,' + (size >= 128 ? 0.26 : 0.16) + ')';
        for (let yy = 0; yy < size; yy += step * 2) ctx.fillRect(x, y + yy, size, step);
      }
      ctx.restore();
      return true;
    } catch (e) { warn(e); return false; }
  }

  /* =========================================================================================
   * AUDIO CUES — radio squelch, comm chirps, typewriter ticks (Web Audio via MP.audio.voiceOut())
   * ======================================================================================= */
  const A = { noise: null, noiseCtx: null, lastTick: 0, cues: 0 };
  function audioOut() {
    try {
      const au = MP.audio; if (!au || !au.getCtx || !au.voiceOut) return null;
      const c = au.getCtx(), o = au.voiceOut();
      if (!c || !o || c.state !== 'running') return null;
      return { c: c, o: o };
    } catch (e) { return null; }
  }
  function noiseBuf(c) {
    if (A.noise && A.noiseCtx === c) return A.noise;
    const len = (c.sampleRate * 0.6) | 0, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = b; A.noiseCtx = c; return b;
  }
  function cueBus(au, gain) { const g = au.c.createGain(); g.gain.value = gain; g.connect(au.o); return g; }
  function tone(au, bus, t0, f0, f1, dur, peak, type) {
    const o = au.c.createOscillator(), g = au.c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    g.gain.setValueAtTime(peak, t0 + Math.max(0.006, dur - 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function hiss(au, bus, t0, dur, peak, freq, q, type) {
    const s = au.c.createBufferSource(), f = au.c.createBiquadFilter(), g = au.c.createGain();
    s.buffer = noiseBuf(au.c);
    f.type = type || 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = q || 0.8;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t0, Math.random() * 0.3); s.stop(t0 + dur + 0.03);
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // line open: squelch + priority-coded chirp. comm=true adds a short "data voice" burst for when TTS is unavailable.
  function cueOpen(item, comm) {
    const au = audioOut(); if (!au) return;
    try {
      const vol = S.volume; if (vol <= 0) return;
      const bus = cueBus(au, 0.55 * vol), t0 = au.c.currentTime + 0.01;
      hiss(au, bus, t0, 0.06, 0.22, 2100, 0.7);
      let t = t0 + 0.05;
      if (item.priority >= 3) {
        const lp = au.c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(bus);
        for (let i = 0; i < 2; i++) { tone(au, lp, t, 760, 1240, 0.13, 0.2, 'square'); t += 0.17; }
      } else if (item.priority === 2) {
        tone(au, bus, t, 1320, 0, 0.045, 0.16, 'triangle'); tone(au, bus, t + 0.075, 1320, 0, 0.045, 0.16, 'triangle'); tone(au, bus, t + 0.15, 990, 0, 0.06, 0.15, 'triangle'); t += 0.22;
      } else {
        tone(au, bus, t, 1180, 0, 0.04, 0.1); tone(au, bus, t + 0.065, 1560, 0, 0.05, 0.1); t += 0.12;
      }
      if (comm) { // encoded-voice chirps, one per word (max 9), pitch walk seeded by the text
        const notes = [880, 988, 1175, 1319, 1480, 1760], words = Math.min(9, Math.max(3, item.text.split(/\s+/).length));
        let h = hash(item.text); t += 0.04;
        for (let i = 0; i < words; i++) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; const f = notes[h % notes.length]; tone(au, bus, t, f, f * 0.94, 0.032, 0.075, 'triangle'); t += 0.032 + 0.02 + (h % 3) * 0.012; }
        hiss(au, bus, t0 + 0.05, t - t0, 0.025, 2600, 0.5);
      }
      A.cues++;
    } catch (e) { warn(e); }
  }
  function cueClose() {
    const au = audioOut(); if (!au) return;
    try { const vol = S.volume; if (vol <= 0) return; const bus = cueBus(au, 0.45 * vol); hiss(au, bus, au.c.currentTime + 0.01, 0.045, 0.12, 1700, 0.9); } catch (e) { /* ignore */ }
  }
  function cueTick(soft) {
    const t = nowS(); if (t - A.lastTick < 0.045) return; A.lastTick = t;
    const au = audioOut(); if (!au) return;
    try {
      const vol = S.volume; if (vol <= 0) return;
      const bus = cueBus(au, (soft ? 0.28 : 0.55) * vol), t0 = au.c.currentTime + 0.002;
      hiss(au, bus, t0, 0.012, 0.09, 3200 + Math.random() * 1400, 1.6, 'highpass');
    } catch (e) { /* ignore */ }
  }

  /* =========================================================================================
   * SPEECH — speechSynthesis with female-voice auto-pick and defensive handling of browser quirks
   * ======================================================================================= */
  const synth = (function () { try { return window.speechSynthesis || null; } catch (e) { return null; } })();
  const SSU = typeof window.SpeechSynthesisUtterance === 'function' ? window.SpeechSynthesisUtterance : null;
  const TTS = { ok: !!(synth && SSU), voices: [], voice: null, tune: null, polls: 0, fails: 0, broken: false, blocked: false, gesture: false, utter: [], keepAlive: 0 };
  const FEMALE_RX = /\b(female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|zira|hazel|susan|aria|jenny|libby|sonia|natasha|clara|emma|ava|allison|kate|kathy|vicki|veena|zoe|zoey|nicky|agnes|martha|catherine|heera|linda|eva|cortana|michelle|ana|ashley|cora|elizabeth|jane|nancy|sara|sarah|amber|monica|maisie|hollie|bella|abbi|olivia|mia|neerja|leah|emily|molly|annette|freya|elsie|joanna|kimberly|salli|kendra|ivy|nicole|amy|ruth|isla|imogen|alice|anna|helena|laura|lucia|paulina|yuna|tingting|sinji|kyoko|ellen|nora|alva|satu|zuzana|mariska|ioana|melina|carmit|lekha|damayanti|kanya|lana|yelda|milena|stephanie|shelley|sandy|flo|grandma|princess)\b/i;
  const MALE_RX = /\b(male|man|david|mark|george|daniel|alex|fred|ryan|guy|thomas|oliver|james|brian|arthur|rishi|aaron|gordon|lee|tom|junior|ralph|albert|bruce|eddy|reed|rocko|grandpa|christopher|eric|roger|steffan|william|liam|connor|andrew|brandon|davis|jason|tony|ravi|prabhat|sean|mitchell|ken|luke|noah|elliot|ethan|harry|jacob|kai|neil|duncan|aarav|jorge|diego|juan|carlos|thomas|xander|maged|tarik|yuri|aleksandr|felix|hemant|rafael|gordon)\b/i;
  const NOVELTY_RX = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|princess|grandma|grandpa)\b/i;
  const ANDROID_F = /-x-(sfg|iob|iog|tpc|tpf|gba|gbc|gbg|aua|auc|ahp|cxx)/i;
  const ANDROID_M = /-x-(iol|iom|tpd|gbb|gbd|rjs|aub|aud|ena|end)/i;
  function gender(v) { // true = female, false = male, null = unknown
    const n = (v.name || '') + ' ' + (v.voiceURI || '');
    if (/google uk english female/i.test(n) || /^google us english$/i.test((v.name || '').trim())) return true;
    if (/\bfemale\b/i.test(n) || ANDROID_F.test(n) || /\+f\d\b/i.test(n)) return true;
    if (/\bmale\b/i.test(n) || ANDROID_M.test(n) || /\+m\d\b/i.test(n)) return false;
    if (FEMALE_RX.test(n)) return true;
    if (MALE_RX.test(n)) return false;
    return null;
  }
  function scoreVoice(v) {
    const lang = String(v.lang || '').toLowerCase().replace('_', '-'), n = v.name || '';
    let s = 0;
    if (lang.indexOf('en-gb') === 0) s += 30; else if (lang.indexOf('en-us') === 0) s += 26;
    else if (/^en-(au|ie|nz|ca|za)/.test(lang)) s += 18; else if (lang.indexOf('en-in') === 0) s += 14;
    else if (lang.indexOf('en') === 0) s += 12; else s -= 100;
    const g = gender(v); if (g === true) s += 60; else if (g === false) s -= 90;
    if (/natural|neural|premium|enhanced/i.test(n)) s += 14;
    if (/online/i.test(n)) s += 4;
    if (v.localService) s += 6;
    if (/google/i.test(n)) s += 5;
    if (/google uk english female|sonia|libby|serena|hazel/i.test(n)) s += 10;   // composed British reads suit her
    if (/aria|jenny|samantha|kate/i.test(n)) s += 6;
    if (/espeak|festival|\+f\d/i.test(n)) s -= 10;                              // robotic synths: last resort
    if (NOVELTY_RX.test(n)) s -= 200;
    if (/shelley|sandy|flo\b/i.test(n)) s -= 25;                                  // macOS "eloquence" voices
    if (v.default) s += 2;
    return s;
  }
  function tuneFor(v) { // base pitch/rate for a calm, clipped, slightly ominous delivery
    const n = (v && v.name) || '';
    let pitch = 1.04, rate = 1.03;
    if (/google/i.test(n)) { pitch = 1.0; rate = 1.0; }
    else if (/natural|neural|online/i.test(n)) { pitch = 1.0; rate = 1.04; }
    else if (/samantha|karen|moira|tessa|serena|kate|fiona/i.test(n)) { pitch = 1.03; rate = 1.04; }
    if (v && gender(v) === false) pitch = 1.22;                                  // no female voice installed
    return { pitch: pitch, rate: rate };
  }
  function autoVoice(list) {
    let best = null, bs = -1e9;
    for (const v of list) { const sc = scoreVoice(v); if (sc > bs) { bs = sc; best = v; } }
    return best;
  }
  function pickVoice() {
    const want = sget('advisor.voiceName', null);
    let v = null;
    if (want) for (const x of TTS.voices) if (x.name === want) { v = x; break; }
    TTS.voice = v || autoVoice(TTS.voices);
    TTS.tune = tuneFor(TTS.voice);
  }
  function loadVoices() {
    if (!TTS.ok) return;
    let list = [];
    try { list = synth.getVoices() || []; } catch (e) { list = []; }
    if (!list.length) return;
    const changed = list.length !== TTS.voices.length;
    TTS.voices = Array.prototype.slice.call(list);
    if (changed || !TTS.voice) { TTS.broken = false; TTS.fails = 0; }
    pickVoice();
  }
  function initVoices() {
    if (!TTS.ok || TTS.inited) return;
    TTS.inited = true;
    loadVoices();
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
      else if ('onvoiceschanged' in synth) synth.onvoiceschanged = loadVoices;
    } catch (e) { /* ignore */ }
    // some engines never fire voiceschanged (or fire it before we listen): poll a few times, then give up
    [250, 700, 1500, 3000, 6000, 12000].forEach(function (ms) { setTimeout(function () { if (!TTS.voices.length) loadVoices(); }, ms); });
  }
  function userActivated() {
    if (TTS.gesture) return true;
    try { const ua = navigator.userActivation; if (ua) return !!ua.hasBeenActive; } catch (e) { /* ignore */ }
    return true; // no activation API: just try (errors fall back to the radio cue)
  }
  function hostMuted() { try { return !!(MP.audio && MP.audio.isMuted && MP.audio.isMuted()); } catch (e) { return false; } }
  function canSpeak() {
    return S.voice && TTS.ok && !!TTS.voice && !TTS.broken && !TTS.blocked && userActivated() && !hostMuted() && S.volume > 0.001;
  }
  function ttsVolume() {
    const m = +sget('vol.master', 0.8), v = +sget('vol.voice', 0.9);
    return clamp(S.volume * (isFinite(m) ? m / 0.8 : 1) * (isFinite(v) ? v / 0.9 : 1), 0, 1);
  }
  function splitChunks(s) { // Chrome drops long utterances: keep each under ~180 chars at sentence breaks
    if (s.length <= 180) return [s];
    const out = []; let cur = '';
    s.split(/(?<=[.!?;:])\s+/).forEach(function (part) {
      if ((cur + ' ' + part).trim().length > 180 && cur) { out.push(cur.trim()); cur = part; } else cur = (cur + ' ' + part).trim();
    });
    if (cur) out.push(cur.trim());
    return out.reduce(function (a, c) { while (c.length > 200) { a.push(c.slice(0, 200)); c = c.slice(200); } a.push(c); return a; }, []);
  }
  function speakItem(item) {
    const text = item.speech || item.text;
    const tune = TTS.tune || { pitch: 1.04, rate: 1.03 };
    const pr = item.priority >= 3 ? 0.06 : item.priority === 0 ? -0.02 : 0;
    const pp = item.priority >= 3 ? -0.03 : 0;
    const rate = clamp(tune.rate * S.rate + pr, 0.5, 2), pitch = clamp(tune.pitch + pp, 0.1, 2);
    const chunks = splitChunks(text);
    item.mode = 'voice'; item.speechAt = nowS(); item.vcps = 14.5 * rate; item.speechLen = text.length;
    item.estDur = text.length / item.vcps + 0.6;
    let offset = 0;
    TTS.utter = chunks.map(function (chunk, ci) {
      const u = new SSU(chunk), base = offset; offset += chunk.length + 1;
      try { u.voice = TTS.voice; } catch (e) { /* ignore */ }
      u.lang = (TTS.voice && TTS.voice.lang) || 'en-GB';
      u.rate = rate; u.pitch = pitch; u.volume = ttsVolume();
      u.onstart = function () { if (cur !== item) return; if (!item.speechStarted) { item.speechStarted = true; item.speechT0 = nowS(); } TTS.fails = 0; };
      u.onboundary = function (e) { if (cur !== item || (e && e.name && e.name !== 'word')) return; item.boundary = true; item.bIdx = base + ((e && e.charIndex) || 0); item.bT = nowS(); };
      u.onend = function () { if (cur !== item) return; if (ci === chunks.length - 1) item.speechDone = true; };
      u.onerror = function (e) {
        if (cur !== item) return;
        const er = (e && e.error) || '';
        if (er === 'interrupted' || er === 'canceled') { item.speechDone = true; return; }
        if (er === 'not-allowed') TTS.blocked = true; else TTS.fails++;
        if (TTS.fails >= 3) TTS.broken = true;
        item.speechDone = true;
        if (!item.speechStarted) toTextMode(item, true);
      };
      return u;
    });
    const go = function () {
      if (cur !== item) return;
      try {
        if (synth.paused) synth.resume();
        for (const u of TTS.utter) synth.speak(u);
        if (synth.paused) synth.resume();
      } catch (e) { warn(e); toTextMode(item, true); }
    };
    let busy = false;
    try { busy = synth.speaking || synth.pending; } catch (e) { busy = false; }
    if (busy) { try { synth.cancel(); } catch (e) { /* ignore */ } setTimeout(go, 70); } // Chrome can drop a speak() issued right after cancel()
    else go();
  }
  function stopSpeech() { try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch (e) { /* ignore */ } }
  function toTextMode(item, cue) {
    if (item.mode === 'text') return;
    item.mode = 'text'; item.speechDone = true;
    if (cue) cueOpen(item, true);
  }

  /* =========================================================================================
   * STATE + QUEUE
   * ======================================================================================= */
  const S = { voice: true, volume: 0.9, rate: 1.0 };
  let inited = false, mode = 'idle', cur = null, gapUntil = 0, lineSeq = 0, hostHint = '';
  const Q = [], MAXQ = 4;
  const lastFire = Object.create(null), tutDone = Object.create(null);
  let greetAt = 0, lastGreetAt = -1e9, lastReturnAt = -1e9, chatterAt = 0, lastLineAt = 0;
  let speakingFlag = false, alertUntil = 0, glitchUntil = 0;

  function ttlFor(it) { return it.tut ? 25 : it.priority >= 3 ? 20 : it.priority === 2 ? 15 : 8; }
  function allowedIn(it, m) {
    const k = it.key || '';
    if (m !== 'menu' && m !== 'game') return false;
    if (!k || !Object.prototype.hasOwnProperty.call(LINES, k)) return true;   // raw say() lines go anywhere
    if (m === 'menu') return k.indexOf('menu.') === 0 || k.indexOf('end.') === 0 || k.indexOf('sys.') === 0;
    return k.indexOf('menu.') !== 0;
  }
  function tagFor(it) {
    const k = it.key || '', pre = k.split('.')[0];
    const tag = Object.prototype.hasOwnProperty.call(TAGS, pre) ? TAGS[pre] : '';
    if (it.priority >= 3 && !it.intr) return tag ? 'FLASH · ' + tag : 'FLASH TRAFFIC';
    if (it.priority === 2 && tag) return 'PRIORITY · ' + tag;
    return tag;
  }

  function event(key, params) {
    try {
      ensureInit();
      key = String(key || '');
      params = (params && typeof params === 'object') ? params : {};
      const def = Object.prototype.hasOwnProperty.call(LINES, key) ? LINES[key] : null;
      if (!def || !def.v || !def.v.length) {
        if (params.text) return say(params.text, { priority: params.priority, hint: params.hint, key: key });
        return false;
      }
      const t = nowS();
      if (key === 'menu.boot' || key === 'menu.greet' || key.indexOf('menu.return_') === 0) { greetAt = 0; lastReturnAt = t; if (key === 'menu.boot') sset('advisor.booted', true); }
      if (def.tut) { if (tutDone[key]) return false; tutDone[key] = 1; }
      const prio = params.priority != null && isFinite(+params.priority) ? clamp(+params.priority | 0, 0, 3) : def.p;
      const cd = def.cd != null ? def.cd : (prio >= 3 ? 4 : 12);
      const mk = function () {
        const idx = pickVariant(key, def.v, params), f = fill(def.v[idx], params);
        return {
          key: key, text: f.text, speech: f.speech, priority: prio, hint: params.hint ? String(params.hint) : (def.hint || ''),
          tut: !!def.tut, intr: !!def.intr, t: t, count: 1, voice: params.voice !== false, ttl: def.ttl || 0,
        };
      };
      if (lastFire[key] != null && t - lastFire[key] < cd) {
        if (def.rep) return replaceOrCollapse(key, mk());
        collapse(key);
        return false;
      }
      lastFire[key] = t;
      return enqueue(mk());
    } catch (e) { warn(e); return false; }
  }
  function say(text, opts) {
    try {
      ensureInit();
      opts = opts || {};
      text = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
      if (!text) return false;
      if (text.length > 400) text = text.slice(0, 397) + '…';
      const t = nowS(), key = opts.key ? String(opts.key) : '';
      const prio = opts.priority != null && isFinite(+opts.priority) ? clamp(+opts.priority | 0, 0, 3) : 1;
      if (key) {
        const cd = opts.cooldown != null ? +opts.cooldown : 0;
        if (cur && cur.key === key && cur.text === text) { collapse(key); return false; }
        for (const q of Q) if (q.key === key && q.text === text) { collapse(key); return false; }
        if (cd > 0 && lastFire[key] != null && t - lastFire[key] < cd) { collapse(key); return false; }
        lastFire[key] = t;
      }
      return enqueue({ key: key, text: text, speech: toSpeech(text), priority: prio, hint: opts.hint ? String(opts.hint) : '', tut: false, intr: !!opts.interrupt, t: t, count: 1, voice: opts.voice !== false, ttl: 0 });
    } catch (e) { warn(e); return false; }
  }
  function collapse(key) { // repeated event inside its cooldown: count it, don't re-speak it
    if (cur && cur.key === key) { cur.count++; refreshHint(); return; }
    for (const q of Q) if (q.key === key) { q.count++; return; }
  }
  function replaceOrCollapse(key, item) {
    for (let i = 0; i < Q.length; i++) if (Q[i].key === key) { Q[i] = item; lastFire[key] = item.t; return true; }
    if (cur && cur.key === key && cur.state !== 'done') { lastFire[key] = item.t; interrupt(); play(item); return true; }
    lastFire[key] = item.t;
    return enqueue(item);
  }
  function enqueue(item) {
    if (!item.ttl) item.ttl = ttlFor(item);
    const t = nowS();
    if (item.priority >= 3 || item.intr) {
      if (cur && cur.state !== 'done' && (cur.priority >= 3 || cur.intr) && cur.priority >= item.priority) {
        Q.unshift(item); trimQueue(); return true;             // never cut off another critical line
      }
      if (allowedIn(item, mode)) { interrupt(); play(item); return true; }
    }
    Q.push(item);
    Q.sort(function (a, b) { return (b.priority - a.priority) || (a.t - b.t); });
    const kept = trimQueue(item);
    if (kept) pump(t);
    return kept;
  }
  function trimQueue(newItem) { // max ~4 waiting: drop lowest priority, oldest first
    let keptNew = true;
    while (Q.length > MAXQ) {
      let w = 0;
      for (let i = 1; i < Q.length; i++) if (Q[i].priority < Q[w].priority || (Q[i].priority === Q[w].priority && Q[i].t < Q[w].t)) w = i;
      const gone = Q.splice(w, 1)[0];
      if (gone.tut) delete tutDone[gone.key];                    // let a dropped tutorial fire again later
      if (gone === newItem) keptNew = false;
    }
    return keptNew;
  }
  function interrupt() {
    if (cur && cur.state !== 'done') { cur.state = 'done'; stopSpeech(); setSpeaking(false); }
  }
  function pump(t) {
    if (!inited || mode === 'idle') return;
    if (cur && cur.state !== 'done') return;
    if (t < gapUntil) return;
    for (let i = Q.length - 1; i >= 0; i--) {
      const it = Q[i];
      if (t - it.t > it.ttl || !allowedIn(it, mode)) { Q.splice(i, 1); if (it.tut) delete tutDone[it.key]; }
    }
    if (Q.length) play(Q.shift());
  }
  function play(item) {
    const t = nowS();
    cur = item;
    item.state = 'typing'; item.start = t; item.lastT = t; item.pos = 0; item.wait = 0; item.len = item.text.length;
    item.shown = -1; item.mode = 'text'; item.id = ++lineSeq;
    lastLineAt = t;
    if (mode === 'menu') scheduleChatter(t);
    emit('advisor:line', { text: item.text, key: item.key || '', priority: item.priority });
    if (item.priority >= 3 && !item.intr) { alertUntil = t + 3.2; glitchUntil = t + 0.7; anim.glitchSeed = 0; }
    else alertUntil = Math.min(alertUntil, t);
    anim.gazeUntil = 0; anim.gaze = 0;
    lineDOM(item);
    const voiced = item.voice && canSpeak();
    cueOpen(item, !voiced);
    if (voiced) { try { speakItem(item); } catch (e) { warn(e); toTextMode(item, false); } }
    setSpeaking(true);
  }
  function finish(item, t) {
    item.state = 'done'; item.doneAt = t;
    const urgent = Q.length && Q[0].priority > item.priority;
    gapUntil = t + (urgent ? 0.3 : 0.75);
    if (item.priority >= 3) alertUntil = Math.min(alertUntil, t + 0.9);
    setSpeaking(false);
    cueClose();
    if (mode === 'menu') scheduleChatter(t);
  }
  function setSpeaking(on) {
    if (on === speakingFlag) return;
    speakingFlag = on;
    emit('advisor:speaking', { on: on });
    applyClasses();
  }
  function scheduleChatter(t) { chatterAt = t + 35 + Math.random() * 25; }

  /* ---------------- typewriter + speech sync, run from tick() ---------------- */
  const TEXT_CPS = 38;
  function stepLine(t) {
    const it = cur; if (!it || it.state !== 'typing') return;
    let el = t - it.lastT; it.lastT = t; if (el > 0.25) el = 0.25;
    if (it.mode === 'voice') {
      if (!it.speechStarted && t - it.speechAt > 1.8) {           // engine never started: fall back to the radio cue
        TTS.fails++; if (TTS.fails >= 3) TTS.broken = true;
        stopSpeech(); toTextMode(it, true);
      } else if (it.speechStarted && !it.speechDone && t - it.speechT0 > it.estDur * 2.2 + 3) {
        stopSpeech(); it.speechDone = true;                       // onend never came
      } else if (!it.speechDone && t - (TTS.keepAlive || 0) > 4) {
        TTS.keepAlive = t; try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ }
      }
    }
    if (it.wait > 0) { it.wait -= el; if (it.wait > 0) return finishCheck(it, t); el = -it.wait; it.wait = 0; }
    let cps = TEXT_CPS;
    if (it.mode === 'voice') {
      cps = it.vcps;
      if (!it.speechStarted) cps *= 0.6;
      if (it.boundary) {
        const target = (it.bIdx / Math.max(1, it.speechLen)) * it.len + (t - it.bT) * it.vcps;
        if (it.pos < target - 3) cps *= 2.6; else if (it.pos > target + 10) cps *= 0.35;
      }
      if (it.speechDone) cps = Math.max(cps, 90);
    }
    const before = Math.floor(it.pos);
    it.pos = Math.min(it.len, it.pos + cps * el);
    const after = Math.floor(it.pos);
    if (after > before) {
      const ch = it.text.charAt(after - 1);
      if (after < it.len) {
        if (ch === '.' || ch === '!' || ch === '?') it.wait = it.mode === 'voice' ? 0.1 : 0.22;
        else if (ch === ',' || ch === ';' || ch === ':' || ch === '—') it.wait = it.mode === 'voice' ? 0.05 : 0.11;
      }
      if (ch !== ' ') cueTick(it.mode === 'voice');
      renderTyped(it, after);
    }
    finishCheck(it, t);
  }
  function finishCheck(it, t) {
    if (it.pos >= it.len && (it.mode !== 'voice' || it.speechDone)) { renderTyped(it, it.len); finish(it, t); }
  }
  // mouth: 0 closed · 1 parted · 2 open · 3 rounded — sampled at a ~10 Hz flap clock
  const VOW_OPEN = 'aeiAEI', VOW_ROUND = 'ouOUwW', LIPS = 'mbpMBPfvFV';
  function mouthFor(t) {
    const it = cur;
    if (!it || it.state === 'done') return 0;
    const voiceLive = it.mode === 'voice' && it.speechStarted && !it.speechDone;
    const typing = it.pos < it.len;
    if (!voiceLive && !typing) return 0;
    if (it.mode === 'voice' && !it.speechStarted) return 0;
    const slot = Math.floor(t * 10);
    if (slot === anim.mSlot && it.id === anim.mId) return anim.mVal;
    anim.mSlot = slot; anim.mId = it.id;
    let idx;
    if (voiceLive && it.boundary) idx = Math.floor((it.bIdx / Math.max(1, it.speechLen)) * it.len + (t - it.bT) * it.vcps * 0.9);
    else if (voiceLive && !typing) idx = Math.floor(((t - it.speechT0) * it.vcps) % Math.max(1, it.len));
    else idx = Math.floor(it.pos);
    const ch = it.text.charAt(clamp(idx, 0, it.len - 1));
    let m;
    if (/[\s.,!?;:—-]/.test(ch)) m = 0;
    else if (VOW_ROUND.indexOf(ch) >= 0) m = 3;
    else if (VOW_OPEN.indexOf(ch) >= 0) m = 2;
    else if (LIPS.indexOf(ch) >= 0) m = 0;
    else m = 1;
    if (m && (slot & 1) && m > 1 && Math.random() < 0.35) m = 1;  // keep flaps from looking mechanical
    if (it.mode !== 'voice' && m > 2) m = 2;
    anim.mVal = m;
    return m;
  }

  /* =========================================================================================
   * DOM
   * ======================================================================================= */
  const UI = { hud: null, menu: null };
  const SPK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path class="vsp-ic-body" d="M2 6h3l4-3v10l-4-3H2z"/>' +
    '<path class="vsp-ic-on" d="M11 5.6a3.4 3.4 0 0 1 0 4.8M12.8 3.8a6 6 0 0 1 0 8.4"/><path class="vsp-ic-off" d="M11 6l4 4M15 6l-4 4"/></svg>';
  function el(tag, cls, parent, html) {
    const e = document.createElement(tag); if (cls) e.className = cls;
    if (html) e.innerHTML = html;   // static markup only (icons); dynamic text always goes through textContent
    if (parent) parent.appendChild(e);
    return e;
  }
  function resolveEl(x, id) {
    if (x && x.nodeType === 1) return x;
    if (typeof x === 'string') { try { return document.querySelector(x); } catch (e) { return null; } }
    return document.getElementById(id);
  }
  function buildLineBits(root, cls) {
    const line = el('div', cls, root);
    line.setAttribute('aria-hidden', 'true');
    const typed = el('span', 'vsp-typed', line), caret = el('span', 'vsp-caret', line), rest = el('span', 'vsp-rest', line);
    return { line: line, typed: typed, caret: caret, rest: rest };
  }
  function buildSpeaker(parent) {
    const b = el('button', 'vsp-spk', parent, SPK_SVG);
    b.type = 'button';
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      try { if (MP.audio && MP.audio.unlock) MP.audio.unlock(); } catch (err) { /* ignore */ }
      TTS.gesture = true; TTS.blocked = false;
      setVoiceEnabled(!S.voice);
      event(S.voice ? 'sys.voice_on' : 'sys.voice_off');
    });
    b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    return b;
  }
  function buildHud(host) {
    host.innerHTML = '';
    const root = el('div', 'vsp vsp-hud', host);
    const pf = el('div', 'vsp-pf', root);
    const cv = el('canvas', 'vsp-cv', pf); cv.width = cv.height = 64;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'VESPER, intelligence officer');
    el('i', 'vsp-scan', pf); el('i', 'vsp-tint', pf);
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el('i', 'vsp-tick vsp-c-' + c, pf); });
    const body = el('div', 'vsp-body', root);
    const head = el('div', 'vsp-head', body);
    el('span', 'vsp-dot', head);
    const name = el('span', 'vsp-name', head); name.textContent = 'VESPER';
    const role = el('span', 'vsp-role', head); role.textContent = '// INTELLIGENCE';
    const bars = el('span', 'vsp-bars', head); for (let i = 0; i < 5; i++) el('i', '', bars);
    const spk = buildSpeaker(head);
    const bits = buildLineBits(body, 'vsp-line');
    const hint = el('div', 'vsp-hint', body); hint.appendChild(document.createElement('span'));
    const sr = el('div', 'vsp-sr', root); sr.setAttribute('aria-live', 'polite'); sr.setAttribute('role', 'status');
    root.addEventListener('click', function () { if (cur && cur.state === 'typing' && cur.mode !== 'voice') { cur.pos = cur.len; renderTyped(cur, cur.len); } });
    return { host: host, root: root, cv: cv, css: 64, bits: bits, hint: hint, sr: sr, spk: spk };
  }
  function buildMenu(host) {
    host.innerHTML = '';
    const root = el('div', 'vsp vsp-menu', host);
    const fr = el('div', 'vsp-frame', root);
    const cv = el('canvas', 'vsp-cv', fr); cv.width = cv.height = 256;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'VESPER, intelligence officer');
    el('i', 'vsp-scan', fr); el('i', 'vsp-tint', fr);
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el('i', 'vsp-brk vsp-c-' + c, fr); });
    const tl = el('span', 'vsp-tag vsp-tag-l', fr); tl.textContent = 'LIVE';
    const tr = el('span', 'vsp-tag vsp-tag-r', fr); tr.textContent = 'SIGINT·07';
    const nm = el('div', 'vsp-mname', root);
    el('span', 'vsp-dot', nm);
    const name = el('span', 'vsp-name', nm); name.textContent = 'VESPER';
    const blocks = el('span', 'vsp-blocks', nm); for (let i = 0; i < 6; i++) el('i', '', blocks);
    const spk = buildSpeaker(nm);
    const bits = buildLineBits(root, 'vsp-mline');
    const hint = el('div', 'vsp-hint', root); hint.appendChild(document.createElement('span'));
    const sr = el('div', 'vsp-sr', root); sr.setAttribute('aria-live', 'polite'); sr.setAttribute('role', 'status');
    return { host: host, root: root, cv: cv, css: 256, bits: bits, hint: hint, sr: sr, spk: spk };
  }
  function liveUI() { return mode === 'menu' ? UI.menu : mode === 'game' ? UI.hud : null; }
  function eachUI(fn) { if (UI.hud) fn(UI.hud); if (UI.menu) fn(UI.menu); }
  function lineDOM(item) {
    const u = liveUI(); if (!u) return;
    u.bits.typed.textContent = ''; u.bits.rest.textContent = item.text;
    u.sr.textContent = item.text;
    u.item = item;
    refreshHint();
    applyClasses();
  }
  function renderTyped(item, n) {
    if (item.shown === n) return;
    item.shown = n;
    const u = liveUI(); if (!u || u.item !== item) return;
    u.bits.typed.textContent = item.text.slice(0, n);
    u.bits.rest.textContent = item.text.slice(n);
  }
  function refreshHint() {
    const u = liveUI(); if (!u) return;
    const it = u.item && u.item === cur ? cur : null;
    let h = '';
    if (it) h = it.hint || hostHint || tagFor(it);
    else h = hostHint;
    if (it && it.count > 1) h = (h ? h + ' · ' : '') + '×' + it.count;
    if (u.hintText !== h) { u.hintText = h; u.hint.firstChild.textContent = h; fitHint(u); }
  }
  function fitHint(u) { // overflowing hints become a slow ping-pong ticker (one layout read per hint change)
    const span = u.hint.firstChild;
    u.hint.classList.remove('vsp-marq');
    const over = span.offsetWidth - u.hint.clientWidth;
    if (over > 2 && u.hint.clientWidth > 0) {
      u.hint.style.setProperty('--vsp-mdx', -(over + 4) + 'px');
      u.hint.style.setProperty('--vsp-mdur', Math.max(3, (over + 4) / 22 + 2.2).toFixed(2) + 's');
      u.hint.classList.add('vsp-marq');
    }
  }
  const classState = {};
  function applyClasses() {
    const t = nowS();
    const talk = !!(cur && cur.state === 'typing');
    const crit = t < alertUntil;
    const warnP = !!(cur && cur.state === 'typing' && cur.priority === 2);
    const stale = !talk && cur && cur.doneAt && t - cur.doneAt > 14;
    const glitchOn = t < glitchUntil;
    eachUI(function (u) {
      const live = u === liveUI();
      const want = { 'vsp-live': live, 'vsp-talk': talk && live, 'vsp-crit': crit && live, 'vsp-warn': warnP && live, 'vsp-stale': !!stale, 'vsp-off': !S.voice, 'vsp-glitch': glitchOn && live };
      const key = u === UI.hud ? 'h' : 'm';
      const prev = classState[key] || (classState[key] = {});
      for (const c in want) if (prev[c] !== want[c]) { prev[c] = want[c]; u.root.classList.toggle(c, want[c]); }
      const label = S.voice ? 'Mute VESPER voice' : 'Unmute VESPER voice';
      if (u.spkLabel !== label) { u.spkLabel = label; u.spk.setAttribute('aria-label', label); u.spk.title = S.voice ? 'Voice on' : 'Voice off'; u.spk.setAttribute('aria-pressed', S.voice ? 'true' : 'false'); }
    });
  }
  function sizeCanvases() {
    const dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
    eachUI(function (u) {
      let css = u.css;
      try { const r = u.cv.getBoundingClientRect(); if (r && r.width >= 16) css = r.width; } catch (e) { /* hidden */ }
      const px = Math.max(64, Math.round(css * dpr));
      if (u.cv.width !== px) { u.cv.width = u.cv.height = px; }
      u.frameKey = '';
      if (u.hintText) fitHint(u);
    });
  }

  /* =========================================================================================
   * ANIMATION
   * ======================================================================================= */
  const anim = { blinkAt: 2, blinkDouble: false, gaze: 0, gazeUntil: 0, nextGlance: 6, mSlot: -1, mId: 0, mVal: 0, glitchSeed: 0, phase: Math.random() * 10 };
  function animState(t) {
    let eye = 0;
    if (t >= anim.blinkAt) {
      const d = t - anim.blinkAt;
      if (d < 0.05) eye = 1; else if (d < 0.14) eye = 2; else if (d < 0.2) eye = 1;
      else {
        anim.blinkAt = anim.blinkDouble ? t + 2.4 + Math.random() * 4.2 : (Math.random() < 0.18 ? t + 0.12 : t + 2.4 + Math.random() * 4.2);
        anim.blinkDouble = !anim.blinkDouble && anim.blinkAt - t < 0.5;
      }
    }
    if (!eye) {
      if (t < anim.gazeUntil) eye = anim.gaze < 0 ? 3 : anim.gaze > 0 ? 4 : 0;
      else if (t >= anim.nextGlance) {
        const talking = cur && cur.state === 'typing';
        anim.gaze = talking ? 1 : (Math.random() < 0.5 ? -1 : 1);
        anim.gazeUntil = t + (talking ? 0.5 : 0.7 + Math.random() * 0.8);
        anim.nextGlance = t + 5 + Math.random() * 8;
      }
    }
    const ph = t + anim.phase;
    const breath = ((ph % 4.6) / 4.6) > 0.42 && ((ph % 4.6) / 4.6) < 0.8 ? 1 : 0;
    const sw = ((ph + 1.3) % 3.4) / 3.4, sway = sw > 0.55 && sw < 0.85 ? 1 : 0;
    const mouth = mouthFor(t);
    const talking = cur && cur.state === 'typing';
    let led;
    if (talking) led = mouth ? 2 : ((Math.floor(t * 8) & 1) ? 2 : 1);
    else led = (ph % 2.6) < 0.14 ? 1 : 0;
    const alert = t < alertUntil ? (t < glitchUntil ? 2 : 1) : 0;
    const gl = t < glitchUntil ? 1 + (Math.floor(t * 16) % 97) : 0;
    return { eye: eye, mouth: mouth, breath: breath, sway: sway, led: led, alert: alert, glitch: gl };
  }
  function renderLive(t, force) {
    const u = liveUI();
    if (!u || !buildPortrait()) return;
    const st = animState(t);
    const key = st.eye + '' + st.mouth + st.breath + st.sway + st.led + st.alert + ':' + st.glitch;
    if (!force && key === u.frameKey) return;
    u.frameKey = key;
    compose(st, P.buf, false);
    P.octx.putImageData(P.img, 0, 0);
    blit(u.cv, P.off, st.alert);
    P.frames = (P.frames || 0) + 1;
  }
  function renderStill(u) { // a calm frame for a mount that is not live
    if (!u || !buildPortrait()) return;
    compose({ eye: 0, mouth: 0, breath: 0, sway: 0, led: 0, alert: 0, glitch: 0 }, P.buf, false);
    P.octx.putImageData(P.img, 0, 0);
    blit(u.cv, P.off, 0);
    u.frameKey = '';
  }

  /* =========================================================================================
   * MAIN LOOP
   * ======================================================================================= */
  let lastHost = 0, rafId = 0, lastClassT = 0;
  function tick() {
    if (!inited) return;
    const t = nowS();
    if (greetAt && t >= greetAt) {
      greetAt = 0;
      if (mode === 'menu' && t - lastReturnAt > 4) {
        const first = !sget('advisor.booted', false);
        event(first ? 'menu.boot' : 'menu.greet');
        lastGreetAt = t;
      }
    }
    if (mode === 'menu' && chatterAt && t >= chatterAt && !Q.length && (!cur || cur.state === 'done') && t > gapUntil + 1.5) {
      scheduleChatter(t);
      event('menu.idle');
    }
    stepLine(t);
    pump(t);
    if (t - lastClassT > 0.1) { lastClassT = t; applyClasses(); }
    renderLive(t, false);
  }
  function rafLoop() {
    rafId = window.requestAnimationFrame(rafLoop);
    if (nowS() - lastHost > 0.3) tick();     // host not driving update(): keep VESPER alive on our own
  }

  /* =========================================================================================
   * PUBLIC API
   * ======================================================================================= */
  function ensureInit() { if (!inited) init({}); }
  function init(opts) {
    try {
      opts = opts || {};
      S.voice = !!sget('advisor.voice', true);
      S.volume = clamp(+sget('advisor.volume', 0.9) || 0, 0, 1);
      S.rate = clamp(+sget('advisor.rate', 1.0) || 1, 0.8, 1.3);
      const hudEl = resolveEl(opts.hudEl, 'advisor-hud'), menuEl = resolveEl(opts.menuEl, 'advisor-menu');
      if (hudEl && (!UI.hud || UI.hud.host !== hudEl)) UI.hud = buildHud(hudEl);
      if (menuEl && (!UI.menu || UI.menu.host !== menuEl)) UI.menu = buildMenu(menuEl);
      buildPortrait();
      initVoices();
      if (!inited) {
        inited = true;
        const onGesture = function () {
          TTS.gesture = true; TTS.blocked = false;
          window.removeEventListener('pointerdown', onGesture, true); window.removeEventListener('keydown', onGesture, true);
        };
        window.addEventListener('pointerdown', onGesture, true);
        window.addEventListener('keydown', onGesture, true);
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) { if (cur && cur.mode === 'voice' && !cur.speechDone) { stopSpeech(); cur.speechDone = true; cur.pos = cur.len; } }
          else { try { if (synth && synth.paused) synth.resume(); } catch (e) { /* ignore */ } }
        });
        let rz = 0;
        window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(sizeCanvases, 120); });
        if (window.requestAnimationFrame) rafId = window.requestAnimationFrame(rafLoop);
        if (mode === 'idle' && !opts.mode) mode = UI.hud ? 'game' : UI.menu ? 'menu' : 'idle';
      }
      sizeCanvases();
      eachUI(renderStill);
      applyClasses();
      if (opts.mode) setMode(opts.mode);
      return true;
    } catch (e) { warn(e); return false; }
  }
  function setMode(m) {
    try {
      ensureInit();
      m = (m === 'menu' || m === 'game') ? m : 'idle';
      if (m === mode) return;
      const prev = mode, t = nowS();
      mode = m;
      if (cur && cur.state !== 'done' && !allowedIn(cur, m)) interrupt();
      for (let i = Q.length - 1; i >= 0; i--) if (!allowedIn(Q[i], m)) { const gone = Q.splice(i, 1)[0]; if (gone.tut) delete tutDone[gone.key]; }
      if (m === 'menu') {
        scheduleChatter(t);
        if (prev === 'game' || t - lastGreetAt > 45) greetAt = t + 0.9;
      } else { greetAt = 0; chatterAt = 0; }
      eachUI(function (u) { u.frameKey = ''; if (u !== liveUI()) renderStill(u); });
      const u = liveUI();
      if (u) u.hintText = null;
      if (u) { // carry the current line over so the live mount isn't blank
        if (cur && cur.state !== 'done' && allowedIn(cur, m)) { lineDOM(cur); renderTyped(cur, Math.floor(cur.pos)); }
        else { u.item = null; u.bits.typed.textContent = ''; u.bits.rest.textContent = ''; refreshHint(); }
      }
      applyClasses();
      renderLive(t, true);
    } catch (e) { warn(e); }
  }
  function update(dt) {
    lastHost = nowS();
    try { tick(dt); } catch (e) { warn(e); }
  }
  function reset() {
    try {
      interrupt();
      Q.length = 0; cur = null; gapUntil = 0; alertUntil = 0; glitchUntil = 0; hostHint = '';
      for (const k in lastFire) delete lastFire[k];
      for (const k in tutDone) delete tutDone[k];
      eachUI(function (u) { u.item = null; u.bits.typed.textContent = ''; u.bits.rest.textContent = ''; u.sr.textContent = ''; u.hintText = ''; u.hint.firstChild.textContent = ''; u.hint.classList.remove('vsp-marq'); });
      setSpeaking(false); applyClasses();
    } catch (e) { warn(e); }
  }
  function hint(text) {
    hostHint = text == null ? '' : String(text).replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 140);
    refreshHint();
  }
  function setVoiceEnabled(on) {
    S.voice = !!on; sset('advisor.voice', S.voice);
    if (!S.voice && cur && cur.mode === 'voice' && !cur.speechDone) { stopSpeech(); cur.speechDone = true; }
    if (S.voice) { TTS.broken = false; TTS.fails = 0; }
    applyClasses();
  }
  function setVolume(v) {
    S.volume = clamp(+v || 0, 0, 1); sset('advisor.volume', S.volume);
    try { for (const u of TTS.utter) u.volume = ttsVolume(); } catch (e) { /* live change unsupported */ }
  }
  function setRate(r) { S.rate = clamp(+r || 1, 0.8, 1.3); sset('advisor.rate', S.rate); }
  function listVoices() {
    if (TTS.ok && !TTS.voices.length) loadVoices();
    return TTS.voices.map(function (v) { return { name: v.name, lang: v.lang, female: gender(v) === true, local: !!v.localService, default: !!v.default }; });
  }
  function setVoiceName(name) {
    sset('advisor.voiceName', name ? String(name) : null);
    TTS.broken = false; TTS.fails = 0;
    if (TTS.voices.length) pickVoice();
  }
  function getVoiceName() { return TTS.voice ? TTS.voice.name : null; }
  function debugState() {
    return {
      mode: mode, inited: inited,
      current: cur ? { key: cur.key, text: cur.text, priority: cur.priority, count: cur.count, state: cur.state, mode: cur.mode } : null,
      queue: Q.map(function (q) { return { key: q.key, text: q.text, priority: q.priority, count: q.count, age: +(nowS() - q.t).toFixed(2) }; }),
      speaking: speakingFlag, voice: { enabled: S.voice, ok: TTS.ok, voices: TTS.voices.length, chosen: getVoiceName(), broken: TTS.broken, blocked: TTS.blocked, canSpeak: canSpeak() },
      cues: A.cues, frames: P.frames || 0, tutorialsDone: Object.keys(tutDone), hint: (liveUI() || {}).hintText || '',
    };
  }

  MP.Advisor = {
    __vesper: true,
    init: init, setMode: setMode, event: event, say: say, hint: hint, update: update, reset: reset,
    setVoiceEnabled: setVoiceEnabled, isVoiceEnabled: function () { return S.voice; },
    setVolume: setVolume, getVolume: function () { return S.volume; },
    setRate: setRate, getRate: function () { return S.rate; },
    listVoices: listVoices, setVoiceName: setVoiceName, getVoiceName: getVoiceName,
    drawPortrait: drawPortrait,
    getMode: function () { return mode; },
    lines: LINES,            // host may patch hints/variants if mechanics change
    debugState: debugState,
  };
})();
