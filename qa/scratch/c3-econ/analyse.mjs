/**
 * Brief C analysis. Reads one or more run.mjs outputs and prints the tables
 * the report needs: the series per tier per season, the winning-vs-losing
 * split, expense composition, the recruiting/NIL drain, and the reconciliation
 * and posted-versus-charged summaries.
 *
 *   node analyse.mjs long-a.json long-b.json
 */
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
const TIERS = ["LOW", "MID", "POWER"];
const money = (n) => (n === null || n === undefined || !Number.isFinite(n)) ? "—"
  : (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : "—";

for (const file of files) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const rows = d.rows;
  const seasons = [...new Set(rows.map((r) => r.season))].sort();
  console.log(`\n${"=".repeat(78)}`);
  console.log(`${file} · seed ${d.seed} · ${d.programs} programs · ${seasons.length} seasons`
    + `${d.reserveMultiplier !== 1 ? ` · reserve x${d.reserveMultiplier}` : ""}`
    + `${d.partial ? " · PARTIAL" : ""}`);
  console.log("=".repeat(78));

  // ---- 1. Winning must pay more than losing ------------------------------
  console.log("\n## 1. Winning vs losing — budget change over the season");
  console.log("season | n win(>=9W) | worst winning | best losing | n lose(>=9L) | PASS?");
  let failures = 0;
  const allWin = [], allLose = [];
  for (const season of seasons) {
    const sr = rows.filter((r) => r.season === season && r.budgetStart !== null && r.wins !== null);
    const change = (r) => r.budget - r.budgetStart;
    const winners = sr.filter((r) => r.wins >= 9).map(change);
    const losers = sr.filter((r) => r.losses >= 9).map(change);
    if (!winners.length || !losers.length) { console.log(`${season} | ${winners.length} | — | — | ${losers.length} | (no split)`); continue; }
    const worstWin = Math.min(...winners), bestLose = Math.max(...losers);
    allWin.push(...winners); allLose.push(...losers);
    const pass = worstWin > bestLose;
    if (!pass) failures += 1;
    console.log(`${season} | ${String(winners.length).padStart(2)} | ${money(worstWin).padStart(9)} | ${money(bestLose).padStart(9)} | ${String(losers.length).padStart(2)} | ${pass ? "pass" : "**FAIL**"}`);
  }
  console.log(`seasons failing the invariant: ${failures} of ${seasons.length}`);
  if (allWin.length && allLose.length) {
    console.log(`pooled: winning n=${allWin.length} median ${money(median(allWin))} range ${money(Math.min(...allWin))}..${money(Math.max(...allWin))}`);
    console.log(`pooled: losing  n=${allLose.length} median ${money(median(allLose))} range ${money(Math.min(...allLose))}..${money(Math.max(...allLose))}`);
  }

  // A finer cut: budget change by win bucket, pooled over all seasons.
  console.log("\n   budget change by wins, pooled over every season:");
  console.log("   wins | n | median change | median weekly net");
  const buckets = new Map();
  for (const r of rows) {
    if (r.wins === null || r.budgetStart === null) continue;
    const b = buckets.get(r.wins) ?? [];
    b.push({ change: r.budget - r.budgetStart, weekly: r.weeks ? r.net / r.weeks : 0 });
    buckets.set(r.wins, b);
  }
  for (const w of [...buckets.keys()].sort((a, b) => a - b)) {
    const b = buckets.get(w);
    console.log(`   ${String(w).padStart(4)} | ${String(b.length).padStart(4)} | ${money(median(b.map((x) => x.change))).padStart(9)} | ${money(median(b.map((x) => x.weekly))).padStart(8)}`);
  }

  // ---- 2. The series ------------------------------------------------------
  console.log("\n## 2. Series per tier per season");
  console.log("season | tier  |  n | median budget | median weekly net | insolvent | median revenue/wk");
  for (const season of seasons) {
    for (const tier of TIERS) {
      const sr = rows.filter((r) => r.season === season && r.tier === tier);
      if (!sr.length) continue;
      const insolvent = sr.filter((r) => r.budget < 0).length;
      console.log(`${season} | ${tier.padEnd(5)} | ${String(sr.length).padStart(2)} | `
        + `${money(median(sr.map((r) => r.budget))).padStart(9)} | `
        + `${money(median(sr.map((r) => r.weeks ? r.net / r.weeks : 0))).padStart(9)} | `
        + `${String(insolvent).padStart(3)}/${sr.length} | `
        + `${money(median(sr.map((r) => r.weeks ? r.revenue / r.weeks : 0))).padStart(9)}`);
    }
  }

  console.log("\n   insolvency (budget < 0 at season end), whole league:");
  for (const season of seasons) {
    const sr = rows.filter((r) => r.season === season);
    const neg = sr.filter((r) => r.budget < 0);
    const everNeg = sr.filter((r) => r.weeksNegative > 0);
    console.log(`   ${season}: ${neg.length}/${sr.length} end negative · ${everNeg.length} went negative at some point in the season`
      + ` · ${neg.map((r) => r.tier).filter((t, i, a) => a.indexOf(t) === i).join(",")}`);
  }

  // ---- 3. Expense composition --------------------------------------------
  console.log("\n## 3. Expense composition, share of total charged expenses");
  console.log("season | tier  |  n | squad | facil | stad | opers | payroll | NIL | advert | largest term");
  for (const season of seasons) {
    for (const tier of TIERS) {
      const sr = rows.filter((r) => r.season === season && r.tier === tier);
      if (!sr.length) continue;
      const sum = (k) => sr.reduce((s, r) => s + r[k], 0);
      const total = sum("expenses");
      const parts = {
        squad: sum("squadCost"), facil: sum("facilitiesCost"), stad: sum("stadiumCost"),
        opers: sum("operationsCost"), payroll: sum("staffPayroll"), NIL: sum("nilSpend"),
        advert: sum("advertisingSpend")
      };
      const biggest = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
      console.log(`${season} | ${tier.padEnd(5)} | ${String(sr.length).padStart(2)} | `
        + Object.values(parts).map((v) => pct(v, total).padStart(5)).join(" | ")
        + ` | ${biggest[0]} ${pct(biggest[1], total)}`);
    }
  }

  // ---- 4. The recruiting drain -------------------------------------------
  console.log("\n## 4. NIL as a share of revenue, per tier per season");
  console.log("season | tier  |  n | NIL/wk | revenue/wk | NIL as % rev | NIL as % expenses | committed NIL at season end");
  for (const season of seasons) {
    for (const tier of TIERS) {
      const sr = rows.filter((r) => r.season === season && r.tier === tier);
      if (!sr.length) continue;
      const sum = (k) => sr.reduce((s, r) => s + r[k], 0);
      const weeks = sum("weeks") || 1;
      console.log(`${season} | ${tier.padEnd(5)} | ${String(sr.length).padStart(2)} | `
        + `${money(sum("nilSpend") / weeks).padStart(8)} | ${money(sum("revenue") / weeks).padStart(9)} | `
        + `${pct(sum("nilSpend"), sum("revenue")).padStart(6)} | ${pct(sum("nilSpend"), sum("expenses")).padStart(6)} | `
        + `${money(median(sr.map((r) => r.committedNil))).padStart(8)}`);
    }
  }

  console.log("\n## 5. Compounding — median budget by tier, indexed to season 1");
  const idx = {};
  for (const tier of TIERS) {
    const first = median(rows.filter((r) => r.season === seasons[0] && r.tier === tier).map((r) => r.budget));
    idx[tier] = first;
  }
  console.log("season | " + TIERS.map((t) => `${t} median (x s1)`).join(" | "));
  for (const season of seasons) {
    const cells = TIERS.map((tier) => {
      const m = median(rows.filter((r) => r.season === season && r.tier === tier).map((r) => r.budget));
      return `${money(m)} (${idx[tier] ? (m / idx[tier]).toFixed(2) : "—"}x)`;
    });
    console.log(`${season} | ${cells.join(" | ")}`);
  }

  console.log("\n   revenue channels, median per week per tier, first vs last season:");
  for (const tier of TIERS) {
    for (const season of [seasons[0], seasons.at(-1)]) {
      const sr = rows.filter((r) => r.season === season && r.tier === tier);
      if (!sr.length) continue;
      const w = sr.reduce((s, r) => s + r.weeks, 0) || 1;
      const s = (k) => sr.reduce((a, r) => a + r[k], 0) / w;
      console.log(`   ${tier.padEnd(5)} ${season}: media ${money(s("mediaRevenue"))} · gate ${money(s("gateRevenue"))} · sponsor ${money(s("sponsorshipRevenue"))} · total ${money(s("revenue"))} · fanBase median ${Math.round(median(sr.map((r) => r.fanBase)))}`);
    }
  }

  console.log("\n   one-off cash, totals per tier over the run (postseason bonuses, donors, facility spend):");
  for (const tier of TIERS) {
    const sr = rows.filter((r) => r.tier === tier);
    const s = (k) => sr.reduce((a, r) => a + r[k], 0);
    console.log(`   ${tier.padEnd(5)}: bonus ${money(s("bonusCash"))} · booster ${money(s("boosterCash"))} · facility spend ${money(s("facilitySpend"))} · marquee ${money(s("marqueeSpend"))} · staff hires ${money(s("staffHireSpend"))}`);
  }

  // ---- 6. Posted vs charged, reconciliation -------------------------------
  console.log(`\n## 6. Posted versus charged: ${d.postedMismatches} mismatches in ${d.postedChecked} WEEKLY_FINANCES events checked`);
  if (d.postedChecks.length) {
    const kinds = {};
    for (const c of d.postedChecks) for (const [k] of c.problems) kinds[k] = (kinds[k] ?? 0) + 1;
    console.log("   ", kinds);
    console.log(JSON.stringify(d.postedChecks.slice(0, 3), null, 1));
  }

  const strict = d.reconciliation;
  const left = strict.filter((r) => Math.abs(r.unexplainedLenient) > 0.5);
  console.log(`\n## 7. Budget movements no event states as a number: ${strict.length}`);
  console.log(`   after joining BOOSTER_RESOLVED to its offer and applying the engine's postseason constants: ${left.length}`);
  const byEvents = {};
  for (const r of strict) {
    const k = r.eventKinds.filter((t) => /BOOSTER|TITLE|CHAMPION|STAFF|FACILITY|MARQUEE/.test(t)).sort().join("+") || "(no budget event at all)";
    byEvents[k] = byEvents[k] ?? { n: 0, total: 0, amounts: new Set() };
    byEvents[k].n += 1; byEvents[k].total += r.unexplained; byEvents[k].amounts.add(r.unexplained);
  }
  for (const [k, v] of Object.entries(byEvents).sort((a, b) => b[1].n - a[1].n)) {
    const amounts = [...v.amounts].slice(0, 4).map(money).join(", ");
    console.log(`   ${String(v.n).padStart(4)} × ${k.padEnd(38)} total ${money(v.total).padStart(9)} · e.g. ${amounts}`);
  }
  if (left.length) console.log(JSON.stringify(left.slice(0, 5), null, 1));

  if (d.timing?.length) {
    console.log(`\n## timing: ${d.timing.map((t) => (t.ms / 1000).toFixed(1)).join("s, ")}s per season`);
  }
}
