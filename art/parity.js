// Compares on-chain output (dumped by `forge test --match-test test_dumpParity`) with the JS engine:
// SVG byte-for-byte, plus rarity tier + score. Seeds 64..95 force each special type.
const fs = require('fs'), path = require('path'), { keccak256, encodeAbiParameters } = require('viem');
const A = require('./poons-art.js');
const dir = path.join(__dirname, '..', 'contracts', 'out-parity');
const TYPE_VALUES = [9851n, 9901n, 9936n, 9966n, 9991n];
let ok = 0, bad = 0;
for (let i = 0; i < 96; i++) {
  let seed = BigInt(keccak256(encodeAbiParameters([{ type: 'uint256' }], [BigInt(i)])));
  if (i >= 64) seed = ((seed >> 16n) << 16n) | TYPE_VALUES[i % 5];
  const svgOk = fs.readFileSync(path.join(dir, i + '.svg'), 'utf8') === A.svg(seed);
  const r = A.rarity(seed);
  const rarOk = fs.readFileSync(path.join(dir, i + '.txt'), 'utf8') === `${A.TIERS.indexOf(r.tier)} ${r.score}`;
  if (svgOk && rarOk) ok++; else { bad++; if (bad < 4) console.log('MISMATCH seed', i, { svgOk, rarOk }); }
}
console.log(`parity: ${ok} match, ${bad} mismatch`);
process.exit(bad ? 1 : 0);
