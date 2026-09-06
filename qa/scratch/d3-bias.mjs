/** Pooled expected-vs-observed with a binomial test, per arm and per contest state. */
import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(new URL("./d3-rows.json", import.meta.url))).filter((r) => r.outcome === "SIGN");

// Normal approximation to the Poisson-binomial: expected = sum p_i, var = sum p_i(1-p_i)
function poolTest(sel, arm, name) {
  if (!sel.length) return;
  const exp = sel.reduce((a, r) => a + r.percent / 100, 0);
  const varr = sel.reduce((a, r) => a + (r.percent / 100) * (1 - r.percent / 100), 0);
  const obs = sel.reduce((a, r) => a + r[arm], 0);
  const z = varr > 0 ? (obs - exp) / Math.sqrt(varr) : 0;
  console.log(`${name.padEnd(46)} n=${String(sel.length).padStart(5)}  expected ${exp.toFixed(1).padStart(7)}  observed ${String(obs).padStart(5)}  z=${z.toFixed(2).padStart(7)}  obs% ${(100 * obs / sel.length).toFixed(1).padStart(5)}  exp% ${(100 * exp / sel.length).toFixed(1).padStart(5)}`);
}

console.log("--- all SIGN rows ---");
for (const arm of ["pure", "live"]) poolTest(rows, arm, `${arm} all`);

console.log("\n--- posted 30-79% only (the mid range, where the PURE gaps sit) ---");
const mid = rows.filter((r) => r.percent >= 30 && r.percent < 80);
for (const arm of ["pure", "live"]) {
  poolTest(mid.filter((r) => !r.contested), arm, `${arm} mid, uncontested`);
  poolTest(mid.filter((r) => r.contested), arm, `${arm} mid, contested`);
}

console.log("\n--- posted >0 only ---");
const pos = rows.filter((r) => r.percent > 0);
for (const arm of ["pure", "live"]) {
  poolTest(pos.filter((r) => !r.contested), arm, `${arm} posted>0, uncontested`);
  poolTest(pos.filter((r) => r.contested), arm, `${arm} posted>0, contested`);
}

console.log("\n--- the 0-9% mass, LIVE, split by contest state ---");
const low = rows.filter((r) => r.percent < 10);
for (const c of [false, true]) {
  const s = low.filter((r) => r.contested === c);
  console.log(`contested=${c} n=${s.length} PURE ${(100 * s.reduce((a, r) => a + r.pure, 0) / s.length).toFixed(1)}%  LIVE ${(100 * s.reduce((a, r) => a + r.live, 0) / s.length).toFixed(1)}%`);
}

console.log("\n--- per seed, PURE only, posted>0 ---");
for (const seed of [...new Set(rows.map((r) => r.seed))]) {
  poolTest(pos.filter((r) => r.seed === seed), "pure", `  ${seed}`);
}
console.log("\n--- per seed, LIVE only, posted>0 ---");
for (const seed of [...new Set(rows.map((r) => r.seed))]) {
  poolTest(pos.filter((r) => r.seed === seed), "live", `  ${seed}`);
}
