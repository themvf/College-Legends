import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(new URL("./d3-rows.json", import.meta.url)));

const bucket = (p) => Math.min(9, Math.floor(p / 10));
const label = (b) => `${b * 10}-${b * 10 + 9}%`;

function table(rows, arm, outcome) {
  const sel = rows.filter((r) => r.outcome === outcome);
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

console.log("total observations:", rows.length);
const bySeed = {};
for (const r of rows) (bySeed[r.seed] ??= []).push(r);
console.log("by seed:", Object.entries(bySeed).map(([k, v]) => `${k}=${v.length}`).join(" "));
console.log("SIGN:", rows.filter(r => r.outcome === "SIGN").length, "HOLD:", rows.filter(r => r.outcome === "HOLD").length);
console.log("contested SIGN:", rows.filter(r => r.outcome === "SIGN" && r.contested).length);

show("SIGN — PURE arm (same state, advanced with no commands)", table(rows, "pure", "SIGN"));
show("SIGN — LIVE arm (advanced with the rival planner's commands)", table(rows, "live", "SIGN"));
show("HOLD — PURE arm", table(rows, "pure", "HOLD"));
show("HOLD — LIVE arm", table(rows, "live", "HOLD"));

// Uncontested SIGN rows: the odds function says these are exact.
const unc = rows.filter((r) => r.outcome === "SIGN" && !r.contested);
show(`SIGN, uncontested only (n=${unc.length}) — PURE`, table(unc, "pure", "SIGN"));

// Per-seed pooled Brier-ish summary and monotonicity
for (const arm of ["pure", "live"]) {
  const t = table(rows, arm, "SIGN").filter((r) => r.n >= 20);
  const obs = t.map((r) => r.observed);
  let mono = true;
  for (let i = 1; i < obs.length; i += 1) if (obs[i] < obs[i - 1]) mono = false;
  console.log(`\n${arm.toUpperCase()} SIGN monotone across deciles with n>=20: ${mono} (${obs.join(" -> ")})`);
  const worst = t.reduce((w, r) => Math.abs(r.gap) > Math.abs(w.gap) ? r : w, t[0]);
  console.log(`${arm.toUpperCase()} worst decile gap: ${worst.decile} n=${worst.n} posted=${worst.meanPosted} observed=${worst.observed} gap=${worst.gap}`);
}

// Per-seed reproduction of the headline gap
console.log("\n### Per-seed, SIGN pooled overall (posted mean vs observed)");
console.log("| seed | n | mean posted | observed PURE | observed LIVE |");
console.log("|---|---|---|---|---|");
for (const [seed, rs] of Object.entries(bySeed)) {
  const s = rs.filter((r) => r.outcome === "SIGN");
  const mp = s.reduce((a, r) => a + r.percent, 0) / s.length;
  const op = 100 * s.reduce((a, r) => a + r.pure, 0) / s.length;
  const ol = 100 * s.reduce((a, r) => a + r.live, 0) / s.length;
  console.log(`| ${seed} | ${s.length} | ${mp.toFixed(1)} | ${op.toFixed(1)} | ${ol.toFixed(1)} |`);
}

// Week breakdown, because the threshold and required lead move with the week.
console.log("\n### SIGN by week");
console.log("| week | n | mean posted | observed PURE | observed LIVE |");
console.log("|---|---|---|---|---|");
const weeks = [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b);
for (const w of weeks) {
  const s = rows.filter((r) => r.outcome === "SIGN" && r.week === w);
  if (!s.length) continue;
  const mp = s.reduce((a, r) => a + r.percent, 0) / s.length;
  console.log(`| ${w} | ${s.length} | ${mp.toFixed(1)} | ${(100 * s.reduce((a, r) => a + r.pure, 0) / s.length).toFixed(1)} | ${(100 * s.reduce((a, r) => a + r.live, 0) / s.length).toFixed(1)} |`);
}
