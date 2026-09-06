/**
 * D3c — decomposition of the LIVE lift by own-command type.
 *
 * D3b established that for a program issuing NO recruiting commands of its own,
 * the posted percentage tracks the outcome (8.1 posted -> 7.2 observed pooled),
 * i.e. rival activity inside the week is worth about one point. Restoring that
 * program's OWN recruiting commands takes the observed rate to 31.7%.
 *
 * So the whole LIVE gap is the reader's own week. This run asks WHICH own
 * action carries it: the scholarship offer, the pursuit points, or the NIL
 * offer. That matters because only one of the three (NIL) has a preview path in
 * `prospectOdds(..., { nilOffer })`; the other two move the outcome with the
 * posted number standing still.
 *
 * Arms, all off the same posted number and the same state:
 *   rivals   own recruiting commands removed entirely
 *   +offer   own OFFER_PROSPECT restored
 *   +points  own INVEST_RECRUITING_POINTS restored
 *   +nil     own SET_NIL_OFFER restored
 *   live     everything restored
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
        posted.push({ seed, week, programId: g, prospectId: p.id, percent: o.percent, contested: o.contested });
      }
    }
    const commands = ai.planWeeklyCommands(state);
    // A muted program keeps every non-recruiting command; `keep` names the
    // recruiting types it is allowed back.
    const arm = (keep) => commands.filter((c) =>
      !RECRUITING.has(c.type) || !muted.has(c.programId) || keep.has(c.type));
    const armStates = {
      rivals: sim.advanceWeek(state, arm(new Set())).state,
      offer: sim.advanceWeek(state, arm(new Set(["OFFER_PROSPECT"]))).state,
      points: sim.advanceWeek(state, arm(new Set(["INVEST_RECRUITING_POINTS"]))).state,
      nil: sim.advanceWeek(state, arm(new Set(["SET_NIL_OFFER"]))).state
    };
    const full = sim.advanceWeek(state, commands);

    const held = (s, prospectId, programId) => {
      const q = s.prospects[prospectId];
      return Boolean(q && q.signedProgramId === programId && (q.status === "COMMITTED" || q.status === "SIGNED"));
    };
    for (const r of posted) {
      for (const [name, s] of Object.entries(armStates)) r[name] = held(s, r.prospectId, r.programId) ? 1 : 0;
      r.live = held(full.state, r.prospectId, r.programId) ? 1 : 0;
      rows.push(r);
    }
    state = full.state;
    process.stderr.write(`${seed} w${week}: ${posted.length} rows\n`);
  }
}

writeFileSync(new URL("./d3c-rows.json", import.meta.url), JSON.stringify(rows));
console.log("rows", rows.length);
