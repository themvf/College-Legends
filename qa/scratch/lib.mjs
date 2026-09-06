import * as sim from "../../packages/simulation/dist/index.js";
import * as ai from "../../packages/ai/dist/index.js";

export const { createFictionalLeague, beginSeason, advanceWeek, advanceOffseasonStep, prepareWeek } = sim;
export const { planWeeklyCommands, planOffseasonCommands } = ai;
export { sim, ai };

/** One career step, matching the charter's phase loop. */
export function step(state) {
  if (state.phase === "ROSTER_REVIEW") return sim.beginSeason(state);
  const commands = state.phase === "OFFSEASON"
    ? ai.planOffseasonCommands(state)
    : ai.planWeeklyCommands(state);
  const result = state.phase === "OFFSEASON"
    ? sim.advanceOffseasonStep(state, commands)
    : sim.advanceWeek(state, commands);
  return result.state ?? result;
}

export function stepFull(state) {
  if (state.phase === "ROSTER_REVIEW") return { state: sim.beginSeason(state), events: [] };
  const commands = state.phase === "OFFSEASON"
    ? ai.planOffseasonCommands(state)
    : ai.planWeeklyCommands(state);
  return state.phase === "OFFSEASON"
    ? sim.advanceOffseasonStep(state, commands)
    : sim.advanceWeek(state, commands);
}

export function league(seed, size) {
  return size === undefined ? createFictionalLeague(seed) : createFictionalLeague(seed, size);
}
