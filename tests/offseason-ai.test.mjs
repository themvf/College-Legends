import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague
} from "../packages/simulation/dist/index.js";
import { planOffseasonCommands, planWeeklyCommands } from "../packages/ai/dist/index.js";

/** A full career step, with rivals planning for whichever phase is open. */
function advance(state, excluded) {
  return state.phase === "OFFSEASON"
    ? advanceOffseasonStep(state, planOffseasonCommands(state, excluded))
    : advanceWeek(state, planWeeklyCommands(state, excluded));
}

test("the planner only speaks for the phase that is open", () => {
  let state = beginSeason(createFictionalLeague("offseason-ai-phase", 12));
  assert.deepEqual(planOffseasonCommands(state), [], "silent during the season");
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  assert.ok(planOffseasonCommands(state).length > 0, "and speaks once the offseason opens");
  assert.deepEqual(
    planWeeklyCommands(state),
    [],
    "the weekly planner stays quiet in the offseason rather than sending commands that would be refused"
  );
});

test("the planner excludes the human's program, as the weekly one does", () => {
  let state = beginSeason(createFictionalLeague("offseason-ai-exclude", 12));
  while (state.phase !== "OFFSEASON") state = advanceWeek(state).state;
  const excluded = "program-1";
  const commands = planOffseasonCommands(state, excluded);
  assert.ok(commands.length > 0);
  assert.ok(
    commands.every((command) => command.programId !== excluded),
    "the player makes his own offseason decisions"
  );
});

test("rivals actually compete in the offseason rather than standing still", () => {
  let state = beginSeason(createFictionalLeague("offseason-ai-participation", 24));
  const seen = { bids: 0, retentions: 0, signings: 0, camps: 0, coachChanges: 0 };
  const firstSeason = state.season;
  // Two full seasons, so a coaching market and a second portal window both open.
  while (state.season < firstSeason + 2) {
    if (state.phase === "OFFSEASON") {
      const commands = planOffseasonCommands(state);
      seen.bids += commands.filter((command) => command.type === "BID_PORTAL_PLAYER").length;
      seen.camps += commands.filter((command) => command.type === "SET_TRAINING_CAMP_FOCUS").length;
      seen.coachChanges += commands.filter((command) => command.type === "REPLACE_STAFF").length;
      const result = advanceOffseasonStep(state, commands);
      seen.signings += result.events.filter((event) => event.type === "PORTAL_PLAYER_SIGNED").length;
      seen.retentions += result.events.filter((event) =>
        event.type === "PORTAL_PLAYER_SIGNED" && event.retained).length;
      if (state.offseasonStep === "PORTAL") {
        for (const program of Object.values(result.state.programs)) {
          const scholarships = Object.values(result.state.players).filter((player) =>
            player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP"
          ).length;
          assert.ok(
            scholarships <= program.scholarshipLimit,
            `${program.id} cannot leave the AI portal market over its scholarship limit`
          );
          assert.ok(result.state.recruiting[program.id].points >= 0, `${program.id} cannot overspend portal points`);
        }
      }
      state = result.state;
      continue;
    }
    state = advanceWeek(state, planWeeklyCommands(state)).state;
  }
  assert.ok(seen.bids > 0, `rivals must bid on the portal, saw ${seen.bids}`);
  assert.ok(seen.signings > 0, `and some of those bids must land, saw ${seen.signings}`);
  assert.ok(seen.retentions > 0, `and somebody must keep a man he was losing, saw ${seen.retentions}`);
  assert.ok(seen.camps > 0, `every program should set a camp focus, saw ${seen.camps}`);
});

test("rivals never bid past their own points or donor ceiling", () => {
  let state = beginSeason(createFictionalLeague("offseason-ai-limits", 24));
  while (state.phase !== "OFFSEASON") state = advanceWeek(state, planWeeklyCommands(state)).state;
  const commands = planOffseasonCommands(state);
  const byProgram = new Map();
  for (const command of commands) {
    if (command.type !== "BID_PORTAL_PLAYER") continue;
    const running = byProgram.get(command.programId) ?? { points: 0, nil: 0 };
    running.points += command.points;
    running.nil += command.weeklyNil;
    byProgram.set(command.programId, running);
  }
  assert.ok(byProgram.size > 0, "somebody must be bidding for this to test anything");
  const result = advanceOffseasonStep(state, commands);
  assert.ok(
    !result.events.some((event) =>
      event.type === "COMMAND_REJECTED" && event.command.type === "BID_PORTAL_PLAYER"),
    "a rival should never send a bid the engine has to refuse"
  );
});

test("the league does not churn its entire coaching staff every single year", () => {
  let state = beginSeason(createFictionalLeague("offseason-ai-coaching", 24));
  const programCount = Object.keys(state.programs).length;
  let changes = 0;
  const firstSeason = state.season;
  while (state.season < firstSeason + 2) {
    if (state.phase === "OFFSEASON") {
      const commands = planOffseasonCommands(state);
      const result = advanceOffseasonStep(state, commands);
      changes += result.events.filter((event) => event.type === "STAFF_REPLACED").length;
      state = result.state;
      continue;
    }
    state = advanceWeek(state, planWeeklyCommands(state)).state;
  }
  // Measured at 0.18 changes per program per year — a post turning over about
  // every five seasons. The floor that matters is the upper one: at the old
  // +8 threshold this ran to 41 changes, nearly one per program per year.
  const perProgramPerYear = changes / programCount / 2;
  assert.ok(
    perProgramPerYear < 0.4,
    `a coaching change must clear the buyout to be worth it, saw ${perProgramPerYear.toFixed(2)} per program per year`
  );
});

test("a career with rivals planning both phases replays byte-identically", () => {
  const run = () => {
    let state = beginSeason(createFictionalLeague("offseason-ai-replay", 12));
    const firstSeason = state.season;
    while (state.season < firstSeason + 1) state = advance(state).state;
    return state;
  };
  assert.deepEqual(run(), run());
});
