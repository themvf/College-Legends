import type {
  GameCommand,
  GameState,
  Position,
  ProgramId,
  Prospect,
  RecruitingEvaluation
} from "@college-legends/model";
import type { ProspectScoutingReport } from "@college-legends/simulation";
import {
  MAX_VISITS_PER_SEASON,
  ROSTER_COMPOSITION,
  SIGNING_WEEK,
  VISIT_COST,
  committedNilTotal,
  nilAskingPriceRange,
  prospectScoutingReport,
  projectedRecruitingOpenings,
  recruitingEvaluationCost,
  recruitingSearchCost,
  weeklyDonorCapacity
} from "@college-legends/simulation";

export type RecruitingStatusFilter = "ALL" | "AVAILABLE" | "MINE" | "FLIP";
export type RecruitingSort = "STATUS" | "PURSUIT" | "FIT" | "OVERALL" | "NEED" | "NAME";

export interface RecruitingFilters {
  query: string;
  position: Position | "ALL";
  status: RecruitingStatusFilter;
  offeredOnly: boolean;
  sort: RecruitingSort;
}

export interface PositionRoom {
  position: Position;
  currentScholarships: number;
  expectedReturners: number;
  incoming: number;
  projected: number;
  target: number;
  bestReturningOverall: number | null;
  plan: "THIN" | "BALANCED" | "CROWDED";
}

export interface RecruitingLedger {
  pointsAvailable: number;
  queuedPointSpend: number;
  weeklyPoints: number;
  projectedOpenings: number;
  commitments: number;
  visitsRemaining: number;
  activeScholarshipOffers: number;
  nilCapacity: number;
  nilCommitted: number;
  nilReserved: number;
  nilFree: number;
  effectiveNilOffers: Record<string, number>;
  effectiveScholarshipOffers: ReadonlySet<string>;
}

export interface ProspectBoardItem {
  prospect: Prospect;
  report: ProspectScoutingReport;
  evaluationCount: number;
  offered: boolean;
  queuedOffer: boolean;
  queuedInvestment: number;
  pendingEvaluations: RecruitingEvaluation[];
  queuedVisit: boolean;
  currentNilOffer: number;
  effectiveNilOffer: number;
  ask: ReturnType<typeof nilAskingPriceRange> | null;
  isMine: boolean;
  flipTarget: boolean;
  resolved: boolean;
  statusLabel: string;
}

/**
 * Recruiting commands must coexist across prospects and action types. This is
 * deliberately exported so the queue, UI projections, and tests all use the
 * same identity contract.
 */
export function recruitingCommandKey(command: GameCommand): string | null {
  if (command.type === "SEARCH_PROSPECTS") return `recruit-search:${command.searchType}:${command.position ?? "ALL"}`;
  if (command.type === "EVALUATE_PROSPECT") return `recruit-eval:${command.prospectId}:${command.evaluation}`;
  if (command.type === "INVEST_RECRUITING_POINTS") return `recruit-invest:${command.prospectId}`;
  if (command.type === "OFFER_PROSPECT") return `recruit-offer:${command.prospectId}`;
  if (command.type === "SCHEDULE_VISIT") return `recruit-visit:${command.prospectId}`;
  if (command.type === "SET_NIL_OFFER") return `recruit-nil:${command.prospectId}`;
  return null;
}

export function queuedRecruitingCost(command: GameCommand): number {
  if (command.type === "SEARCH_PROSPECTS") return recruitingSearchCost(command.searchType);
  if (command.type === "EVALUATE_PROSPECT") return recruitingEvaluationCost(command.evaluation);
  if (command.type === "INVEST_RECRUITING_POINTS") return command.points;
  if (command.type === "SCHEDULE_VISIT") return VISIT_COST;
  return 0;
}

export function effectiveNilOffers(
  state: Readonly<GameState>,
  programId: ProgramId,
  pending: readonly GameCommand[]
): Record<string, number> {
  const offers = { ...(state.nil?.[programId]?.offersByProspect ?? {}) };
  for (const command of pending) {
    if (command.type !== "SET_NIL_OFFER" || command.programId !== programId) continue;
    if (command.weeklyAmount <= 0) delete offers[command.prospectId];
    else offers[command.prospectId] = command.weeklyAmount;
  }
  return offers;
}

