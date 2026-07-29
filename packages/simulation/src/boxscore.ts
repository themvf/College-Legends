import type { GameState, PlayerGameStatLine, ProgramId } from "@college-legends/model";

/**
 * A played game as a newspaper would print it. The engine already emits every
 * number in `playerGameStats`; this only groups, sorts, and totals them, so the
 * page can never disagree with the game that was played.
 *
 * Grouping lives here rather than in the UI because the totals are assertions:
 * a test can check that the passing table's team row equals the yardage the
 * drive loop actually produced.
 */
export interface BoxScoreRow {
  playerId: string;
  name: string;
  position: string;
  /** True for the team total line, which never links to a player. */
  total: boolean;
  values: string[];
}

export interface BoxScoreGroup {
  id: string;
  label: string;
  columns: string[];
  rows: BoxScoreRow[];
}

export interface BoxScoreTeam {
  programId: ProgramId;
  name: string;
  abbreviation: string;
  score: number;
  groups: BoxScoreGroup[];
}

/** One line of the head-to-head team comparison. */
export interface BoxScoreTeamStat {
  label: string;
  home: string;
  away: string;
}

export interface BoxScore {
  gameId: string;
  season: number;
  week: number;
  home: BoxScoreTeam;
  away: BoxScoreTeam;
  teamStats: BoxScoreTeamStat[];
}

const sum = (lines: readonly PlayerGameStatLine[], pick: (line: PlayerGameStatLine) => number): number =>
  lines.reduce((total, line) => total + pick(line), 0);

const average = (yards: number, attempts: number): string => (attempts > 0 ? (yards / attempts).toFixed(1) : "0.0");

interface GroupSpec {
  id: string;
  label: string;
  columns: string[];
  /** A player appears in this table only if he did something in it. */
  qualifies: (line: PlayerGameStatLine) => boolean;
  /** Best first, the way a box score is read. */
  rank: (line: PlayerGameStatLine) => number;
  row: (line: PlayerGameStatLine) => string[];
  total: (lines: readonly PlayerGameStatLine[]) => string[];
}

/**
 * The tables a college box score prints, in the order it prints them. Columns
 * the engine does not model (longest play, solo tackles, fumbles) are left out
 * rather than filled with a plausible-looking zero.
 */
const GROUPS: readonly GroupSpec[] = [
  {
    id: "PASSING",
    label: "Passing",
    columns: ["C/ATT", "YDS", "AVG", "TD", "INT", "SACKS"],
    qualifies: (line) => line.passingAttempts > 0,
    rank: (line) => line.passingYards,
    row: (line) => [
      `${line.passingCompletions}/${line.passingAttempts}`,
      String(line.passingYards),
      average(line.passingYards, line.passingAttempts),
      String(line.passingTouchdowns),
      String(line.interceptionsThrown),
      String(line.sacksTaken)
    ],
    total: (lines) => [
      `${sum(lines, (line) => line.passingCompletions)}/${sum(lines, (line) => line.passingAttempts)}`,
      String(sum(lines, (line) => line.passingYards)),
      average(sum(lines, (line) => line.passingYards), sum(lines, (line) => line.passingAttempts)),
      String(sum(lines, (line) => line.passingTouchdowns)),
      String(sum(lines, (line) => line.interceptionsThrown)),
      String(sum(lines, (line) => line.sacksTaken))
    ]
  },
  {
    id: "RUSHING",
    label: "Rushing",
    columns: ["CAR", "YDS", "AVG", "TD"],
    qualifies: (line) => line.rushingAttempts > 0,
    rank: (line) => line.rushingYards,
    row: (line) => [
      String(line.rushingAttempts),
      String(line.rushingYards),
      average(line.rushingYards, line.rushingAttempts),
      String(line.rushingTouchdowns)
    ],
    total: (lines) => [
      String(sum(lines, (line) => line.rushingAttempts)),
      String(sum(lines, (line) => line.rushingYards)),
      average(sum(lines, (line) => line.rushingYards), sum(lines, (line) => line.rushingAttempts)),
      String(sum(lines, (line) => line.rushingTouchdowns))
    ]
  },
  {
    id: "RECEIVING",
    label: "Receiving",
    columns: ["REC", "YDS", "AVG", "TD", "TGTS"],
    qualifies: (line) => line.targets > 0 || line.receptions > 0,
    rank: (line) => line.receivingYards,
    row: (line) => [
      String(line.receptions),
      String(line.receivingYards),
      average(line.receivingYards, line.receptions),
      String(line.receivingTouchdowns),
      String(line.targets)
    ],
    total: (lines) => [
      String(sum(lines, (line) => line.receptions)),
      String(sum(lines, (line) => line.receivingYards)),
      average(sum(lines, (line) => line.receivingYards), sum(lines, (line) => line.receptions)),
      String(sum(lines, (line) => line.receivingTouchdowns)),
      String(sum(lines, (line) => line.targets))
    ]
  },
  {
    id: "DEFENSE",
    label: "Defense",
    columns: ["TOT", "TFL", "SACKS", "INT", "PD"],
    qualifies: (line) =>
      line.tackles > 0 || line.sacks > 0 || line.defensiveInterceptions > 0 || line.passBreakups > 0,
    rank: (line) => line.tackles + line.sacks * 3 + line.defensiveInterceptions * 4,
    row: (line) => [
      String(line.tackles),
      String(line.tacklesForLoss),
      line.sacks.toFixed(1).replace(/\.0$/, ""),
      String(line.defensiveInterceptions),
      String(line.passBreakups)
    ],
    total: (lines) => [
      String(sum(lines, (line) => line.tackles)),
      String(sum(lines, (line) => line.tacklesForLoss)),
      sum(lines, (line) => line.sacks).toFixed(1).replace(/\.0$/, ""),
      String(sum(lines, (line) => line.defensiveInterceptions)),
      String(sum(lines, (line) => line.passBreakups))
    ]
  },
  {
    id: "KICKING",
    label: "Kicking",
    columns: ["FG", "PCT", "PTS"],
    qualifies: (line) => line.fieldGoalsAttempted > 0,
    rank: (line) => line.fieldGoalsMade,
    row: (line) => [
      `${line.fieldGoalsMade}/${line.fieldGoalsAttempted}`,
      `${Math.round(line.fieldGoalsMade / Math.max(1, line.fieldGoalsAttempted) * 100)}%`,
      String(line.fieldGoalsMade * 3)
    ],
    total: (lines) => [
      `${sum(lines, (line) => line.fieldGoalsMade)}/${sum(lines, (line) => line.fieldGoalsAttempted)}`,
      `${Math.round(sum(lines, (line) => line.fieldGoalsMade) / Math.max(1, sum(lines, (line) => line.fieldGoalsAttempted)) * 100)}%`,
      String(sum(lines, (line) => line.fieldGoalsMade) * 3)
    ]
  },
  {
    id: "PUNTING",
    label: "Punting",
    columns: ["NO", "YDS", "AVG"],
    qualifies: (line) => line.punts > 0,
    rank: (line) => line.punts,
    row: (line) => [
      String(line.punts),
      String(line.puntYards),
      average(line.puntYards, line.punts)
    ],
    total: (lines) => [
      String(sum(lines, (line) => line.punts)),
      String(sum(lines, (line) => line.puntYards)),
      average(sum(lines, (line) => line.puntYards), sum(lines, (line) => line.punts))
    ]
  }
];

