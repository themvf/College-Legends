/**
 * qa-lead independent verification of D1's margin / shutout headline.
 * Fresh seeds chosen by the lead, not D's, so this is not a re-run of the
 * same draws. Regular season only.
 */
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "lead-verify-a,lead-verify-b,lead-verify-c").split(",");
const SIZE = Number(process.argv[3] ?? 24);

let allMargins = [];
let allScores = [];
let homeWins = 0, decided = 0;

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  const margins = [], scores = [];
  let hw = 0, n = 0;
  while (state.phase === "REGULAR_SEASON" && state.week <= 14) {
    const result = sim.advanceWeek(state, ai.planWeeklyCommands(state));
    for (const e of result.events) {
      if (e.type !== "GAME_COMPLETED") continue;
      margins.push(Math.abs(e.homeScore - e.awayScore));
      scores.push(e.homeScore, e.awayScore);
      if (e.homeScore !== e.awayScore) { n += 1; if (e.homeScore > e.awayScore) hw += 1; }
    }
    state = result.state;
  }
  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
  const shut = scores.filter((s) => s === 0).length / scores.length;
  const one = margins.filter((m) => m <= 8).length / margins.length;
  const pts = scores.reduce((a, b) => a + b, 0) / scores.length;
  console.log(
    `${seed.padEnd(16)} games=${String(margins.length).padStart(4)}  margin=${avg.toFixed(2)}` +
    `  shutout=${(shut * 100).toFixed(2)}%  one-score=${(one * 100).toFixed(1)}%` +
    `  home=${(hw / n * 100).toFixed(1)}%  pts/tg=${pts.toFixed(1)}`
  );
  allMargins = allMargins.concat(margins);
  allScores = allScores.concat(scores);
  homeWins += hw; decided += n;
}

const avg = allMargins.reduce((a, b) => a + b, 0) / allMargins.length;
const shut = allScores.filter((s) => s === 0).length / allScores.length;
const one = allMargins.filter((m) => m <= 8).length / allMargins.length;
const pts = allScores.reduce((a, b) => a + b, 0) / allScores.length;
console.log(
  `POOLED size=${SIZE} leagues=${SEEDS.length} games=${allMargins.length}  ` +
  `margin=${avg.toFixed(2)}  shutout=${(shut * 100).toFixed(2)}%  ` +
  `one-score=${(one * 100).toFixed(1)}%  home=${(homeWins / decided * 100).toFixed(1)}%  ` +
  `pts/tg=${pts.toFixed(1)}`
);
