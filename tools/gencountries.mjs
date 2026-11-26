// Build-time: rasterise Natural Earth 1:50m countries (public domain, via `world-atlas`) onto the
// game's tile grid (same Miller projection as genmap.mjs) for the PRE-SET COUNTRIES mode.
// Writes src/js/01b_countries.js. Usage: node tools/gencountries.mjs <node_modules dir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const nm = process.argv[2];
if (!nm) { console.error('pass node_modules dir'); process.exit(1); }
const require = createRequire(path.join(nm, 'x.js'));
const topo = require('topojson-client');
const iso = require('i18n-iso-countries');
const countries = require(path.join(nm, 'world-atlas/countries-50m.json'));

const W = 2000, LAT_N = 80, LAT_S = -58;
const K = W / (2 * Math.PI);
const millerY = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));
const Y0 = millerY(LAT_N);
const H = Math.round((Y0 - millerY(LAT_S)) * K);
const px = (lon) => (lon + 180) / 360 * W;
const py = (lat) => (Y0 - millerY(Math.max(-85, Math.min(85, lat)))) * K;

// land mask from the generated map data (country cells only count on land tiles)
const md = fs.readFileSync(new URL('../src/js/01_mapdata.js', import.meta.url), 'utf8');
const rle = md.match(/rle:"([^"]+)"/)[1];
const bytes = Buffer.from(rle, 'base64');
const land = new Uint8Array(W * H);
{ let p = 0, i = 0, cur = 0; while (i < bytes.length && p < W * H) { let run = 0, sh = 0, c; do { c = bytes[i++]; run |= (c & 127) << sh; sh += 7; } while (c & 128); if (cur) land.fill(1, p, Math.min(W * H, p + run)); p += run; cur ^= 1; } }

const NAME_FIX = {
  'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Republic',
  'Bosnia and Herz.': 'Bosnia', 'S. Sudan': 'South Sudan', 'Eq. Guinea': 'Equatorial Guinea', 'W. Sahara': 'Western Sahara',
  'Dominican Rep.': 'Dominican Republic', 'Solomon Is.': 'Solomon Islands', 'Falkland Is.': 'Falklands', 'Fr. S. Antarctic Lands': 'French Southern Lands',
  'N. Cyprus': 'Northern Cyprus', 'Czechia': 'Czechia', 'eSwatini': 'Eswatini', 'Timor-Leste': 'Timor-Leste', "Côte d'Ivoire": 'Ivory Coast',
  'North Macedonia': 'Macedonia', 'United Kingdom': 'United Kingdom', 'Russia': 'Russia',
};
// approximate capitals (lon, lat); others fall back to the centre of their largest landmass
const CAP = {
  US: [-77.04, 38.9], CA: [-75.7, 45.4], MX: [-99.13, 19.43], BR: [-47.9, -15.8], AR: [-58.4, -34.6], CL: [-70.65, -33.45], PE: [-77.04, -12.05], CO: [-74.07, 4.71],
  VE: [-66.9, 10.5], BO: [-68.15, -16.5], EC: [-78.5, -0.22], PY: [-57.6, -25.3], UY: [-56.2, -34.9], GY: [-58.16, 6.8], SR: [-55.2, 5.85], CU: [-82.38, 23.13],
  GT: [-90.5, 14.6], HN: [-87.2, 14.1], NI: [-86.25, 12.13], CR: [-84.08, 9.93], PA: [-79.5, 8.98], DO: [-69.9, 18.47], HT: [-72.33, 18.54],
  GB: [-0.12, 51.5], IE: [-6.26, 53.35], FR: [2.35, 48.85], ES: [-3.7, 40.42], PT: [-9.14, 38.72], DE: [13.4, 52.52], NL: [4.9, 52.37], BE: [4.35, 50.85],
  CH: [7.45, 46.95], AT: [16.37, 48.21], IT: [12.5, 41.9], PL: [21.01, 52.23], CZ: [14.42, 50.09], SK: [17.11, 48.15], HU: [19.04, 47.5], SI: [14.5, 46.05],
  HR: [15.98, 45.81], BA: [18.41, 43.86], RS: [20.46, 44.82], AL: [19.82, 41.33], GR: [23.73, 37.98], BG: [23.32, 42.7], RO: [26.1, 44.43], MD: [28.86, 47.0],
  UA: [30.52, 50.45], BY: [27.56, 53.9], LT: [25.28, 54.69], LV: [24.1, 56.95], EE: [24.75, 59.44], FI: [24.94, 60.17], SE: [18.07, 59.33], NO: [10.75, 59.91],
  DK: [12.57, 55.68], IS: [-21.9, 64.15], RU: [37.62, 55.75], TR: [32.85, 39.93], GE: [44.8, 41.72], AM: [44.51, 40.18], AZ: [49.87, 40.41], KZ: [71.43, 51.13],
  UZ: [69.24, 41.3], TM: [58.38, 37.95], KG: [74.6, 42.87], TJ: [68.78, 38.56], AF: [69.18, 34.53], PK: [73.05, 33.68], IN: [77.21, 28.61], NP: [85.32, 27.7],
  BD: [90.41, 23.81], LK: [79.86, 6.93], MM: [96.13, 19.75], TH: [100.5, 13.75], LA: [102.6, 17.97], KH: [104.92, 11.56], VN: [105.85, 21.03], MY: [101.69, 3.14],
  ID: [106.85, -6.21], PH: [120.98, 14.6], CN: [116.4, 39.9], MN: [106.92, 47.92], KP: [125.75, 39.03], KR: [126.98, 37.57], JP: [139.69, 35.69], TW: [121.56, 25.04],
  AU: [149.13, -35.28], NZ: [174.78, -41.29], PG: [147.18, -9.44], IR: [51.39, 35.69], IQ: [44.36, 33.31], SY: [36.29, 33.51], JO: [35.93, 31.95], IL: [35.21, 31.77],
  SA: [46.72, 24.69], YE: [44.21, 15.35], OM: [58.4, 23.59], AE: [54.37, 24.45], EG: [31.24, 30.04], LY: [13.19, 32.89], TN: [10.18, 36.8], DZ: [3.06, 36.75],
  MA: [-6.84, 34.02], MR: [-15.98, 18.08], ML: [-8.0, 12.65], NE: [2.11, 13.51], TD: [15.04, 12.13], SD: [32.53, 15.5], SS: [31.58, 4.85], ET: [38.75, 9.03],
  ER: [38.93, 15.32], SO: [45.32, 2.04], KE: [36.82, -1.29], UG: [32.58, 0.35], TZ: [35.74, -6.16], CD: [15.27, -4.32], CG: [15.28, -4.27], GA: [9.45, 0.39],
  CM: [11.5, 3.87], CF: [18.56, 4.39], NG: [7.49, 9.08], GH: [-0.19, 5.6], CI: [-5.28, 6.82], BF: [-1.52, 12.37], SN: [-17.45, 14.69], GN: [-13.7, 9.64],
  AO: [13.23, -8.84], ZM: [28.32, -15.39], ZW: [31.05, -17.83], MZ: [32.59, -25.97], MW: [33.79, -13.96], BW: [25.91, -24.65], NA: [17.08, -22.56],
  ZA: [28.19, -25.75], MG: [47.52, -18.88], EH: [-13.2, 27.15],
};

