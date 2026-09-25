// Generates the X (Twitter) brand assets from the art engine, pixel-perfect (no resampling):
//   brand/pfp.png   400x400  — pixel wordmark only; the "OO" are a pair of glasses
//   brand/logo.png  1200x400 — the same wordmark, wide
//   brand/cover.png 1500x500 — a street of Poons at night, no text
// Usage: node brand/make-assets.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const A = require('../art/poons-art.js');

// ---------------------------------------------------------------- tiny PNG encoder
function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// A cell canvas of hex colours, blown up by `scale` when encoded.
function canvas(cw, ch) {
  const c = Array.from({ length: ch }, () => Array(cw).fill(null));
  const set = (x, y, col) => { if (col && x >= 0 && y >= 0 && x < cw && y < ch) c[y][x] = col; };
  const encode = (scale, file) => {
    const w = cw * scale, h = ch * scale, buf = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const hex = c[Math.floor(y / scale)][Math.floor(x / scale)] || '#000000';
      const i = (y * w + x) * 3;
      buf[i] = parseInt(hex.slice(1, 3), 16); buf[i + 1] = parseInt(hex.slice(3, 5), 16); buf[i + 2] = parseInt(hex.slice(5, 7), 16);
    }
    fs.writeFileSync(file, png(w, h, buf));
    console.log(`wrote ${path.relative(process.cwd(), file)} (${w}x${h})`);
  };
  return { c, set, cw, ch, encode };
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const bayer = (x, y) => BAYER[y % 4][x % 4] / 16;
const INK = A.FIXED[A.S.INK];

// Outline every non-background cell of `mask` with ink, like the NFTs do.
function outline(cv, isChar) {
  const add = [];
  for (let y = 0; y < cv.ch; y++) for (let x = 0; x < cv.cw; x++) {
    if (isChar[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isChar[y + dy]?.[x + dx])) add.push([x, y]);
  }
  for (const [x, y] of add) cv.set(x, y, INK);
}

// ---------------------------------------------------------------- logo (wordmark only)
// Pixel wordmark "POONS" whose OO are a pair of glasses: thick frames, a bridge, a glint on each lens.
// No illustration. Drawn in cells; `wordmark()` returns cell pixels relative to its top-left corner.
const WORD_W = 42, WORD_H = 9;
function wordmark(ink, lens) {
  const px = [];
  const put = (x, y, c) => px.push([x, y, c]);
  const glyph = (rows, x0) => rows.forEach((r, y) => [...r].forEach((b, x) => { if (b === '1') put(x0 + x, y, ink); }));
  glyph(['111110', '110011', '110011', '110011', '111110', '110000', '110000', '110000', '110000'], 0); // P
  for (const x0 of [8, 18]) { // OO = the two lenses
    for (let y = 0; y < 9; y++) for (let x = 0; x < 8; x++) {
      const frame = x <= 1 || x >= 6 || y <= 1 || y >= 7;
      if ((x === 0 || x === 7) && (y === 0 || y === 8)) continue; // softened corners
      put(x0 + x, y, frame ? ink : lens.fill);
    }
    put(x0 + 2, 2, lens.glint); put(x0 + 3, 2, lens.glint); put(x0 + 2, 3, lens.glint); // glare
  }
  put(16, 2, ink); put(17, 2, ink); put(16, 3, ink); put(17, 3, ink); // bridge
  put(7, 2, ink); put(26, 2, ink); // hinges where the temples would start
  glyph(['1100011', '1110011', '1111011', '1101111', '1100111', '1100011', '1100011', '1100011', '1100011'], 28); // N
  glyph(['011111', '110000', '110000', '111100', '011110', '000111', '000011', '000011', '111110'], 36); // S
  return px;
}

const LOGO = {
  ground: '#a8c6d3', // felt blue, the Poon's face
  ink: '#15141a',
  lens: { fill: '#cfe2ea', glint: '#ffffff' },
};

