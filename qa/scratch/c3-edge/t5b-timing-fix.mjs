/**
 * Brief B §5 — reruns the two parts of t5-timing.mjs that my own harness got
 * wrong: `scheduledOpponent` returns an id string, not a fixture object, and
 * the ROSTER_REVIEW rejection check sliced the last 60 events of a log that
 * beginSeason had just written thousands of rows into.
 * Commands and read-only projections; nothing written into `state`.
 */
import { readFileSync } from "node:fs";
import {
  advanceWeek, advanceOffseasonStep, beginSeason,
  scoutingReport, scoutingBoard, scoutingReadiness, filmGamesAvailable, scheduledOpponent,
  scoutingConfidence, SCOUTING_TIERS, FULL_FILE_READINESS, READINESS_CAP
} from "../../../packages/simulation/dist/index.js";
import { planOffseason } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";

// ------------------------------------- a. week 1 of season 1: the film gate
{
  const state = load(seed, "s1-w1");
  const me = Object.keys(state.programs).sort()[0];
  const opponentId = scheduledOpponent(state, me);
  console.log(`=== a. season ${state.season} week ${state.week} — no prior week ===`);
  console.log(`   me=${me} opponent=${opponentId} filmGames=${filmGamesAvailable(state, opponentId)}`);
  console.log(`   SCOUTING_TIERS=${JSON.stringify(SCOUTING_TIERS)} READINESS_CAP=${READINESS_CAP} FULL_FILE_READINESS=${FULL_FILE_READINESS}`);
  const report = scoutingReport(state, me);
  console.log(`   week-1 report: tiers=${JSON.stringify(report.tiers)} filmGames=${report.filmGames} confidence=${report.confidence}`);
  console.log(`     identity=${report.identity} units=${report.units} keyPlayers=${report.keyPlayers} tendencies=${report.tendencies}`);
  console.log(`     notes=${JSON.stringify(report.notes)}`);

  // Every program's week-1 report: does the gate hold for all 72?
  let leaked = 0;
  let withPoints = 0;
  for (const programId of Object.keys(state.programs)) {
    const r = scoutingReport(state, programId);
    if (!r) continue;
    if ((state.preparation?.[programId]?.pointsByOpponent?.[r.opponentProgramId] ?? 0) > 0) withPoints += 1;
    if (r.tiers.length > 0 || r.identity !== null || r.units !== null || r.tendencies !== null) {
      leaked += 1;
      if (leaked <= 3) console.log(`     !! LEAK ${programId}: tiers=${JSON.stringify(r.tiers)} identity=${r.identity} units=${Boolean(r.units)}`);
    }
  }
  console.log(`   72 programs at week 1: programs with a nonzero file on this week's opponent=${withPoints}, programs reading ANY gated tier=${leaked}`);

  // The other half of the claim: the file still pays readiness from point one.
  console.log(`   readiness: 0=${scoutingReadiness(0)} 1=${scoutingReadiness(1)} 5=${scoutingReadiness(5)} 20=${scoutingReadiness(20)} 55=${scoutingReadiness(55)} 155=${scoutingReadiness(155)}`);
  console.log(`   readiness degenerate: -50=${scoutingReadiness(-50)} NaN=${scoutingReadiness(NaN)} Infinity=${scoutingReadiness(Infinity)} -Infinity=${scoutingReadiness(-Infinity)}`);
  console.log(`   confidence with 0 film vs 3 film, at each tier threshold:`);
  for (const points of [0, 1, 19, 20, 44, 45, 74, 75, 500]) {
    console.log(`     ${String(points).padEnd(4)} film0=${scoutingConfidence(state, me, 0, points)} film3=${scoutingConfidence(state, me, 3, points)} readiness=${scoutingReadiness(points)}`);
  }

  const nets = Object.values(state.programs).map((p) => p.lastWeeklyNet);
  console.log(`   lastWeeklyNet at week 1 (the "reads last week" rule): distinct=${JSON.stringify([...new Set(nets)])} anyNaN=${nets.some(Number.isNaN)} anyUndefined=${nets.some((n) => n === undefined)}`);
}

// -------------------- d. the last offseason step into a new season, correctly
{
  const state = load(seed, "offseason-TRAINING_CAMP");
  const me = Object.keys(state.programs).sort()[0];
  const r1 = advanceOffseasonStep(state, planOffseason(state));
  console.log(`\n=== d. TRAINING_CAMP -> ${r1.state.phase} season=${r1.state.season} week=${r1.state.week} step=${r1.state.offseasonStep ?? "-"} ===`);

  const before = r1.state.eventHistory.length;
  const prospectId = Object.keys(r1.state.prospects).sort()[0];
  const commands = [
    { type: "OFFER_PROSPECT", programId: me, prospectId, extend: true },
    { type: "SET_NIL_OFFER", programId: me, prospectId, weeklyAmount: 20_000 },
    { type: "SEARCH_PROSPECTS", programId: me, searchType: "SLEEPERS" },
    { type: "INVEST_RECRUITING_POINTS", programId: me, prospectId, points: 5 }
  ];
  const rr = beginSeason(r1.state, commands);
  const emitted = rr.eventHistory.slice(before);
  console.log(`   beginSeason -> season=${rr.season} week=${rr.week} phase=${rr.phase}; ${emitted.length} new events`);
  for (const c of commands) {
    const rej = emitted.find((e) => e.type === "COMMAND_REJECTED" && e.command?.type === c.type && e.programId === me);
    console.log(`     ${c.type.padEnd(26)} ${rej ? `REJECTED: ${rej.reason}` : "!! no rejection found"}`);
  }
  // Is the new season leavable?
  const w1 = advanceWeek(rr, []);
  console.log(`   advanceWeek -> season=${w1.state.season} week=${w1.state.week} phase=${w1.state.phase}`);
  console.log(`   prospects by status entering 2028: ${JSON.stringify(Object.values(rr.prospects).reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {}))}`);
  console.log(`   eventHistory length after rollover: ${rr.eventHistory.length} (cap 10000)`);
}
