// Poons art engine — seed -> traits -> 32x32 pixel raster -> SVG.
//
// Shapes are colour-agnostic: every pixel stores a palette *slot*, and traits decide which colour each
// slot resolves to. art/export-sol.js turns these tables into contracts/src/PoonsData.sol, and
// PoonsRenderer.sol composes them in exactly the same order, so this file is the reference output.
// Parity is checked byte-for-byte by art/parity.js.
(function (root) {
  const N = 32;
  const NONE = 255;

  // ---------------------------------------------------------------- palette slots
  const SLOT_NAMES = ['NONE', 'INK', 'BLACK', 'WHITE', 'MITTEN', 'MITTEN_SH', 'CHIM', 'CHIM_SH', 'NOSE', 'NOSE_HI',
    'BODY', 'BODY_SH', 'BODY_HI', 'ROOF', 'ROOF_DK', 'ROOF_EDGE', 'FUR', 'FUR_DK', 'FUR_HI', 'FRAME', 'LENS_L', 'LENS_R',
    'SHIRT_A', 'SHIRT_B', 'SHIRT_LINE', 'SPARKLE', 'DIM_EYE', 'TIE', 'SMOKE', 'SMOKE_SH', 'HEART', 'BG_A', 'BG_B', 'GLOW',
    'BEAK', 'TAPE', 'PINK', 'LASER', 'LASER_HI', 'MUST', 'PIPE', 'PIPE_DK', 'ITEM_A', 'ITEM_B', 'ITEM_C', 'STAR', 'NOTE',
    'FIRE_A', 'FIRE_B', 'FIRE_C'];
  const S = Object.fromEntries(SLOT_NAMES.map((n, i) => [n, i]));
  const SLOT_COUNT = SLOT_NAMES.length;
  const BG_SLOTS = [S.BG_A, S.BG_B, S.GLOW];

  const FIXED = {
    [S.INK]: '#15141a', [S.BLACK]: '#141316', [S.WHITE]: '#f6f4ee', [S.MITTEN]: '#f4f1ea', [S.MITTEN_SH]: '#d9d4c8',
    [S.CHIM]: '#8fbfa7', [S.CHIM_SH]: '#6f9f88', [S.NOSE]: '#4f9c95', [S.NOSE_HI]: '#7cc1ba', [S.SPARKLE]: '#8fd3ff',
    [S.DIM_EYE]: '#5a6a78', [S.TIE]: '#b8323a', [S.SMOKE]: '#e8eef0', [S.SMOKE_SH]: '#d1dcdf', [S.HEART]: '#ef6f8e',
    [S.BEAK]: '#f0a030', [S.TAPE]: '#f2efe6', [S.PINK]: '#ff6f9c', [S.LASER]: '#ff2a2a', [S.LASER_HI]: '#ffd6d6',
    [S.MUST]: '#4a2c1a', [S.PIPE]: '#7a4a2a', [S.PIPE_DK]: '#3d2414', [S.STAR]: '#ffd84a', [S.NOTE]: '#1d1b22',
    [S.FIRE_A]: '#ff4d2e', [S.FIRE_B]: '#ff9a2e', [S.FIRE_C]: '#ffe066',
  };

  // ---------------------------------------------------------------- traits
  // Option: [label, weight, colours for the trait's slots, variant]
  // TRAITS order == order the seed is consumed (16 bits per trait). Keep in sync with PoonsRenderer.sol.
  const TRAITS = [
    { key: 'Type', slots: [], opts: [
      ['Poon', 9850, [], ''], ['Zombie', 50, [], 'zombie'], ['Shadow', 35, [], 'shadow'],
      ['Ghost', 30, [], 'ghost'], ['Skeleton', 25, [], 'skeleton'], ['Gold', 10, [], 'gold']] },
    { key: 'Body', slots: [S.BODY, S.BODY_SH, S.BODY_HI], opts: [
      ['Felt Blue', 22, ['#a8c6d3', '#7fa2b3', '#cfe2ea']],
      ['Rose',      12, ['#e9b3b8', '#c98a93', '#f6d3d5']],
      ['Mint',      12, ['#b3dcc4', '#86b89b', '#d5efe0']],
      ['Cream',     12, ['#ecdcb8', '#cdb78b', '#f8eed6']],
      ['Lilac',     10, ['#c7b6e0', '#9f8cc0', '#e2d8f1']],
      ['Peach',     10, ['#f2c3a0', '#d69c76', '#fadcc6']],
      ['Sky',        8, ['#9fd0f0', '#74a9cf', '#cbe7f8']],
      ['Sage',       7, ['#b9c7a3', '#94a37d', '#d6e0c6']],
      ['Butter',     5, ['#f3e08a', '#d4bd5c', '#faf0bd']],
      ['Charcoal',   2, ['#5d6168', '#43464c', '#7c8088']]] },
    { key: 'Roof', slots: [S.ROOF, S.ROOF_DK, S.ROOF_EDGE], opts: [
      ['Forest',   24, ['#3f8a5f', '#2a6446', '#1d4632']],
      ['Brick',    14, ['#b8573f', '#8d3e2c', '#62291d']],
      ['Navy',     14, ['#3d5a8a', '#2b416a', '#1c2b48']],
      ['Mustard',  12, ['#d4a53a', '#a87e22', '#735514']],
      ['Bubble',   10, ['#e27fa8', '#b85b82', '#853d5c']],
      ['Plum',      9, ['#7d4b86', '#5d3565', '#3e2245']],
      ['Teal',      9, ['#2f8f8a', '#216b67', '#154845']],
      ['Snow',      5, ['#f4f6f8', '#d3dbe3', '#9aa7b5']],
      ['Obsidian',  3, ['#2b2a33', '#1b1a21', '#0d0c10']]] },
    { key: 'Topper', slots: [S.FUR, S.FUR_DK, S.FUR_HI], opts: [
      ['Golden Pup',  20, ['#d9a766', '#a8753a', '#f1cf98'], 'dog'],
      ['Choco Pup',   12, ['#7a4f33', '#553421', '#9e6b49'], 'dog'],
      ['Dalmatian',    7, ['#f2efe8', '#2a2624', '#ffffff'], 'dalmatian'],
      ['Ginger Cat',  10, ['#e08a3c', '#b0621f', '#f3b374'], 'cat'],
      ['Tuxedo Cat',   7, ['#2a2830', '#141318', '#f2efe8'], 'cat'],
      ['Frog',         7, ['#8cc152', '#5f8f2e', '#b5dd83'], 'frog'],
      ['Bunny',        8, ['#f1ece4', '#d8a8b4', '#ffffff'], 'bunny'],
      ['Bear Cub',     8, ['#9a6a43', '#6e4a2c', '#c99d74'], 'bear'],
      ['Bluebird',     7, ['#5b9fe0', '#3a6fb0', '#e8eef6'], 'bird'],
      ['Duckling',     6, ['#ffd84a', '#e0a92a', '#fff0a0'], 'duck'],
      ['Crown',        3, ['#e8b923', '#c0392b', '#fff1a8'], 'crown'],
      ['Empty Roof',   5, ['#000000', '#000000', '#000000'], '']] },
    { key: 'Glasses', slots: [S.FRAME, S.LENS_L, S.LENS_R], opts: [
      ['Classic Black', 28, ['#141316', '#000000', '#000000'], 'thick'],
      ['Round Black',   14, ['#141316', '#000000', '#000000'], 'round'],
      ['Gold Wire',     10, ['#c9a14a', '#000000', '#000000'], 'thin'],
      ['Tortoise',       9, ['#6b3f22', '#000000', '#000000'], 'thick'],
      ['Nerd Tape',      8, ['#141316', '#000000', '#000000'], 'thick+tape'],
      ['Shades',         8, ['#141316', '#26303a', '#26303a'], 'thick+lens+dim'],
      ['Rose Tint',      7, ['#b24a6a', '#f6c6d3', '#f6c6d3'], 'thick+lens'],
      ['3D',             6, ['#f3f1ea', '#d8505a', '#4aa6c9'], 'thick+lens+dim'],
      ['Monocle',        5, ['#c9a14a', '#000000', '#000000'], 'mono'],
      ['Visor',          5, ['#35c6d9', '#b8f4ff', '#000000'], 'visor+hide']] },
    { key: 'Eyes', slots: [], opts: [
      ['Open', 30, [], 'open/open'], ['Sleepy', 12, [], 'sleepy/sleepy'], ['Wink', 9, [], 'open/closed'],
      ['Sparkle', 8, [], 'sparkle/sparkle'], ['Side Eye', 9, [], 'side/side'], ['Angry', 8, [], 'angryL/angryR'],
      ['Hearts', 6, [], 'hearts/hearts'], ['Dizzy', 5, [], 'dizzy/dizzy'], ['Laser', 3, [], 'laser/laser']] },
    { key: 'Mouth', slots: [], opts: [
      ['None', 30, [], ''], ['Smile', 15, [], 'smile'], ['Grin', 10, [], 'grin'], ['Tongue', 9, [], 'tongue'],
      ['Mustache', 9, [], 'mustache'], ['Surprised', 8, [], 'oo'], ['Pipe', 7, [], 'pipe'], ['Bubblegum', 6, [], 'gum']] },
    { key: 'Shirt', slots: [S.SHIRT_A, S.SHIRT_B, S.SHIRT_LINE], opts: [
      ['Blue Plaid',     18, ['#3f6f87', '#6f9db3', '#23465a'], 'plaid'],
      ['Red Plaid',      12, ['#a8433b', '#d0705e', '#5e1f1c'], 'plaid'],
      ['Green Plaid',    10, ['#3e6b45', '#6f9a64', '#22412a'], 'plaid'],
      ['Grey Hoodie',    12, ['#8a8d93', '#a4a7ad', '#5d6066'], 'hoodie'],
      ['Breton Stripe',  10, ['#1f3a6b', '#f1ede4', '#1f3a6b'], 'stripe'],
      ['Overalls',        9, ['#4a6fa5', '#e9d8a6', '#2f4a73'], 'overalls'],
      ['Cable Knit',      9, ['#b8573f', '#efe3cc', '#8d3e2c'], 'knit'],
      ['Hawaiian',        7, ['#2fa39a', '#ffd84a', '#ff6f61'], 'hawaii'],
      ['Suit',            7, ['#4a4d57', '#f1ede4', '#b8323a'], 'suit'],
      ['Tuxedo',          6, ['#1f1e24', '#f4f2ec', '#0e0d11'], 'tux']] },
    { key: 'Item', slots: [S.ITEM_A, S.ITEM_B, S.ITEM_C], opts: [
      ['None',       45, ['#000000', '#000000', '#000000'], ''],
      ['Coffee',     12, ['#f4f1ea', '#6b3f22', '#d9dee2'], 'coffee'],
      ['Balloon',     9, ['#e8453c', '#ff9a8f', '#e9e4da'], 'balloon'],
      ['Sunflower',   8, ['#ffd23f', '#4f8a3a', '#6b3f22'], 'flower'],
      ['Candle',      8, ['#f3ead2', '#c9a14a', '#ff9a2e'], 'candle'],
      ['Pons Flag',   7, ['#3f8a5f', '#8a6a4a', '#f4f1ea'], 'flag'],
      ['Donut',       6, ['#ff8fb8', '#d9a766', '#ffe066'], 'donut'],
      ['Diamond',     5, ['#8fe3ff', '#e9fbff', '#ffffff'], 'diamond']] },
    { key: 'Background', slots: BG_SLOTS, opts: [
      ['Lamp Light', 20, ['#17312f', '#244441', '#e89a4a']],
      ['Night',      12, ['#141a2e', '#1f2946', '#f4e3a1']],
      ['Paper',      12, ['#e9dfc8', '#ddd0b2', '#f7efdc']],
      ['Blush',      10, ['#e7b9ae', '#dca397', '#f7dccf']],
      ['Sea',        10, ['#2d6e7a', '#3b8491', '#9fd6d4']],
      ['Sunset',      9, ['#b83b5e', '#e0674f', '#f9d56e']],
      ['Mint Room',   9, ['#cfe8dc', '#bddccd', '#f5fbf7']],
      ['Lavender',    8, ['#a896c8', '#b9a7d6', '#ece4fb']],
      ['Forest',      6, ['#1e3a2b', '#284a37', '#c9e36b']],
      ['Arcade',      4, ['#1a1030', '#2a1850', '#ff4fd8']]] },
    { key: 'Smoke', slots: [], opts: [
      ['Puffs', 45, [], 'puffs'], ['No Smoke', 18, [], ''], ['Hearts', 9, [], 'hearts'], ['Stars', 9, [], 'stars'],
      ['Notes', 8, [], 'notes'], ['Fire', 6, [], 'fire'], ['Bubbles', 5, [], 'bubbles']] },
  ];
  const T = Object.fromEntries(TRAITS.map((t, i) => [t.key, i]));

  // ---------------------------------------------------------------- special types
  // Specials replace the whole palette (shapes still come from the other traits, so every special is
  // still one of a kind). Ghost and Skeleton also swap some shapes. Palettes are derived from a
  // reference Poon by luminance -> ramp, then pinned colours.
  const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum255 = h => { const [r, g, b] = hex2(h); return (2126 * r + 7152 * g + 722 * b) / 10000; };
  const REF = (() => {
    const p = { ...FIXED };
    TRAITS.forEach(t => t.slots.forEach((s, j) => { p[s] = t.opts[t.key === 'Item' ? 1 : 0][2][j]; }));
    return p;
  })();
  function rampPalette(ramp, pins) {
    const p = {};
    for (let s = 1; s < SLOT_COUNT; s++) {
      if (BG_SLOTS.includes(s)) continue;
      const l = lum255(REF[s] || '#808080');
      p[s] = ramp[Math.min(ramp.length - 1, Math.floor(l * ramp.length / 256))];
    }
    return Object.assign(p, pins);
  }
  const SPECIALS = {
    gold: {
      palette: rampPalette(['#4a3208', '#8a6212', '#c9981f', '#f0c948', '#fff2b0'],
        { [S.INK]: '#2a1a02', [S.BG_A]: '#120d06', [S.BG_B]: '#1d1508', [S.GLOW]: '#6b4c10' }),
      labels: { Body: 'Gold', Roof: 'Gold', Background: 'Vault' },
    },
    shadow: {
      palette: rampPalette(['#07070b', '#101018', '#1b1b26', '#2a2a38'],
        { [S.INK]: '#000000', [S.BLACK]: '#ff3b3b', [S.WHITE]: '#ffd0d0', [S.SPARKLE]: '#ff3b3b', [S.DIM_EYE]: '#ff3b3b',
          [S.BG_A]: '#3a3f4a', [S.BG_B]: '#454b57', [S.GLOW]: '#6e7686' }),
      labels: { Body: 'Shadow', Roof: 'Shadow', Background: 'Fog' },
    },
    zombie: {
      palette: Object.assign({ ...REF }, {
        [S.BODY]: '#8fae7a', [S.BODY_SH]: '#6a8a58', [S.BODY_HI]: '#b3cc9c', [S.ROOF]: '#5b5348', [S.ROOF_DK]: '#433d34',
        [S.ROOF_EDGE]: '#2c2822', [S.SHIRT_A]: '#5d4a6b', [S.SHIRT_B]: '#7d6a8a', [S.SHIRT_LINE]: '#3a2d44',
        [S.MITTEN]: '#b3cc9c', [S.MITTEN_SH]: '#8fae7a', [S.NOSE]: '#6a3a3a', [S.NOSE_HI]: '#8a5050', [S.WHITE]: '#e9f0c0',
        [S.BG_A]: '#1f2420', [S.BG_B]: '#2a312b', [S.GLOW]: '#9fbf6a' }),
      labels: { Body: 'Zombie', Roof: 'Rotten', Background: 'Graveyard' },
    },
    ghost: {
      palette: rampPalette(['#9aa3b8', '#c3cad8', '#e4e8f0', '#ffffff'],
        { [S.INK]: '#8d96ab', [S.BLACK]: '#23232e', [S.WHITE]: '#ffffff', [S.BG_A]: '#15142a', [S.BG_B]: '#1e1c3a', [S.GLOW]: '#5a57a0' }),
      labels: { Body: 'Ghost', Roof: 'Ghost', Background: 'Haunted', Glasses: 'None', Eyes: 'Ghost', Mouth: 'Boo', Shirt: 'Sheet' },
      ghost: true,
    },
    skeleton: {
      palette: rampPalette(['#8a8676', '#b9b5a3', '#dcd8c6', '#f4f1e4'],
        { [S.INK]: '#0e0d10', [S.BLACK]: '#0e0d10', [S.SHIRT_A]: '#1b1a20', [S.ROOF]: '#4a4852', [S.ROOF_DK]: '#35343c',
          [S.ROOF_EDGE]: '#222128', [S.BG_A]: '#231a2e', [S.BG_B]: '#2e2340', [S.GLOW]: '#8a6fb0' }),
      labels: { Body: 'Bone', Roof: 'Crypt', Background: 'Crypt', Glasses: 'None', Eyes: 'Sockets', Mouth: 'Teeth', Shirt: 'Ribcage' },
      skeleton: true,
    },
  };

  // ---------------------------------------------------------------- rarity
  // Points per option = round(-10*log2(p)). Score = sum over traits. Tiers by score percentile over
  // regular Poons (thresholds measured with art/rarity-calibrate.js); every special type is Legendary.
  const POINTS = TRAITS.map(t => { const tot = t.opts.reduce((a, o) => a + o[1], 0); return t.opts.map(o => Math.round(-10 * Math.log2(o[1] / tot))); });
  const TIERS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const TIER_MIN = [0, 306, 331, 351]; // Uncommon, Rare, Epic score floors (Common = 0)

  // ---------------------------------------------------------------- seed -> traits
  // Trait k reads bits [16k, 16k+16) of the seed (low 176 bits). Bit 255 marks a Founding Resident:
  // the wallet's qualifying buy happened on the Pons bonding curve, before the token graduated.
  const FOUNDER_BIT = 1n << 255n;
  const isFounder = seed => (BigInt(seed) & FOUNDER_BIT) !== 0n;
  function traitsFor(seed) {
    seed = BigInt(seed);
    return TRAITS.map((t, k) => {
      const total = t.opts.reduce((a, o) => a + o[1], 0);
      let r = Number((seed >> BigInt(16 * k)) & 0xffffn) % total;
      for (let i = 0; i < t.opts.length; i++) { if ((r -= t.opts[i][1]) < 0) return i; }
      return t.opts.length - 1;
    });
  }
  const specialOf = idx => SPECIALS[TRAITS[0].opts[idx[0]][3]] || null;
  function traitLabels(idx) {
    const sp = specialOf(idx);
    return Object.fromEntries(TRAITS.map((t, k) => [t.key, (sp && sp.labels[t.key]) || t.opts[idx[k]][0]]));
  }
  function rarity(seed) {
    const idx = traitsFor(seed);
    const score = idx.reduce((a, i, k) => a + POINTS[k][i], 0);
    if (idx[0] !== 0) return { tier: 'Legendary', score };
    let tier = 0; for (let i = 1; i < TIER_MIN.length; i++) if (score >= TIER_MIN[i]) tier = i;
    return { tier: TIERS[tier], score };
  }

  // ---------------------------------------------------------------- shapes
  function shape(draw) {
    const m = new Map();
    const set = (x, y, s) => { if (x >= 0 && y >= 0 && x < N && y < N) m.set(y * N + x, s); };
    const rect = (x0, y0, x1, y1, s) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, s); };
    const disc = (cx, cy, r, s) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r * r) set(x, y, s); };
    draw({ set, rect, disc, has: (x, y) => m.get(y * N + x) });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([i, s]) => [i % N, Math.floor(i / N), s]);
  }
  const shirtArea = fn => shape(({ set }) => {
    for (let y = 26; y < N; y++) for (let x = 7; x <= 24; x++) { if ((x === 7 || x === 24) && y === 26) continue; set(x, y, fn(x, y)); }
  });

  const SHAPES = {
    shirt_plaid: shirtArea((x, y) => ((x + 1) % 4 === 0 || y % 4 === 1) ? S.SHIRT_LINE : ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? S.SHIRT_A : S.SHIRT_B)),
    shirt_hoodie: shirtArea((x, y) => (x === 15 || x === 16) && y > 26 ? S.SHIRT_LINE : S.SHIRT_A),
    shirt_tux: shirtArea((x, y) => (x >= 14 && x <= 17) ? (y === 26 && (x === 15 || x === 16) ? S.TIE : S.SHIRT_B) : S.SHIRT_A),
    shirt_stripe: shirtArea((x, y) => y % 2 === 0 ? S.SHIRT_A : S.SHIRT_B),
    shirt_overalls: shirtArea((x, y) => {
      if ((x === 10 || x === 11 || x === 20 || x === 21) && y <= 28) return S.SHIRT_LINE;
      if (y <= 27) return S.SHIRT_B;
      if (y === 29 && x >= 14 && x <= 17) return S.SHIRT_LINE;
      return S.SHIRT_A;
    }),
    shirt_knit: shirtArea((x, y) => (y === 27 || y === 30) ? S.SHIRT_LINE : (y === 28 || y === 29) && ((x + y) % 4 === 0 || (x - y + 32) % 4 === 0) ? S.SHIRT_A : S.SHIRT_B),
    shirt_hawaii: shirtArea((x, y) => (x * 7 + y * 3) % 11 === 0 ? S.SHIRT_B : (x * 5 + y * 9) % 13 === 0 ? S.SHIRT_LINE : S.SHIRT_A),
    shirt_suit: shirtArea((x, y) => (x === 15 || x === 16) ? S.SHIRT_LINE : (x === 14 || x === 17) && y <= 29 ? S.SHIRT_B : S.SHIRT_A),
    shirt_ribs: shirtArea((x, y) => (x === 15 || x === 16) ? S.SHIRT_B : (y % 2 === 1 && x >= 9 && x <= 22) ? S.SHIRT_B : S.SHIRT_A),
    ghost_tail: shape(({ set }) => {
      for (let y = 26; y < N; y++) for (let x = 5; x <= 26; x++) {
        if (y === 31 && x % 4 < 2) continue;
        set(x, y, x <= 6 ? S.BODY_SH : S.BODY);
      }
    }),
    hands: shape(({ set, rect }) => {
      rect(5, 28, 7, 31, S.MITTEN); rect(24, 28, 26, 31, S.MITTEN); set(7, 31, S.MITTEN_SH); set(24, 31, S.MITTEN_SH);
    }),
    head: shape(({ set, has }) => {
      for (let y = 12; y <= 26; y++) for (let x = 3; x <= 28; x++) {
        const cx = x < 16 ? 3 : 28;
        if (y >= 24 && Math.abs(x - cx) < y - 23) continue;
        let s = S.BODY;
        if (x <= 4 || y >= 25) s = S.BODY_SH;
        if (x >= 26 && y > 13) s = S.BODY_SH;
        if (y === 13 && x > 5 && x < 26) s = S.BODY_HI;
        set(x, y, s);
      }
      let v = 0xfe1b; const r = () => { v ^= v << 13; v >>>= 0; v ^= v >>> 17; v ^= v << 5; v >>>= 0; return v / 4294967296; };
      for (let i = 0; i < 18; i++) { const x = 5 + Math.floor(r() * 21), y = 14 + Math.floor(r() * 10); if (has(x, y) === S.BODY) set(x, y, S.BODY_HI); }
    }),
    roof: shape(({ set }) => { for (let y = 5; y <= 14; y++) { const half = 2 + (y - 5) * 1.62;
      for (let x = 0; x < N; x++) if (Math.abs(x + .5 - 16) <= half) set(x, y, y >= 13 ? S.ROOF_EDGE : (y % 2 === 0 && (x + y) % 3 !== 0) ? S.ROOF_DK : S.ROOF);
    } }),
    chimney: shape(({ rect }) => { rect(21, 4, 24, 9, S.CHIM); rect(20, 3, 25, 4, S.CHIM_SH); rect(24, 5, 24, 9, S.CHIM_SH); }),

    // toppers — sit on the ridge (y 0..7)
    topper_dog: animal('dog'), topper_dalmatian: animal('dalmatian'), topper_cat: animal('cat'), topper_frog: animal('frog'),
    topper_bunny: shape(({ set, rect }) => {
      rect(10, 3, 16, 6, S.FUR); rect(11, 2, 15, 2, S.FUR);
      rect(10, 0, 11, 2, S.FUR); rect(15, 0, 16, 2, S.FUR); set(11, 1, S.FUR_DK); set(15, 1, S.FUR_DK);
      set(11, 4, S.BLACK); set(15, 4, S.BLACK); set(13, 5, S.FUR_DK); set(12, 5, S.FUR_HI); set(14, 5, S.FUR_HI);
      rect(11, 7, 12, 7, S.FUR); rect(14, 7, 15, 7, S.FUR);
    }),
    topper_bear: shape(({ set, rect }) => {
      rect(10, 2, 16, 6, S.FUR); rect(11, 1, 15, 1, S.FUR);
      rect(9, 0, 10, 1, S.FUR_DK); rect(16, 0, 17, 1, S.FUR_DK);
      rect(12, 4, 14, 6, S.FUR_HI); set(13, 4, S.BLACK); set(11, 3, S.BLACK); set(15, 3, S.BLACK);
      rect(11, 7, 12, 7, S.FUR); rect(14, 7, 15, 7, S.FUR);
    }),
    topper_bird: shape(({ set, rect }) => {
      rect(12, 2, 14, 3, S.FUR); rect(11, 4, 15, 6, S.FUR); rect(12, 5, 14, 6, S.FUR_HI);
      set(14, 2, S.BLACK); set(15, 3, S.BEAK); rect(10, 4, 10, 5, S.FUR_DK); set(15, 5, S.FUR_DK);
      set(12, 7, S.BEAK); set(14, 7, S.BEAK);
    }),
    topper_duck: shape(({ set, rect }) => {
      rect(12, 1, 14, 3, S.FUR); rect(10, 4, 16, 6, S.FUR); rect(11, 5, 13, 5, S.FUR_DK);
      set(13, 2, S.BLACK); rect(15, 2, 16, 2, S.BEAK); set(10, 3, S.FUR); set(12, 1, S.FUR_HI);
      set(12, 7, S.BEAK); set(14, 7, S.BEAK);
    }),
    topper_crown: shape(({ set, rect }) => {
      rect(10, 4, 16, 6, S.FUR); rect(10, 2, 10, 3, S.FUR); rect(13, 1, 13, 3, S.FUR); rect(16, 2, 16, 3, S.FUR);
      set(12, 3, S.FUR); set(14, 3, S.FUR); rect(10, 6, 16, 6, S.FUR_HI);
      set(11, 5, S.FUR_DK); set(13, 5, S.FUR_DK); set(15, 5, S.FUR_DK); set(13, 1, S.FUR_HI);
    }),

    nose: shape(({ set, rect }) => { rect(15, 23, 16, 24, S.NOSE); set(15, 23, S.NOSE_HI); }),
    nose_skull: shape(({ rect }) => { rect(14, 23, 17, 23, S.BLACK); rect(15, 24, 16, 24, S.BLACK); }),

    // mouths
    mouth_smile: shape(({ set, rect }) => { set(13, 25, S.BLACK); set(18, 25, S.BLACK); rect(14, 26, 17, 26, S.BLACK); }),
    mouth_grin: shape(({ set, rect }) => { set(13, 25, S.BLACK); set(18, 25, S.BLACK); rect(14, 25, 17, 25, S.WHITE); rect(14, 26, 17, 26, S.BLACK); }),
    mouth_tongue: shape(({ rect }) => { rect(14, 25, 17, 25, S.BLACK); rect(15, 26, 16, 26, S.PINK); }),
    mouth_mustache: shape(({ set, rect }) => { rect(12, 24, 14, 24, S.MUST); rect(17, 24, 19, 24, S.MUST); set(11, 25, S.MUST); set(20, 25, S.MUST); }),
    mouth_oo: shape(({ rect }) => { rect(15, 25, 16, 26, S.BLACK); }),
    mouth_pipe: shape(({ rect }) => { rect(16, 25, 19, 25, S.PIPE); rect(20, 23, 22, 25, S.PIPE); rect(20, 23, 22, 23, S.PIPE_DK); }),
    mouth_gum: shape(({ set, rect, disc }) => { rect(15, 25, 16, 25, S.BLACK); disc(18.5, 26, 2.2, S.PINK); set(18, 25, S.WHITE); }),
    mouth_teeth: shape(({ set, rect }) => { for (let x = 12; x <= 19; x++) set(x, 25, x % 2 ? S.WHITE : S.BLACK); rect(13, 26, 18, 26, S.BLACK); }),

    // items (held by the right mitten)
    item_coffee: shape(({ set, rect }) => { rect(27, 26, 29, 29, S.ITEM_A); rect(27, 26, 29, 26, S.ITEM_B); set(30, 27, S.ITEM_A); set(30, 28, S.ITEM_A); set(28, 24, S.ITEM_C); set(27, 23, S.ITEM_C); }),
    item_balloon: shape(({ set, disc }) => {
      [[27, 27], [27, 26], [28, 25], [28, 24], [28, 23], [29, 22], [29, 21]].forEach(([x, y]) => set(x, y, S.ITEM_C));
      disc(30.2, 17, 2.4, S.ITEM_A); set(29, 16, S.ITEM_B); set(29, 15, S.ITEM_B);
    }),
    item_flower: shape(({ set, rect }) => {
      rect(28, 23, 28, 28, S.ITEM_B); set(27, 26, S.ITEM_B); set(29, 25, S.ITEM_B);
      [[27, 20], [28, 19], [29, 20], [27, 22], [29, 22], [28, 23], [26, 21], [30, 21]].forEach(([x, y]) => set(x, y, S.ITEM_A));
      rect(27, 21, 29, 21, S.ITEM_C); set(28, 20, S.ITEM_C); set(28, 22, S.ITEM_C);
    }),
    item_candle: shape(({ set, rect }) => { rect(27, 29, 30, 29, S.ITEM_B); rect(28, 25, 29, 28, S.ITEM_A); set(28, 24, S.ITEM_C); set(29, 23, S.ITEM_C); set(28, 23, S.FIRE_C); }),
    item_flag: shape(({ set, rect }) => { rect(28, 19, 28, 30, S.ITEM_B); rect(29, 19, 31, 22, S.ITEM_A); set(30, 20, S.ITEM_C); set(30, 21, S.ITEM_C); }),
    item_donut: shape(({ set, disc }) => { disc(29, 27.5, 2.2, S.ITEM_B); disc(29, 27, 1.8, S.ITEM_A); set(28, 27, S.ITEM_B); set(30, 26, S.ITEM_C); set(27, 26, S.WHITE); set(29, 25, S.ITEM_C); }),
    item_diamond: shape(({ set, rect }) => { set(28, 25, S.ITEM_B); rect(27, 26, 29, 26, S.ITEM_A); rect(27, 27, 29, 27, S.ITEM_A); set(28, 28, S.ITEM_A); set(27, 26, S.ITEM_B); set(30, 24, S.ITEM_C); set(31, 23, S.ITEM_C); }),

    // smoke — only fills empty cells, no outline
    smoke_puffs: shape(({ disc }) => { disc(25.5, 1.5, 1.6, S.SMOKE); disc(27.5, -.3, 1.3, S.SMOKE); disc(23.2, 2.2, 0.9, S.SMOKE_SH); }),
    smoke_hearts: shape(({ set, rect }) => {
      const h = (x, y) => { set(x, y, S.HEART); set(x + 2, y, S.HEART); rect(x, y + 1, x + 2, y + 1, S.HEART); set(x + 1, y + 2, S.HEART); };
      h(24, 1); h(28, -1);
    }),
    smoke_stars: shape(({ set }) => {
      const st = (x, y) => { set(x, y, S.STAR); set(x - 1, y, S.STAR); set(x + 1, y, S.STAR); set(x, y - 1, S.STAR); set(x, y + 1, S.STAR); };
      st(25, 1); st(29, 3); set(28, 0, S.STAR);
    }),
    smoke_notes: shape(({ set, rect }) => { rect(25, 0, 25, 2, S.NOTE); rect(24, 2, 25, 2, S.NOTE); rect(29, 1, 29, 3, S.NOTE); rect(28, 3, 29, 3, S.NOTE); set(30, 1, S.NOTE); }),
    smoke_fire: shape(({ set, rect }) => { rect(21, 1, 24, 2, S.FIRE_A); rect(22, 0, 23, 1, S.FIRE_B); set(22, 2, S.FIRE_C); set(23, 2, S.FIRE_B); set(21, 0, S.FIRE_A); set(24, 0, S.FIRE_A); }),
    // Founding Resident: a small gold star in the bottom-left corner (fills empty cells, like smoke)
    badge_founder: shape(({ set }) => { [[2, 27], [1, 28], [2, 28], [3, 28], [2, 29]].forEach(([x, y]) => set(x, y, S.STAR)); set(2, 28, S.WHITE); }),
    smoke_bubbles: shape(({ set }) => {
      [[25, 1], [26, 0], [27, 1], [26, 2]].forEach(([x, y]) => set(x, y, S.SMOKE));
      [[29, 3], [30, 2], [31, 3], [30, 4]].forEach(([x, y]) => set(x, y, S.SMOKE)); set(23, 2, S.SMOKE_SH);
    }),
  };

  function animal(kind) {
    return shape(({ set, rect }) => {
      rect(10, 2, 16, 6, S.FUR); rect(11, 1, 15, 1, S.FUR);
      if (kind === 'cat') { set(10, 0, S.FUR_DK); set(10, 1, S.FUR); set(16, 0, S.FUR_DK); set(16, 1, S.FUR); }
      else if (kind === 'frog') { rect(10, 0, 11, 1, S.FUR); rect(15, 0, 16, 1, S.FUR); set(10, 0, S.BLACK); set(16, 0, S.BLACK); }
      else { rect(9, 2, 9, 6, S.FUR_DK); rect(17, 2, 17, 6, S.FUR_DK); set(8, 5, S.FUR_DK); set(18, 5, S.FUR_DK); }
      rect(12, 1, 14, 1, S.FUR_HI);
      if (kind !== 'frog') { set(11, 4, S.BLACK); set(15, 4, S.BLACK); set(13, 5, S.BLACK); set(12, 5, S.FUR_HI); set(14, 5, S.FUR_HI); }
      else rect(12, 5, 14, 5, S.FUR_DK);
      if (kind === 'dalmatian') { set(11, 2, S.FUR_DK); set(15, 3, S.FUR_DK); set(13, 6, S.FUR_DK); }
      rect(11, 7, 12, 7, S.FUR); rect(14, 7, 15, 7, S.FUR); set(11, 7, S.FUR_HI); set(15, 7, S.FUR_HI);
    });
  }

  // glasses: frame (both lenses + bridge + temples) and the left lens interior (right = +12px)
  function lensPixels(frame, x0) {
    const out = [];
    const x1 = x0 + 9, y0 = 15, y1 = 22;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const thin = frame === 'thin', round = frame === 'round';
      const edge = x <= x0 + (thin ? 0 : 1) || x >= x1 - (thin ? 0 : 1) || y === y0 || y === y1;
      const cx = Math.min(x - x0, x1 - x), cy = Math.min(y - y0, y1 - y);
      if (round && cx + cy < 2) continue;
      if (round && cx + cy === 2 && cx < 2) { out.push([x, y, 'f']); continue; }
      out.push([x, y, edge ? 'f' : 'i']);
    }
    return out;
  }
  for (const f of ['thick', 'round', 'thin']) {
    SHAPES['frame_' + f] = shape(({ set, rect }) => {
      for (const x0 of [5, 17]) for (const [x, y, k] of lensPixels(f, x0)) if (k === 'f') set(x, y, S.FRAME);
      rect(15, 17, 16, 18, S.FRAME); set(3, 17, S.FRAME); set(4, 17, S.FRAME); set(27, 17, S.FRAME); set(28, 17, S.FRAME);
    });
    SHAPES['lens_' + f] = shape(({ set }) => { for (const [x, y, k] of lensPixels(f, 5)) if (k === 'i') set(x, y, S.LENS_L); });
  }
  SHAPES.frame_mono = shape(({ set }) => {
    for (const [x, y, k] of lensPixels('thin', 17)) if (k === 'f') set(x, y, S.FRAME);
    set(27, 17, S.FRAME); set(28, 17, S.FRAME);
    [[26, 23], [27, 24], [27, 25], [26, 26]].forEach(([x, y]) => set(x, y, S.FRAME));
  });
  SHAPES.frame_visor = shape(({ set, rect }) => { rect(4, 17, 27, 20, S.FRAME); rect(6, 18, 25, 18, S.LENS_L); set(3, 18, S.FRAME); set(28, 18, S.FRAME); });
  SHAPES.tape = shape(({ rect }) => { rect(15, 16, 16, 19, S.TAPE); });

  // eyes: drawn centred on the left eye (cx=10); the right eye is the same shape +11px
  const EYES = {
    open: ({ set, rect }) => { rect(9, 17, 11, 20, S.BLACK); set(9, 17, S.WHITE); },
    sleepy: ({ rect }) => { rect(9, 19, 11, 20, S.BLACK); rect(9, 18, 11, 18, S.BODY_SH); },
    closed: ({ set, rect }) => { rect(9, 19, 11, 19, S.BLACK); set(8, 18, S.BLACK); set(12, 18, S.BLACK); },
    sparkle: ({ set, rect }) => { rect(9, 17, 11, 20, S.BLACK); set(9, 17, S.WHITE); set(11, 19, S.WHITE); set(10, 18, S.SPARKLE); },
    side: ({ set, rect }) => { rect(10, 17, 12, 20, S.BLACK); set(10, 17, S.WHITE); },
    angryL: ({ set, rect }) => { rect(9, 18, 11, 20, S.BLACK); set(9, 18, S.WHITE); set(8, 16, S.BLACK); set(9, 16, S.BLACK); set(10, 17, S.BLACK); set(11, 17, S.BLACK); },
    angryR: ({ set, rect }) => { rect(9, 18, 11, 20, S.BLACK); set(9, 18, S.WHITE); set(11, 16, S.BLACK); set(12, 16, S.BLACK); set(9, 17, S.BLACK); set(10, 17, S.BLACK); },
    hearts: ({ set, rect }) => { set(9, 17, S.PINK); set(11, 17, S.PINK); rect(9, 18, 11, 18, S.PINK); set(10, 19, S.PINK); },
    dizzy: ({ set }) => { [[9, 17], [11, 17], [10, 18], [9, 19], [11, 19]].forEach(([x, y]) => set(x, y, S.BLACK)); },
    laser: ({ rect }) => { rect(9, 17, 11, 20, S.LASER); rect(10, 18, 10, 19, S.LASER_HI); rect(12, 18, 20, 19, S.LASER); },
    dim: ({ set }) => { set(9, 17, S.DIM_EYE); },
    ghost: ({ set, rect }) => { rect(9, 17, 10, 21, S.BLACK); rect(8, 18, 11, 20, S.BLACK); set(9, 18, S.WHITE); },
    socket: ({ rect }) => { rect(8, 17, 12, 20, S.BLACK); rect(9, 16, 11, 16, S.BLACK); rect(9, 21, 11, 21, S.BLACK); },
  };
  for (const [k, f] of Object.entries(EYES)) SHAPES['eye_' + k] = shape(f);

  // background: 4x4 Bayer-dithered lamp glow + vertical gradient, precomputed as two bitmaps
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const GLOW_BITS = [], GRAD_BITS = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 3, y - 10) / 14, b = BAYER[y % 4][x % 4] / 16;
    GLOW_BITS.push(d < 1 && (1 - d) * 0.75 > b + 0.12 ? 1 : 0);
    GRAD_BITS.push((y / N) * .6 > b ? 1 : 0);
  }

  // ---------------------------------------------------------------- variants -> shape ids
  // Every option compiles to [a, b, c, flags] (NONE = 255). Meaning per trait:
  //   Type: flags 1 = ghost shapes, 2 = skeleton shapes      Glasses: a frame, b lens, c extra; flags 1 dim eyes, 2 hide eyes
  //   Eyes: a left, b right       Topper/Mouth/Shirt/Item/Smoke: a shape
  const FLAG = { ghost: 1, skeleton: 2, dim: 1, hide: 2 };
  const SHAPE_NAMES = Object.keys(SHAPES);
  const sid = n => { const i = SHAPE_NAMES.indexOf(n); if (i < 0) throw new Error('no shape ' + n); return i; };
  function variantOf(k, i) {
    const v = TRAITS[k].opts[i][3] || '';
    switch (TRAITS[k].key) {
      case 'Type': return [NONE, NONE, NONE, v === 'ghost' ? FLAG.ghost : v === 'skeleton' ? FLAG.skeleton : 0];
      case 'Topper': return [v ? sid('topper_' + v) : NONE, NONE, NONE, 0];
      case 'Glasses': {
        const [f, ...mods] = v.split('+');
        return [sid('frame_' + f), mods.includes('lens') ? sid('lens_' + f) : NONE, mods.includes('tape') ? sid('tape') : NONE,
          (mods.includes('dim') ? FLAG.dim : 0) | (mods.includes('hide') ? FLAG.hide : 0)];
      }
      case 'Eyes': { const [l, r] = v.split('/'); return [sid('eye_' + l), sid('eye_' + r), NONE, 0]; }
      case 'Mouth': return [v ? sid('mouth_' + v) : NONE, NONE, NONE, 0];
      case 'Shirt': return [sid('shirt_' + v), NONE, NONE, 0];
      case 'Item': return [v ? sid('item_' + v) : NONE, NONE, NONE, 0];
      case 'Smoke': return [v ? sid('smoke_' + v) : NONE, NONE, NONE, 0];
      default: return [NONE, NONE, NONE, 0];
    }
  }
  const VARIANTS = TRAITS.map((t, k) => t.opts.map((_, i) => variantOf(k, i)));

  // ---------------------------------------------------------------- compose
  // Ordered [shapeId, dx] draw calls — PoonsRenderer.grid() mirrors this line by line.
  function plan(idx) {
    const V = k => VARIANTS[k][idx[k]];
    const tf = V(T.Type)[3], ghost = tf & FLAG.ghost, skel = tf & FLAG.skeleton;
    const calls = [];
    if (ghost) calls.push([sid('ghost_tail'), 0]);
    else calls.push([skel ? sid('shirt_ribs') : V(T.Shirt)[0], 0], [sid('hands'), 0]);
    calls.push([sid('head'), 0], [sid('roof'), 0], [sid('chimney'), 0]);
    if (V(T.Topper)[0] !== NONE) calls.push([V(T.Topper)[0], 0]);
    const g = V(T.Glasses);
    if (!ghost && !skel) {
      calls.push([g[0], 0]);
      if (g[1] !== NONE) calls.push([g[1], 0], [g[1], 12]);
      if (g[2] !== NONE) calls.push([g[2], 0]);
    }
    if (skel) calls.push([sid('eye_socket'), 0], [sid('eye_socket'), 11]);
    else if (ghost) calls.push([sid('eye_ghost'), 0], [sid('eye_ghost'), 11]);
    else if (g[3] & FLAG.hide) { /* visor covers the eyes */ }
    else if (g[3] & FLAG.dim) calls.push([sid('eye_dim'), 0], [sid('eye_dim'), 11]);
    else calls.push([V(T.Eyes)[0], 0], [V(T.Eyes)[1], 11]);
    if (skel) calls.push([sid('nose_skull'), 0], [sid('mouth_teeth'), 0]);
    else if (ghost) calls.push([sid('mouth_oo'), 0]);
    else {
      calls.push([sid('nose'), 0]);
      if (V(T.Mouth)[0] !== NONE) calls.push([V(T.Mouth)[0], 0]);
    }
    if (V(T.Item)[0] !== NONE) calls.push([V(T.Item)[0], 0]);
    return calls;
  }
  function palette(idx) {
    const sp = specialOf(idx);
    if (sp) return sp.palette;
    const p = { ...FIXED };
    TRAITS.forEach((t, k) => t.slots.forEach((s, j) => { p[s] = t.opts[idx[k]][2][j]; }));
    return p;
  }
  function slotGrid(idx, founder = false) {
    const g = new Array(N * N).fill(0);
    for (const [id, dx] of plan(idx)) for (const [x, y, s] of SHAPES[SHAPE_NAMES[id]]) {
      const slot = s === S.LENS_L && dx ? S.LENS_R : s; // right lens takes the LENS_R colour
      if (x + dx < N) g[y * N + x + dx] = slot;
    }
    const out = g.slice();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (g[y * N + x]) continue;
      if ((x > 0 && g[y * N + x - 1]) || (x < N - 1 && g[y * N + x + 1]) || (y > 0 && g[(y - 1) * N + x]) || (y < N - 1 && g[(y + 1) * N + x])) out[y * N + x] = S.INK;
    }
    const smoke = VARIANTS[T.Smoke][idx[T.Smoke]][0];
    if (smoke !== NONE) for (const [x, y, s] of SHAPES[SHAPE_NAMES[smoke]]) if (!out[y * N + x]) out[y * N + x] = s;
    if (founder) for (const [x, y, s] of SHAPES.badge_founder) if (!out[y * N + x]) out[y * N + x] = s;
    for (let i = 0; i < N * N; i++) if (!out[i]) out[i] = GLOW_BITS[i] ? S.GLOW : GRAD_BITS[i] ? S.BG_B : S.BG_A;
    return out;
  }

  function svg(seed) {
    const idx = traitsFor(seed), g = slotGrid(idx, isFounder(seed)), pal = palette(idx);
    let body = '';
    for (let s = 1; s < SLOT_COUNT; s++) {
      let d = '';
      for (let y = 0; y < N; y++) for (let x = 0; x < N;) {
        if (g[y * N + x] !== s) { x++; continue; }
        let e = x + 1; while (e < N && g[y * N + e] === s) e++;
        d += `M${x} ${y}h${e - x}v1h-${e - x}z`; x = e;
      }
      if (d) body += `<path fill="${pal[s]}" d="${d}"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${body}</svg>`;
  }

  // Random seed for previews (on chain: keccak(wallet, blockhash) with bit 255 = founder flag).
  function randomSeed(founder = false) {
    let s = 0n; for (let i = 0; i < 8; i++) s = (s << 32n) | BigInt(Math.floor(Math.random() * 4294967296));
    return (s & (FOUNDER_BIT - 1n)) | (founder ? FOUNDER_BIT : 0n);
  }

  const api = { N, NONE, S, SLOT_NAMES, SLOT_COUNT, FIXED, TRAITS, SPECIALS, SHAPES, SHAPE_NAMES, VARIANTS, POINTS, TIERS, TIER_MIN,
    GLOW_BITS, GRAD_BITS, FOUNDER_BIT, isFounder, traitsFor, traitLabels, rarity, plan, palette, slotGrid, svg, randomSeed };
  if (typeof module !== 'undefined') module.exports = api; else root.PoonsArt = api;
})(typeof window !== 'undefined' ? window : globalThis);
