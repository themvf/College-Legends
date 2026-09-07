/**
 * Issue 2026-09-06-08, attribution step.
 *
 * The within-tier split killed every candidate the lead named: among LOW
 * programs the insolvent and the solvent build the same number of facilities
 * (1.48 vs 1.59), open on the identical reserve, carry the same prestige, and
 * the insolvent carry *less* payroll. The one thing that separates them is
 * program character — DEVELOPER 52%, FRONTRUNNER 33%, DIEHARD 4%,
 * TALENT_MAGNET 5%.
 *
 * Character sets authored facility levels at creation, and upkeep is
 * `level^1.7` per facility. So the hypothesis is that upkeep is implicated
 * after all, but through the levels a program is *born with* rather than
 * through anything it builds — which is why "levels built" showed nothing.
 *
 * This measures, at creation and per character within LOW: authored facility
 * levels, the upkeep those levels cost, media rights, and the resulting
 * weekly margin — before a single week is played, so nothing here can be
 * confounded by results.
 */
import { league, sim } from "../lib.mjs";

const SEEDS = (process.argv[2] ?? "lead-c1-a,lead-c1-b,qa-c3-econ-72").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const FACILITIES = ["TRAINING", "STADIUM", "ACADEMICS", "RECRUITING", "SCOUTING"];
const UPKEEP_EXPONENT = 1.7;

const rows = [];
for (const seed of SEEDS) {
  const state = sim.beginSeason(league(seed, SIZE));
  for (const program of Object.values(state.programs)) {
    if (program.tier !== "LOW") continue;
    const levels = FACILITIES.map((key) => program.facilities[key] ?? 0);
    rows.push({
      seed,
      id: program.id,
      character: program.character,
      levels: levels.reduce((a, b) => a + b, 0),
      // The engine's own shape, so the comparison is in the engine's units.
      upkeepIndex: levels.reduce((total, level) => total + Math.pow(level, UPKEEP_EXPONENT), 0),
      weeklyRevenue: program.weeklyRevenue ?? 0,
      weeklyExpenses: program.weeklyExpenses ?? 0,
      budget: program.budget,
      fanBase: program.fanBase,
      stadium: program.stadiumCapacity ?? 0,
      scholarshipLimit: program.scholarshipLimit,
      perFacility: Object.fromEntries(FACILITIES.map((key, i) => [key, levels[i]]))
    });
  }
}

const mean = (list, pick) => list.length === 0 ? 0 : list.reduce((t, r) => t + pick(r), 0) / list.length;

console.log(`\nLOW programs at creation · seeds ${SEEDS.join(",")} · n=${rows.length}\n`);
console.log("character       n   levels  upkeepIdx   " + FACILITIES.map((f) => f.slice(0, 5).padStart(6)).join(""));
for (const character of [...new Set(rows.map((r) => r.character))].sort()) {
  const cohort = rows.filter((r) => r.character === character);
  const perF = FACILITIES.map((key) => mean(cohort, (r) => r.perFacility[key]).toFixed(1).padStart(6)).join("");
  console.log(`${String(character).padEnd(14)} ${String(cohort.length).padStart(2)}`
    + `  ${mean(cohort, (r) => r.levels).toFixed(1).padStart(6)}`
    + `  ${mean(cohort, (r) => r.upkeepIndex).toFixed(1).padStart(9)}`
    + `   ${perF}`);
}

console.log("\nknown insolvency rate within LOW, for comparison:");
console.log("  DEVELOPER 52%   FRONTRUNNER 33%   TALENT_MAGNET 5%   DIEHARD 4%");
