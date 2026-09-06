/**
 * D1 — pooled competitiveness baseline, six leagues, 72 programs, one season.
 * Regular season only (144 games/league), which is what game-balance.md §2's
 * "+-3.5 points on 144 games" refers to.
 */
import { writeFileSync } from "node:fs";
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "qa-c3-pool-1,qa-c3-pool-2,qa-c3-pool-3,qa-c3-pool-4,qa-c3-pool-5,qa-c3-pool-6").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const out = [];

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  const games = [];
  while (state.phase === "REGULAR_SEASON" && state.week <= 14) {
    const result = sim.advanceWeek(state, ai.planWeeklyCommands(state));
    for (const e of result.events) {
      if (e.type === "GAME_COMPLETED") games.push({ h: e.homeScore, a: e.awayScore, week: e.week, gameId: e.gameId });
    }
    state = result.state;
  }
  // Per-team-game football rates, from the game logs of the regular season.
  const byTeamGame = new Map();
  for (const line of state.playerGameStats) {
    const key = `${line.gameId}|${line.programId}`;
    const t = byTeamGame.get(key) ?? {
      pa: 0, pc: 0, py: 0, ptd: 0, int: 0, ra: 0, ry: 0, rtd: 0, sacks: 0, fgm: 0, punts: 0
    };
    t.pa += line.passingAttempts; t.pc += line.passingCompletions; t.py += line.passingYards;
    t.ptd += line.passingTouchdowns; t.int += line.interceptionsThrown;
    t.ra += line.rushingAttempts; t.ry += line.rushingYards; t.rtd += line.rushingTouchdowns;
    t.sacks += line.sacks; t.fgm += line.fieldGoalsMade; t.punts += line.punts;
    byTeamGame.set(key, t);
  }
  out.push({ seed, games, teamGames: [...byTeamGame.values()] });
  process.stderr.write(`${seed}: ${games.length} games, ${byTeamGame.size} team-games\n`);
}

writeFileSync(new URL("./d1-rows.json", import.meta.url), JSON.stringify(out));
console.log("leagues", out.length);
