/**
 * Monotonicity, with the uncertainty stated. A decile inversion of 4 points on
 * n=40 is noise; the brief calls a monotonicity break a bug, so it has to be
 * distinguished from sampling.
 */
import { readFileSync } from "node:fs";
const rows = JSON.parse(readFileSync(new URL("./d3-rows.json", import.meta.url)))
  .filter((r) => r.outcome === "SIGN");

const wilson = (hits, n) => {
  if (!n) return [null, null];
  const z = 1.96, p = hits / n;
  const d = 1 + z * z / n;
  const c = p + z * z / (2 * n);
  const s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [100 * (c - s) / d, 100 * (c + s) / d];
};

function buckets(sel, edges, arm) {
  return edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1];
    const b = sel.filter((r) => r.percent >= lo && r.percent < hi);
    const hits = b.reduce((a, r) => a + r[arm], 0);
    const [l, u] = wilson(hits, b.length);
    return {
      band: `${lo}-${hi - 1}%`, n: b.length,
      posted: b.length ? +(b.reduce((a, r) => a + r.percent, 0) / b.length).toFixed(1) : null,
      observed: b.length ? +(100 * hits / b.length).toFixed(1) : null,
      ci: b.length ? `${l.toFixed(1)}–${u.toFixed(1)}` : null,
      gap: b.length ? +(100 * hits / b.length - b.reduce((a, r) => a + r.percent, 0) / b.length).toFixed(1) : null
    };
  });
}

const show = (title, t) => {
  console.log(`\n### ${title}`);
  console.log("| band | n | mean posted | observed | 95% CI | gap |");
  console.log("|---|---|---|---|---|---|");
  for (const r of t) console.log(`| ${r.band} | ${r.n} | ${r.posted ?? "-"} | ${r.observed ?? "-"} | ${r.ci ?? "-"} | ${r.gap ?? "-"} |`);
  const obs = t.filter((r) => r.n >= 20).map((r) => r.observed);
  let breaks = [];
  for (let i = 1; i < obs.length; i += 1) if (obs[i] < obs[i - 1]) breaks.push(`${t.filter(r => r.n >= 20)[i - 1].band}=${obs[i - 1]} > ${t.filter(r => r.n >= 20)[i].band}=${obs[i]}`);
  console.log(`monotone: ${breaks.length === 0}${breaks.length ? " — inversions: " + breaks.join("; ") : ""}`);
};

// Deciles above the 0-9 mass, which is 89% of rows and swamps everything.
const DEC = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 101];
// Coarser bands, where n is enough for the CI to mean something.
const QUINT = [0, 10, 30, 50, 70, 101];

for (const arm of ["pure", "live"]) {
  show(`${arm.toUpperCase()} — deciles`, buckets(rows, DEC, arm));
  show(`${arm.toUpperCase()} — coarse bands`, buckets(rows, QUINT, arm));
}

// Rank agreement: does a higher posted number mean a higher outcome rate?
for (const arm of ["pure", "live"]) {
  const sel = rows.filter((r) => r.percent > 0);
  // point-biserial correlation between posted percent and outcome
  const n = sel.length;
  const mx = sel.reduce((a, r) => a + r.percent, 0) / n;
  const my = sel.reduce((a, r) => a + r[arm], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const r of sel) { const dx = r.percent - mx, dy = r[arm] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  console.log(`\n${arm.toUpperCase()} point-biserial r (posted>0 only, n=${n}): ${(sxy / Math.sqrt(sxx * syy)).toFixed(3)}`);
}

// Uncontested rows: the docstring calls these exact.
const unc = rows.filter((r) => !r.contested);
show(`PURE — uncontested only (docstring: "an uncontested one is exact"), n=${unc.length}`, buckets(unc, DEC, "pure"));
const con = rows.filter((r) => r.contested);
show(`PURE — contested only (docstring: real chance is at or below posted), n=${con.length}`, buckets(con, DEC, "pure"));
