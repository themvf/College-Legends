/**
 * Issue 2026-09-06-08. The lead reproduced 7-9 of 72 insolvent by season five
 * against a stated ~3, and named the thread: what distinguishes the seven from
 * the sixty-five? Facility upkeep and payroll are the candidates and neither
 * has been measured against the insolvent set.
 *
 * This profiles every program at the end of season five and splits the league
 * on solvency, so the answer is a comparison rather than an anecdote.
 */
import { league, sim, ai } from "../lib.mjs";

const SEEDS = (process.argv[2] ?? "lead-c1-a,lead-c1-b").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const SEASONS = Number(process.argv[4] ?? 5);

const FACILITIES = ["TRAINING", "STADIUM", "ACADEMICS", "RECRUITING", "SCOUTING"];

const rows = [];

for (const seed of SEEDS) {
  let state = league(seed, SIZE);
  // Facility levels as generated, so a build can be told from an endowment.
  const opening = {};
  for (const program of Object.values(state.programs)) {
    opening[program.id] = {
      tier: program.tier,
      character: program.character,
      budget: program.budget,
      facilities: { ...program.facilities }
    };
  }

  for (let s = 0; s < SEASONS; s += 1) {
    state = sim.beginSeason(state);
    while (state.phase === "REGULAR_SEASON") {
      state = sim.advanceWeek(state, ai.planWeeklyCommands(state)).state;
    }
    while (state.phase === "OFFSEASON") {
      state = sim.advanceOffseasonStep(state, ai.planOffseasonCommands(state)).state;
    }
  }

  for (const program of Object.values(state.programs)) {
    const start = opening[program.id];
    const built = FACILITIES.reduce(
      (total, key) => total + ((program.facilities[key] ?? 0) - (start.facilities[key] ?? 0)), 0);
    const levels = FACILITIES.reduce((total, key) => total + (program.facilities[key] ?? 0), 0);
    const payroll = Object.values(state.staff)
      .filter((member) => member.programId === program.id)
      .reduce((total, member) => total + (member.salary ?? 0), 0);
    rows.push({
      seed,
      id: program.id,
      tier: start.tier,
      character: start.character,
      insolvent: program.budget < 0,
      budget: program.budget,
      openingBudget: start.budget,
      built,
      levels,
      payroll,
      lastWeeklyNet: program.lastWeeklyNet ?? 0,
      fanBase: program.fanBase,
      prestige: program.prestige,
      championships: program.championships ?? 0
    });
  }
  process.stderr.write(`${seed}: done\n`);
}

const mean = (list, pick) => list.length === 0 ? 0 : list.reduce((t, r) => t + pick(r), 0) / list.length;
const money = (value) => `$${(value / 1e6).toFixed(2)}M`;

const failed = rows.filter((r) => r.insolvent);
const solvent = rows.filter((r) => !r.insolvent);

console.log(`\nseeds ${SEEDS.join(",")} · ${SIZE} programs · ${SEASONS} seasons`);
console.log(`insolvent ${failed.length} of ${rows.length}\n`);

console.log("                          insolvent      solvent");
const compare = (label, pick, format = (v) => v.toFixed(2)) =>
  console.log(`${label.padEnd(24)} ${format(mean(failed, pick)).padStart(12)} ${format(mean(solvent, pick)).padStart(12)}`);

compare("facility levels built", (r) => r.built);
compare("total facility levels", (r) => r.levels);
compare("staff payroll (weekly)", (r) => r.payroll, money);
compare("opening budget", (r) => r.openingBudget, money);
compare("last weekly net", (r) => r.lastWeeklyNet, money);
compare("fan base", (r) => r.fanBase, (v) => Math.round(v).toLocaleString());
compare("prestige", (r) => r.prestige);

// Every insolvency in the first run was LOW, which makes the league-wide split
// above mostly a restatement of "LOW builds less and pays less". The question
// is what separates a failing LOW program from a surviving one.
for (const tier of ["LOW", "MID", "POWER"]) {
  const cohort = rows.filter((r) => r.tier === tier);
  const bad = cohort.filter((r) => r.insolvent);
  const good = cohort.filter((r) => !r.insolvent);
  if (bad.length === 0 || good.length === 0) continue;
  console.log(`\nwithin ${tier} — ${bad.length} insolvent vs ${good.length} solvent`);
  console.log("                          insolvent      solvent");
  const within = (label, pick, format = (v) => v.toFixed(2)) =>
    console.log(`${label.padEnd(24)} ${format(mean(bad, pick)).padStart(12)} ${format(mean(good, pick)).padStart(12)}`);
  within("facility levels built", (r) => r.built);
  within("total facility levels", (r) => r.levels);
  within("staff payroll (weekly)", (r) => r.payroll, money);
  within("opening budget", (r) => r.openingBudget, money);
  within("last weekly net", (r) => r.lastWeeklyNet, money);
  within("fan base", (r) => r.fanBase, (v) => Math.round(v).toLocaleString());
  within("prestige", (r) => r.prestige);
  console.log(`  character rates within ${tier}:`);
  for (const character of [...new Set(cohort.map((r) => r.character))].sort()) {
    const all = cohort.filter((r) => r.character === character);
    const failed = all.filter((r) => r.insolvent).length;
    const share = all.length === 0 ? 0 : (100 * failed / all.length);
    console.log(`    ${String(character).padEnd(14)} ${String(failed).padStart(2)}/${String(all.length).padStart(2)}`
      + `  ${share.toFixed(0)}%  net ${money(mean(all, (r) => r.lastWeeklyNet))}`
      + `  fans ${Math.round(mean(all, (r) => r.fanBase)).toLocaleString()}`);
  }
}

console.log("\nby tier:");
for (const tier of ["LOW", "MID", "POWER"]) {
  const all = rows.filter((r) => r.tier === tier);
  const bad = all.filter((r) => r.insolvent);
  console.log(`  ${tier.padEnd(6)} ${String(bad.length).padStart(2)}/${String(all.length).padStart(2)}`
    + `  built ${mean(bad, (r) => r.built).toFixed(1)} vs ${mean(all.filter((r) => !r.insolvent), (r) => r.built).toFixed(1)}`);
}

console.log("\nby character:");
const characters = [...new Set(rows.map((r) => r.character))].sort();
for (const character of characters) {
  const all = rows.filter((r) => r.character === character);
  const bad = all.filter((r) => r.insolvent);
  console.log(`  ${String(character).padEnd(14)} ${String(bad.length).padStart(2)}/${String(all.length).padStart(2)}`);
}

console.log("\nthe insolvent, worst first:");
for (const row of failed.sort((a, b) => a.budget - b.budget).slice(0, 12)) {
  console.log(`  ${row.seed} ${row.id.padEnd(11)} ${row.tier.padEnd(6)} ${String(row.character).padEnd(14)}`
    + ` budget ${money(row.budget).padStart(10)} built ${row.built} levels ${row.levels}`
    + ` payroll ${money(row.payroll)} net ${money(row.lastWeeklyNet)}`);
}
