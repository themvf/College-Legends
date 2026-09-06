/**
 * Brief B §5 — timing boundaries.
 *
 *   a. week 1 of season 1: no prior week, no film. The tier gate must fire and
 *      readiness must still pay from the first point.
 *   b. SIGNING_WEEK (12) and the two weeks after it.
 *   c. the week-14 rollover into OFFSEASON.
 *   d. the final offseason step into a new season.
 *
 * Fixtures are real snapshots. Commands only; nothing written into `state`.
 */
import { readFileSync } from "node:fs";
import {
  advanceWeek, advanceOffseasonStep, beginSeason,
  scoutingReport, scoutingBoard, scoutingReadiness, filmGamesAvailable, scheduledOpponent,
  scoutingConfidence, SIGNING_WEEK, READINESS_CAP, SCOUTING_TIERS, FULL_FILE_READINESS
} from "../../../packages/simulation/dist/index.js";
import { planWeek, planOffseason } from "./lib.mjs";

const snapDir = new URL("./snap/", import.meta.url).pathname;
const load = (seed, name) => JSON.parse(readFileSync(`${snapDir}${seed}.${name}.json`, "utf8"));
const seed = process.argv[2] ?? "qa-c3-market-1";

// ---------------------------------------------------------------- a. week 1
{
  const state = load(seed, "s1-w1");
  const me = Object.keys(state.programs).sort()[0];
  const opponent = scheduledOpponent(state, me);
  console.log(`=== a. season ${state.season} week ${state.week}: no prior week ===`);
  console.log(`   opponent=${opponent?.opponentProgramId} filmGames=${opponent ? filmGamesAvailable(state, opponent.opponentProgramId) : "n/a"}`);
  console.log(`   readiness curve: 0=${scoutingReadiness(0)} 1=${scoutingReadiness(1)} 20=${scoutingReadiness(20)} ${READINESS_CAP}=${scoutingReadiness(READINESS_CAP)} ${READINESS_CAP + 100}=${scoutingReadiness(READINESS_CAP + 100)}`);
  console.log(`   readiness at negative points: ${scoutingReadiness(-50)}  at NaN: ${scoutingReadiness(NaN)}  at Infinity: ${scoutingReadiness(Infinity)}`);
  console.log(`   SCOUTING_TIERS=${JSON.stringify(SCOUTING_TIERS)} FULL_FILE_READINESS=${FULL_FILE_READINESS}`);
  const report = scoutingReport(state, me);
  console.log(`   scoutingReport(week 1): ${JSON.stringify(report).slice(0, 700)}`);
  const board = scoutingBoard(state, me);
  console.log(`   scoutingBoard rows=${board.length}`);
  for (const row of board.slice(0, 4)) {
    console.log(`     wk${row.week} vs ${row.opponentProgramId} film=${filmGamesAvailable(state, row.opponentProgramId)} points=${row.points} tier=${row.tier ?? "-"} confidence=${row.confidence} readiness=${row.readiness ?? "-"} value=${row.value}`);
  }
  // The gate itself: confidence and tier at each threshold with zero film.
  for (const points of [0, 1, 19, 20, 44, 45, 74, 75, 500]) {
    const conf = scoutingConfidence(state, me, 0, points);
    const confWithFilm = scoutingConfidence(state, me, 3, points);
    console.log(`     points=${String(points).padEnd(4)} film0 -> ${JSON.stringify(conf)}   film3 -> ${JSON.stringify(confWithFilm)}   readiness=${scoutingReadiness(points)}`);
  }
  // lastWeeklyNet, the documented "reads last week" rule, at week 1.
  const nets = Object.values(state.programs).map((p) => p.lastWeeklyNet);
  console.log(`   lastWeeklyNet at week 1: distinct=${JSON.stringify([...new Set(nets)].slice(0, 5))} anyNaN=${nets.some((n) => Number.isNaN(n))} anyUndefined=${nets.some((n) => n === undefined)}`);
  const { state: after, events } = advanceWeek(state, planWeek(state));
  console.log(`   advanceWeek from w1 -> week ${after.week}, ${events.length} events, rejected=${events.filter((e) => e.type === "COMMAND_REJECTED").length}`);
}

// ------------------------------------------------------- b. the signing week
for (const name of ["s1-w11", "s1-w12", "s1-w13", "s1-w14"]) {
  const state = load(seed, name);
  const me = Object.keys(state.programs).sort()[0];
  const target = state.recruiting[me].discoveredProspectIds
    .find((id) => state.prospects[id]?.status === "AVAILABLE");
  const counts = {};
  for (const p of Object.values(state.prospects)) counts[p.status] = (counts[p.status] ?? 0) + 1;
  const cmds = target ? [
    { type: "EVALUATE_PROSPECT", programId: me, prospectId: target, evaluation: "BASIC" },
    { type: "OFFER_PROSPECT", programId: me, prospectId: target, extend: true },
    { type: "INVEST_RECRUITING_POINTS", programId: me, prospectId: target, points: 20 }
  ] : [];
  const { state: after, events } = advanceWeek(state, [...planWeek(state), ...cmds]);
  const afterCounts = {};
  for (const p of Object.values(after.prospects)) afterCounts[p.status] = (afterCounts[p.status] ?? 0) + 1;
  const rej = events.filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
  console.log(`\n=== b. week ${state.week} (SIGNING_WEEK=${SIGNING_WEEK}) ===`);
  console.log(`   before ${JSON.stringify(counts)}`);
  console.log(`   after  ${JSON.stringify(afterCounts)}  -> week ${after.week} phase ${after.phase} step ${after.offseasonStep ?? "-"}`);
  console.log(`   PROSPECT_SIGNED=${events.filter((e) => e.type === "PROSPECT_SIGNED").length} PROSPECT_COMMITTED=${events.filter((e) => e.type === "PROSPECT_COMMITTED").length} PROSPECT_FLIPPED=${events.filter((e) => e.type === "PROSPECT_FLIPPED").length}`);
  console.log(`   my commands rejected: ${rej.length ? rej.map((r) => `${r.command.type}: ${r.reason}`).join(" | ") : "none"}`);
  if (after.phase === "OFFSEASON") {
    console.log(`   ROLLOVER: offseasonStep=${after.offseasonStep}`);
    const stuck = Object.values(after.prospects).filter((p) => p.status === "COMMITTED");
    console.log(`   prospects still COMMITTED across the rollover: ${stuck.length}`);
  }
}

