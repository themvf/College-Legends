/**
 * qa-lead triage of Brief C's C1: insolvency count at 72 programs by season 5,
 * against game-balance.md §3's stated ~3 of 72.
 * Fresh seeds chosen by the lead.
 */
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "lead-c1-a").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const SEASONS = Number(process.argv[4] ?? 5);

for (const seed of SEEDS) {
  let state = league(seed, SIZE);
  const byYear = [];
  for (let s = 0; s < SEASONS; s += 1) {
    state = sim.beginSeason(state);
    while (state.phase === "REGULAR_SEASON") {
      state = sim.advanceWeek(state, ai.planWeeklyCommands(state)).state;
    }
    while (state.phase === "OFFSEASON") {
      state = sim.advanceOffseasonStep(state, ai.planOffseasonCommands(state)).state;
    }
    const programs = Object.values(state.programs);
    const insolvent = programs.filter((p) => p.budget < 0);
    const budgets = programs.map((p) => p.budget).sort((a, b) => a - b);
    byYear.push({
      season: s + 1,
      insolvent: insolvent.length,
      min: budgets[0],
      median: budgets[Math.floor(budgets.length / 2)],
      max: budgets[budgets.length - 1]
    });
    process.stderr.write(`${seed} season ${s + 1}: insolvent ${insolvent.length}/${programs.length}\n`);
  }
  console.log(`\n=== ${seed} (${SIZE} programs)`);
  console.log("season  insolvent  min budget      median        max");
  for (const r of byYear) {
    const m = (v) => `$${(v / 1e6).toFixed(1)}M`.padStart(12);
    console.log(`  ${String(r.season).padStart(2)}      ${String(r.insolvent).padStart(2)}/${SIZE}   ${m(r.min)} ${m(r.median)} ${m(r.max)}`);
  }
}
