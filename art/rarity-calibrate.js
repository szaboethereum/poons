// Measures rarity-score percentiles over regular Poons and prints tier floors for TIER_MIN.
// Target split of regular Poons: Epic top 2%, Rare next 8%, Uncommon next 25%, Common the rest.
const A = require('./poons-art.js');
const n = 200000, scores = [];
let specials = 0;
for (let i = 0; i < n; i++) {
  const seed = A.randomSeed(), idx = A.traitsFor(seed);
  if (idx[0] !== 0) { specials++; continue; }
  scores.push(A.rarity(seed).score);
}
scores.sort((a, b) => a - b);
const at = q => scores[Math.floor(q * scores.length)];
console.log({ uncommon: at(0.65), rare: at(0.90), epic: at(0.98), specialsPct: (100 * specials / n).toFixed(2) });
const tiers = {};
for (let i = 0; i < 20000; i++) { const t = A.rarity(A.randomSeed()).tier; tiers[t] = (tiers[t] || 0) + 1; }
console.log('current TIER_MIN split per 3333:', Object.fromEntries(Object.entries(tiers).map(([k, v]) => [k, Math.round(v / 20000 * 3333)])));