export function effectiveScholarshipOffers(
  state: Readonly<GameState>,
  programId: ProgramId,
  pending: readonly GameCommand[]
): ReadonlySet<string> {
  const offers = new Set(state.recruiting[programId]?.offeredProspectIds ?? []);
  for (const command of pending) {
    if (command.type !== "OFFER_PROSPECT" || command.programId !== programId) continue;
    if (command.extend) offers.add(command.prospectId);
    else offers.delete(command.prospectId);
  }
  return offers;
}

export function buildRecruitingLedger(
  state: Readonly<GameState>,
  programId: ProgramId,
  pending: readonly GameCommand[]
): RecruitingLedger {
  const program = state.programs[programId]!;
  const recruiting = state.recruiting[programId]!;
  const relevant = pending.filter((command) => command.programId === programId);
  const queuedPointSpend = relevant.reduce((total, command) => total + queuedRecruitingCost(command), 0);
  const nilOffers = effectiveNilOffers(state, programId, relevant);
  const nilCapacity = weeklyDonorCapacity(program);
  const nilCommitted = committedNilTotal(state, programId);
  const nilReserved = Object.values(nilOffers).reduce((total, amount) => total + amount, 0);
  const scholarshipOffers = effectiveScholarshipOffers(state, programId, relevant);
  const activeOffers = [...scholarshipOffers].filter((prospectId) => {
    const status = state.prospects[prospectId]?.status;
    return status === "AVAILABLE" || status === "COMMITTED";
  }).length;
  const queuedVisits = relevant.filter((command) => command.type === "SCHEDULE_VISIT").length;
  const commitments = Object.values(state.prospects).filter((prospect) =>
    (prospect.status === "COMMITTED" || prospect.status === "SIGNED")
    && prospect.signedProgramId === programId
  ).length;
  return {
    pointsAvailable: Math.max(0, recruiting.points - queuedPointSpend),
    queuedPointSpend,
    weeklyPoints: recruiting.weeklyPoints,
    projectedOpenings: projectedRecruitingOpenings(state, programId),
    commitments,
    visitsRemaining: Math.max(0, MAX_VISITS_PER_SEASON - recruiting.visitsUsedThisSeason - queuedVisits),
    activeScholarshipOffers: activeOffers,
    nilCapacity,
    nilCommitted,
    nilReserved,
    nilFree: Math.max(0, nilCapacity - nilCommitted - nilReserved),
    effectiveNilOffers: nilOffers,
    effectiveScholarshipOffers: scholarshipOffers
  };
}

export function buildPositionRooms(state: Readonly<GameState>, programId: ProgramId): Record<Position, PositionRoom> {
  const positions = Object.keys(ROSTER_COMPOSITION) as Position[];
  return Object.fromEntries(positions.map((position) => {
    const current = Object.values(state.players).filter((player) =>
      player.programId === programId
      && player.position === position
      && player.eligibility.rosterStatus === "SCHOLARSHIP"
    );
    const returning = current.filter((player) => player.eligibility.seasonsRemaining > 1);
    const incoming = Object.values(state.prospects).filter((prospect) =>
      prospect.position === position
      && prospect.signedProgramId === programId
      && (prospect.status === "COMMITTED" || prospect.status === "SIGNED")
    ).length;
    const projected = returning.length + incoming;
    const target = ROSTER_COMPOSITION[position];
    const ratio = projected / Math.max(1, target);
    return [position, {
      position,
      currentScholarships: current.length,
      expectedReturners: returning.length,
      incoming,
      projected,
      target,
      bestReturningOverall: returning.length ? Math.round(Math.max(...returning.map((player) => player.overall))) : null,
      plan: ratio < 0.75 ? "THIN" : ratio > 1.25 ? "CROWDED" : "BALANCED"
    } satisfies PositionRoom];
  })) as Record<Position, PositionRoom>;
}

