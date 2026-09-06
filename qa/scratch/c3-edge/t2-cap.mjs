/**
 * Brief B §2 — the scholarship cap.
 *
 * Everything here is reached through the public path: the fixture is a real
 * 72-program season driven by the rival planner (build-states.mjs), and the
 * only thing this script adds is commands. Nothing is written into `state`.
 */
import { readFileSync } from "node:fs";
import {
  advanceWeek, advanceOffseasonStep, beginSeason, projectedRecruitingOpenings
} from "../../../packages/simulation/dist/index.js";
import { planOffseason, planWeek } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";

const scholarships = (state, programId) => Object.values(state.players)
  .filter((p) => p.programId === programId && p.eligibility.rosterStatus === "SCHOLARSHIP").length;

// ---------------------------------------------------------------- at the cap
for (const week of ["s1-w13", "s1-w14"]) {
  const state = load(seed, week);
  const rows = Object.keys(state.programs).sort().map((id) => ({
    id,
    openings: projectedRecruitingOpenings(state, id),
    scholarships: scholarships(state, id),
    limit: state.programs[id].scholarshipLimit,
    committed: Object.values(state.prospects).filter((p) => (p.status === "COMMITTED" || p.status === "SIGNED") && p.signedProgramId === id).length
  }));
  const full = rows.filter((r) => r.openings <= 0);
  console.log(`\n=== ${seed} ${week}: programs at zero projected openings: ${full.length}/72 ===`);
  console.log(`   min openings=${Math.min(...rows.map((r) => r.openings))} max=${Math.max(...rows.map((r) => r.openings))}`);
  console.log(`   max scholarships on a roster=${Math.max(...rows.map((r) => r.scholarships))} (limit ${rows[0].limit})`);
  const negative = rows.filter((r) => r.openings < 0 || r.scholarships > r.limit);
  if (negative.length) console.log(`   !! ${negative.length} rows over the limit or negative: ${JSON.stringify(negative.slice(0, 5))}`);

  if (full.length) {
    const victim = full[0];
    const target = state.recruiting[victim.id].discoveredProspectIds
      .find((id) => state.prospects[id] && state.prospects[id].status === "AVAILABLE");
    console.log(`   probe program=${victim.id} openings=${victim.openings} scholarships=${victim.scholarships} committed=${victim.committed} target=${target}`);
    if (target) {
      const cmds = [
        { type: "OFFER_PROSPECT", programId: victim.id, prospectId: target, extend: true },
        { type: "EVALUATE_PROSPECT", programId: victim.id, prospectId: target, evaluation: "BASIC" },
        { type: "INVEST_RECRUITING_POINTS", programId: victim.id, prospectId: target, points: 5 },
        { type: "SCHEDULE_VISIT", programId: victim.id, prospectId: target },
        { type: "SET_NIL_OFFER", programId: victim.id, prospectId: target, weeklyAmount: 40_000 }
      ];
      const { events } = advanceWeek(state, cmds);
      for (const c of cmds) {
        const rej = events.find((e) => e.type === "COMMAND_REJECTED" && e.command === c);
        const acc = events.find((e) => ["PROSPECT_OFFERED", "PROSPECT_EVALUATED", "RECRUITING_INVESTMENT", "RECRUITING_VISIT_SCHEDULED", "NIL_OFFER_SET"].includes(e.type)
          && e.programId === victim.id && e.prospectId === target
          && ((c.type === "OFFER_PROSPECT" && e.type === "PROSPECT_OFFERED")
            || (c.type === "EVALUATE_PROSPECT" && e.type === "PROSPECT_EVALUATED")
            || (c.type === "INVEST_RECRUITING_POINTS" && e.type === "RECRUITING_INVESTMENT")
            || (c.type === "SCHEDULE_VISIT" && e.type === "RECRUITING_VISIT_SCHEDULED")
            || (c.type === "SET_NIL_OFFER" && e.type === "NIL_OFFER_SET")));
        console.log(`     ${c.type.padEnd(26)} ${rej ? `REJECTED: ${rej.reason}` : acc ? "ACCEPTED" : "!! SILENT (no rejection, no event)"}`);
      }
    }
  }
}

