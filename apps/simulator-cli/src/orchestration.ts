import type { DecisionActor, GameCommand, GameState, ProgramId, SimulationResult } from "@college-legends/model";
import {
  planOffseasonCommands,
  planWeeklyCommands,
  weeklyPlanningKnowledgeSnapshot
} from "@college-legends/ai";
import {
  advanceOffseasonStepWithDecisions,
  advanceWeekWithDecisions,
  beginSeasonWithDecisions,
  createGameDecision,
  createWeeklyPlanningDecision,
  type WeeklyPlanningCommand
} from "@college-legends/simulation";

function aiActor(
  state: Readonly<GameState>,
  programId: ProgramId,
  policyId: "weekly-plan-v1" | "offseason-plan-v1"
): Extract<DecisionActor, { mode: "AI" }> {
  const program = state.programs[programId];
  return {
    mode: "AI",
    actorId: `ai:${programId}`,
    displayName: program ? `${program.abbreviation} staff` : "Program AI",
    policyId
  };
}

function isWeeklyPlanningCommand(command: GameCommand): command is WeeklyPlanningCommand {
  return command.type === "SET_WEEK_FOCUS" || command.type === "SET_SCOUTING_TARGET";
}

/**
 * Advance one headless career boundary through the same attributed command
 * envelopes used by the production worker. Domain simulation remains owned by
 * the existing begin/advance functions inside those wrappers.
 */
export function advanceHeadlessCareerStep(input: Readonly<GameState>): SimulationResult {
  if (input.phase === "ROSTER_REVIEW") {
    const result = beginSeasonWithDecisions(input, []);
    // The legacy CLI did not include roster-review setup events in its report.
    return { state: result.state, events: [] };
  }

  if (input.phase === "OFFSEASON") {
    const commands = planOffseasonCommands(input);
    const continuations = commands.filter((command): command is Extract<GameCommand, { type: "CONTINUE_OFFSEASON" }> =>
      command.type === "CONTINUE_OFFSEASON");
    const decisions = commands
      .filter((command) => command.type !== "CONTINUE_OFFSEASON")
      .map((command, sequence) => createGameDecision(
        input,
        command,
        aiActor(input, command.programId, "offseason-plan-v1"),
        sequence
      ));
    return advanceOffseasonStepWithDecisions(input, decisions, continuations);
  }

  const commands = planWeeklyCommands(input);
  const planningCommands = commands.filter(isWeeklyPlanningCommand);
  const planningDecisions = planningCommands.map((command, sequence) => createWeeklyPlanningDecision(
    input,
    command,
    aiActor(input, command.programId, "weekly-plan-v1"),
    sequence,
    weeklyPlanningKnowledgeSnapshot(input, command.programId)
  ));
  const otherDecisions = commands
    .filter((command) => !isWeeklyPlanningCommand(command))
    .map((command, sequence) => createGameDecision(
      input,
      command,
      aiActor(input, command.programId, "weekly-plan-v1"),
      planningDecisions.length + sequence
    ));
  return advanceWeekWithDecisions(input, [...planningDecisions, ...otherDecisions]);
}
