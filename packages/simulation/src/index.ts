import type { GameCommand, GameEvent, GameState, Player, Position, Program, Prospect, SimulationResult } from "@college-legends/model";
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

export function createFictionalLeague(rootSeed: string, programCount = 12): GameState {
  const rng = new AddressableRng(rootSeed).fork("league-generation");
  const state: GameState = {
    identity: { rootSeed, balanceConfiguration: { version: "0.1.0", weeklyDevelopment: { base: 0.012, coachWeight: 0.018, workEthicWeight: 0.022, fatigueFloor: 0.62, maximum: 0.09 }, game: { possessions: 24, homeFieldAdvantage: 1.8, upsetNoise: 11 } }, simulationVersion: "0.1.0" },
    season: 2027, week: 0, phase: "ROSTER_REVIEW", programs: {}, players: {}, prospects: {}, schedule: []
  };
  const rosterPositions = Object.entries(ROSTER_COMPOSITION).flatMap(([position, count]) =>
    Array.from({ length: count }, () => position as Position)
  );
  for (let index = 0; index < programCount; index += 1) {
    const id = `program-${index + 1}`;
    const tier = index < 3 ? "POWER" : index < 8 ? "MID" : "LOW";
    state.programs[id] = { id, name: `College ${index + 1}`, tier, budget: tier === "POWER" ? 20_000_000 : tier === "MID" ? 6_000_000 : 1_500_000, scholarshipLimit: 85, wins: 0, losses: 0, championships: 0, coachSecurity: tier === "POWER" ? 45 : tier === "MID" ? 65 : 92 };
    const baseline = tier === "POWER" ? 83 : tier === "MID" ? 75 : 68;
    for (let rosterIndex = 0; rosterIndex < rosterPositions.length; rosterIndex += 1) {
      const playerId = `${id}-player-${rosterIndex + 1}`;
      const overall = Math.round(rng.between(`${playerId}:overall`, baseline - 5, baseline + 5));
      state.players[playerId] = { id: playerId, name: `Player ${index + 1}-${rosterIndex + 1}`, programId: id, position: rosterPositions[rosterIndex]!, overall, potential: clamp(Math.round(overall + rng.between(`${playerId}:potential`, 2, 13)), overall, 99), workEthic: rng.between(`${playerId}:work-ethic`, 0.2, 1), fatigue: 0, eligibility: { cohortYear: 2027 - (rosterIndex % 4), seasonsEnrolled: rosterIndex % 4, seasonsParticipated: rosterIndex % 4, seasonsRemaining: 4 - (rosterIndex % 4), redshirtStatus: "AVAILABLE", gamesPlayedThisSeason: 0, rosterStatus: "SCHOLARSHIP" } };
    }
  }
  generateProspects(state, rng.fork("prospects"), programCount * 30, "initial");
  buildSeasonSchedule(state);
  return state;
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
  const ids = Object.keys(state.programs);
  state.schedule = [];
  let scheduleIndex = 0;
  for (let week = 1; week <= 12; week += 1) {
    for (let index = 0; index + 1 < ids.length; index += 2) {
      const homeProgramId = ids[(index + week) % ids.length]!;
      const awayProgramId = ids[(index + week + 1) % ids.length]!;
      if (homeProgramId === awayProgramId) continue;
      state.schedule.push({ id: `game:${week}:${scheduleIndex++}`, homeProgramId, awayProgramId, played: false });
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
  developPlayers(state, rng.fork("development"), events);
  resolveScheduledGames(state, rng.fork("games"), events);
  state.week += 1;
  if (state.week > 14) rolloverSeason(state, events);
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
    const player = state.players[command.playerId];
    if (!player || player.programId !== program.id) {
      events.push({ type: "COMMAND_REJECTED", programId: command.programId, command, reason: "Command is not valid for this roster." });
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
  const tierBonus = state.programs[programId]!.tier === "POWER" ? 12 : state.programs[programId]!.tier === "MID" ? 6 : 0;
  return Number((prospect.interestByProgram[programId]! + tierBonus + rng.between(`${prospect.id}:${programId}:decision-noise`, -7, 7)).toFixed(3));
}

function scholarshipCount(state: GameState, programId: string): number {
  return Object.values(state.players).filter((player) => player.programId === programId && player.eligibility.rosterStatus === "SCHOLARSHIP").length;
}

function prospectToPlayer(prospect: Prospect, id: string, programId: string, season: number): Player {
  return { id, name: prospect.name, programId, position: prospect.position, overall: prospect.overall, potential: prospect.potential, workEthic: prospect.workEthic, fatigue: 0, eligibility: { cohortYear: season, seasonsEnrolled: 0, seasonsParticipated: 0, seasonsRemaining: 4, redshirtStatus: "AVAILABLE", gamesPlayedThisSeason: 0, rosterStatus: "SCHOLARSHIP" } };
}

function generateProspects(state: GameState, rng: AddressableRng, count: number, cohort: string): void {
  const positions: Player["position"][] = ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P"];
  for (let index = 0; index < count; index += 1) {
    const id = `prospect-${cohort}-${index + 1}`;
    const overall = Math.round(rng.between(`${id}:overall`, 52, 79));
    const interestByProgram = Object.fromEntries(Object.keys(state.programs).map((programId) => [programId, Number(rng.between(`${id}:${programId}:interest`, 35, 88).toFixed(3))]));
    state.prospects[id] = { id, name: `Prospect ${index + 1}`, position: positions[index % positions.length]!, overall, potential: clamp(overall + rng.between(`${id}:potential`, 4, 20), overall, 99), workEthic: rng.between(`${id}:work-ethic`, 0.2, 1), interestByProgram, status: "AVAILABLE", signedProgramId: null };
  }
}

function developPlayers(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  const rules = state.identity.balanceConfiguration.weeklyDevelopment;
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus === "DEPARTED" || player.overall >= player.potential) continue;
    const fatigueModifier = clamp(1 - player.fatigue / 180, rules.fatigueFloor, 1);
    const gain = clamp((rules.base + player.workEthic * rules.workEthicWeight + rng.between(player.id, -0.01, 0.01)) * fatigueModifier, 0, rules.maximum);
    const previousOverall = player.overall;
    player.overall = clamp(Number((player.overall + gain).toFixed(3)), 40, player.potential);
    player.fatigue = clamp(player.fatigue + 1.5, 0, 100);
    if (player.overall !== previousOverall) events.push({ type: "PLAYER_DEVELOPED", season: state.season, week: state.week, playerId: player.id, previousOverall, newOverall: player.overall, factors: { workEthic: player.workEthic, fatigueModifier } });
  }
}

function teamStrength(state: GameState, program: Program): number {
  const roster = Object.values(state.players).filter((player) => player.programId === program.id && player.eligibility.rosterStatus !== "DEPARTED");
  return roster.length === 0 ? 40 : roster.reduce((sum, player) => sum + player.overall, 0) / roster.length;
}

function resolveScheduledGames(state: GameState, rng: AddressableRng, events: GameEvent[]): void {
  for (const game of state.schedule.filter((item) => !item.played && state.week === Number(item.id.split(":")[1]))) {
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
    if (homeScore > awayScore) { home.wins += 1; away.losses += 1; } else { away.wins += 1; home.losses += 1; }
    events.push({ type: "GAME_COMPLETED", season: state.season, week: state.week, gameId: game.id, homeProgramId: home.id, awayProgramId: away.id, homeScore, awayScore });
  }
}

function rolloverSeason(state: GameState, events: GameEvent[]): void {
  for (const player of Object.values(state.players)) {
    if (player.programId === null || player.eligibility.rosterStatus === "DEPARTED") continue;
    player.eligibility.seasonsEnrolled += 1;
    player.eligibility.seasonsParticipated += 1;
    player.eligibility.seasonsRemaining -= 1;
    player.eligibility.gamesPlayedThisSeason = 0;
    player.fatigue = 0;
    if (player.eligibility.seasonsRemaining <= 0) {
      player.eligibility.rosterStatus = "GRADUATED";
      events.push({ type: "PLAYER_DEPARTED", season: state.season, playerId: player.id, reason: "ELIGIBILITY_EXHAUSTED" });
    }
  }
  state.season += 1; state.week = 1;
  for (const program of Object.values(state.programs)) { program.wins = 0; program.losses = 0; }
  generateProspects(state, new AddressableRng(state.identity.rootSeed).fork("recruiting-cohort", String(state.season)), Object.keys(state.programs).length * 15, String(state.season));
  buildSeasonSchedule(state);
}