const fc = topo.feature(countries, countries.objects.countries);
const cid = new Uint8Array(W * H);
const list = [];
for (const f of fc.features) {
  const g = f.geometry; if (!g) continue;
  const rawName = (f.properties && f.properties.name) || 'Unknown';
  if (/Antarctica/i.test(rawName)) continue;
  const rings = [];
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) {
    let off = 0, prev = null;
    const un = ring.map(([lo, la]) => { if (prev != null) { const d = lo + off - prev; if (d > 180) off -= 360; else if (d < -180) off += 360; } prev = lo + off; return [px(lo + off), py(la)]; });
    let minX = Infinity, maxX = -Infinity; for (const [x] of un) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    for (const shift of [-W, 0, W]) { if (maxX + shift < 0 || minX + shift > W) continue; rings.push(shift ? un.map(([x, y]) => [x + shift, y]) : un); }
  }
  const rowX = new Map();
  for (const r of rings) for (let i = 0, n = r.length; i < n; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % n];
    if (y1 === y2) continue;
    const ymin = Math.min(y1, y2), ymax = Math.max(y1, y2);
    for (let y = Math.max(0, Math.ceil(ymin - 0.5)); y <= Math.min(H - 1, Math.floor(ymax - 0.5)); y++) {
      const cy = y + 0.5; if (cy < ymin || cy >= ymax) continue;
      if (!rowX.has(y)) rowX.set(y, []);
      rowX.get(y).push(x1 + (cy - y1) * (x2 - x1) / (y2 - y1));
    }
  }
  const idx = list.length + 1;
  if (idx > 250) break;
  let count = 0;
  for (const [y, xs] of rowX) {
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(0, Math.ceil(xs[i] - 0.5)), b = Math.min(W - 1, Math.floor(xs[i + 1] - 0.5));
      for (let x = a; x <= b; x++) { const t = x + y * W; if (land[t]) { cid[t] = cid[t] === idx ? 0 : idx; } }
    }
  }
  for (let t = 0; t < W * H; t++) if (cid[t] === idx) count++;
  if (!count) continue;
  const a2 = f.id && f.id !== '-99' ? iso.numericToAlpha2(f.id) : null;
  list.push({ i: idx, name: (NAME_FIX[rawName] || rawName).toUpperCase(), a2: a2 || '', tiles: count, cap: a2 && CAP[a2] ? CAP[a2] : null });
}
// re-index compactly (countries with no tiles were skipped above, so ids are already dense)
const out = [];
let v = cid[0], run = 0;
const pushVar = (n) => { while (n >= 128) { out.push((n & 127) | 128); n >>>= 7; } out.push(n); };
for (let t = 0; t < W * H; t++) { if (cid[t] === v) run++; else { out.push(v); pushVar(run); v = cid[t]; run = 1; } }
out.push(v); pushVar(run);
const b64 = Buffer.from(Uint8Array.from(out)).toString('base64');
const js = `/* generated by tools/gencountries.mjs — Natural Earth 1:50m countries (public domain) */
(function(){ window.MP = window.MP || {}; MP.COUNTRIES = { list: ${JSON.stringify(list)},
rle:"${b64}" }; })();
`;
fs.writeFileSync(new URL('../src/js/01b_countries.js', import.meta.url), js);
console.log('countries', list.length, 'bytes', js.length, 'largest', list.slice().sort((a, b) => b.tiles - a.tiles).slice(0, 5).map((c) => c.name + ':' + c.tiles).join(', '));
