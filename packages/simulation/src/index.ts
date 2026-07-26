import type { DevelopmentFocus, DivisionId, FacilityType, GameCommand, GameEvent, GameState, Player, PlayerRating, PlayerRatings, Position, Program, Prospect, SimulationResult, StaffAssignment, StaffMember, StaffRole } from "@college-legends/model";
import { FICTIONAL_PROGRAMS, fictionalPersonName } from "@college-legends/content";
import { AddressableRng } from "./rng.js";

export { AddressableRng } from "./rng.js";

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));
const clone = <T>(value: T): T => structuredClone(value);

export const ROSTER_COMPOSITION: Readonly<Record<Position, number>> = {
  QB: 4,
  RB: 7,
  WR: 12,
  TE: 6,
  OL: 17,
  DL: 14,
  LB: 10,
  DB: 11,
  K: 2,
  P: 2
};

export const STARTING_ROSTER_SIZE = Object.values(ROSTER_COMPOSITION).reduce((total, count) => total + count, 0);
export const FACILITY_UPGRADE_COST: Readonly<Record<number, number>> = {
  1: 350_000,
  2: 750_000,
  3: 1_500_000,
  4: 3_000_000
};

const STAFF_ROLES: readonly StaffRole[] = ["HEAD_COACH", "OFFENSIVE_COORDINATOR", "DEFENSIVE_COORDINATOR", "STRENGTH_COACH"];
const REGULAR_SEASON_WEEKS = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14] as const;
const DIVISION_GAME_COUNT = 8;

export interface DevelopmentPayoff {
  ratingChanges: Partial<Record<PlayerRating, number>>;
  fatigueChange: number;
  gameEffect: string;
  tradeoff: string;
}

const DEVELOPMENT_PAYOFFS: Readonly<Record<DevelopmentFocus, DevelopmentPayoff>> = {
  BALANCED: {
    ratingChanges: { technique: 0.2, strength: 0.2, conditioning: 0.2, injuryPrevention: 0.1 },
    fatigueChange: 1,
    gameEffect: "Broad growth across execution, power, and endurance",
    tradeoff: "No single attribute develops quickly"
  },
  TECHNIQUE: {
    ratingChanges: { technique: 0.5, conditioning: 0.1, injuryPrevention: 0.05 },
    fatigueChange: 1.5,
    gameEffect: "Technique directly raises weekly game execution",
    tradeoff: "Minimal power and durability growth"
  },
  STRENGTH: {
    ratingChanges: { technique: 0.1, strength: 0.5, conditioning: 0.1, armStrength: 0.4 },
    fatigueChange: 2.5,
    gameEffect: "Strength raises physical play; QB arm strength raises passing power",
    tradeoff: "Highest fatigue and injury exposure"
  },
  CONDITIONING: {
    ratingChanges: { technique: 0.05, strength: 0.05, conditioning: 0.5, injuryPrevention: 0.35 },
    fatigueChange: -2,
    gameEffect: "Endurance sustains game performance and injury prevention lowers risk",
    tradeoff: "Slowest direct overall-rating growth"
  }
};

export function developmentPayoff(focus: DevelopmentFocus, position: Position): DevelopmentPayoff {
  const payoff = DEVELOPMENT_PAYOFFS[focus];
  if (focus !== "STRENGTH" || position === "QB") return payoff;
  const { armStrength: _unused, ...ratingChanges } = payoff.ratingChanges;
  return { ...payoff, ratingChanges };
}

export function staffAssignmentPayoff(member: Pick<StaffMember, "rating" | "role">, assignment: StaffAssignment): string {
  if (assignment === "GAME_PREP") return `+${gamePrepContribution(member).toFixed(1)} team rating in the next game`;
  if (assignment === "PLAYER_DEVELOPMENT") return `+${Math.round(member.rating / 5)}% weekly player growth`;
  if (assignment === "RECRUITING") return `+${(member.rating / 25).toFixed(1)} recruiting score on every offer`;
  return `-${(member.rating / 30).toFixed(1)} roster fatigue; ${Math.round(member.rating / 2)}% chance to shorten injuries`;
}

export function facilityPayoff(facility: FacilityType, level: number): string {
  if (facility === "TRAINING") return `+${Math.max(0, level - 1) * 4}% weekly player growth`;
  if (facility === "STADIUM") return `+${Math.max(0, level - 1) * 8}% home-game revenue`;
  if (facility === "ACADEMICS") return `-${Math.max(0, level - 1) * 1.5}% offseason transfer risk`;
  return `+${Math.max(0, level - 1) * 2} recruiting score on every offer`;
}

