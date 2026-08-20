import type {
  DecisionAuditRecord,
  DecisionClock,
  DecisionItem,
  DecisionKnowledgeSnapshot,
  DecisionProjection,
  DecisionProjectedEffect,
  DecisionRecord,
  DecisionStatus,
  GameCommand,
  GameEvent,
  GameState
} from "@college-legends/model";

/** Roughly two full 72-program seasons at two planning decisions per week. */
export const DECISION_AUDIT_LIMIT = 4_096;

/**
 * Keep player-owned and standing origins ahead of high-volume autonomous
 * receipts, then use any remaining room for the newest audits. This remains
 * bounded while preventing one 72-program week from erasing the player's
 * still-effective choice.
 */
export function retainedDecisionAudits(
  audits: readonly DecisionAuditRecord[],
  limit = DECISION_AUDIT_LIMIT
): DecisionAuditRecord[] {
  const protectedIds = new Set(audits
    .filter((audit) => audit.actor.mode !== "AI" || audit.outcomePending)
    .slice(-limit)
    .map((audit) => audit.submissionId));
  const recent = audits.slice(-Math.max(0, limit - protectedIds.size));
  const retainedIds = new Set([...protectedIds, ...recent.map((audit) => audit.submissionId)]);
  return audits.filter((audit) => retainedIds.has(audit.submissionId)).slice(-limit);
}

/** Keep referenced causal events plus the ordinary rolling feed, in one store. */
export function retainedDecisionEventHistory(
  events: readonly GameEvent[],
  audits: readonly DecisionAuditRecord[],
  recentLimit: number
): GameEvent[] {
  const causalIds = new Set(audits.flatMap((audit) => audit.causes.map((cause) => cause.id)));
  for (const audit of audits) {
    for (const cause of audit.standingOutcome?.causes ?? []) causalIds.add(cause.id);
  }
  const recentStart = Math.max(0, events.length - recentLimit);
  return events.filter((event, index) => index >= recentStart
    || (event.decisionCauseId !== undefined && causalIds.has(event.decisionCauseId))
    || event.decisionOutcomeCauseIds?.some((causeId) => causalIds.has(causeId)) === true);
}

const STATUS_TRANSITIONS: Readonly<Record<DecisionStatus, readonly DecisionStatus[]>> = {
  REQUIRED: ["PENDING", "DELEGATED", "BLOCKED"],
  OPTIONAL: ["PENDING", "DELEGATED"],
  DELEGATED: ["PENDING", "BLOCKED"],
  PENDING: ["DONE", "BLOCKED"],
  DONE: [],
  BLOCKED: ["PENDING", "DELEGATED"]
};

/** One lifecycle table for every surface; local features should not fork it. */
export function canTransitionDecisionStatus(from: DecisionStatus, to: DecisionStatus): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalValue(entry)]);
    return Object.fromEntries(entries);
  }
  return value;
}

/** Stable identity for the exact GameCommand, independent of object key order. */
export function decisionCommandKey(command: Readonly<GameCommand>): string {
  return JSON.stringify(canonicalValue(command));
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
  }
  return value;
}

function canonicalKnowledgeJson(knowledge: Readonly<DecisionKnowledgeSnapshot>): string {
  return JSON.stringify(canonicalValue(knowledge));
}

function knowledgeHash(value: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193);
    right = Math.imul(right ^ code, 0x85ebca6b);
  }
  return `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0).toString(16).padStart(8, "0")}`;
}

/** Stable content identity for one exact canonical knowledge snapshot. */
export function decisionKnowledgeId(knowledge: Readonly<DecisionKnowledgeSnapshot>): string {
  const canonical = canonicalKnowledgeJson(knowledge);
  return `knowledge:v1:${canonical.length}:${knowledgeHash(canonical)}`;
}

/** Intern an immutable snapshot, rejecting any content-address collision. */
export function internDecisionKnowledge(
  pool: Record<string, DecisionKnowledgeSnapshot>,
  knowledge: Readonly<DecisionKnowledgeSnapshot>
): string {
  const canonical = canonicalKnowledgeJson(knowledge);
  const id = `knowledge:v1:${canonical.length}:${knowledgeHash(canonical)}`;
  const existing = pool[id];
  if (existing) {
    if (canonicalKnowledgeJson(existing) !== canonical) {
      throw new Error(`Decision knowledge id collision for ${id}.`);
    }
    return id;
  }
  pool[id] = freezeDeep(structuredClone(knowledge));
  return id;
}

