import type { GameEvent, GameState, PlayerId, ProgramId } from "@college-legends/model";

type WeeklyRecap = Extract<GameEvent, { type: "WEEKLY_RECAP" }>;
type CompletedGame = Extract<GameEvent, { type: "GAME_COMPLETED" }>;
type PlayerBrandUpdate = Extract<GameEvent, { type: "PLAYER_BRAND_UPDATED" }>;

export type WeeklyStory =
  | {
      id: string;
      kind: "PROGRAM_RESULT";
      season: number;
      week: number;
      importance: number;
      programId: ProgramId;
      opponentProgramId: ProgramId | null;
      result: WeeklyRecap["result"];
      scoreFor: number | null;
      scoreAgainst: number | null;
      opponentRank: number | null;
      homeGame: boolean;
      marqueeGame: boolean;
      featuredPlayerId: PlayerId | null;
      featuredPlayerRating: number | null;
      featuredPlayerSummary: string | null;
      fanChange: number;
      localPressChange: number;
      nationalPressChange: number;
      weeklyNet: number;
    }
  | {
      id: string;
      kind: "NATIONAL_RESULT";
      season: number;
      week: number;
      importance: number;
      angle: "UPSET" | "THRILLER" | "RANKED_STATEMENT" | "SHOOTOUT" | "NATIONAL_RESULT";
      winnerProgramId: ProgramId;
      loserProgramId: ProgramId;
      winnerScore: number;
      loserScore: number;
      winnerRank: number | null;
      loserRank: number | null;
    }
  | {
      id: string;
      kind: "PLAYER_SPOTLIGHT";
      season: number;
      week: number;
      importance: number;
      playerId: PlayerId;
      programId: ProgramId;
      opponentProgramId: ProgramId | null;
      gameRating: number;
      performanceSummary: string;
      personalFanChange: number;
      schoolFanLift: number;
      stardomChange: number;
    }
  | {
      id: string;
      kind: "PROGRAM_MOMENTUM";
      season: number;
      week: number;
      importance: number;
      angle: "SPONSOR_BONUS" | "PACKED_HOUSE" | "FAN_SURGE" | "BIG_WEEK";
      programId: ProgramId;
      sponsorName: string | null;
      sponsorBonus: number;
      attendance: number;
      capacity: number;
      fanChange: number;
      weeklyNet: number;
    };

function storyWeek(
  state: Readonly<GameState>,
  season: number | undefined,
  week: number | undefined
): { season: number; week: number } | null {
  if (season !== undefined && week !== undefined) return { season, week };
  const latest = [...state.eventHistory]
    .reverse()
    .find((event): event is WeeklyRecap => event.type === "WEEKLY_RECAP");
  return latest ? { season: latest.season, week: latest.week } : null;
}

function programResultStory(
  state: Readonly<GameState>,
  playerProgramId: ProgramId,
  recaps: readonly WeeklyRecap[],
  brandUpdates: readonly PlayerBrandUpdate[]
): WeeklyStory | null {
  const recap = recaps.find((event) => event.programId === playerProgramId);
  if (!recap) return null;
  const featured = recap.featuredPlayerId
    ? brandUpdates.find((event) => event.playerId === recap.featuredPlayerId)
    : null;
  const margin = recap.scoreFor !== null && recap.scoreAgainst !== null
    ? Math.abs(recap.scoreFor - recap.scoreAgainst)
    : 0;
  const importance = recap.result === "BYE"
    ? 45
    : 70
      + (recap.marqueeGame ? 15 : 0)
      + (recap.opponentRank !== null && recap.opponentRank <= 25 ? 12 : 0)
      + Math.min(8, margin / 3);
  return {
    id: `${recap.season}-${recap.week}-program-${playerProgramId}`,
    kind: "PROGRAM_RESULT",
    season: recap.season,
    week: recap.week,
    importance,
    programId: playerProgramId,
    opponentProgramId: recap.opponentProgramId,
    result: recap.result,
    scoreFor: recap.scoreFor,
    scoreAgainst: recap.scoreAgainst,
    opponentRank: recap.opponentRank,
    homeGame: recap.homeGame,
    marqueeGame: recap.marqueeGame,
    featuredPlayerId: recap.featuredPlayerId,
    featuredPlayerRating: recap.featuredPlayerRating,
    featuredPlayerSummary: featured?.performanceSummary ?? null,
    fanChange: recap.fanChange,
    localPressChange: recap.localPressChange,
    nationalPressChange: recap.nationalPressChange,
    weeklyNet: recap.weeklyNet
  };
}

