/**
 * D3b — attribution for the D3 gap.
 *
 * D3 measured the posted percentage against two arms: the same state advanced
 * with no commands at all (PURE), and the same state advanced with the rival
 * planner's full week (LIVE). LIVE came out far above posted. Two candidate
 * causes, with opposite consequences:
 *
 *   own-week   the number cannot see the program's OWN queued recruiting
 *              commands, which land before the market resolves
 *   rival-week the number cannot see what rivals do after it is posted, which
 *              is the effect the docstring says makes it an upper bound
 *
 * So: one arm in which a designated quarter of the league issues no recruiting
 * commands at all while everybody else does. For those programs the only thing
 * that moves between posting and resolution is what rivals did.
 */
import { writeFileSync } from "node:fs";
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "qa-c3-odds-1,qa-c3-odds-2,qa-c3-odds-3,qa-c3-odds-4").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const RECRUITING = new Set([
  "OFFER_PROSPECT", "SCHEDULE_VISIT", "SEARCH_PROSPECTS",
  "EVALUATE_PROSPECT", "INVEST_RECRUITING_POINTS", "SET_NIL_OFFER"
]);

const rows = [];
const openingsRows = [];

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  const ids = Object.keys(state.programs);
  const muted = new Set(ids.filter((_, i) => i % 4 === 0));
  while (state.phase === "REGULAR_SEASON" && state.week <= 14) {
    const week = state.week;
    const index = sim.recruitingOddsIndex(state);
    const posted = [];
    for (const p of Object.values(state.prospects)) {
      if (p.status === "SIGNED" || p.status === "WITHDRAWN") continue;
      for (const g of muted) {
        const o = sim.prospectOdds(state, g, p.id, index);
        if (!o || o.outcome !== "SIGN") continue;
        posted.push({ seed, week, programId: g, prospectId: p.id, percent: o.percent, contested: o.contested, contenders: o.contenders });
      }
    }
    const commands = ai.planWeeklyCommands(state);
    const rivalsOnly = commands.filter((c) => !(RECRUITING.has(c.type) && muted.has(c.programId)));
    const armRivals = sim.advanceWeek(state, rivalsOnly).state;
    const full = sim.advanceWeek(state, commands);

    const held = (s, prospectId, programId) => {
      const q = s.prospects[prospectId];
      return Boolean(q && q.signedProgramId === programId && (q.status === "COMMITTED" || q.status === "SIGNED"));
    };
    for (const r of posted) {
      r.rivalsOnly = held(armRivals, r.prospectId, r.programId) ? 1 : 0;
      r.live = held(full.state, r.prospectId, r.programId) ? 1 : 0;
      rows.push(r);
    }

    // Openings, for the openings-exhaustion hypothesis behind the PURE bias.
    for (const g of muted) {
      const before = sim.projectedRecruitingOpenings(state, g);
      const wonPure = Object.values(armRivals.prospects)
        .filter((p) => p.signedProgramId === g && (p.status === "COMMITTED" || p.status === "SIGNED")).length
        - Object.values(state.prospects)
          .filter((p) => p.signedProgramId === g && (p.status === "COMMITTED" || p.status === "SIGNED")).length;
      openingsRows.push({ seed, week, programId: g, openings: before, gained: wonPure });
    }

    state = full.state;
    process.stderr.write(`${seed} w${week}: ${posted.length} muted-program rows\n`);
  }
}

writeFileSync(new URL("./d3b-rows.json", import.meta.url), JSON.stringify(rows));
writeFileSync(new URL("./d3b-openings.json", import.meta.url), JSON.stringify(openingsRows));
console.log("rows", rows.length);
