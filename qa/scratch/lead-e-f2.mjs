/**
 * qa-lead triage of Brief E's F2: the SCOUT card's "leave it alone" branch
 * (card.baseline) against the readiness a week actually run without the SCOUT
 * focus delivered (WEEK_FOCUS_PAYOFF.scoutingReadiness).
 *
 * The program holds exactly one priority, INSTALL_OFFENSE, so a payoff event is
 * emitted (none is emitted when the focus list is empty) and SCOUT's baseline is
 * literally "what happens if you leave the film room alone".
 */
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "qa-cycle2-readiness,lead-f2-a,lead-f2-b").split(",");
const PID = process.argv[3] ?? "program-4";
const WEEKS = 8;
const num = (s) => (typeof s === "string" ? Number(s.replace(/[^0-9.\-]/g, "")) : s);

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, 24));
  console.log(`\n=== ${seed} / ${PID}`);
  console.log("wk  card baseline  card focused  delivered  baseline-gap");
  for (let week = 1; week <= WEEKS; week += 1) {
    if (state.phase !== "REGULAR_SEASON") break;

    const prepared = sim.prepareWeek(state, [
      { type: "SET_WEEK_FOCUS", programId: PID, focuses: ["INSTALL_OFFENSE"] }
    ]).state;

    const scout = sim.weekPriorities(prepared, PID).find((c) => c.focus === "SCOUT");
    const baseline = num(scout.baseline);
    const focused = num(scout.focused);

    const advanced = sim.advanceWeek(prepared, ai.planWeeklyCommands(prepared).filter((c) => c.programId !== PID));
    const payoff = advanced.events.find((e) => e.type === "WEEK_FOCUS_PAYOFF" && e.programId === PID);
    const delivered = payoff?.scoutingReadiness;
    const played = advanced.events.some(
      (e) => e.type === "GAME_COMPLETED" && (e.homeProgramId === PID || e.awayProgramId === PID)
    );

    const f = (v) => (v === undefined ? " --- " : Number(v).toFixed(2).padStart(5));
    const gap = delivered === undefined ? "---" : (delivered - baseline).toFixed(2).padStart(6);
    console.log(`${String(week).padStart(2)}  ${f(baseline)}         ${f(focused)}        ${f(delivered)}     ${gap}  ${played ? "" : "(BYE)"}`);

    state = advanced.state;
  }
}