function nationalResultStory(
  state: Readonly<GameState>,
  playerProgramId: ProgramId,
  games: readonly CompletedGame[],
  recaps: readonly WeeklyRecap[]
): WeeklyStory | null {
  const recapByProgram = new Map(recaps.map((recap) => [recap.programId, recap]));
  const candidates = games
    .filter((game) => game.homeProgramId !== playerProgramId && game.awayProgramId !== playerProgramId)
    .map((game) => {
      const homeWon = game.homeScore > game.awayScore;
      const winnerProgramId = homeWon ? game.homeProgramId : game.awayProgramId;
      const loserProgramId = homeWon ? game.awayProgramId : game.homeProgramId;
      const winnerScore = Math.max(game.homeScore, game.awayScore);
      const loserScore = Math.min(game.homeScore, game.awayScore);
      // Each recap stores its opponent's pregame rank. Reading the opposite
      // recap gives us the team's rank before rankings are recalculated.
      const homeRank = recapByProgram.get(game.awayProgramId)?.opponentRank
        ?? state.programs[game.homeProgramId]?.nationalRank
        ?? null;
      const awayRank = recapByProgram.get(game.homeProgramId)?.opponentRank
        ?? state.programs[game.awayProgramId]?.nationalRank
        ?? null;
      const winnerRank = homeWon ? homeRank : awayRank;
      const loserRank = homeWon ? awayRank : homeRank;
      const margin = winnerScore - loserScore;
      const total = winnerScore + loserScore;
      const rankGap = winnerRank !== null && loserRank !== null ? winnerRank - loserRank : 0;
      const upset = loserRank !== null && loserRank <= 25 && rankGap >= 8;
      const rankedStatement = loserRank !== null && loserRank <= 25 && margin >= 14;
      const angle: Extract<WeeklyStory, { kind: "NATIONAL_RESULT" }>["angle"] = upset
        ? "UPSET"
        : margin <= 3
          ? "THRILLER"
          : rankedStatement
            ? "RANKED_STATEMENT"
            : total >= 70
              ? "SHOOTOUT"
              : "NATIONAL_RESULT";
      const editorialScore = angle === "UPSET"
        ? 1_000 + rankGap * 8 + (26 - (loserRank ?? 25)) * 5
        : angle === "RANKED_STATEMENT"
          ? 800 + margin * 4 + (26 - (loserRank ?? 25)) * 4
          : angle === "THRILLER"
            ? 650 + total + (winnerRank !== null && winnerRank <= 25 ? 100 : 0)
            : angle === "SHOOTOUT"
              ? 500 + total
              : 250 + (winnerRank !== null && winnerRank <= 25 ? 100 - winnerRank : 0);
      return {
        id: `${game.season}-${game.week}-national-${game.gameId}`,
        kind: "NATIONAL_RESULT" as const,
        season: game.season,
        week: game.week,
        importance: editorialScore,
        angle,
        winnerProgramId,
        loserProgramId,
        winnerScore,
        loserScore,
        winnerRank,
        loserRank
      };
    })
    .sort((left, right) => right.importance - left.importance || left.id.localeCompare(right.id));
  return candidates[0] ?? null;
}

