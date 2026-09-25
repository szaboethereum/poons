// Poons art engine — seed -> traits -> 32x32 pixel raster -> SVG (pixel | riso | mellan).
// The raster is the single source of truth; every style is just a different renderer over it,
// which is exactly how the on-chain renderer will work (layers stored RLE, styles emitted as SVG).
(function (root) {
  const N = 32;

  // ---------- deterministic PRNG (xorshift32) ----------
  function rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return () => {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  function pickW(r, table) { // [[value, weight], ...]
    const tot = table.reduce((a, t) => a + t[1], 0);
    let x = r() * tot;
    for (const [v, w] of table) { if ((x -= w) < 0) return v; }
    return table[table.length - 1][0];
  }

  // ---------- trait tables ----------
  const BODY = {
    felt:  { name: 'Felt Blue', base: '#a8c6d3', shade: '#7fa2b3', hi: '#cfe2ea' },
    rose:  { name: 'Rose',      base: '#e9b3b8', shade: '#c98a93', hi: '#f6d3d5' },
    mint:  { name: 'Mint',      base: '#b3dcc4', shade: '#86b89b', hi: '#d5efe0' },
    cream: { name: 'Cream',     base: '#ecdcb8', shade: '#cdb78b', hi: '#f8eed6' },
    lilac: { name: 'Lilac',     base: '#c7b6e0', shade: '#9f8cc0', hi: '#e2d8f1' },
    ghost: { name: 'Ghost',     base: '#eef0f2', shade: '#c9ced4', hi: '#ffffff' },
  };
  const ROOF = {
    forest:  { name: 'Forest',  base: '#3f8a5f', dark: '#2a6446', edge: '#1d4632' },
    brick:   { name: 'Brick',   base: '#b8573f', dark: '#8d3e2c', edge: '#62291d' },
    navy:    { name: 'Navy',    base: '#3d5a8a', dark: '#2b416a', edge: '#1c2b48' },
    mustard: { name: 'Mustard', base: '#d4a53a', dark: '#a87e22', edge: '#735514' },
    bubble:  { name: 'Bubble',  base: '#e27fa8', dark: '#b85b82', edge: '#853d5c' },
  };
  const TOPPER = {
    golden:    { name: 'Golden Pup', fur: '#d9a766', dark: '#a8753a', hi: '#f1cf98' },
    choco:     { name: 'Choco Pup',  fur: '#7a4f33', dark: '#553421', hi: '#9e6b49' },
    dalmatian: { name: 'Dalmatian',  fur: '#f2efe8', dark: '#2a2624', hi: '#ffffff' },
    ginger:    { name: 'Ginger Cat', fur: '#e08a3c', dark: '#b0621f', hi: '#f3b374' },
    frog:      { name: 'Frog',       fur: '#8cc152', dark: '#5f8f2e', hi: '#b5dd83' },
    none:      { name: 'Empty Roof' },
  };
  const GLASSES = {
    classic: { name: 'Classic Black', frame: '#141316', lens: null },
    round:   { name: 'Round Black',   frame: '#141316', lens: null, round: true },
    gold:    { name: 'Gold Wire',     frame: '#c9a14a', lens: null, thin: true },
    shades:  { name: 'Shades',        frame: '#141316', lens: '#26303a' },
    anaglyph:{ name: '3D',            frame: '#f3f1ea', lens: 'rb' },
  };
  const SHIRT = {
    plaidBlue:  { name: 'Blue Plaid',  a: '#3f6f87', b: '#6f9db3', line: '#23465a' },
    plaidRed:   { name: 'Red Plaid',   a: '#a8433b', b: '#d0705e', line: '#5e1f1c' },
    plaidGreen: { name: 'Green Plaid', a: '#3e6b45', b: '#6f9a64', line: '#22412a' },
    hoodie:     { name: 'Grey Hoodie', a: '#8a8d93', b: '#a4a7ad', line: '#5d6066', solid: true },
    tux:        { name: 'Tuxedo',      a: '#1f1e24', b: '#f4f2ec', line: '#0e0d11', tux: true },
  };
  const BG = {
    lamp:   { name: 'Lamp Light', a: '#17312f', b: '#244441', glow: '#e89a4a' },
    night:  { name: 'Night',      a: '#141a2e', b: '#1f2946', glow: '#f4e3a1' },
    paper:  { name: 'Paper',      a: '#e9dfc8', b: '#ddd0b2', glow: '#f7efdc' },
    blush:  { name: 'Blush',      a: '#e7b9ae', b: '#dca397', glow: '#f7dccf' },
    sea:    { name: 'Sea',        a: '#2d6e7a', b: '#3b8491', glow: '#9fd6d4' },
  };
  const EYES = { open: 'Open', sleepy: 'Sleepy', wink: 'Wink', sparkle: 'Sparkle' };
  const SMOKE = { puffs: 'Puffs', hearts: 'Hearts', none: 'No Smoke' };

  function traitsFor(seed) {
    const r = rng(seed);
    return {
      body:    pickW(r, [['felt', 40], ['rose', 14], ['mint', 14], ['cream', 14], ['lilac', 12], ['ghost', 6]]),
      roof:    pickW(r, [['forest', 40], ['brick', 16], ['navy', 16], ['mustard', 16], ['bubble', 12]]),
      topper:  pickW(r, [['golden', 40], ['choco', 18], ['dalmatian', 12], ['ginger', 14], ['frog', 10], ['none', 6]]),
      glasses: pickW(r, [['classic', 45], ['round', 20], ['gold', 15], ['shades', 12], ['anaglyph', 8]]),
      eyes:    pickW(r, [['open', 55], ['sleepy', 20], ['wink', 15], ['sparkle', 10]]),
      shirt:   pickW(r, [['plaidBlue', 38], ['plaidRed', 18], ['plaidGreen', 18], ['hoodie', 16], ['tux', 10]]),
      bg:      pickW(r, [['lamp', 36], ['night', 18], ['paper', 18], ['blush', 14], ['sea', 14]]),
      smoke:   pickW(r, [['puffs', 70], ['hearts', 10], ['none', 20]]),
    };
  }
  function traitLabels(t) {
    return {
      Body: BODY[t.body].name, Roof: ROOF[t.roof].name, Topper: TOPPER[t.topper].name,
      Glasses: GLASSES[t.glasses].name, Eyes: EYES[t.eyes], Shirt: SHIRT[t.shirt].name,
      Background: BG[t.bg].name, Smoke: SMOKE[t.smoke],
    };
  }

  // ---------- raster ----------
  function raster(t) {
    const g = Array.from({ length: N }, () => Array(N).fill(null)); // character layer
    const fg = Array.from({ length: N }, () => Array(N).fill(null)); // no-outline overlay (smoke)
    const set = (x, y, c, L = g) => { if (x >= 0 && y >= 0 && x < N && y < N && c) L[y][x] = c; };
    const rect = (x0, y0, x1, y1, c, L) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c, L); };
    const disc = (cx, cy, r, c, L) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) set(x, y, c, L); };

    const B = BODY[t.body], R = ROOF[t.roof], S = SHIRT[t.shirt], G = GLASSES[t.glasses];

    // shirt + sleeves
    for (let y = 26; y < N; y++) for (let x = 7; x <= 24; x++) {
      if ((x === 7 || x === 24) && y === 26) continue;
      let c;
      if (S.solid) c = (x === 15 || x === 16) && y > 26 ? S.line : S.a;
      else if (S.tux) c = (x >= 14 && x <= 17) ? (y === 26 && (x === 15 || x === 16) ? '#b8323a' : S.b) : S.a;
      else c = ((x + 1) % 4 === 0 || y % 4 === 1) ? S.line : ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? S.a : S.b);
      set(x, y, c);
    }
    // mitten hands
    rect(5, 28, 7, 31, '#f4f1ea'); rect(24, 28, 26, 31, '#f4f1ea');
    set(5, 28, null); set(26, 28, null); set(7, 31, '#d9d4c8'); set(24, 31, '#d9d4c8');

    // head (rounded house block)
    for (let y = 12; y <= 26; y++) for (let x = 3; x <= 28; x++) {
      const bottom = y >= 24, cx = x < 16 ? 3 : 28, dx = Math.abs(x - cx);
      if (bottom && dx < (y - 23)) continue;
      let c = B.base;
      if (x <= 4 || y >= 25) c = B.shade;
      if (x >= 26 && y > 13) c = B.shade;
      if (y === 13 && x > 5 && x < 26) c = B.hi;
      set(x, y, c);
    }
    // felt speckle
    const fr = rng(0xfe17 + t.body.length);
    for (let i = 0; i < 18; i++) { const x = 5 + Math.floor(fr() * 21), y = 14 + Math.floor(fr() * 10); if (g[y][x] === B.base) set(x, y, B.hi); }

    // roof
    for (let y = 5; y <= 14; y++) {
      const half = 2 + (y - 5) * 1.62;
      for (let x = 0; x < N; x++) {
        if (Math.abs(x + .5 - 16) <= half) {
          let c = (y % 2 === 0 && (x + y) % 3 !== 0) ? R.dark : R.base;
          if (y >= 13) c = R.edge;
          set(x, y, c);
        }
      }
    }
    // chimney (sits on the right slope)
    rect(21, 4, 24, 9, '#8fbfa7'); rect(20, 3, 25, 4, '#6f9f88'); rect(24, 5, 24, 9, '#6f9f88');

    // topper on the ridge
    const T = TOPPER[t.topper];
    if (t.topper !== 'none') {
      const isCat = t.topper === 'ginger', isFrog = t.topper === 'frog';
      rect(10, 2, 16, 6, T.fur);
      set(10, 2, null); set(16, 2, null);
      rect(11, 1, 15, 1, T.fur);
      if (isCat) { set(10, 0, T.dark); set(10, 1, T.fur); set(16, 0, T.dark); set(16, 1, T.fur); }
      else if (isFrog) { rect(10, 0, 11, 1, T.fur); rect(15, 0, 16, 1, T.fur); set(10, 0, '#141316'); set(16, 0, '#141316'); }
      else { rect(9, 2, 9, 6, T.dark); rect(17, 2, 17, 6, T.dark); set(8, 5, T.dark); set(18, 5, T.dark); } // floppy ears
      rect(12, 1, 14, 1, T.hi);
      if (!isFrog) { set(11, 4, '#141316'); set(15, 4, '#141316'); rect(13, 5, 13, 5, '#141316'); set(12, 5, T.hi); set(14, 5, T.hi); }
      else { rect(12, 5, 14, 5, T.dark); }
      if (t.topper === 'dalmatian') { set(11, 2, T.dark); set(15, 3, T.dark); set(13, 6, T.dark); }
      rect(11, 7, 12, 7, T.fur); rect(14, 7, 15, 7, T.fur); // paws over the ridge
      set(11, 7, T.hi); set(15, 7, T.hi);
    }

    // glasses
    const F = G.frame;
    const lens = (x0) => {
      const x1 = x0 + 9, y0 = 15, y1 = 22;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const edge = x <= x0 + (G.thin ? 0 : 1) || x >= x1 - (G.thin ? 0 : 1) || y === y0 || y === y1;
        const cx = Math.min(x - x0, x1 - x), cy = Math.min(y - y0, y1 - y); // distance to nearest side
        if (G.round && cx + cy < 2) continue;              // clip the outer corners
        if (G.round && cx + cy === 2 && cx < 2) { set(x, y, F); continue; } // bevel ring
        if (edge) set(x, y, F);
        else if (G.lens === 'rb') set(x, y, x0 < 16 ? '#d8505a' : '#4aa6c9');
        else if (G.lens) set(x, y, G.lens);
      }
    };
    lens(5); lens(17);
    rect(15, 17, 16, 18, F);
    set(4, 17, F); set(27, 17, F); set(3, 17, F); set(28, 17, F);

    // eyes
    const dark = G.lens && G.lens !== 'rb';
    const eye = (cx, kind) => {
      if (dark) { set(cx - 1, 17, '#5a6a78'); return; }
      if (kind === 'sleepy') { rect(cx - 1, 19, cx + 1, 20, '#141316'); rect(cx - 1, 18, cx + 1, 18, B.shade); return; }
      if (kind === 'closed') { rect(cx - 1, 19, cx + 1, 19, '#141316'); set(cx - 2, 18, '#141316'); set(cx + 2, 18, '#141316'); return; }
      rect(cx - 1, 17, cx + 1, 20, '#141316'); set(cx - 2, 18, '#141316'); set(cx + 2, 18, '#141316'); set(cx - 2, 19, '#141316'); set(cx + 2, 19, '#141316');
      set(cx - 1, 17, '#f6f4ee');
      if (kind === 'sparkle') { set(cx + 1, 19, '#f6f4ee'); set(cx, 18, '#8fd3ff'); }
    };
    eye(10, t.eyes === 'wink' ? 'open' : t.eyes);
    eye(21, t.eyes === 'wink' ? 'closed' : t.eyes);
    // nose
    rect(15, 23, 16, 24, '#4f9c95'); set(15, 23, '#7cc1ba');

    // outline pass (4-neighbourhood) -> ink edge
    const ink = '#15141a';
    const out = g.map(r => r.slice());
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (g[y][x]) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx]);
      if (nb) out[y][x] = ink;
    }

    // smoke (no outline)
    if (t.smoke === 'puffs') {
      disc(25.5, 1.5, 1.6, '#e8eef0', fg); disc(27.5, -.3, 1.3, '#e8eef0', fg); disc(23.2, 2.2, 0.9, '#d1dcdf', fg);
    } else if (t.smoke === 'hearts') {
      const h = (x, y) => { set(x, y, '#ef6f8e', fg); set(x + 2, y, '#ef6f8e', fg); rect(x, y + 1, x + 2, y + 1, '#ef6f8e', fg); set(x + 1, y + 2, '#ef6f8e', fg); };
      h(24, 1); h(28, -1);
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fg[y][x] && !out[y][x]) out[y][x] = fg[y][x];

    // background (dithered glow)
    const Bg = BG[t.bg];
    const bgMask = out.map(row => row.map(c => !c));
    const px = out.map((row, y) => row.map((c, x) => {
      if (c) return c;
      const d = Math.hypot(x - 3, y - 10) / 14;
      const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y % 4][x % 4] / 16;
      if (d < 1 && (1 - d) * 0.75 > bayer + 0.12) return Bg.glow;
      return (y / N) * .6 > bayer ? Bg.b : Bg.a;
    }));
    px.bg = bgMask; px.glow = Bg.glow;
    return px;
  }

  // ---------- helpers ----------
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = h => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  // Merge horizontal runs so the SVG stays small (this is what the on-chain renderer emits too).
  function runs(px, pred) {
    let s = '';
    for (let y = 0; y < N; y++) {
      let x = 0;
      while (x < N) {
        const v = pred(px[y][x], x, y);
        if (!v) { x++; continue; }
        let x2 = x + 1;
        while (x2 < N && pred(px[y][x2], x2, y) === v) x2++;
        s += `M${x} ${y}h${x2 - x}v1h-${x2 - x}z`;
        x = x2;
      }
    }
    return s;
  }

  // ---------- style 1: pixel ----------
  function svgPixel(px) {
    const cols = {};
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) (cols[px[y][x]] ||= 1);
    let body = '';
    for (const c of Object.keys(cols)) body += `<path fill="${c}" d="${runs(px, v => v === c)}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${body}</svg>`;
  }

  // ---------- style 2: risograph ----------
  const INKSETS = [
    { name: 'Blue / Fluo Pink / Yellow', inks: ['#0078bf', '#ff48b0', '#ffe800'] },
    { name: 'Teal / Orange / Federal Blue', inks: ['#00838a', '#ff6c2f', '#3d5588'] },
    { name: 'Green / Red / Yellow', inks: ['#00a95c', '#ff665e', '#ffe800'] },
  ];
  const PAPER = '#f3ede0';
  function svgRiso(px, seed) {
    const r = rng(seed ^ 0x5150);
    const set = INKSETS[Math.floor(r() * INKSETS.length)];
    const inks = set.inks.map(hex), paper = hex(PAPER);
    const levels = [0, 0.5, 1];
    const combos = [];
    for (const a of levels) for (const b of levels) for (const c of levels) {
      const cov = [a, b, c];
      const col = paper.map((p, i) => p * cov.reduce((m, k, j) => m * (1 - k * (1 - inks[j][i])), 1));
      combos.push({ cov, col });
    }
    const memo = {};
    const sep = c => memo[c] ||= (() => {
      const t = hex(c); let best, bd = 1e9;
      for (const k of combos) { const d = k.col.reduce((s, v, i) => s + (v - t[i]) ** 2 * [0.3, 0.59, 0.11][i], 0); if (d < bd) { bd = d; best = k; } }
      return best.cov;
    })();
    let layers = '';
    const isBg = (x, y) => px.bg[y][x];
    const glowInk = Math.floor(r() * 3);
    set.inks.forEach((ink, i) => {
      const dx = ((r() - .5) * .7).toFixed(2), dy = ((r() - .5) * .7).toFixed(2);
      const solid = runs(px, (c, x, y) => !isBg(x, y) && sep(c)[i] === 1 && 1);
      const half = runs(px, (c, x, y) => (isBg(x, y) ? (i === glowInk && Math.hypot(x - 3, y - 10) < 14 - (x + y) % 3) : sep(c)[i] === .5) && 1);
      layers += `<g style="mix-blend-mode:multiply" transform="translate(${dx} ${dy})" filter="url(#rough)">` +
        `<path fill="${ink}" fill-opacity=".92" d="${solid}"/><path fill="url(#ht${i})" d="${half}"/></g>`;
    });
    const pats = set.inks.map((ink, i) =>
      `<pattern id="ht${i}" width=".5" height=".5" patternUnits="userSpaceOnUse" patternTransform="rotate(${[15, 75, 45][i]})"><circle cx=".25" cy=".25" r=".15" fill="${ink}"/></pattern>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs>${pats}` +
      `<filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="2" seed="${seed % 997}"/><feDisplacementMap in="SourceGraphic" scale=".35"/></filter>` +
      `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="3.1" numOctaves="1" seed="7"/><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .18  0 0 0 0 .15  0 0 0 -1.6 1.05"/></filter></defs>` +
      `<rect width="32" height="32" fill="${PAPER}"/>${layers}<rect width="32" height="32" filter="url(#grain)" opacity=".35"/></svg>`;
  }

  // ---------- style 3: Mellan engraving (single spiral, width follows tone) ----------
  function spiralPath(cx, cy, gap, rmax) {
    // Archimedean spiral from alternating half-circles: compact enough to live in a contract as a constant.
    let d = `M${cx} ${cy}`, r = gap / 2, x = cx, y = cy, up = true;
    for (let k = 0; r < rmax; k++) {
      const nx = up ? x + 2 * r - gap / 2 : x - 2 * r + gap / 2;
      d += `A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${nx.toFixed(2)} ${y}`;
      x = nx; r += gap / 2; up = !up;
    }
    return d;
  }
  function svgMellan(px, seed) {
    const S = 10, gap = 5;
    const cx = 160, cy = 232; // Mellan centred his Sudarium on the nose; so do we.
    const dark = px.map((row, y) => row.map((c, x) => px.bg[y][x] ? 0.1 + 0.12 * (y / N) : 1 - lum(c)));
    const th = [0.05, 0.3, 0.5, 0.68, 0.84];
    const w = [0.55, 1.3, 2.2, 3.1, 4.1];
    const spiral = spiralPath(cx, cy, gap, 300);
    let defs = `<filter id="soft"><feGaussianBlur stdDeviation="4.5"/><feComponentTransfer><feFuncA type="linear" slope="6" intercept="-2.6"/></feComponentTransfer></filter>`;
    let body = '';
    th.forEach((t, k) => {
      let rects = '';
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (dark[y][x] >= t) rects += `M${x * S} ${y * S}h${S}v${S}h-${S}z`;
      defs += `<mask id="m${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="320"><path fill="#fff" filter="url(#soft)" d="${rects}"/></mask>`;
      body += `<path d="${spiral}" fill="none" stroke="#1f1a14" stroke-width="${w[k]}" mask="url(#m${k})"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><defs>${defs}</defs>` +
      `<rect width="320" height="320" fill="#efe5cf"/><path d="${spiral}" fill="none" stroke="#1f1a14" stroke-width=".22"/>${body}</svg>`;
  }

  function render(seed, style) {
    const t = traitsFor(seed), px = raster(t);
    if (style === 'riso') return svgRiso(px, seed);
    if (style === 'mellan') return svgMellan(px, seed);
    return svgPixel(px);
  }

  const api = { N, rng, traitsFor, traitLabels, raster, svgPixel, svgRiso, svgMellan, render, INKSETS,
    tables: { BODY, ROOF, TOPPER, GLASSES, SHIRT, BG, EYES, SMOKE } };
  if (typeof module !== 'undefined') module.exports = api; else root.PoonsArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
