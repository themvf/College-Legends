/**
 * Is the mild PURE shortfall an openings-exhaustion effect?
 *
 * `resolveRecruitingMarket` decrements `openingsByProgram` as contests resolve
 * and skips a winner whose openings have run out (index.ts:3642). `prospectOdds`
 * prices each row independently, so a program with one opening and three rows at
 * 60% is posted 60/60/60 while the engine can only give it one of the three.
 *
 * Test, from the D3 rows alone: group SIGN rows by (seed, week, program), let
 * E = sum of posted probabilities for that program-week and O = the number it
 * actually took in the PURE arm. If exhaustion is the cause, the shortfall
 * O - E should grow with E.
 */
import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(new URL("./d3-rows.json", import.meta.url))).filter((r) => r.outcome === "SIGN");

const byPW = new Map();
for (const r of rows) {
  const k = `${r.seed}|${r.week}|${r.programId}`;
  const g = byPW.get(k) ?? { E: 0, O: 0, n: 0 };
  g.E += r.percent / 100; g.O += r.pure; g.n += 1;
  byPW.set(k, g);
}
const groups = [...byPW.values()];
const bands = [[0, 0.5], [0.5, 1], [1, 2], [2, 3], [3, 5], [5, 1e9]];
console.log("| expected wins this week (sum of posted p) | program-weeks | expected | observed | shortfall | shortfall per expected win |");
console.log("|---|---|---|---|---|---|");
for (const [lo, hi] of bands) {
  const g = groups.filter((x) => x.E >= lo && x.E < hi);
  if (!g.length) continue;
  const E = g.reduce((a, x) => a + x.E, 0), O = g.reduce((a, x) => a + x.O, 0);
  console.log(`| ${lo}–${hi === 1e9 ? "∞" : hi} | ${g.length} | ${E.toFixed(1)} | ${O} | ${(O - E).toFixed(1)} | ${(E > 0 ? (O - E) / E : 0).toFixed(3)} |`);
}
console.log(`\ntotal program-weeks with at least one posted SIGN row: ${groups.length}`);
console.log(`program-weeks where E > 1 (more than one expected win): ${groups.filter((g) => g.E > 1).length}`);
