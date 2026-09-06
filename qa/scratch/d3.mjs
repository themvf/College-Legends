/**
 * D3 — prospectOdds calibration.
 *
 * At the moment odds are posted for a (program, prospect) pair, record the
 * percentage; then record whether that program ended the week holding him.
 *
 * Two arms off the same posted number:
 *   PURE — the same state advanced with no commands at all. This asks whether
 *          the closed-form integral describes the engine's own market for the
 *          state the number was computed on.
 *   LIVE — the same state advanced with the rival planner's real commands, which
 *          is what a player actually experiences: rivals can still improve their
 *          offers after the number is posted.
 */
import { writeFileSync } from "node:fs";
import { league, sim, ai } from "./lib.mjs";

const SEEDS = process.argv[2] ? process.argv[2].split(",") : ["qa-c3-odds-1", "qa-c3-odds-2", "qa-c3-odds-3", "qa-c3-odds-4"];
const SIZE = Number(process.argv[3] ?? 72);
const LAST_WEEK = Number(process.argv[4] ?? 14);

const rows = [];

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  while (state.phase === "REGULAR_SEASON" && state.week <= LAST_WEEK) {
    const week = state.week;
    const index = sim.recruitingOddsIndex(state);
    const posted = [];
    for (const p of Object.values(state.prospects)) {
      if (p.status === "SIGNED" || p.status === "WITHDRAWN") continue;
      for (const g of Object.keys(state.programs)) {
        const o = sim.prospectOdds(state, g, p.id, index);
        if (!o || o.outcome === "NOT_PURSUING") continue;
        posted.push({
          seed, week, programId: g, prospectId: p.id,
          outcome: o.outcome, percent: o.percent,
          contenders: o.contenders, contested: o.contested, lead: o.lead
        });
      }
    }

    const pure = sim.advanceWeek(state, []).state;
    const commands = ai.planWeeklyCommands(state);
    const liveResult = sim.advanceWeek(state, commands);
    const live = liveResult.state;

    const held = (s, prospectId, programId) => {
      const q = s.prospects[prospectId];
      return Boolean(q && q.signedProgramId === programId && (q.status === "COMMITTED" || q.status === "SIGNED"));
    };
    for (const row of posted) {
      row.pure = held(pure, row.prospectId, row.programId) ? 1 : 0;
      row.live = held(live, row.prospectId, row.programId) ? 1 : 0;
      rows.push(row);
    }
    process.stderr.write(`${seed} w${week}: posted ${posted.length}\n`);
    state = live;
  }
}

writeFileSync(new URL("./d3-rows.json", import.meta.url), JSON.stringify(rows));
console.log("rows", rows.length);
