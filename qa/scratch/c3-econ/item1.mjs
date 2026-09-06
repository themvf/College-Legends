/**
 * Brief C item 1 — "winning must pay more than losing", three ways.
 *
 *  (a) The charter's literal test: pooled across the league, the worst >=9-win
 *      season must beat the best >=9-loss season.
 *  (b) Within tier, which removes the confound that a POWER program's bad year
 *      still turns over three times a LOW program's good one.
 *  (c) Within program: the same program's winning seasons against its own
 *      losing seasons. This is the cleanest form of the invariant — it holds
 *      everything except the record constant.
 *
 * Also reports the season-1 bands against the figures in game-balance.md §3.
 */
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
const money = (n) => n === null ? "—" : (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`);
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const rows = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(f, "utf8"));
  for (const r of d.rows) rows.push({ ...r, file: f });
}
const change = (r) => r.budget - r.budgetStart;
const valid = rows.filter((r) => r.budgetStart !== null && r.wins !== null);
console.log(`n = ${valid.length} program-seasons from ${files.join(", ")}`);

// (a) pooled, per season
console.log("\n(a) POOLED across the league, per season");
let fails = 0;
const seasons = [...new Set(valid.map((r) => r.season))].sort();
for (const season of seasons) {
  const s = valid.filter((r) => r.season === season);
  const w = s.filter((r) => r.wins >= 9), l = s.filter((r) => r.losses >= 9);
  if (!w.length || !l.length) continue;
  const worstWin = w.reduce((a, b) => change(a) < change(b) ? a : b);
  const bestLose = l.reduce((a, b) => change(a) > change(b) ? a : b);
  const pass = change(worstWin) > change(bestLose);
  if (!pass) fails += 1;
  console.log(`${season} worst win ${money(change(worstWin)).padStart(9)} (${worstWin.tier} ${worstWin.wins}-${worstWin.losses})`
    + `  vs best loss ${money(change(bestLose)).padStart(9)} (${bestLose.tier} ${bestLose.wins}-${bestLose.losses})`
    + `  ${pass ? "pass" : "FAIL"}`);
}
console.log(`pooled failures: ${fails} of ${seasons.length} seasons`);

// (b) within tier
console.log("\n(b) WITHIN TIER, per season");
for (const tier of ["LOW", "MID", "POWER"]) {
  let tf = 0, tn = 0;
  const detail = [];
  for (const season of seasons) {
    const s = valid.filter((r) => r.season === season && r.tier === tier);
    const w = s.filter((r) => r.wins >= 9), l = s.filter((r) => r.losses >= 9);
    if (!w.length || !l.length) continue;
    tn += 1;
    const worstWin = Math.min(...w.map(change)), bestLose = Math.max(...l.map(change));
    if (!(worstWin > bestLose)) { tf += 1; detail.push(`${season}: ${money(worstWin)} vs ${money(bestLose)}`); }
  }
  console.log(`  ${tier.padEnd(5)} failures ${tf} of ${tn} seasons with both groups present`);
  for (const d of detail.slice(0, 6)) console.log(`      ${d}`);
}

// (c) within program
console.log("\n(c) WITHIN PROGRAM, pooled over the whole run");
const byProgram = new Map();
for (const r of valid) {
  const k = `${r.file}|${r.programId}`;
  const b = byProgram.get(k) ?? { tier: r.tier, win: [], lose: [] };
  if (r.wins >= 9) b.win.push(change(r));
  if (r.losses >= 9) b.lose.push(change(r));
  byProgram.set(k, b);
}
let pf = 0, pn = 0;
for (const [k, b] of byProgram) {
  if (!b.win.length || !b.lose.length) continue;
  pn += 1;
  const worst = Math.min(...b.win), best = Math.max(...b.lose);
  if (!(worst > best)) { pf += 1; if (pf <= 8) console.log(`  FAIL ${k} ${b.tier}: worst winning ${money(worst)} (n=${b.win.length}) vs best losing ${money(best)} (n=${b.lose.length})`); }
}
console.log(`  programs failing their own within-program test: ${pf} of ${pn}`);

// medians within program
const deltas = [];
for (const [, b] of byProgram) {
  if (!b.win.length || !b.lose.length) continue;
  deltas.push(median(b.win) - median(b.lose));
}
console.log(`  median(winning) - median(losing), per program: median ${money(median(deltas))}, negative for ${deltas.filter((d) => d < 0).length} of ${deltas.length}`);

// (d) the documented season-1 band
console.log("\n(d) Season 1 bands against game-balance.md §3 (24 programs)");
for (const f of files) {
  const s = valid.filter((r) => r.file === f && r.season === Math.min(...valid.filter((x) => x.file === f).map((x) => x.season)));
  const w = s.filter((r) => r.wins >= 9).map(change), l = s.filter((r) => r.losses >= 9).map(change);
  console.log(`  ${f}: winning n=${w.length} ${money(Math.min(...w))} .. ${money(Math.max(...w))}   (doc: +$1.3M..+$12.0M)`);
  console.log(`  ${f}: losing  n=${l.length} ${money(Math.min(...l))} .. ${money(Math.max(...l))}   (doc: -$0.6M..-$1.8M)`);
  const wf = s.filter((r) => r.wins >= 9).map((r) => r.net), lf = s.filter((r) => r.losses >= 9).map((r) => r.net);
  console.log(`     WEEKLY_FINANCES net only (no postseason/booster cash): winning ${money(Math.min(...wf))}..${money(Math.max(...wf))}, losing ${money(Math.min(...lf))}..${money(Math.max(...lf))}`);
}

// (e) The same, on WEEKLY_FINANCES net alone — is the postseason cash the cause?
console.log("\n(e) Pooled test on WEEKLY_FINANCES net alone (excludes postseason bonuses, donors, facility spend)");
let nf = 0, nn = 0;
for (const season of seasons) {
  const s = valid.filter((r) => r.season === season);
  const w = s.filter((r) => r.wins >= 9).map((r) => r.net), l = s.filter((r) => r.losses >= 9).map((r) => r.net);
  if (!w.length || !l.length) continue;
  nn += 1;
  if (!(Math.min(...w) > Math.max(...l))) nf += 1;
}
console.log(`  pooled failures on net alone: ${nf} of ${nn} seasons`);
for (const tier of ["LOW", "MID", "POWER"]) {
  let tf = 0, tn = 0;
  for (const season of seasons) {
    const s = valid.filter((r) => r.season === season && r.tier === tier);
    const w = s.filter((r) => r.wins >= 9).map((r) => r.net), l = s.filter((r) => r.losses >= 9).map((r) => r.net);
    if (!w.length || !l.length) continue;
    tn += 1;
    if (!(Math.min(...w) > Math.max(...l))) tf += 1;
  }
  console.log(`  ${tier.padEnd(5)} within-tier failures on net alone: ${tf} of ${tn}`);
}