// ------------------------------------------------- enrolment at completeOffseason
let state = load(seed, "offseason-TRAINING_CAMP");
const before = Object.values(state.prospects).filter((p) => p.status === "SIGNED" || p.status === "COMMITTED");
console.log(`\n=== enrolment: ${before.length} prospects SIGNED/COMMITTED entering completeOffseason ===`);
const byProgram = new Map();
for (const p of before) byProgram.set(p.signedProgramId, (byProgram.get(p.signedProgramId) ?? 0) + 1);
const wouldExceed = [...byProgram.entries()]
  .map(([id, n]) => ({ id, class: n, roster: scholarships(state, id), limit: state.programs[id]?.scholarshipLimit }))
  .filter((r) => r.roster + r.class > r.limit);
console.log(`   programs whose class + roster would exceed 85 before departures: ${wouldExceed.length}`);
if (wouldExceed.length) console.log(`   ${JSON.stringify(wouldExceed.slice(0, 6))}`);

const result = advanceOffseasonStep(state, planOffseason(state));
state = result.state;
const voided = result.events.filter((e) => e.type === "PROSPECT_COMMITMENT_VOIDED");
const enrolled = result.events.filter((e) => e.type === "PROSPECT_ENROLLED");
console.log(`   after completeOffseason: phase=${state.phase} season=${state.season}`);
console.log(`   PROSPECT_ENROLLED=${enrolled.length}  lateFill=${enrolled.filter((e) => e.lateFill).length}  PROSPECT_COMMITMENT_VOIDED=${voided.length}`);
if (voided.length) console.log(`   voided reasons: ${JSON.stringify([...new Set(voided.map((e) => e.reason))])}`);

const orphans = Object.values(state.prospects).filter((p) => p.status === "SIGNED" || p.status === "COMMITTED");
console.log(`   ORPHANS (still SIGNED/COMMITTED after enrolment): ${orphans.length}`);
if (orphans.length) console.log(`   ${JSON.stringify(orphans.slice(0, 5).map((p) => ({ id: p.id, status: p.status, program: p.signedProgramId })))}`);

const over = Object.keys(state.programs).map((id) => ({ id, n: scholarships(state, id), limit: state.programs[id].scholarshipLimit }))
  .filter((r) => r.n > r.limit);
console.log(`   programs over the 85 scholarship limit after enrolment: ${over.length}${over.length ? ` ${JSON.stringify(over.slice(0, 6))}` : ""}`);
const counts = Object.keys(state.programs).map((id) => scholarships(state, id));
console.log(`   scholarship count min=${Math.min(...counts)} max=${Math.max(...counts)} mean=${(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)}`);

// A NIL commitment keyed on a prospect who was voided would be a money leak.
let strandedNil = 0;
for (const [programId, nil] of Object.entries(state.nil ?? {})) {
  for (const key of Object.keys(nil.commitmentsByPlayer ?? {})) {
    if (!state.players[key] && !state.prospects[key]) { strandedNil += 1; if (strandedNil <= 5) console.log(`   !! stranded NIL commitment ${programId} -> ${key} = ${nil.commitmentsByPlayer[key]}`); }
  }
}
console.log(`   stranded NIL commitments (key is neither a player nor a prospect): ${strandedNil}`);

// The new season must still be enterable.
const s2 = beginSeason(state);
console.log(`   beginSeason -> season=${s2.season} week=${s2.week} phase=${s2.phase}`);
const { state: s2w1 } = advanceWeek(s2, planWeek(s2));
console.log(`   advanceWeek  -> season=${s2w1.season} week=${s2w1.week} phase=${s2w1.phase}`);
