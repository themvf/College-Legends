/**
 * qa-lead triage of Brief C's C5: the charter's literal winning-beats-losing
 * test. game-balance.md §3 — "If the worst winning season is beaten by the best
 * losing one, that is a P1 regardless of sample size."
 *
 * Budget change is measured across the regular season only (beginSeason ->
 * end of week 14), so postseason cash and the offseason are excluded and the
 * record on the books is the record that earned the money.
 */
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "lead-c5-a,lead-c5-b").split(",");
const SIZE = Number(process.argv[3] ?? 24);
const SEASONS = Number(process.argv[4] ?? 8);

const rows = [];

for (const seed of SEEDS) {
  let state = league(seed, SIZE);
  for (let s = 0; s < SEASONS; s += 1) {
    state = sim.beginSeason(state);
    const season = state.season;
    const opening = {};
    for (const p of Object.values(state.programs)) opening[p.id] = p.budget;
    while (state.phase === "REGULAR_SEASON") {
      state = sim.advanceWeek(state, ai.planWeeklyCommands(state)).state;
    }
    for (const p of Object.values(state.programs)) {
      rows.push({
        seed, season, id: p.id, tier: p.reputationTier ?? p.tier,
        wins: p.record?.wins ?? p.wins, losses: p.record?.losses ?? p.losses,
        delta: p.budget - opening[p.id]
      });
    }
    while (state.phase === "OFFSEASON") {
      state = sim.advanceOffseasonStep(state, ai.planOffseasonCommands(state)).state;
    }
    process.stderr.write(`${seed} ${season} done\n`);
  }
}

const m = (v) => `$${(v / 1e6).toFixed(2)}M`;
const winners = rows.filter((r) => r.wins >= 9);
const losers = rows.filter((r) => r.losses >= 9);

console.log(`\nprogram-seasons=${rows.length}  winners(>=9W)=${winners.length}  losers(>=9L)=${losers.length}`);

const worstWin = winners.reduce((a, b) => (b.delta < a.delta ? b : a));
const bestLose = losers.reduce((a, b) => (b.delta > a.delta ? b : a));
console.log(`\nLITERAL TEST (pooled, all tiers, all seasons)`);
console.log(`  worst winning season : ${worstWin.seed} ${worstWin.season} ${worstWin.id} ${worstWin.tier} ${worstWin.wins}-${worstWin.losses}  ${m(worstWin.delta)}`);
console.log(`  best losing season   : ${bestLose.seed} ${bestLose.season} ${bestLose.id} ${bestLose.tier} ${bestLose.wins}-${bestLose.losses}  ${m(bestLose.delta)}`);
console.log(`  verdict: ${worstWin.delta > bestLose.delta ? "PASS" : "FAIL"}`);

console.log(`\nWITHIN TIER (the confound the pooled test does not control)`);
for (const tier of ["LOW", "MID", "POWER"]) {
  const w = winners.filter((r) => r.tier === tier);
  const l = losers.filter((r) => r.tier === tier);
  if (!w.length || !l.length) { console.log(`  ${tier.padEnd(6)} n/a (w=${w.length} l=${l.length})`); continue; }
  const ww = w.reduce((a, b) => (b.delta < a.delta ? b : a));
  const bl = l.reduce((a, b) => (b.delta > a.delta ? b : a));
  const mean = (xs) => xs.reduce((t, r) => t + r.delta, 0) / xs.length;
  console.log(
    `  ${tier.padEnd(6)} worstWin ${m(ww.delta).padStart(9)} (n=${String(w.length).padStart(3)}, mean ${m(mean(w)).padStart(9)})` +
    `  bestLoss ${m(bl.delta).padStart(9)} (n=${String(l.length).padStart(3)}, mean ${m(mean(l)).padStart(9)})` +
    `  ${ww.delta > bl.delta ? "PASS" : "FAIL"}`
  );
}

console.log(`\nMEAN BUDGET CHANGE BY WIN COUNT (pooled)`);
const byWins = new Map();
for (const r of rows) {
  const b = byWins.get(r.wins) ?? [];
  b.push(r.delta); byWins.set(r.wins, b);
}
for (const wins of [...byWins.keys()].sort((a, b) => a - b)) {
  const xs = byWins.get(wins);
  const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(`  ${String(wins).padStart(2)}W  n=${String(xs.length).padStart(3)}  mean ${m(avg).padStart(9)}`);
}
