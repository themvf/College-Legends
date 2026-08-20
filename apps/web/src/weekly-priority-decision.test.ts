import { describe, expect, it } from "vitest";
import { beginSeason, commitWeeklyDecision, createFictionalLeague, createWeeklyPlanningDecision, focusCapacity, weekPriorities } from "@college-legends/simulation";
import { weeklyPriorityDecision } from "./weekly-priority-decision.js";

function fixture() {
  const state = beginSeason(createFictionalLeague("weekly-priority-view", 12));
  const programId = Object.keys(state.programs)[0]!;
  return { state, programId };
}

describe("weekly priority decision lifecycle", () => {
  it("projects required and pending from one canonical item", () => {
    const { state, programId } = fixture();
    state.weekFocus[programId] = [];
    const required = weeklyPriorityDecision(state, programId);
    expect(required).toMatchObject({
      id: `weekly-priorities:${state.season}:${state.week}:${programId}`,
      status: "REQUIRED",
      attention: true
    });
    expect(required.summary).toBe(`${focusCapacity(state, programId).capacity} priority slot${focusCapacity(state, programId).capacity === 1 ? "" : "s"} open`);

    const pending = weeklyPriorityDecision(state, programId, {
      type: "SET_WEEK_FOCUS",
      programId,
      focuses: ["DEVELOP"]
    });
    expect(pending).toMatchObject({ status: "PENDING", focuses: ["DEVELOP"], attention: false });
    expect(pending.summary).toContain("Coach a player up");
  });

  it("reconstructs done and blocked from the durable audit", () => {
    const { state, programId } = fixture();
    const focuses = [...weekPriorities(state, programId)]
      .sort((left, right) => right.stakes - left.stakes)
      .slice(0, focusCapacity(state, programId).capacity)
      .map((card) => card.focus);
    const decision = createWeeklyPlanningDecision(state, {
      type: "SET_WEEK_FOCUS",
      programId,
      focuses
    }, {
      mode: "MANUAL",
      actorId: `player:${programId}`,
      displayName: "Player"
    });
    const committed = commitWeeklyDecision(state, decision).state;
    expect(weeklyPriorityDecision(committed, programId)).toMatchObject({
      status: "DONE",
      focuses,
      attention: false
    });

    const blocked = structuredClone(committed);
    blocked.decisionAudits![blocked.decisionAudits!.length - 1] = {
      ...blocked.decisionAudits!.at(-1)!,
      status: "BLOCKED",
      rejectionReason: "This plan exceeds staff capacity."
    };
    expect(weeklyPriorityDecision(blocked, programId)).toMatchObject({
      status: "BLOCKED",
      summary: "This plan exceeds staff capacity.",
      attention: true
    });
  });
});
