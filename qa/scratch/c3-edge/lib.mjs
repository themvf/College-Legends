import { createHash } from "node:crypto";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague
} from "../../../packages/simulation/dist/index.js";
import {
  planOffseasonCommands,
  planWeeklyCommands,
  portalPlanningKnowledgeViews,
  weeklyBusinessPlanningKnowledgeViews
} from "../../../packages/ai/dist/index.js";

export function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

/** Deterministic stable-ish serialisation of the whole prospect market. */
export function prospectFingerprint(state) {
  const rows = Object.keys(state.prospects).sort().map((id) => {
    const p = state.prospects[id];
    return [id, p.status, p.signedProgramId ?? "-", JSON.stringify(Object.entries(p.interestByProgram ?? {}).sort())].join("|");
  });
  return rows.join("\n");
}

export function nilFingerprint(state) {
  return Object.keys(state.nil ?? {}).sort().map((programId) => {
    const nil = state.nil[programId];
    return [
      programId,
      JSON.stringify(Object.entries(nil.offersByProspect ?? {}).sort()),
      JSON.stringify(Object.entries(nil.commitmentsByPlayer ?? {}).sort())
    ].join("|");
  }).join("\n");
}

export function recruitingFingerprint(state) {
  return Object.keys(state.recruiting ?? {}).sort().map((programId) => {
    const r = state.recruiting[programId];
    return [
      programId,
      r.points,
      r.visitsUsedThisSeason,
      [...r.offeredProspectIds].sort().join(","),
      JSON.stringify(Object.entries(r.scoutingByProspect ?? {}).sort().map(([k, v]) => [k, v.pursuitPoints, v.visitsUsed ?? 0, [...v.evaluations].sort()]))
    ].join("|");
  }).join("\n");
}

/** Everything except the event log, which carries emission order by construction. */
export function stateFingerprint(state) {
  const { eventHistory, decisionAudits, ...rest } = state;
  return hash(rest);
}

export function planWeek(state) {
  const businessViews = weeklyBusinessPlanningKnowledgeViews(state);
  return planWeeklyCommands(state, undefined, businessViews);
}

export function planOffseason(state) {
  const portalViews = state.offseasonStep === "PORTAL" ? portalPlanningKnowledgeViews(state) : undefined;
  return planOffseasonCommands(state, undefined, portalViews);
}

/** One career step with AI commands for every program. */
export function step(state, extraCommands = []) {
  if (state.phase === "ROSTER_REVIEW") return { state: beginSeason(state, extraCommands), events: [] };
  if (state.phase === "OFFSEASON") return advanceOffseasonStep(state, [...planOffseason(state), ...extraCommands]);
  return advanceWeek(state, [...planWeek(state), ...extraCommands]);
}

export function league(seed, programCount = 72) {
  return createFictionalLeague(seed, programCount);
}

export function rejections(events) {
  return events.filter((event) => event.type === "COMMAND_REJECTED");
}

/** Deterministic shuffle with a fixed permutation, so a run is reproducible. */
export function fixedShuffle(items, salt = 1) {
  const keyed = items.map((item, index) => ({ item, key: ((index + 1) * 2654435761 + salt * 40503) % 1000003 }));
  keyed.sort((a, b) => a.key - b.key);
  return keyed.map((entry) => entry.item);
}

/** Group commands by program, preserving each program's internal order. */
export function byProgramBlocks(commands) {
  const blocks = new Map();
  for (const command of commands) {
    const key = command.programId ?? "-";
    if (!blocks.has(key)) blocks.set(key, []);
    blocks.get(key).push(command);
  }
  return [...blocks.entries()];
}