function pfp() {
  const N = 50, cv = canvas(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cv.c[y][x] = LOGO.ground;
  const x0 = Math.floor((N - WORD_W) / 2), y0 = Math.floor((N - WORD_H) / 2);
  for (const [x, y, c] of wordmark(LOGO.ink, LOGO.lens)) cv.set(x0 + x, y0 + y, c);
  return cv;
}

// Wide wordmark for headers, docs and the site (1200x400).
function logoWide() {
  const W = 60, H = 20, cv = canvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cv.c[y][x] = LOGO.ground;
  const x0 = Math.floor((W - WORD_W) / 2), y0 = Math.floor((H - WORD_H) / 2);
  for (const [x, y, c] of wordmark(LOGO.ink, LOGO.lens)) cv.set(x0 + x, y0 + y, c);
  return cv;
}

// ---------------------------------------------------------------- cover (300x100 cells, 5px)
function cover() {
  const W = 300, H = 100, GROUND = 92;
  const cv = canvas(W, H);
  // night sky -> teal horizon, Bayer-dithered bands
  const sky = ['#10152a', '#141a2e', '#1a2340', '#1f2946', '#1d3440', '#17312f'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y / GROUND) * (sky.length - 1), i = Math.min(sky.length - 2, Math.floor(t));
    cv.c[y][x] = (t - i) > bayer(x, y) ? sky[i + 1] : sky[i];
  }
  // stars (seeded)
  let v = 0xc0ffee; const r = () => { v ^= v << 13; v >>>= 0; v ^= v >>> 17; v ^= v << 5; v >>>= 0; return v / 4294967296; };
  for (let i = 0; i < 140; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * 50); cv.set(x, y, r() < .2 ? '#f4e3a1' : '#8a93b8'); }
  for (const [x, y] of [[40, 12], [128, 8], [196, 20], [270, 34]]) { cv.set(x, y, '#f4e3a1'); cv.set(x - 1, y, '#8a93b8'); cv.set(x + 1, y, '#8a93b8'); cv.set(x, y - 1, '#8a93b8'); cv.set(x, y + 1, '#8a93b8'); }
  // moon
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + .5 - 236, y + .5 - 22);
    if (d <= 9) cv.c[y][x] = Math.hypot(x + .5 - 240, y + .5 - 19) <= 7.5 ? '#f4e3a1' : '#d9c77e';
    else if (d <= 16 && (1 - (d - 9) / 7) * .5 > bayer(x, y)) cv.c[y][x] = '#26315a';
  }
  [[233, 24], [234, 24], [238, 27], [231, 20]].forEach(([x, y]) => cv.set(x, y, '#c9b86e'));
  // two rows of hills
  for (let x = 0; x < W; x++) {
    const h1 = Math.round(74 + 5 * Math.sin(x / 23) + 3 * Math.sin(x / 7.3));
    const h2 = Math.round(82 + 3 * Math.sin(x / 17 + 2) + 2 * Math.sin(x / 5.1));
    for (let y = h1; y < GROUND; y++) cv.c[y][x] = '#1b3a35';
    for (let y = h2; y < GROUND; y++) cv.c[y][x] = '#1e3a2b';
  }
  // ground
  for (let y = GROUND; y < H; y++) for (let x = 0; x < W; x++) {
    cv.c[y][x] = y === GROUND ? '#3f8a5f' : ((y - GROUND) / 8) > bayer(x, y) + .15 ? '#1d4632' : '#2a6446';
  }
  // a street of Poons: fixed seeds, three of them special (Gold, Ghost, Skeleton)
  const seed = (hex, type) => { let s = BigInt('0x' + hex.repeat(8).slice(0, 64)); if (type !== undefined) s = (s >> 16n << 16n) | BigInt(type); return s; };
  const street = [
    seed('7a3c19e5', 1200), seed('b41d02f7', 3000), seed('51e9ac03', 9966), seed('e0773b2d', 500),
    seed('9f06d4a1', 9991), seed('2cd58e70', 7000), seed('c3a1f60b', 9936), seed('66b2e91c', 4200),
  ];
  const BG = new Set([A.S.BG_A, A.S.BG_B, A.S.GLOW]);
  street.forEach((s, i) => {
    const idx = A.traitsFor(s), g = A.slotGrid(idx), pal = A.palette(idx);
    const x0 = 7 + i * 36, y0 = GROUND - 31;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const slot = g[y * 32 + x];
      if (!BG.has(slot)) cv.set(x0 + x, y0 + y, pal[slot]);
    }
  });
  return cv;
}

// ---------------------------------------------------------------- single Poon (1:1)
// Builds a seed that rolls the given option index for every trait, then renders it at `scale`.
function seedFor(picks) {
  let seed = 0n;
  A.TRAITS.forEach((t, k) => {
    const i = picks[t.key] ?? 0;
    const offset = t.opts.slice(0, i).reduce((a, o) => a + o[1], 0); // first value that rolls option i
    seed |= BigInt(offset) << BigInt(16 * k);
  });
  return seed;
}
function poonCanvas(seed) {
  const cv = canvas(32, 32), idx = A.traitsFor(seed), g = A.slotGrid(idx, A.isFounder(seed)), pal = A.palette(idx);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) cv.c[y][x] = pal[g[y * 32 + x]];
  return cv;
}

const out = __dirname;
// The classic Poon from the reference: felt blue, forest roof, golden pup, black glasses, blue plaid, lamp light.
const classic = seedFor({ Type: 0, Body: 0, Roof: 0, Topper: 0, Glasses: 0, Eyes: 0, Mouth: 0, Shirt: 0, Item: 0, Background: 0, Smoke: 0 });
console.log('classic traits:', JSON.stringify(A.traitLabels(A.traitsFor(classic))));
poonCanvas(classic).encode(38, path.join(out, 'poon-classic.png'));
// A Legendary: Gold, the rarest type (~3 in 3,333), with a crown on the roof and a diamond in hand.
const idxOf = (key, name) => A.TRAITS.find(t => t.key === key).opts.findIndex(o => o[0] === name);
const gold = seedFor({ Type: idxOf('Type', 'Gold'), Topper: idxOf('Topper', 'Crown'), Glasses: idxOf('Glasses', 'Classic Black'),
  Eyes: idxOf('Eyes', 'Sparkle'), Mouth: idxOf('Mouth', 'Smile'), Item: idxOf('Item', 'Diamond'), Smoke: idxOf('Smoke', 'Stars') });
console.log('gold:', JSON.stringify(A.traitLabels(A.traitsFor(gold))), A.rarity(gold).tier);
poonCanvas(gold).encode(38, path.join(out, 'poon-gold.png'));
// A Ghost: the pale, see-through special type (Legendary), haunting a night room.
const ghost = seedFor({ Type: idxOf('Type', 'Ghost'), Topper: idxOf('Topper', 'Bluebird'), Glasses: idxOf('Glasses', 'Round Black'),
  Eyes: idxOf('Eyes', 'Open'), Mouth: idxOf('Mouth', 'Surprised'), Item: idxOf('Item', 'Candle'), Background: idxOf('Background', 'Night'), Smoke: idxOf('Smoke', 'Stars') });
console.log('ghost:', JSON.stringify(A.traitLabels(A.traitsFor(ghost))), A.rarity(ghost).tier);
poonCanvas(ghost).encode(38, path.join(out, 'poon-ghost.png'));
pfp().encode(8, path.join(out, 'pfp.png'));
logoWide().encode(20, path.join(out, 'logo.png'));
cover().encode(5, path.join(out, 'cover.png'));