export function createFictionalLeague(rootSeed: string, programCount = FICTIONAL_PROGRAMS.length): GameState {
  const selectedPrograms = FICTIONAL_PROGRAMS.slice(0, clamp(Math.trunc(programCount), 2, FICTIONAL_PROGRAMS.length));
  const rng = new AddressableRng(rootSeed).fork("league-generation");
  const nameRng = rng.fork("fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  const nameFor = (ordinal: number): string => fictionalPersonName(ordinal, firstNameOffset, lastNameOffset);
  const state: GameState = {
    identity: { rootSeed, balanceConfiguration: { version: "0.1.0", weeklyDevelopment: { base: 0.012, coachWeight: 0.018, workEthicWeight: 0.022, fatigueFloor: 0.62, maximum: 0.09 }, game: { possessions: 24, homeFieldAdvantage: 1.8, upsetNoise: 11 } }, simulationVersion: "0.1.0" },
    season: 2027, week: 0, phase: "ROSTER_REVIEW", programs: {}, players: {}, prospects: {}, staff: {}, schedule: [], eventHistory: []
  };
  const rosterPositions = Object.entries(ROSTER_COMPOSITION).flatMap(([position, count]) =>
    Array.from({ length: count }, () => position as Position)
  );
  for (let index = 0; index < selectedPrograms.length; index += 1) {
    const definition = selectedPrograms[index]!;
    const id = `program-${index + 1}`;
    const tier = definition.tier;
    const facilityLevel = tier === "POWER" ? 4 : tier === "MID" ? 3 : 2;
    const baseline = tier === "POWER" ? 83 : tier === "MID" ? 75 : 68;
    state.programs[id] = {
      id,
      name: `${definition.name} ${definition.nickname}`,
      nickname: definition.nickname,
      abbreviation: definition.abbreviation,
      city: definition.city,
      state: definition.state,
      stateCode: definition.stateCode,
      divisionId: definition.divisionId,
      tier,
      budget: tier === "POWER" ? 20_000_000 : tier === "MID" ? 6_000_000 : 1_500_000,
      scholarshipLimit: 85,
      wins: 0,
      losses: 0,
      championships: 0,
      coachSecurity: tier === "POWER" ? 45 : tier === "MID" ? 65 : 92,
      prestige: tier === "POWER" ? 88 : tier === "MID" ? 72 : 55,
      fanSupport: tier === "POWER" ? 91 : tier === "MID" ? 70 : 48,
      weeklyRevenue: tier === "POWER" ? 1_200_000 : tier === "MID" ? 520_000 : 210_000,
      weeklyExpenses: tier === "POWER" ? 940_000 : tier === "MID" ? 430_000 : 185_000,
      facilities: { TRAINING: facilityLevel, STADIUM: facilityLevel, ACADEMICS: facilityLevel, RECRUITING: facilityLevel }
    };
    for (const [staffIndex, role] of STAFF_ROLES.entries()) {
      const staffId = `${id}-staff-${staffIndex + 1}`;
      const personOrdinal = index * (STARTING_ROSTER_SIZE + STAFF_ROLES.length) + staffIndex;
      state.staff[staffId] = {
        id: staffId,
        programId: id,
        name: nameFor(personOrdinal),
        role,
        rating: Math.round(rng.between(`${staffId}:rating`, baseline - 4, baseline + 7)),
        salary: Math.round(rng.between(`${staffId}:salary`, 140_000, tier === "POWER" ? 1_400_000 : 650_000)),
        assignment: role === "STRENGTH_COACH" ? "PLAYER_DEVELOPMENT" : "GAME_PREP"
      };
    }
    for (let rosterIndex = 0; rosterIndex < rosterPositions.length; rosterIndex += 1) {
      const playerId = `${id}-player-${rosterIndex + 1}`;
      const personOrdinal = index * (STARTING_ROSTER_SIZE + STAFF_ROLES.length) + STAFF_ROLES.length + rosterIndex;
      const overall = Math.round(rng.between(`${playerId}:overall`, baseline - 5, baseline + 5));
      const position = rosterPositions[rosterIndex]!;
      state.players[playerId] = {
        id: playerId,
        name: nameFor(personOrdinal),
        programId: id,
        position,
        overall,
        potential: clamp(Math.round(overall + rng.between(`${playerId}:potential`, 2, 13)), overall, 99),
        workEthic: rng.between(`${playerId}:work-ethic`, 0.2, 1),
        fatigue: 0,
        ratings: createPlayerRatings(overall, position, rng, playerId),
        injuryWeeksRemaining: 0,
        developmentFocus: "BALANCED",
        eligibility: { cohortYear: 2027 - (rosterIndex % 4), seasonsEnrolled: rosterIndex % 4, seasonsParticipated: rosterIndex % 4, seasonsRemaining: 4 - (rosterIndex % 4), redshirtStatus: "AVAILABLE", gamesPlayedThisSeason: 0, rosterStatus: "SCHOLARSHIP" }
      };
    }
  }
  const actualProgramCount = selectedPrograms.length;
  generateProspects(state, rng.fork("prospects"), actualProgramCount * 30, "initial", actualProgramCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length), firstNameOffset, lastNameOffset);
  buildSeasonSchedule(state);
  return state;
}

