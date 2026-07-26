import type { GameEvent, GameState } from "@college-legends/model";

export interface SimulationMetrics { seasons: number; games: number; averagePointsPerTeam: number; upsetRate: number; departures: number; }

export function summarize(state: GameState, events: readonly GameEvent[], seasons: number): SimulationMetrics {
  const games = events.filter((event): event is Extract<GameEvent, { type: "GAME_COMPLETED" }> => event.type === "GAME_COMPLETED");
  const upsets = games.filter((game) => {
    const home = state.programs[game.homeProgramId]; const away = state.programs[game.awayProgramId];
    if (!home || !away) return false;
    return (home.tier === "POWER" && game.homeScore < game.awayScore) || (away.tier === "POWER" && game.awayScore < game.homeScore);
  });
  return { seasons, games: games.length, averagePointsPerTeam: games.length === 0 ? 0 : games.reduce((sum, game) => sum + game.homeScore + game.awayScore, 0) / (games.length * 2), upsetRate: games.length === 0 ? 0 : upsets.length / games.length, departures: events.filter((event) => event.type === "PLAYER_DEPARTED").length };
}