export function buildProspectBoard(
  state: Readonly<GameState>,
  programId: ProgramId,
  pending: readonly GameCommand[],
  ledger: RecruitingLedger
): ProspectBoardItem[] {
  const recruiting = state.recruiting[programId]!;
  return recruiting.discoveredProspectIds.flatMap((prospectId) => {
    const prospect = state.prospects[prospectId];
    if (!prospect || !(
      prospect.status === "AVAILABLE"
      || prospect.signedProgramId === programId
      || (prospect.status === "COMMITTED" && state.week < SIGNING_WEEK)
    )) return [];
    const report = prospectScoutingReport(state, programId, prospect);
    const scouting = recruiting.scoutingByProspect[prospect.id];
    const pendingEvaluations = pending.flatMap((command) =>
      command.type === "EVALUATE_PROSPECT" && command.prospectId === prospect.id ? [command.evaluation] : []
    );
    const queuedOffer = pending.some((command) => command.type === "OFFER_PROSPECT" && command.prospectId === prospect.id);
    const queuedInvestment = pending.find((command): command is Extract<GameCommand, { type: "INVEST_RECRUITING_POINTS" }> =>
      command.type === "INVEST_RECRUITING_POINTS" && command.prospectId === prospect.id
    )?.points ?? 0;
    const queuedVisit = pending.some((command) => command.type === "SCHEDULE_VISIT" && command.prospectId === prospect.id);
    const currentNilOffer = state.nil?.[programId]?.offersByProspect[prospect.id] ?? 0;
    const effectiveNilOffer = ledger.effectiveNilOffers[prospect.id] ?? 0;
    const isMine = prospect.signedProgramId === programId;
    const flipTarget = prospect.status === "COMMITTED" && !isMine;
    const resolved = prospect.status === "SIGNED" || prospect.status === "ENROLLED";
    const statusLabel = resolved ? "Signed"
      : prospect.status === "COMMITTED" ? (isMine ? "Your verbal" : "Flip target")
        : report.pursuitPoints > 0 ? `Active pursuit · ${report.pursuitPoints} pts`
          : ledger.effectiveScholarshipOffers.has(prospect.id) ? "Offer out" : "No offer";
    const evaluationCount = scouting?.evaluations.length ?? 0;
    return [{
      prospect,
      report,
      evaluationCount,
      offered: ledger.effectiveScholarshipOffers.has(prospect.id),
      queuedOffer,
      queuedInvestment,
      pendingEvaluations,
      queuedVisit,
      currentNilOffer,
      effectiveNilOffer,
      ask: evaluationCount > 0 ? nilAskingPriceRange(prospect, evaluationCount, state.programs[programId]) : null,
      isMine,
      flipTarget,
      resolved,
      statusLabel
    }];
  });
}

function rangeValue(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusPriority(item: ProspectBoardItem): number {
  if (item.isMine) return 0;
  if (item.report.pursuitPoints > 0) return 1;
  if (item.offered) return 2;
  if (item.flipTarget) return 3;
  return 4;
}

export function filterAndSortProspects(
  items: readonly ProspectBoardItem[],
  filters: Readonly<RecruitingFilters>,
  rooms: Readonly<Record<Position, PositionRoom>>
): ProspectBoardItem[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const visible = items.filter((item) => {
    if (query && !`${item.prospect.name} ${item.prospect.position} ${item.prospect.homeStateCode}`.toLocaleLowerCase().includes(query)) return false;
    if (filters.position !== "ALL" && item.prospect.position !== filters.position) return false;
    if (filters.offeredOnly && !item.offered) return false;
    if (filters.status === "AVAILABLE" && item.prospect.status !== "AVAILABLE") return false;
    if (filters.status === "MINE" && !item.isMine) return false;
    if (filters.status === "FLIP" && !item.flipTarget) return false;
    return true;
  });
  return visible.sort((left, right) => {
    if (filters.sort === "STATUS") return statusPriority(left) - statusPriority(right)
      || right.report.pursuitPoints - left.report.pursuitPoints
      || left.prospect.name.localeCompare(right.prospect.name);
    if (filters.sort === "PURSUIT") return right.report.pursuitPoints - left.report.pursuitPoints
      || left.prospect.name.localeCompare(right.prospect.name);
    if (filters.sort === "NAME") return left.prospect.name.localeCompare(right.prospect.name);
    if (filters.sort === "NEED") return rooms[left.prospect.position].projected - rooms[right.prospect.position].projected
      || left.prospect.name.localeCompare(right.prospect.name);
    const leftValue = filters.sort === "FIT" ? left.report.fitScore : rangeValue(left.report.overall);
    const rightValue = filters.sort === "FIT" ? right.report.fitScore : rangeValue(right.report.overall);
    if (leftValue === null && rightValue !== null) return 1;
    if (leftValue !== null && rightValue === null) return -1;
    return (rightValue ?? -1) - (leftValue ?? -1) || left.prospect.name.localeCompare(right.prospect.name);
  });
}
