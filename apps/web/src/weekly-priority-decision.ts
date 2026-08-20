import type { DecisionStatus, GameState, ProgramId, WeekFocus } from "@college-legends/model";
import {
  WEEK_FOCUS_LABELS,
  activeFocuses,
  decisionCommandKey,
  focusCapacity,
  weekPriorities,
  type WeeklyPlanningCommand
} from "@college-legends/simulation";

export interface WeeklyPriorityDecisionView {
  id: string;
  status: DecisionStatus;
  focuses: WeekFocus[];
  summary: string;
  detail: string;
  action: "Set priority" | "Review" | "Change";
  attention: boolean;
}

const RECOMMENDATION_THRESHOLD = 65;

function focusSummary(focuses: readonly WeekFocus[]): string {
  return focuses.length > 0 ? focuses.map((focus) => WEEK_FOCUS_LABELS[focus]).join(" · ") : "No priorities set";
}

/**
 * One lifecycle projection consumed by every weekly-priority surface. State,
 * in-flight work, and the durable audit are inputs; React copy is not a second
 * source of truth.
 */
export function weeklyPriorityDecision(
  state: Readonly<GameState>,
  programId: ProgramId,
  inFlight: WeeklyPlanningCommand | null = null
): WeeklyPriorityDecisionView {
  const id = `weekly-priorities:${state.season}:${state.week}:${programId}`;
  const capacity = focusCapacity(state, programId).capacity;
  const focuses = activeFocuses(state, programId);
  const proposed = inFlight?.type === "SET_WEEK_FOCUS" && inFlight.programId === programId
    ? inFlight.focuses
    : null;

  if (proposed) {
    return {
      id,
      status: "PENDING",
      focuses: [...proposed],
      summary: `Applying ${focusSummary(proposed)}`,
      detail: "The staff plan is being committed and saved.",
      action: "Change",
      attention: false
    };
  }

  const audit = [...(state.decisionAudits ?? [])]
    .reverse()
    .find((candidate) => candidate.decisionId === id);
  if (audit?.status === "BLOCKED") {
    return {
      id,
      status: "BLOCKED",
      focuses,
      summary: audit.rejectionReason ?? "The staff plan could not be committed.",
      detail: "Review the plan and submit a legal set of priorities.",
      action: "Review",
      attention: true
    };
  }

  if (focuses.length < capacity) {
    const open = capacity - focuses.length;
    return {
      id,
      status: "REQUIRED",
      focuses,
      summary: `${open} priority slot${open === 1 ? "" : "s"} open`,
      detail: "Unused staff capacity is lost when the week advances.",
      action: "Set priority",
      attention: true
    };
  }

  const commandKey = decisionCommandKey({ type: "SET_WEEK_FOCUS", programId, focuses });
  if (audit?.status === "DONE" && audit.commandKey === commandKey) {
    return {
      id,
      status: "DONE",
      focuses,
      summary: `${focusSummary(focuses)} set`,
      detail: "Committed for this week.",
      action: "Change",
      attention: false
    };
  }

  const recommendation = [...weekPriorities(state, programId)]
    .filter((card) => !focuses.includes(card.focus) && !card.blocked && card.stakes >= RECOMMENDATION_THRESHOLD)
    .sort((left, right) => right.stakes - left.stakes || left.focus.localeCompare(right.focus))[0];
  if (recommendation) {
    return {
      id,
      status: "OPTIONAL",
      focuses,
      summary: `${recommendation.label} is worth reviewing`,
      detail: recommendation.stakesNote,
      action: "Review",
      attention: true
    };
  }

  return {
    id,
    status: "DONE",
    focuses,
    summary: `${focusSummary(focuses)} set`,
    detail: "The standing plan uses all available staff capacity.",
    action: "Change",
    attention: false
  };
}