function createPlayerRatings(overall: number, position: Position, rng: AddressableRng, path: string): PlayerRatings {
  const rating = (name: PlayerRating, offset = 0): number =>
    clamp(Number((overall + offset + rng.between(`${path}:${name}`, -4, 4)).toFixed(1)), 40, 99);
  return {
    technique: rating("technique"),
    strength: rating("strength", ["OL", "DL", "LB", "RB"].includes(position) ? 2 : 0),
    conditioning: rating("conditioning"),
    injuryPrevention: rating("injuryPrevention"),
    armStrength: rating("armStrength", position === "QB" ? 3 : -3)
  };
}

export function beginSeason(input: Readonly<GameState>): GameState {
  const state = clone<GameState>(input);
  if (state.phase === "ROSTER_REVIEW") {
    state.phase = "REGULAR_SEASON";
    state.week = 1;
  }
  return state;
}

export function buildSeasonSchedule(state: GameState): void {
  state.schedule = [];
  let scheduleIndex = 0;
  const programsByDivision = new Map<DivisionId, string[]>();
  for (const program of Object.values(state.programs)) {
    const ids = programsByDivision.get(program.divisionId) ?? [];
    ids.push(program.id);
    programsByDivision.set(program.divisionId, ids);
  }
  const activeDivisions = [...programsByDivision.keys()];
  const seasonRotation = Math.max(0, state.season - 2027);

  for (const [divisionIndex, divisionId] of activeDivisions.entries()) {
    const rounds = roundRobinRounds(programsByDivision.get(divisionId)!);
    const roundCount = Math.min(DIVISION_GAME_COUNT, rounds.length);
    for (let slot = 0; slot < roundCount; slot += 1) {
      const week = REGULAR_SEASON_WEEKS[slot]!;
      const round = rounds[(slot + seasonRotation * DIVISION_GAME_COUNT) % rounds.length]!;
      for (const [pairIndex, [left, right]] of round.entries()) {
        const flip = (slot + pairIndex + divisionIndex + state.season) % 2 === 0;
        const homeProgramId = flip ? left : right;
        const awayProgramId = flip ? right : left;
        state.schedule.push({ id: `game:${state.season}:${scheduleIndex++}`, week, homeProgramId, awayProgramId, matchupType: "DIVISION", played: false, homeScore: null, awayScore: null });
      }
    }
  }

  if (activeDivisions.length < 2) return;
  const divisionRounds = roundRobinRounds(activeDivisions);
  for (let crossSlot = 0; crossSlot < 4; crossSlot += 1) {
    const week = REGULAR_SEASON_WEEKS[DIVISION_GAME_COUNT + crossSlot]!;
    const divisionPairings = divisionRounds[(crossSlot + seasonRotation * 4) % divisionRounds.length]!;
    for (const [divisionPairIndex, [leftDivision, rightDivision]] of divisionPairings.entries()) {
      const leftPrograms = programsByDivision.get(leftDivision)!;
      const rightPrograms = programsByDivision.get(rightDivision)!;
      const pairCount = Math.min(leftPrograms.length, rightPrograms.length);
      const rotation = (seasonRotation * 4 + crossSlot) % Math.max(1, rightPrograms.length);
      for (let teamIndex = 0; teamIndex < pairCount; teamIndex += 1) {
        const left = leftPrograms[teamIndex]!;
        const right = rightPrograms[(teamIndex + rotation) % rightPrograms.length]!;
        const flip = (crossSlot + teamIndex + divisionPairIndex + state.season) % 2 === 0;
        const homeProgramId = flip ? left : right;
        const awayProgramId = flip ? right : left;
        state.schedule.push({ id: `game:${state.season}:${scheduleIndex++}`, week, homeProgramId, awayProgramId, matchupType: "CROSS_DIVISION", played: false, homeScore: null, awayScore: null });
      }
    }
  }
  balanceHomeAndAway(state.schedule);
}

