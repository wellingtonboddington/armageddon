// Build: concatenate all CSS + JS sources into one self-contained offline index.html
// Usage: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const CSS = ['src/css/main.css', 'src/advisor/advisor.css'];
const JS = [
  'src/js/00_core.js', 'src/js/01_mapdata.js', 'src/js/02_config.js', 'src/js/03_util.js', 'src/js/04_flags.js',
  'src/js/05_sfx.js', 'src/js/06_icons.js', 'src/advisor/advisor.js',
  'src/js/10_world.js', 'src/js/11_state.js', 'src/js/12_economy.js', 'src/js/13_combat.js', 'src/js/14_naval.js',
  'src/js/15_weapons.js', 'src/js/16_diplo.js', 'src/js/17_weather.js', 'src/js/18_ai.js', 'src/js/19_game.js',
  'src/js/20_render.js', 'src/js/21_hud.js', 'src/js/22_menu.js', 'src/js/23_main.js',
];

const css = CSS.filter((f) => { if (!exists(f)) { console.warn('missing', f); return false; } return true; }).map((f) => `/* ==== ${f} ==== */\n` + rd(f)).join('\n');
const js = JS.filter((f) => { if (!exists(f)) { console.warn('missing', f); return false; } return true; })
  .map((f) => `/* ==== ${f} ==== */\n` + rd(f).replace(/<\/script/gi, '<\\/script')).join('\n;\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Midnight Protocol</title>
<meta name="description" content="MIDNIGHT PROTOCOL — an offline real-time grand strategy game of territory, trade, diplomacy and nuclear brinkmanship.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%230a0a08'/%3E%3Ccircle cx='16' cy='16' r='3' fill='%23ffd21f'/%3E%3Cpath d='M16 4a12 12 0 0 1 10.4 6l-7.8 4.5A3 3 0 0 0 16 13z M5.6 10A12 12 0 0 1 16 4v9a3 3 0 0 0-2.6 1.5z M10.4 26.4A12 12 0 0 1 4 16h9a3 3 0 0 0 1.5 2.6z' fill='%23ffd21f'/%3E%3C/svg%3E">
<style>
${css}
</style>
</head>
<body>
<canvas id="map"></canvas>
<div id="hud" style="display:none"></div>
<div id="menu" style="display:none"></div>
<div id="modal-root"></div>
<div id="boot">
  <div class="bt">MIDNIGHT PROTOCOL</div>
  <div class="hz"></div>
  <div id="boot-log"></div>
  <div id="boot-go" style="display:none">CLICK OR PRESS ANY KEY TO ESTABLISH UPLINK</div>
</div>
<script>
${js}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
