/* MIDNIGHT PROTOCOL — utilities */
(function () {
  'use strict';
  const MP = window.MP;
  const U = (MP.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);

  // seeded RNG (mulberry32)
  U.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (n) => Math.floor(f() * n);
    f.range = (a2, b2) => a2 + f() * (b2 - a2);
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.state = () => a;
    f.setState = (s) => { a = s; };
    return f;
  };
  U.R = U.rng((Date.now() ^ 0x5bd1e995) >>> 0); // global non-sim randomness (visuals)

  // hashed value noise
  function hash2(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  U.hash2 = hash2;
  function smooth(t) { return t * t * (3 - 2 * t); }
  U.vnoise = function (x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  U.fbm = function (x, y, s, oct) {
    let v = 0, amp = 0.5, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) { v += amp * U.vnoise(x * f, y * f, s + i * 17); tot += amp; amp *= 0.5; f *= 2; }
    return v / tot;
  };

  // formatting
  U.fmtK = function (v) {
    v = Math.round(v);
    const a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(v);
  };
  U.fmtInt = (v) => Math.round(v).toLocaleString('en-US');
  U.fmtTime = function (s) {
    s = Math.max(0, Math.ceil(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };
  U.fmtPct = (v) => (v < 10 ? v.toFixed(1) : v.toFixed(0)) + '%';
  U.MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  U.rgb = (c, a) => (a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);
  U.mix = (c1, c2, t) => [Math.round(c1[0] + (c2[0] - c1[0]) * t), Math.round(c1[1] + (c2[1] - c1[1]) * t), Math.round(c1[2] + (c2[2] - c1[2]) * t)];
  U.hex2rgb = function (h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // tiny DOM helper
  U.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  };

  // min-heap keyed by numeric priority (used by A*)
  U.Heap = class {
    constructor() { this.k = []; this.v = []; }
    get size() { return this.k.length; }
    push(key, val) {
      const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
      while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
      k[i] = key; v[i] = val;
    }
    pop() {
      const k = this.k, v = this.v; const top = v[0]; const lk = k.pop(), lv = v.pop();
      if (k.length) {
        let i = 0; const n = k.length;
        for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; }
        k[i] = lk; v[i] = lv;
      }
      return top;
    }
  };

  // base64 <-> bytes
  U.b64ToBytes = function (b64) {
    const bin = atob(b64); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  U.bytesToB64 = function (bytes) {
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  };
  // generic RLE for Uint8 arrays (value, varint run)
  U.rleEncode = function (arr) {
    const out = []; let i = 0; const n = arr.length;
    const pv = (v) => { while (v >= 128) { out.push((v & 127) | 128); v >>>= 7; } out.push(v); };
    while (i < n) { const v = arr[i]; let j = i + 1; while (j < n && arr[j] === v) j++; out.push(v); pv(j - i); i = j; }
    return U.bytesToB64(Uint8Array.from(out));
  };
  U.rleDecode = function (b64, n) {
    const b = U.b64ToBytes(b64); const out = new Uint8Array(n); let p = 0, i = 0;
    while (i < b.length && p < n) {
      const v = b[i++]; let run = 0, sh = 0, c;
      do { c = b[i++]; run |= (c & 127) << sh; sh += 7; } while (c & 128);
      out.fill(v, p, Math.min(n, p + run)); p += run;
    }
    return out;
  };

  U.now = () => performance.now() / 1000;
})();