function roundRobinRounds<T extends string>(values: readonly T[]): [T, T][][] {
  if (values.length < 2) return [];
  const participants: Array<T | null> = [...values];
  if (participants.length % 2 !== 0) participants.push(null);
  const rounds: [T, T][][] = [];
  for (let roundIndex = 0; roundIndex < participants.length - 1; roundIndex += 1) {
    const pairings: [T, T][] = [];
    for (let index = 0; index < participants.length / 2; index += 1) {
      const left = participants[index];
      const right = participants[participants.length - 1 - index];
      if (left != null && right != null) pairings.push([left, right]);
    }
    rounds.push(pairings);
    participants.splice(1, 0, participants.pop()!);
  }
  return rounds;
}

/**
 * A 12-game schedule gives every full-league program an even graph degree.
 * Orienting each Euler circuit produces exactly six home and six away games
 * without changing opponents, weeks, or matchup types.
 */
function balanceHomeAndAway(schedule: GameState["schedule"]): void {
  const adjacency = new Map<string, number[]>();
  for (const [gameIndex, game] of schedule.entries()) {
    for (const programId of [game.homeProgramId, game.awayProgramId]) {
      const edges = adjacency.get(programId) ?? [];
      edges.push(gameIndex);
      adjacency.set(programId, edges);
    }
  }
  if ([...adjacency.values()].some((edges) => edges.length % 2 !== 0)) return;

  const unused = new Set(schedule.map((_, index) => index));
  for (const start of adjacency.keys()) {
    if (!(adjacency.get(start) ?? []).some((edge) => unused.has(edge))) continue;
    const stack: Array<{ programId: string; viaGame: number | null }> = [{ programId: start, viaGame: null }];
    while (stack.length > 0) {
      const current = stack[stack.length - 1]!;
      const edge = (adjacency.get(current.programId) ?? []).find((candidate) => unused.has(candidate));
      if (edge !== undefined) {
        unused.delete(edge);
        const game = schedule[edge]!;
        const opponent = game.homeProgramId === current.programId ? game.awayProgramId : game.homeProgramId;
        stack.push({ programId: opponent, viaGame: edge });
        continue;
      }
      const completed = stack.pop()!;
      if (completed.viaGame === null || stack.length === 0) continue;
      const previous = stack[stack.length - 1]!.programId;
      schedule[completed.viaGame]!.homeProgramId = previous;
      schedule[completed.viaGame]!.awayProgramId = completed.programId;
    }
  }
}

export function advanceWeek(input: Readonly<GameState>, commands: readonly GameCommand[] = []): SimulationResult {
  const state = clone<GameState>(input);
  if (state.phase !== "REGULAR_SEASON") {
    throw new Error("Review the opening roster and begin the season before advancing a week.");
  }
  const events: GameEvent[] = [];
  const rng = new AddressableRng(state.identity.rootSeed).fork(String(state.season), String(state.week));
  resolveCommands(state, commands, rng.fork("commands"), events);
  recoverPlayers(state, rng.fork("recovery"), events);
  developPlayers(state, rng.fork("development"), events);
  resolveScheduledGames(state, rng.fork("games"), events);
  processInjuries(state, rng.fork("injuries"), events);
  processWeeklyFinances(state, events);
  state.week += 1;
  if (state.week > 14) rolloverSeason(state, events);
  state.eventHistory.push(...events);
  if (state.eventHistory.length > 500) state.eventHistory = state.eventHistory.slice(-500);
  return { state, events };
}

