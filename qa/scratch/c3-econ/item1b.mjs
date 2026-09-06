/**
 * Brief C item 1, controlled.
 *
 * The charter's literal min-vs-max test is confounded two ways over a long run:
 * program size (a POWER bad year turns over more than a LOW good year) and
 * calendar (budgets grow ~10x over twenty seasons, so a losing 2044 out-earns a
 * winning 2030 for the same program). This file removes both.
 *
 *  1. Adjacent-season pairs for the same program: does more wins than last year
 *     mean more money than last year?
 *  2. Operating margin (WEEKLY_FINANCES net / revenue) by wins.
 *  3. Budget change normalised by the season's own revenue, by wins.
 */
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
const money = (n) => Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`;
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const rows = [];
for (const f of files) for (const r of JSON.parse(readFileSync(f, "utf8")).rows) rows.push({ ...r, file: f });
const valid = rows.filter((r) => r.budgetStart !== null && r.wins !== null && r.revenue > 0);
const change = (r) => r.budget - r.budgetStart;

// ---- 1. adjacent-season pairs, same program --------------------------------
const key = (r) => `${r.file}|${r.programId}`;
const byProgram = new Map();
for (const r of valid) { const b = byProgram.get(key(r)) ?? []; b.push(r); byProgram.set(key(r), b); }
let agree = 0, disagree = 0, tied = 0;
const pairDeltas = [];
for (const [, list] of byProgram) {
  list.sort((a, b) => a.season - b.season);
  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1], cur = list[i];
    const dw = cur.wins - prev.wins;
    if (dw === 0) continue;
    // Normalise out the calendar: compare each season's change against its own
    // revenue, so a bigger program in a later year is not automatically ahead.
    const dm = change(cur) / cur.revenue - change(prev) / prev.revenue;
    pairDeltas.push({ dw, dm, tier: cur.tier });
    if (dm === 0) tied += 1; else if ((dw > 0) === (dm > 0)) agree += 1; else disagree += 1;
  }
}
console.log(`1. Adjacent-season pairs for the same program, n = ${agree + disagree + tied}`);
console.log(`   more wins than last year also meant a better year financially: ${agree} (${(100 * agree / (agree + disagree)).toFixed(1)}%)`);
console.log(`   more wins but a worse year: ${disagree}`);
for (const tier of ["LOW", "MID", "POWER"]) {
  const t = pairDeltas.filter((p) => p.tier === tier);
  const a = t.filter((p) => (p.dw > 0) === (p.dm > 0)).length;
  console.log(`   ${tier.padEnd(5)} ${a}/${t.length} = ${(100 * a / t.length).toFixed(1)}%`);
}

// ---- 2. operating margin by wins -------------------------------------------
console.log("\n2. Operating margin (WEEKLY_FINANCES net / revenue) by wins, all tiers pooled");
console.log("   wins |    n | median margin | median budget change / revenue");
const buckets = new Map();
for (const r of valid) { const b = buckets.get(r.wins) ?? []; b.push(r); buckets.set(r.wins, b); }
for (const w of [...buckets.keys()].sort((a, b) => a - b)) {
  const b = buckets.get(w);
  console.log(`   ${String(w).padStart(4)} | ${String(b.length).padStart(4)} | `
    + `${(100 * median(b.map((r) => r.net / r.revenue))).toFixed(1).padStart(9)}% | `
    + `${(100 * median(b.map((r) => change(r) / r.revenue))).toFixed(1).padStart(9)}%`);
}

// ---- 3. within tier and era ------------------------------------------------
console.log("\n3. Within tier, within a 4-season era: worst >=9-win vs best >=9-loss");
const seasons = [...new Set(valid.map((r) => r.season))].sort();
const eras = [];
for (let i = 0; i < seasons.length; i += 4) eras.push(seasons.slice(i, i + 4));
let fails = 0, n = 0;
for (const era of eras) {
  for (const tier of ["LOW", "MID", "POWER"]) {
    const s = valid.filter((r) => era.includes(r.season) && r.tier === tier);
    const w = s.filter((r) => r.wins >= 9), l = s.filter((r) => r.losses >= 9);
    if (!w.length || !l.length) continue;
    n += 1;
    const worst = Math.min(...w.map(change)), best = Math.max(...l.map(change));
    const pass = worst > best;
    if (!pass) fails += 1;
    console.log(`   ${era[0]}-${era.at(-1)} ${tier.padEnd(5)} worst win ${money(worst).padStart(9)} (n=${w.length}) vs best loss ${money(best).padStart(9)} (n=${l.length})  ${pass ? "pass" : "FAIL"}`);
  }
}
console.log(`   failures: ${fails} of ${n} tier-eras`);

// ---- 4. the extreme cases: who is the best losing season? ------------------
console.log("\n4. The ten most profitable losing seasons (>=9 losses)");
const losers = valid.filter((r) => r.losses >= 9).sort((a, b) => change(b) - change(a));
for (const r of losers.slice(0, 10)) {
  console.log(`   ${r.file.slice(5, 6)} ${r.season} ${r.tier.padEnd(5)} ${r.programId.padEnd(11)} ${r.wins}-${r.losses}`
    + ` change ${money(change(r)).padStart(9)} · net ${money(r.net).padStart(9)}`
    + ` · bonus ${money(r.bonusCash).padStart(8)} · booster ${money(r.boosterCash).padStart(8)}`
    + ` · facility spend ${money(r.facilitySpend).padStart(8)} · revenue ${money(r.revenue).padStart(9)}`
    + ` · margin ${(100 * r.net / r.revenue).toFixed(1)}%`);
}
console.log("\n   The ten least profitable winning seasons (>=9 wins)");
const winners = valid.filter((r) => r.wins >= 9).sort((a, b) => change(a) - change(b));
for (const r of winners.slice(0, 10)) {
  console.log(`   ${r.file.slice(5, 6)} ${r.season} ${r.tier.padEnd(5)} ${r.programId.padEnd(11)} ${r.wins}-${r.losses}`
    + ` change ${money(change(r)).padStart(9)} · net ${money(r.net).padStart(9)}`
    + ` · bonus ${money(r.bonusCash).padStart(8)} · booster ${money(r.boosterCash).padStart(8)}`
    + ` · facility spend ${money(r.facilitySpend).padStart(8)} · revenue ${money(r.revenue).padStart(9)}`
    + ` · margin ${(100 * r.net / r.revenue).toFixed(1)}%`);
}
