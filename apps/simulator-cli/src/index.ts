import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GameEvent } from "@college-legends/model";
import { summarize } from "@college-legends/analytics";
import { planWeeklyCommands } from "@college-legends/ai";
import { advanceOffseasonStep, advanceWeek, beginSeason, createFictionalLeague } from "@college-legends/simulation";

const args = new Map<string, string>();
for (let index = 0; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value?.startsWith("--")) args.set(value.slice(2), process.argv[index + 1] ?? "true");
}
const seasons = Number(args.get("seasons") ?? 50);
const seed = String(args.get("seed") ?? "college-legends-baseline");
const output = resolve(String(args.get("output") ?? "reports/latest"));
let state = beginSeason(createFictionalLeague(seed));
const events: GameEvent[] = [];
const initialSeason = state.season;
while (state.season < initialSeason + seasons) {
  // A career alternates weeks with offseason steps. The headless runner takes
  // no offseason decisions yet — see the AI offseason planner.
  const result = state.phase === "OFFSEASON"
    ? advanceOffseasonStep(state)
    : advanceWeek(state, planWeeklyCommands(state));
  state = result.state;
  events.push(...result.events);
}
const metrics = summarize(state, events, seasons);
await mkdir(output, { recursive: true });
await writeFile(resolve(output, "metrics.json"), `${JSON.stringify({ seed, metrics }, null, 2)}\n`);
await writeFile(resolve(output, "program-records.csv"), ["program,tier,wins,losses,coachSecurity", ...Object.values(state.programs).map((program) => `${program.name},${program.tier},${program.wins},${program.losses},${program.coachSecurity}`)].join("\n") + "\n");
console.log(JSON.stringify({ output, ...metrics }, null, 2));