function resolveCommands(state: GameState, commands: readonly GameCommand[], rng: AddressableRng, events: GameEvent[]): void {
  const offers = new Map<string, Set<string>>();
  for (const command of commands) {
    const program = state.programs[command.programId];
    if (!program) {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Program does not exist." });
      continue;
    }
    if (command.type === "OFFER_PROSPECT") {
      const prospect = state.prospects[command.prospectId];
      if (!prospect || prospect.status !== "AVAILABLE") {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Prospect is unavailable." });
        continue;
      }
      if (scholarshipCount(state, program.id) >= program.scholarshipLimit) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Program has no scholarship available." });
        continue;
      }
      const bidders = offers.get(prospect.id) ?? new Set<string>();
      if (bidders.has(program.id)) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Program already offered this prospect this week." });
      } else {
        bidders.add(program.id);
        offers.set(prospect.id, bidders);
      }
      continue;
    }
    if (command.type === "ASSIGN_STAFF") {
      const staff = state.staff[command.staffId];
      if (!staff || staff.programId !== program.id) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Staff assignment is not valid for this program." });
        continue;
      }
      staff.assignment = command.assignment;
      events.push({ type: "STAFF_ASSIGNED", season: state.season, week: state.week, programId: program.id, staffId: staff.id, assignment: staff.assignment });
      continue;
    }
    if (command.type === "UPGRADE_FACILITY") {
      const currentLevel = program.facilities[command.facility];
      const cost = FACILITY_UPGRADE_COST[currentLevel];
      if (!cost || currentLevel >= 5) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Facility is already at the maximum level." });
        continue;
      }
      if (program.budget < cost) {
        events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "The program cannot afford this facility upgrade." });
        continue;
      }
      program.budget -= cost;
      program.facilities[command.facility] = currentLevel + 1;
      events.push({ type: "FACILITY_UPGRADED", season: state.season, week: state.week, programId: program.id, facility: command.facility, newLevel: currentLevel + 1, cost });
      continue;
    }
    const player = state.players[command.playerId];
    if (!player || player.programId !== program.id) {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Command is not valid for this roster." });
      continue;
    }
    if (command.type === "SET_DEVELOPMENT_FOCUS") {
      player.developmentFocus = command.focus;
      events.push({ type: "DEVELOPMENT_FOCUS_SET", season: state.season, week: state.week, programId: program.id, playerId: player.id, focus: command.focus });
      continue;
    }
    if (player.eligibility.redshirtStatus !== "AVAILABLE") {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Player cannot redshirt." });
      continue;
    }
    player.eligibility.redshirtStatus = "USED";
  }
  resolveRecruitingContests(state, offers, rng.fork("recruiting"), events);
}

/**
 * Every valid offer is collected before resolution.  A prospect's choice never
 * depends on command ordering or program-array order; the only tie breaker is
 * an addressable draw derived from the prospect and school IDs.
 */
function resolveRecruitingContests(state: GameState, offers: ReadonlyMap<string, ReadonlySet<string>>, rng: AddressableRng, events: GameEvent[]): void {
  const resolved = [...offers.entries()].map(([prospectId, bidderSet]) => {
    const prospect = state.prospects[prospectId]!;
    const offeredBy = [...bidderSet].sort();
    const scores = Object.fromEntries(offeredBy.map((programId) => [programId, recruitingScore(state, prospect, programId, rng)]));
    const winnerProgramId = offeredBy.reduce((best, candidate) => scores[candidate]! > scores[best]! || (scores[candidate] === scores[best] && candidate < best) ? candidate : best);
    return { prospect, offeredBy, scores, winnerProgramId, priority: rng.at(`${prospectId}:commitment-priority`) };
  }).sort((left, right) => left.priority - right.priority || left.prospect.id.localeCompare(right.prospect.id));

  for (const contest of resolved) {
    const program = state.programs[contest.winnerProgramId]!;
    if (scholarshipCount(state, program.id) >= program.scholarshipLimit) continue;
    const playerId = `player:${contest.prospect.id}`;
    state.players[playerId] = prospectToPlayer(contest.prospect, playerId, program.id, state.season);
    contest.prospect.status = "SIGNED";
    contest.prospect.signedProgramId = program.id;
    events.push({ type: "RECRUITING_CONTEST_RESOLVED", season: state.season, week: state.week, prospectId: contest.prospect.id, offeredBy: contest.offeredBy, winnerProgramId: program.id, scores: contest.scores });
    events.push({ type: "PROSPECT_SIGNED", season: state.season, week: state.week, prospectId: contest.prospect.id, playerId, programId: program.id });
  }
}

function recruitingScore(state: GameState, prospect: Prospect, programId: string, rng: AddressableRng): number {
  const program = state.programs[programId]!;
  const tierBonus = program.tier === "POWER" ? 12 : program.tier === "MID" ? 6 : 0;
  const facilityBonus = Math.max(0, program.facilities.RECRUITING - 1) * 2;
  const staffBonus = Object.values(state.staff)
    .filter((staff) => staff.programId === programId && staff.assignment === "RECRUITING")
    .reduce((total, staff) => total + staff.rating / 25, 0);
  return Number((prospect.interestByProgram[programId]! + tierBonus + facilityBonus + staffBonus + rng.between(`${prospect.id}:${programId}:decision-noise`, -7, 7)).toFixed(3));
}