/** Resolve and validate an audit's exact program and simulation-boundary view. */
export function decisionKnowledgeFor(
  state: Pick<GameState, "decisionKnowledge">,
  audit: Pick<DecisionAuditRecord, "knowledgeId" | "programId" | "submittedAt">
): Readonly<DecisionKnowledgeSnapshot> {
  const knowledge = state.decisionKnowledge?.[audit.knowledgeId];
  if (!knowledge) throw new Error(`Missing decision knowledge reference: ${audit.knowledgeId}.`);
  if (decisionKnowledgeId(knowledge) !== audit.knowledgeId) {
    throw new Error(`Decision knowledge content does not match reference: ${audit.knowledgeId}.`);
  }
  if (knowledge.programId !== audit.programId) {
    throw new Error("Decision knowledge and audit must belong to the same program.");
  }
  if (knowledge.season !== audit.submittedAt.season
    || knowledge.week !== audit.submittedAt.week
    || knowledge.phase !== audit.submittedAt.phase) {
    throw new Error("Decision knowledge and audit must describe the same simulation boundary.");
  }
  return knowledge;
}

/** Keep exactly the knowledge referenced by retained audits, in audit order. */
export function retainedDecisionKnowledge(
  pool: Readonly<Record<string, DecisionKnowledgeSnapshot>>,
  audits: readonly DecisionAuditRecord[]
): Record<string, DecisionKnowledgeSnapshot> {
  const retained: Record<string, DecisionKnowledgeSnapshot> = {};
  for (const audit of audits) {
    const knowledge = decisionKnowledgeFor({ decisionKnowledge: pool as Record<string, DecisionKnowledgeSnapshot> }, audit);
    const retainedId = internDecisionKnowledge(retained, knowledge);
    if (retainedId !== audit.knowledgeId) {
      throw new Error(`Decision knowledge content does not match reference: ${audit.knowledgeId}.`);
    }
  }
  return retained;
}

/**
 * Creates an immutable preview around the same command the engine will resolve.
 * The redacted knowledge snapshot is the projector's only parameter, and it is
 * validated here so projections cannot cross program boundaries accidentally.
 */
export function createDecisionProjection<TCommand extends GameCommand>(
  item: DecisionItem,
  command: TCommand,
  knowledge: DecisionKnowledgeSnapshot,
  project: (visible: Readonly<DecisionKnowledgeSnapshot>) => readonly DecisionProjectedEffect[]
): DecisionProjection<TCommand> {
  if (!item.id.trim()) throw new Error("A decision needs a stable id.");
  if (command.programId !== item.programId || command.programId !== knowledge.programId) {
    throw new Error("A decision projection can only use knowledge from the command's program.");
  }
  const visible = freezeDeep(structuredClone(knowledge));
  const effects = project(visible);
  for (const effect of effects) {
    if (!effect.key.trim() || !effect.unit.trim() || !effect.source.trim()) {
      throw new Error("Every projected effect needs a key, unit, and resolving source.");
    }
    if (!Number.isFinite(effect.low) || !Number.isFinite(effect.high) || effect.low > effect.high) {
      throw new Error("Projected effect ranges must be finite and ordered.");
    }
    if (!Number.isFinite(effect.confidence) || effect.confidence < 0 || effect.confidence > 1) {
      throw new Error("Projection confidence must be between zero and one.");
    }
  }
  return freezeDeep(structuredClone({ item, command, knowledge: visible, effects }));
}

/** Convert a chosen projection into the one PENDING command record. */
export function submitDecisionProjection<TCommand extends GameCommand>(
  projection: Readonly<DecisionProjection<TCommand>>,
  submittedAt: DecisionClock
): DecisionRecord<TCommand> {
  if (submittedAt.season !== projection.knowledge.season
    || submittedAt.week !== projection.knowledge.week
    || submittedAt.phase !== projection.knowledge.phase) {
    throw new Error("Decision timing and knowledge timing must describe the same simulation boundary.");
  }
  return freezeDeep(structuredClone({
    id: projection.item.id,
    submissionId: `${projection.item.id}:submission:${submittedAt.sequence}`,
    status: "PENDING" as const,
    command: projection.command,
    actor: projection.item.actor,
    knowledge: projection.knowledge,
    submittedAt
  }));
}

/** Build a causal audit that references, rather than re-implements, domain events. */
export function createDecisionAudit(
  decision: Readonly<DecisionRecord>,
  knowledgeId: string,
  domainEvents: readonly { type: string }[],
  rejectionReason: string | null,
  acceptedResolution: "IMMEDIATE" | "STANDING" = "IMMEDIATE"
): DecisionAuditRecord {
  const resolution = rejectionReason === null ? acceptedResolution : "REJECTED";
  return freezeDeep({
    decisionId: decision.id,
    submissionId: decision.submissionId,
    commandType: decision.command.type,
    commandKey: decisionCommandKey(decision.command),
    programId: decision.command.programId,
    actor: structuredClone(decision.actor),
    knowledgeId,
    submittedAt: structuredClone(decision.submittedAt),
    status: rejectionReason === null ? "DONE" : "BLOCKED",
    resolution,
    outcomePending: resolution === "STANDING",
    standingOutcome: null,
    causes: domainEvents.map((event, ordinal) => ({
      id: `${decision.submissionId}:event:${ordinal}`,
      eventType: event.type,
      ordinal
    })),
    rejectionReason
  });
}
