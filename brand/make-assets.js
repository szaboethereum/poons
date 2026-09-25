// Generates the X (Twitter) brand assets from the art engine, pixel-perfect (no resampling):
//   brand/pfp.png   400x400  — the Poon face, the wordmark's "OO" are its glasses
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

// ---------------------------------------------------------------- PFP (50x50 cells, 8px)
// The Poon face fills the circle; the wordmark sits across it and its "OO" are the glasses.
function pfp() {
  const N = 50;
  const cv = canvas(N, N);
  const char = Array.from({ length: N }, () => Array(N).fill(false));
  const put = (x, y, col) => { cv.set(x, y, col); if (x >= 0 && y >= 0 && x < N && y < N) char[y][x] = true; };
  const rect = (x0, y0, x1, y1, col) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, col); };
  const felt = { base: '#a8c6d3', sh: '#7fa2b3', hi: '#cfe2ea' };
  const roof = { base: '#3f8a5f', dk: '#2a6446', edge: '#1d4632' };
  const pup = { fur: '#d9a766', dk: '#a8753a', hi: '#f1cf98' };

  // face / house block
  for (let y = 18; y < N; y++) for (let x = 2; x <= 47; x++) put(x, y, x <= 4 || x >= 45 ? felt.sh : felt.base);
  let v = 0x5eed; const r = () => { v ^= v << 13; v >>>= 0; v ^= v >>> 17; v ^= v << 5; v >>>= 0; return v / 4294967296; };
  for (let i = 0; i < 34; i++) put(6 + Math.floor(r() * 38), 21 + Math.floor(r() * 22), felt.hi);
  rect(5, 20, 44, 20, felt.hi);
  // chimney + roof
  rect(34, 5, 38, 13, '#8fbfa7'); rect(33, 4, 39, 5, '#6f9f88'); rect(38, 6, 38, 13, '#6f9f88');
  for (let y = 8; y <= 19; y++) {
    const half = 2 + (y - 8) * 2.3;
    for (let x = 0; x < N; x++) if (Math.abs(x + .5 - 25) <= half) put(x, y, y >= 18 ? roof.edge : (y % 2 === 1 && (x + y) % 3 !== 0) ? roof.dk : roof.base);
  }
  // golden pup on the ridge (engine shape, recentred)
  for (const [x, y, s] of A.SHAPES.topper_dog) {
    const col = { [A.S.FUR]: pup.fur, [A.S.FUR_DK]: pup.dk, [A.S.FUR_HI]: pup.hi, [A.S.BLACK]: '#141316' }[s];
    put(x + 12, y + 2, col);
  }

  // bold wordmark: P OO N S (2-pixel strokes so it reads at 48px)
  const P = ['111110', '110011', '110011', '110011', '111110', '110000', '110000', '110000', '110000'];
  const Nn = ['1100011', '1110011', '1111011', '1101111', '1100111', '1100011', '1100011', '1100011', '1100011'];
  const Ss = ['011111', '110000', '110000', '111100', '011110', '000111', '000011', '000011', '111110'];
  const ty = 26;
  const glyph = (g, x0) => g.forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') put(x0 + x, ty + y, INK); }));
  const lens = x0 => {
    for (let y = 0; y < 9; y++) for (let x = 0; x < 8; x++) {
      const frame = x <= 1 || x >= 6 || y <= 1 || y >= 7;
      put(x0 + x, ty + y, frame ? '#141316' : felt.hi);
    }
    rect(x0 + 3, ty + 3, x0 + 4, ty + 5, '#141316'); put(x0 + 3, ty + 3, '#f6f4ee');
  };
  glyph(P, 5);
  lens(12); lens(21);
  rect(20, ty + 3, 20, ty + 4, '#141316'); // bridge
  glyph(Nn, 30);
  glyph(Ss, 38);
  // nose + plaid collar
  rect(24, 38, 25, 39, '#4f9c95'); put(24, 38, '#7cc1ba');
  for (let y = 45; y < N; y++) for (let x = 12; x <= 37; x++) put(x, y, ((x + 1) % 4 === 0 || y % 4 === 1) ? '#23465a' : ((x >> 1) + (y >> 1)) % 2 ? '#3f6f87' : '#6f9db3');

  outline(cv, char);
  // lamp-lit background with dithered glow (upper left)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (cv.c[y][x]) continue;
    const d = Math.hypot(x - 6, y - 7) / 18;
    cv.c[y][x] = d < 1 && (1 - d) * .75 > bayer(x, y) + .1 ? '#e89a4a' : (y / N) * .8 > bayer(x, y) ? '#244441' : '#17312f';
  }
  // chimney smoke
  [[39, 2], [40, 2], [40, 1], [41, 1], [42, 0], [43, 0], [38, 3]].forEach(([x, y]) => { if (!char[y][x]) cv.set(x, y, '#e8eef0'); });
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

const out = __dirname;
pfp().encode(8, path.join(out, 'pfp.png'));
cover().encode(5, path.join(out, 'cover.png'));