function scholarshipCount(state: GameState, programId: string): number {
  return Object.values(state.players).filter((player) => player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
}

function prospectToPlayer(prospect: Prospect, id: string, programId: string, season: number): Player {
  const baselineRatings: PlayerRatings = {
    technique: prospect.overall,
    strength: prospect.overall,
    conditioning: prospect.overall,
    injuryPrevention: prospect.overall,
    armStrength: clamp(prospect.overall + (prospect.position === "QB" ? 3 : -3), 40, 99)
  };
  return { id, name: prospect.name, programId, position: prospect.position, overall: prospect.overall, potential: prospect.potential, workEthic: prospect.workEthic, fatigue: 0, ratings: baselineRatings, injuryWeeksRemaining: 0, developmentFocus: "BALANCED", eligibility: { cohortYear: season, seasonsEnrolled: 0, seasonsParticipated: 0, seasonsRemaining: 4, redshirtStatus: "AVAILABLE", gamesPlayedThisSeason: 0, rosterStatus: "SCHOLARSHIP" } };
}

function generateProspects(state: GameState, rng: AddressableRng, count: number, cohort: string, nameStart = 0, firstNameOffset = 0, lastNameOffset = 0): void {
  const positions: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
  for (let index = 0; index < count; index += 1) {
    const id = `prospect-${cohort}-${index + 1}`;
    const overall = Math.round(rng.between(`${id}:overall`, 52, 79));
    const interestByProgram = Object.fromEntries(Object.keys(state.programs).map((programId) => [programId, Number(rng.between(`${id}:${programId}:interest`, 35, 88).toFixed(3))]));
    state.prospects[id] = { id, name: fictionalPersonName(nameStart + index, firstNameOffset, lastNameOffset), position: positions[index % positions.length]!, overall, potential: clamp(overall + rng.between(`${id}:potential`, 4, 20), overall, 99), workEthic: rng.between(`${id}:work-ethic`, 0.2, 1), interestByProgram, status: "AVAILABLE", signedProgramId: null };
  }
}

function developPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const rules = state.identity.balanceConfiguration.weeklyDevelopment;
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.overall >= player.potential || player.injuryWeeksRemaining > 0) continue;
    const fatigueModifier = clamp(1 - player.fatigue / 180, rules.fatigueFloor, 1);
    const program = state.programs[player.programId]!;
    const trainingModifier = 1 + Math.max(0, program.facilities.TRAINING - 1) * 0.04;
    const developmentCoaches = Object.values(state.staff).filter((staff) => staff.programId === program.id && staff.assignment === "PLAYER_DEVELOPMENT");
    const coachingModifier = 1 + developmentCoaches.reduce((sum, staff) => sum + staff.rating / 500, 0);
    const focus = developmentPayoff(player.developmentFocus, player.position);
    const developmentScale = clamp((0.72 + player.workEthic * 0.45) * fatigueModifier * trainingModifier * coachingModifier, 0.5, 1.8);
    const ratingChanges: Partial<Record<PlayerRating, number>> = {};
    for (const [rating, baseChange] of Object.entries(focus.ratingChanges) as [PlayerRating, number][]) {
      const actualChange = Number((baseChange * developmentScale).toFixed(2));
      player.ratings[rating] = clamp(Number((player.ratings[rating] + actualChange).toFixed(2)), 40, 99);
      ratingChanges[rating] = actualChange;
    }
    const directGrowthWeight = player.developmentFocus === "CONDITIONING" ? 0.72 : player.developmentFocus === "BALANCED" ? 0.9 : 1;
    const gain = clamp((rules.base + player.workEthic * rules.workEthicWeight + rng.between(player.id, -0.01, 0.01)) * fatigueModifier * trainingModifier * coachingModifier * directGrowthWeight, 0, rules.maximum);
    const previousOverall = player.overall;
    player.overall = clamp(Number((player.overall + gain).toFixed(3)), 40, player.potential);
    player.fatigue = clamp(Number((player.fatigue + focus.fatigueChange).toFixed(1)), 0, 100);
    if (player.overall !== previousOverall) events.push({ type: "PLAYER_DEVELOPED", season: state.season, week: state.week, playerId: player.id, previousOverall, newOverall: player.overall, factors: { workEthic: player.workEthic, fatigueModifier, focus: player.developmentFocus, ratingChanges } });
  }
}

