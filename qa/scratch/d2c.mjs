/**
 * D2(c) — what one priority slot is worth in points of scoring margin.
 *
 * The three cards that pay on Saturday are put against each other inside the
 * same leagues: every program is forced to exactly one standing priority,
 * assigned round-robin *within tier* so the arms are strength-balanced, and the
 * AI's own SET_WEEK_FOCUS is stripped. The difference between arms is the value
 * of the slot, measured rather than converted from posted units.
 *
 * DEVELOP and RECRUIT are deliberately excluded: both pay after this season, so
 * a one-season margin comparison would report them as worthless by construction.
 */
import { writeFileSync } from "node:fs";
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "qa-c3-slotab-1,qa-c3-slotab-2,qa-c3-slotab-3,qa-c3-slotab-4").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const ARMS = ["INSTALL_OFFENSE", "INSTALL_DEFENSE", "SCOUT"];
const out = [];

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  const byTier = { LOW: [], MID: [], POWER: [] };
  for (const [id, p] of Object.entries(state.programs)) byTier[p.tier].push(id);
  const arm = {};
  for (const tier of Object.keys(byTier)) {
    byTier[tier].forEach((id, i) => { arm[id] = ARMS[i % ARMS.length]; });
  }
  const focusCmds = Object.keys(state.programs).map((programId) => ({
    type: "SET_WEEK_FOCUS", programId, focuses: [arm[programId]]
  }));

  const tally = {};
  for (const id of Object.keys(state.programs)) tally[id] = { arm: arm[id], pf: 0, pa: 0, w: 0, l: 0, g: 0 };

  while (state.phase === "REGULAR_SEASON" && state.week <= 14) {
    const planned = ai.planWeeklyCommands(state).filter((c) => c.type !== "SET_WEEK_FOCUS");
    const result = sim.advanceWeek(state, [...focusCmds, ...planned]);
    for (const e of result.events) {
      if (e.type !== "GAME_COMPLETED") continue;
      const h = tally[e.homeProgramId], a = tally[e.awayProgramId];
      h.pf += e.homeScore; h.pa += e.awayScore; h.g += 1; h[e.homeScore > e.awayScore ? "w" : "l"] += 1;
      a.pf += e.awayScore; a.pa += e.homeScore; a.g += 1; a[e.awayScore > e.homeScore ? "w" : "l"] += 1;
    }
    state = result.state;
    process.stderr.write(`${seed} w${state.week - 1}\n`);
  }
  for (const [id, t] of Object.entries(tally)) out.push({ seed, programId: id, tier: state.programs[id].tier, ...t });
}

writeFileSync(new URL("./d2c-rows.json", import.meta.url), JSON.stringify(out));

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
console.log("| arm | programs | team-games | points for | points against | margin | win % |");
console.log("|---|---|---|---|---|---|---|");
for (const a of ARMS) {
  const rs = out.filter((r) => r.arm === a && r.g > 0);
  const g = rs.reduce((s, r) => s + r.g, 0);
  const pf = rs.reduce((s, r) => s + r.pf, 0), pa = rs.reduce((s, r) => s + r.pa, 0);
  const w = rs.reduce((s, r) => s + r.w, 0);
  console.log(`| ${a} | ${rs.length} | ${g} | ${(pf / g).toFixed(2)} | ${(pa / g).toFixed(2)} | ${((pf - pa) / g).toFixed(2)} | ${(100 * w / g).toFixed(1)} |`);
}
console.log("\nper tier:");
for (const tier of ["LOW", "MID", "POWER"]) {
  for (const a of ARMS) {
    const rs = out.filter((r) => r.arm === a && r.tier === tier && r.g > 0);
    const g = rs.reduce((s, r) => s + r.g, 0);
    const pf = rs.reduce((s, r) => s + r.pf, 0), pa = rs.reduce((s, r) => s + r.pa, 0);
    const w = rs.reduce((s, r) => s + r.w, 0);
    console.log(`  ${tier} ${a}: n=${rs.length} games=${g} margin=${((pf - pa) / g).toFixed(2)} win%=${(100 * w / g).toFixed(1)}`);
  }
}
console.log("\nper seed margin:");
for (const seed of SEEDS) {
  const line = ARMS.map((a) => {
    const rs = out.filter((r) => r.seed === seed && r.arm === a && r.g > 0);
    const g = rs.reduce((s, r) => s + r.g, 0);
    return `${a}=${((rs.reduce((s, r) => s + r.pf, 0) - rs.reduce((s, r) => s + r.pa, 0)) / g).toFixed(2)}`;
  }).join(" ");
  console.log(`  ${seed}: ${line}`);
}
void mean;