// ------------------------------------ c/d. offseason steps and the wrong step
{
  const steps = ["BOARD_REVIEW", "PORTAL", "SIGNING_DAY", "COACHING", "TRAINING_CAMP"];
  const probes = (me, prospectId, playerId) => [
    { type: "OFFER_PROSPECT", programId: me, prospectId, extend: true },
    { type: "SET_NIL_OFFER", programId: me, prospectId, weeklyAmount: 20_000 },
    { type: "INVEST_RECRUITING_POINTS", programId: me, prospectId, points: 5 },
    { type: "SEARCH_PROSPECTS", programId: me, searchType: "SLEEPERS" },
    { type: "BID_PORTAL_PLAYER", programId: me, playerId, points: 10, weeklyNil: 10_000 },
    { type: "SET_TRAINING_CAMP_FOCUS", programId: me, focus: "INSTALL" },
    { type: "SET_TICKET_PRICE", programId: me, price: 40 },
    { type: "SET_WEEK_FOCUS", programId: me, focuses: ["SCOUT"] }
  ];
  for (const step of steps) {
    const state = load(seed, `offseason-${step}`);
    const me = Object.keys(state.programs).sort()[0];
    const prospectId = Object.keys(state.prospects).sort().find((id) => state.prospects[id].status !== "ENROLLED") ?? Object.keys(state.prospects)[0];
    const playerId = Object.keys(state.portal ?? {})[0] ?? "player:none";
    const cmds = probes(me, prospectId, playerId);
    const { events } = advanceOffseasonStep(state, cmds);
    console.log(`\n=== c. offseason step ${step} (phase=${state.phase}) ===`);
    for (const c of cmds) {
      const rej = events.find((e) => e.type === "COMMAND_REJECTED" && e.command === c);
      const accepted = events.some((e) => e.programId === me && ["PORTAL_BID_SET", "TRAINING_CAMP_SET", "PROSPECT_OFFERED", "NIL_OFFER_SET", "RECRUITING_INVESTMENT", "PROSPECTS_DISCOVERED", "TICKET_PRICE_SET", "WEEK_FOCUS_SET"].includes(e.type));
      console.log(`   ${c.type.padEnd(26)} ${rej ? `REJECTED: ${rej.reason}` : accepted ? "accepted (some matching event)" : "!! NO REJECTION AND NO EVENT"}`);
    }
  }
}

// -------------------------------- d. the last offseason step into a new season
{
  let state = load(seed, "offseason-TRAINING_CAMP");
  const me = Object.keys(state.programs).sort()[0];
  const r1 = advanceOffseasonStep(state, planOffseason(state));
  console.log(`\n=== d. TRAINING_CAMP -> ${r1.state.phase} season=${r1.state.season} week=${r1.state.week} step=${r1.state.offseasonStep ?? "-"} ===`);
  // Another offseason step from ROSTER_REVIEW — is it refused, or does it run?
  let r2;
  try { r2 = advanceOffseasonStep(r1.state, [{ type: "CONTINUE_OFFSEASON", programId: me }]); }
  catch (error) { console.log(`   advanceOffseasonStep in ${r1.state.phase} THREW: ${error.message}`); }
  if (r2) console.log(`   advanceOffseasonStep in ${r1.state.phase} -> phase=${r2.state.phase} season=${r2.state.season} week=${r2.state.week} rejected=${r2.events.filter((e) => e.type === "COMMAND_REJECTED").length}`);
  // advanceWeek from ROSTER_REVIEW, before beginSeason.
  let r3;
  try { r3 = advanceWeek(r1.state, []); }
  catch (error) { console.log(`   advanceWeek in ROSTER_REVIEW THREW: ${error.message}`); }
  if (r3) console.log(`   advanceWeek in ROSTER_REVIEW -> phase=${r3.state.phase} season=${r3.state.season} week=${r3.state.week} rejected=${r3.events.filter((e) => e.type === "COMMAND_REJECTED").length}`);
  // Recruiting commands in ROSTER_REVIEW, through beginSeason.
  const prospectId = Object.keys(r1.state.prospects).sort()[0];
  const rr = beginSeason(r1.state, prospectId ? [
    { type: "OFFER_PROSPECT", programId: me, prospectId, extend: true },
    { type: "SET_NIL_OFFER", programId: me, prospectId, weeklyAmount: 20_000 },
    { type: "SEARCH_PROSPECTS", programId: me, searchType: "SLEEPERS" }
  ] : []);
  const rrEvents = rr.eventHistory.slice(-60).filter((e) => e.type === "COMMAND_REJECTED" && e.programId === me);
  console.log(`   beginSeason with recruiting commands -> season=${rr.season} week=${rr.week} phase=${rr.phase}`);
  console.log(`   rejections: ${rrEvents.length ? rrEvents.map((e) => `${e.command.type}: ${e.reason}`).join(" | ") : "!! none"}`);
}