function buildTeam(
  state: Readonly<GameState>,
  programId: ProgramId,
  score: number,
  lines: readonly PlayerGameStatLine[]
): BoxScoreTeam {
  const program = state.programs[programId];
  return {
    programId,
    name: program?.name ?? programId,
    abbreviation: program?.abbreviation ?? programId.slice(0, 4).toUpperCase(),
    score,
    groups: GROUPS.flatMap((spec) => {
      const qualifying = lines.filter(spec.qualifies).sort((left, right) => spec.rank(right) - spec.rank(left));
      if (qualifying.length === 0) return [];
      const rows: BoxScoreRow[] = qualifying.map((line) => ({
        playerId: line.playerId,
        name: state.players[line.playerId]?.name ?? "Unknown",
        position: line.position,
        total: false,
        values: spec.row(line)
      }));
      rows.push({ playerId: `${programId}:${spec.id}:total`, name: "TEAM", position: "", total: true, values: spec.total(qualifying) });
      return [{ id: spec.id, label: spec.label, columns: spec.columns, rows }];
    })
  };
}

/**
 * Comparative team totals, derived from the same lines as the tables above so
 * the two halves of the page cannot drift apart.
 */
function teamStats(home: readonly PlayerGameStatLine[], away: readonly PlayerGameStatLine[]): BoxScoreTeamStat[] {
  const of = (lines: readonly PlayerGameStatLine[]) => {
    const passing = sum(lines, (line) => line.passingYards);
    const rushing = sum(lines, (line) => line.rushingYards);
    return {
      total: passing + rushing,
      passing,
      rushing,
      plays: sum(lines, (line) => line.passingAttempts + line.rushingAttempts),
      turnovers: sum(lines, (line) => line.interceptionsThrown),
      sacks: sum(lines, (line) => line.sacks)
    };
  };
  const left = of(home);
  const right = of(away);
  return [
    { label: "Total yards", home: String(left.total), away: String(right.total) },
    { label: "Passing", home: String(left.passing), away: String(right.passing) },
    { label: "Rushing", home: String(left.rushing), away: String(right.rushing) },
    { label: "Yards per play", home: average(left.total, left.plays), away: average(right.total, right.plays) },
    { label: "Sacks", home: String(left.sacks), away: String(right.sacks) },
    { label: "Turnovers", home: String(left.turnovers), away: String(right.turnovers) }
  ];
}

/** The box score for a played game, or null if it has not been played. */
export function boxScore(state: Readonly<GameState>, gameId: string): BoxScore | null {
  const game = state.schedule.find((fixture) => fixture.id === gameId);
  if (!game || !game.played || game.homeScore === null || game.awayScore === null) return null;
  const lines = state.playerGameStats.filter((line) => line.gameId === gameId);
  if (lines.length === 0) return null;
  const homeLines = lines.filter((line) => line.programId === game.homeProgramId);
  const awayLines = lines.filter((line) => line.programId === game.awayProgramId);
  return {
    gameId,
    season: state.season,
    week: game.week,
    home: buildTeam(state, game.homeProgramId, game.homeScore, homeLines),
    away: buildTeam(state, game.awayProgramId, game.awayScore, awayLines),
    teamStats: teamStats(homeLines, awayLines)
  };
}

/** The most recent played game involving this program, for the recap screen. */
export function latestBoxScore(state: Readonly<GameState>, programId: ProgramId): BoxScore | null {
  const played = state.schedule
    .filter((fixture) => fixture.played && (fixture.homeProgramId === programId || fixture.awayProgramId === programId))
    .sort((left, right) => right.week - left.week)[0];
  return played ? boxScore(state, played.id) : null;
}
