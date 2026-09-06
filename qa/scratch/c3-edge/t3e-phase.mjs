/**
 * Brief B §3 (remainder) — phase and offseason-step guards, and offers to
 * prospects who are already committed. Command path only; nothing is written
 * into `state`.
 *
 * The question is not whether a command is refused — it is whether the refusal
 * NAMES THE OWNER: the phase or the offseason step that owns the command.
 */
import { readFileSync } from "node:fs";
import { advanceWeek, advanceOffseasonStep, beginSeason } from "../../../packages/simulation/dist/index.js";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";

const RECRUITING_EVENTS = new Set([
  "PROSPECT_OFFERED", "PROSPECT_EVALUATED", "RECRUITING_INVESTMENT",
  "RECRUITING_VISIT_SCHEDULED", "NIL_OFFER_SET", "PROSPECTS_DISCOVERED"
]);

function probe(label, state, runner, programId, prospectId) {
  const commands = [
    { type: "OFFER_PROSPECT", programId, prospectId, extend: true },
    { type: "EVALUATE_PROSPECT", programId, prospectId, evaluation: "BASIC" },
    { type: "INVEST_RECRUITING_POINTS", programId, prospectId, points: 5 },
    { type: "SCHEDULE_VISIT", programId, prospectId },
    { type: "SET_NIL_OFFER", programId, prospectId, weeklyAmount: 5000 },
    { type: "SEARCH_PROSPECTS", programId, searchType: "NATIONAL_SHOWCASE" }
  ];
  console.log(`\n--- ${label}`);
  let events;
  try {
    events = runner(state, commands).events;
  } catch (error) {
    console.log(`   !! THREW: ${error.message}`);
    return;
  }
  for (const command of commands) {
    const rejected = events.find((e) => e.type === "COMMAND_REJECTED" && e.command === command);
    const acted = events.some((e) => RECRUITING_EVENTS.has(e.type) && e.programId === programId
      && (e.prospectId === undefined || e.prospectId === prospectId));
    console.log(`   ${command.type.padEnd(26)} ${rejected ? `REJECTED: ${rejected.reason}` : acted ? "ACCEPTED (acted)" : "!! SILENT — no rejection, no event"}`);
  }
}

// ------------------------------------------------------------------ pick ids
const w11 = load(seed, "s1-w11");
const me = "program-1";
const target = w11.recruiting[me].discoveredProspectIds
  .find((id) => w11.prospects[id]?.status === "AVAILABLE");
console.log(`seed=${seed} program=${me} target=${target}`);

// 1. REGULAR_SEASON (the owning phase) — the control.
probe("REGULAR_SEASON week 11 (control: this is the owning phase)", w11, advanceWeek, me, target);

// 2. ROSTER_REVIEW — beginSeason is the only legal transition out of it.
const rr = load(seed, "s2-rosterreview");
const rrTarget = rr.recruiting[me].discoveredProspectIds.find((id) => rr.prospects[id]?.status === "AVAILABLE")
  ?? Object.keys(rr.prospects)[0];
probe("ROSTER_REVIEW (recruiting commands passed to beginSeason)", rr, (s, c) => {
  const next = beginSeason(s, c);
  return { state: next, events: next.eventHistory.slice(s.eventHistory.length) };
}, me, rrTarget);

// 3/4. Each offseason step.
for (const step of ["BOARD_REVIEW", "PORTAL", "SIGNING_DAY", "COACHING", "TRAINING_CAMP"]) {
  const state = load(seed, `offseason-${step}`);
  const id = state.recruiting[me]?.discoveredProspectIds.find((p) => state.prospects[p]?.status === "AVAILABLE")
    ?? Object.keys(state.prospects)[0];
  probe(`OFFSEASON step=${step}`, state, advanceOffseasonStep, me, id);
}

// 5. advanceWeek called while the state says OFFSEASON — wrong entry point.
{
  const state = load(seed, "offseason-PORTAL");
  const id = Object.keys(state.prospects)[0];
  probe("advanceWeek() called on an OFFSEASON state (wrong entry point)", state, advanceWeek, me, id);
}

// 6. advanceOffseasonStep called during REGULAR_SEASON — the mirror.
{
  const id = target;
  probe("advanceOffseasonStep() called on a REGULAR_SEASON state", w11, advanceOffseasonStep, me, id);
}

// ------------------------------------------- offers to already-committed men
{
  console.log(`\n=== offers to prospects who are already committed ===`);
  const state = load(seed, "s1-w11");
  const committedElsewhere = Object.values(state.prospects)
    .find((p) => (p.status === "COMMITTED" || p.status === "SIGNED") && p.signedProgramId && p.signedProgramId !== me
      && state.recruiting[me].discoveredProspectIds.includes(p.id));
  const committedToMe = Object.values(state.prospects)
    .find((p) => (p.status === "COMMITTED" || p.status === "SIGNED") && p.signedProgramId === me);
  console.log(`   committedElsewhere=${committedElsewhere?.id ?? "none discovered"} (status=${committedElsewhere?.status} to ${committedElsewhere?.signedProgramId})`);
  console.log(`   committedToMe=${committedToMe?.id ?? "none"} (status=${committedToMe?.status})`);
  if (committedElsewhere) probe(`offer to a prospect committed ELSEWHERE (week 11, pre-SIGNING_WEEK)`, state, advanceWeek, me, committedElsewhere.id);
  if (committedToMe) probe(`offer to a prospect committed TO ME`, state, advanceWeek, me, committedToMe.id);

  // Same two, after SIGNING_WEEK, where a commitment is supposed to be final.
  const w13 = load(seed, "s1-w13");
  const signedElsewhere = Object.values(w13.prospects)
    .find((p) => p.status === "SIGNED" && p.signedProgramId && p.signedProgramId !== me
      && w13.recruiting[me].discoveredProspectIds.includes(p.id));
  console.log(`\n   post-signing-week target=${signedElsewhere?.id ?? "none"} status=${signedElsewhere?.status}`);
  if (signedElsewhere) probe(`offer to a SIGNED prospect (week 13, past SIGNING_WEEK=12)`, w13, advanceWeek, me, signedElsewhere.id);
}