function teamStrength(state: GameState, program: Program): number {
  const roster = Object.values(state.players).filter((player) => player.programId === program.id && player.eligibility.rosterStatus === "SCHOLARSHIP" && player.injuryWeeksRemaining === 0);
  if (roster.length === 0) return 40;
  const playerStrength = roster.reduce((sum, player) => {
    const armBonus = player.position === "QB" ? (player.ratings.armStrength - player.overall) * 0.1 : 0;
    const attributeBonus = (player.ratings.technique - player.overall) * 0.1
      + (player.ratings.strength - player.overall) * 0.07
      + (player.ratings.conditioning - player.overall) * 0.06;
    return sum + player.overall + armBonus + attributeBonus - player.fatigue * 0.015;
  }, 0) / roster.length;
  const gamePrepBonus = Object.values(state.staff)
    .filter((staff) => staff.programId === program.id && staff.assignment === "GAME_PREP")
    .reduce((total, staff) => total + gamePrepContribution(staff), 0);
  return playerStrength + gamePrepBonus;
}

function gamePrepContribution(member: Pick<StaffMember, "rating" | "role">): number {
  const roleFit: Record<StaffRole, number> = { HEAD_COACH: 1.2, OFFENSIVE_COORDINATOR: 1.4, DEFENSIVE_COORDINATOR: 1.4, STRENGTH_COACH: 0.6 };
  return member.rating * roleFit[member.role] / 100;
}

function recoverPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const program of Object.values(state.programs)) {
    const recoveryStaff = Object.values(state.staff).filter((staff) => staff.programId === program.id && staff.assignment === "RECOVERY");
    const fatigueRecovery = recoveryStaff.reduce((total, staff) => total + staff.rating / 30, 0);
    for (const player of Object.values(state.players).filter((candidate) => candidate.programId === program.id && candidate.eligibility.rosterStatus === "SCHOLARSHIP")) {
      player.fatigue = clamp(Number((player.fatigue - fatigueRecovery).toFixed(1)), 0, 100);
      if (player.injuryWeeksRemaining <= 0) continue;
      const extraRecovery = recoveryStaff.some((staff) => rng.at(`${player.id}:${staff.id}:extra-recovery`) < staff.rating / 200) ? 1 : 0;
      player.injuryWeeksRemaining = Math.max(0, player.injuryWeeksRemaining - 1 - extraRecovery);
      if (player.injuryWeeksRemaining === 0) events.push({ type: "PLAYER_RECOVERED", season: state.season, week: state.week, playerId: player.id });
    }
  }
}

function processInjuries(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const activePrograms = new Set(state.schedule
    .filter((game) => game.week === state.week && game.played)
    .flatMap((game) => [game.homeProgramId, game.awayProgramId]));
  for (const player of Object.values(state.players)) {
    if (!player.programId || !activePrograms.has(player.programId) || player.eligibility.rosterStatus !== "SCHOLARSHIP" || player.injuryWeeksRemaining > 0) continue;
    const preventionModifier = clamp(1 - (player.ratings.injuryPrevention - 50) / 160, 0.55, 1.15);
    const fatigueModifier = 1 + player.fatigue / 80;
    const strengthTrainingModifier = player.developmentFocus === "STRENGTH" ? 1.2 : 1;
    const risk = clamp(0.0035 * preventionModifier * fatigueModifier * strengthTrainingModifier, 0.001, 0.02);
    if (rng.at(`${player.id}:injury`) >= risk) continue;
    const weeks = 1 + Math.floor(rng.between(`${player.id}:injury-length`, 0, 3));
    player.injuryWeeksRemaining = weeks;
    events.push({ type: "PLAYER_INJURED", season: state.season, week: state.week, playerId: player.id, weeks, risk: Number((risk * 100).toFixed(2)) });
  }
}

