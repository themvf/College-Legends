import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(new URL("./d3b-rows.json", import.meta.url)));

const bucket = (p) => Math.min(9, Math.floor(p / 10));
const label = (b) => `${b * 10}-${b * 10 + 9}%`;

function table(sel, arm) {
  const buckets = Array.from({ length: 10 }, () => ({ n: 0, hits: 0, sumP: 0 }));
  for (const r of sel) {
    const b = buckets[bucket(r.percent)];
    b.n += 1; b.hits += r[arm]; b.sumP += r.percent;
  }
  return buckets.map((b, i) => ({
    decile: label(i), n: b.n,
    meanPosted: b.n ? +(b.sumP / b.n).toFixed(1) : null,
    observed: b.n ? +(100 * b.hits / b.n).toFixed(1) : null,
    gap: b.n ? +(100 * b.hits / b.n - b.sumP / b.n).toFixed(1) : null
  }));
}
const show = (title, t) => {
  console.log(`\n### ${title}`);
  console.log("| decile | n | mean posted | observed | gap |");
  console.log("|---|---|---|---|---|");
  for (const r of t) console.log(`| ${r.decile} | ${r.n} | ${r.meanPosted ?? "-"} | ${r.observed ?? "-"} | ${r.gap ?? "-"} |`);
};

console.log("rows (muted programs only, SIGN outcome):", rows.length);
const mp = rows.reduce((a, r) => a + r.percent, 0) / rows.length;
console.log(`pooled mean posted ${mp.toFixed(1)}  observed RIVALS-ONLY ${(100 * rows.reduce((a, r) => a + r.rivalsOnly, 0) / rows.length).toFixed(1)}  observed LIVE(own commands restored) ${(100 * rows.reduce((a, r) => a + r.live, 0) / rows.length).toFixed(1)}`);

show("RIVALS-ONLY arm — muted program issues no recruiting commands; rivals issue theirs", table(rows, "rivalsOnly"));
show("LIVE arm — same programs, own recruiting commands restored", table(rows, "live"));

// Monotonicity in each arm, n>=20
for (const arm of ["rivalsOnly", "live"]) {
  const t = table(rows, arm).filter((r) => r.n >= 20);
  const obs = t.map((r) => r.observed);
  let mono = true;
  for (let i = 1; i < obs.length; i += 1) if (obs[i] < obs[i - 1]) mono = false;
  console.log(`\n${arm} monotone (n>=20 deciles): ${mono} (${obs.join(" -> ")})`);
}

// Per seed
console.log("\n| seed | n | mean posted | rivals-only | live |");
console.log("|---|---|---|---|---|");
const bySeed = {};
for (const r of rows) (bySeed[r.seed] ??= []).push(r);
for (const [s, rs] of Object.entries(bySeed)) {
  console.log(`| ${s} | ${rs.length} | ${(rs.reduce((a, r) => a + r.percent, 0) / rs.length).toFixed(1)} | ${(100 * rs.reduce((a, r) => a + r.rivalsOnly, 0) / rs.length).toFixed(1)} | ${(100 * rs.reduce((a, r) => a + r.live, 0) / rs.length).toFixed(1)} |`);
}

// Openings
const op = JSON.parse(readFileSync(new URL("./d3b-openings.json", import.meta.url)));
const zero = op.filter((r) => r.openings <= 0).length;
console.log(`\nopenings rows ${op.length}; program-weeks with <=0 projected openings: ${zero} (${(100 * zero / op.length).toFixed(1)}%)`);