function playerSpotlightStory(
  state: Readonly<GameState>,
  brandUpdates: readonly PlayerBrandUpdate[],
  recaps: readonly WeeklyRecap[]
): WeeklyStory | null {
  const recapByProgram = new Map(recaps.map((recap) => [recap.programId, recap]));
  const standout = [...brandUpdates]
    .filter((event): event is PlayerBrandUpdate & { gameRating: number } =>
      event.gameRating !== null && state.players[event.playerId] !== undefined)
    .sort((left, right) =>
      right.gameRating - left.gameRating
      || right.personalFanChange - left.personalFanChange
      || left.playerId.localeCompare(right.playerId))[0];
  if (!standout || standout.gameRating < 82) return null;
  return {
    id: `${standout.season}-${standout.week}-player-${standout.playerId}`,
    kind: "PLAYER_SPOTLIGHT",
    season: standout.season,
    week: standout.week,
    importance: standout.gameRating + Math.min(15, standout.personalFanChange / 1_000),
    playerId: standout.playerId,
    programId: standout.programId,
    opponentProgramId: recapByProgram.get(standout.programId)?.opponentProgramId ?? null,
    gameRating: standout.gameRating,
    performanceSummary: standout.performanceSummary,
    personalFanChange: standout.personalFanChange,
    schoolFanLift: standout.schoolFanLift,
    stardomChange: standout.stardomChange
  };
}

function programMomentumStory(
  playerProgramId: ProgramId,
  recaps: readonly WeeklyRecap[],
  events: readonly GameEvent[]
): WeeklyStory | null {
  const recap = recaps.find((event) => event.programId === playerProgramId);
  if (!recap) return null;
  const payment = events.find((event): event is Extract<GameEvent, { type: "SPONSORSHIP_PAYMENT" }> =>
    event.type === "SPONSORSHIP_PAYMENT" && event.programId === playerProgramId);
  const sponsorBonus = payment ? payment.total - payment.basePayment : 0;
  const capacityShare = recap.capacity > 0 ? recap.attendance / recap.capacity : 0;
  const fanSurgeThreshold = Math.max(1_000, recap.fansBefore * 0.025);
  let angle: Extract<WeeklyStory, { kind: "PROGRAM_MOMENTUM" }>["angle"] | null = null;
  if (sponsorBonus > 0) angle = "SPONSOR_BONUS";
  else if (recap.homeGame && capacityShare >= 0.9) angle = "PACKED_HOUSE";
  else if (recap.fanChange >= fanSurgeThreshold) angle = "FAN_SURGE";
  else if (recap.weeklyNet >= 500_000) angle = "BIG_WEEK";
  if (!angle) return null;
  return {
    id: `${recap.season}-${recap.week}-business-${playerProgramId}`,
    kind: "PROGRAM_MOMENTUM",
    season: recap.season,
    week: recap.week,
    importance: 60
      + (angle === "SPONSOR_BONUS" ? 20 : 0)
      + Math.min(15, Math.max(0, recap.weeklyNet) / 100_000),
    angle,
    programId: playerProgramId,
    sponsorName: payment?.sponsorName ?? null,
    sponsorBonus,
    attendance: recap.attendance,
    capacity: recap.capacity,
    fanChange: recap.fanChange,
    weeklyNet: recap.weeklyNet
  };
}

/**
 * Selects a small, deterministic editorial package from structured weekly
 * events. It stores no prose and mutates no state; the UI remains responsible
 * for turning these facts into sentences.
 */
export function weeklyStories(
  state: Readonly<GameState>,
  playerProgramId: ProgramId,
  season?: number,
  week?: number
): WeeklyStory[] {
  const issue = storyWeek(state, season, week);
  if (!issue) return [];
  const events = state.eventHistory.filter((event) =>
    "season" in event
    && event.season === issue.season
    && ("week" in event ? event.week === issue.week : false));
  const recaps = events.filter((event): event is WeeklyRecap => event.type === "WEEKLY_RECAP");
  const games = events.filter((event): event is CompletedGame => event.type === "GAME_COMPLETED");
  const brandUpdates = events.filter((event): event is PlayerBrandUpdate => event.type === "PLAYER_BRAND_UPDATED");
  const selected = [
    programResultStory(state, playerProgramId, recaps, brandUpdates),
    nationalResultStory(state, playerProgramId, games, recaps),
    playerSpotlightStory(state, brandUpdates, recaps),
    programMomentumStory(playerProgramId, recaps, events)
  ].filter((story): story is WeeklyStory => story !== null);
  return selected.slice(0, 4);
}