function resolveScheduledGames(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const game of state.schedule.filter((item) => !item.played && state.week === item.week)) {
    const home = state.programs[game.homeProgramId]; const away = state.programs[game.awayProgramId];
    if (!home || !away) continue;
    const homeStrength = teamStrength(state, home) + state.identity.balanceConfiguration.game.homeFieldAdvantage;
    const awayStrength = teamStrength(state, away);
    const score = (strength: number, opponent: number, side: string): number => {
      let points = 0;
      for (let possession = 0; possession < state.identity.balanceConfiguration.game.possessions; possession += 1) {
        const chance = clamp(0.23 + (strength - opponent) / 150 + rng.between(`${game.id}:${side}:${possession}`, -0.08, 0.08), 0.05, 0.55);
        if (rng.at(`${game.id}:${side}:result:${possession}`) < chance) points += rng.at(`${game.id}:${side}:td:${possession}`) < 0.66 ? 7 : 3;
      }
      return points;
    };
    let homeScore = score(homeStrength, awayStrength, "home"); let awayScore = score(awayStrength, homeStrength, "away");
    if (homeScore === awayScore) homeScore += rng.at(`${game.id}:overtime`) < 0.5 ? 3 : 0, awayScore += homeScore === awayScore ? 3 : 0;
    game.played = true;
    game.homeScore = homeScore;
    game.awayScore = awayScore;
    if (homeScore > awayScore) { home.wins += 1; away.losses += 1; } else { away.wins += 1; home.losses += 1; }
    events.push({ type: "GAME_COMPLETED", season: state.season, week: state.week, gameId: game.id, homeProgramId: home.id, awayProgramId: away.id, homeScore, awayScore });
  }
}

function processWeeklyFinances(state: GameState, events: GameEvent[]): void {
  for (const program of Object.values(state.programs)) {
    const homeGame = state.schedule.find((game) => game.week === state.week && game.homeProgramId === program.id);
    const stadiumModifier = 1 + Math.max(0, program.facilities.STADIUM - 1) * 0.08;
    const gameDayRevenue = homeGame?.played ? Math.round(program.weeklyRevenue * (0.55 + program.fanSupport / 100) * stadiumModifier) : 0;
    const revenue = program.weeklyRevenue + gameDayRevenue;
    const staffPayroll = Object.values(state.staff).filter((staff) => staff.programId === program.id).reduce((sum, staff) => sum + staff.salary / 52, 0);
    const expenses = Math.round(program.weeklyExpenses + staffPayroll);
    const net = Math.round(revenue - expenses);
    program.budget += net;
    events.push({ type: "WEEKLY_FINANCES", season: state.season, week: state.week, programId: program.id, revenue: Math.round(revenue), expenses, net });
  }
}

function rolloverSeason(state: GameState, events: GameEvent[]): void {
  const portalRng = new AddressableRng(state.identity.rootSeed).fork("portal", String(state.season));
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus !== "SCHOLARSHIP") continue;
    player.eligibility.seasonsEnrolled += 1;
    player.eligibility.seasonsParticipated += 1;
    player.eligibility.seasonsRemaining -= 1;
    player.eligibility.gamesPlayedThisSeason = 0;
    player.fatigue = 0;
    player.injuryWeeksRemaining = 0;
    if (player.eligibility.seasonsRemaining <= 0) {
      player.eligibility.rosterStatus = "GRADUATED";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "ELIGIBILITY_EXHAUSTED" });
      continue;
    }
    const program = state.programs[player.programId]!;
    const academicProtection = Math.max(0, program.facilities.ACADEMICS - 1) * 0.015;
    const playingTimePressure = player.overall > teamStrength(state, program) + 4 ? 0.02 : 0;
    const transferRisk = clamp(0.08 + playingTimePressure - academicProtection, 0.01, 0.12);
    if (portalRng.at(`${player.id}:transfer`) < transferRisk) {
      player.eligibility.rosterStatus = "PORTAL";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "TRANSFER_PORTAL" });
    }
  }
  state.season += 1; state.week = 1;
  for (const program of Object.values(state.programs)) { program.wins = 0; program.losses = 0; }
  const programCount = Object.keys(state.programs).length;
  const nameRng = new AddressableRng(state.identity.rootSeed).fork("league-generation", "fictional-names");
  const firstNameOffset = Math.floor(nameRng.between("first-offset", 0, 96));
  const lastNameOffset = Math.floor(nameRng.between("last-offset", 0, 160));
  const initialPeople = programCount * (STARTING_ROSTER_SIZE + STAFF_ROLES.length + 30);
  const seasonOffset = Math.max(0, state.season - 2028) * programCount * 15;
  generateProspects(state, new AddressableRng(state.identity.rootSeed).fork("recruiting-cohort", String(state.season)), programCount * 15, String(state.season), initialPeople + seasonOffset, firstNameOffset, lastNameOffset);
  buildSeasonSchedule(state);
}
