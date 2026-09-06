/**
 * D2 — what a priority slot is actually worth, and whether the five cards post
 * the numbers the week delivers.
 *
 * (a) Marginal value of one slot, per card, per (tier x capacity x week).
 *     Method: prepareWeek with SET_WEEK_FOCUS focuses=[] for every program, then
 *     weekPriorities(). With nothing chosen, each card's `baseline` is the week
 *     with no slot spent on it and `focused` is the week with one slot spent on
 *     it, both computed by the same projection the engine runs.
 *
 * (b) Posted versus delivered, all five cards. For each card f: set every
 *     program's focus to [f], read the card, advance the week with no other
 *     commands, read WEEK_FOCUS_PAYOFF. Also runs a focus=[] control arm so the
 *     DEVELOP card's roster-growth claim has something to be a ratio against.
 */
import { writeFileSync } from "node:fs";
import { league, sim, ai } from "./lib.mjs";

const SEEDS = (process.argv[2] ?? "qa-c3-slot-1,qa-c3-slot-2,qa-c3-slot-3,qa-c3-slot-4").split(",");
const SIZE = Number(process.argv[3] ?? 72);
const WEEKS = (process.argv[4] ?? "1,7,13").split(",").map(Number);
const CARDS = ["INSTALL_OFFENSE", "INSTALL_DEFENSE", "SCOUT", "DEVELOP", "RECRUIT"];

const num = (s) => {
  const m = String(s).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const reps = (s) => {
  const m = String(s).match(/\((\d+) rep/);
  return m ? Number(m[1]) : null;
};

const marginal = [];   // (a)
const delivered = [];  // (b)
const briefingRows = [];

function setAll(state, focuses) {
  const cmds = Object.keys(state.programs).map((programId) => ({ type: "SET_WEEK_FOCUS", programId, focuses: [...focuses] }));
  return sim.prepareWeek(state, cmds).state;
}

for (const seed of SEEDS) {
  let state = sim.beginSeason(league(seed, SIZE));
  const maxWeek = Math.max(...WEEKS);
  const byTier = { LOW: [], MID: [], POWER: [] };
  for (const [id, p] of Object.entries(state.programs)) byTier[p.tier].push(id);
  const standing = [byTier.LOW[0], byTier.MID[0], byTier.POWER[0]].filter(Boolean);
  const sampled = [...byTier.LOW.slice(1, 5), ...byTier.MID.slice(1, 5), ...byTier.POWER.slice(1, 5)];
  while (state.phase === "REGULAR_SEASON" && state.week <= maxWeek) {
    const week = state.week;
    if (WEEKS.includes(week)) {
      // ---- (a) marginal value of the first slot, all five cards at once ----
      const empty = setAll(state, []);
      for (const programId of Object.keys(state.programs)) {
        const program = state.programs[programId];
        const capacity = sim.focusCapacity(state, programId).capacity;
        const cards = sim.weekPriorities(empty, programId);
        const row = { seed, week, programId, tier: program.tier, capacity, cards: {} };
        for (const card of cards) {
          row.cards[card.focus] = {
            baseline: card.baseline, focused: card.focused,
            baseNum: num(card.baseline), focusNum: num(card.focused),
            baseReps: reps(card.baseline), focusReps: reps(card.focused),
            stakes: card.stakes, blocked: card.blocked
          };
        }
        marginal.push(row);
      }

      // ---- (b) posted vs delivered ----
      const arms = {};
      for (const card of [...CARDS, "NONE"]) {
        const focuses = card === "NONE" ? [] : [card];
        const prepared = setAll(state, focuses);
        const posted = {};
        for (const programId of Object.keys(state.programs)) {
          const cards = sim.weekPriorities(prepared, programId);
          const found = cards.find((c) => c.focus === card) ?? null;
          const dev = cards.find((c) => c.focus === "DEVELOP");
          posted[programId] = {
            focused: found?.focused ?? null,
            baseline: found?.baseline ?? null,
            blocked: found?.blocked ?? null,
            devLabel: dev?.label ?? null,
            label: found?.label ?? null,
            target: sim.scoutingTargetFor(prepared, programId),
            spotlightPlayerId: prepared.developmentSpotlights?.[programId]?.target?.playerId ?? null
          };
        }
        const result = sim.advanceWeek(prepared, []);
        const payoffs = {};
        for (const e of result.events) {
          if (e.type === "WEEK_FOCUS_PAYOFF") payoffs[e.programId] = e;
        }
        // Roster growth actually delivered, for the DEVELOP claim.
        const growth = {};
        for (const e of result.events) {
          if (e.type !== "PLAYER_DEVELOPED") continue;
          const p = prepared.players[e.playerId];
          if (!p?.programId) continue;
          const g = growth[p.programId] ??= { total: 0, n: 0, spotlightGain: 0 };
          const d = e.newOverall - e.previousOverall;
          g.total += d; g.n += 1;
          if (posted[p.programId]?.spotlightPlayerId === e.playerId) g.spotlightGain = d;
        }
        arms[card] = { posted, payoffs, growth };
      }
      for (const programId of Object.keys(state.programs)) {
        const program = state.programs[programId];
        const base = { seed, week, programId, tier: program.tier, capacity: sim.focusCapacity(state, programId).capacity };
        for (const card of CARDS) {
          const a = arms[card];
          const ev = a.payoffs[programId];
          delivered.push({
            ...base, card,
            posted: a.posted[programId]?.focused ?? null,
            postedNum: num(a.posted[programId]?.focused ?? ""),
            blocked: a.posted[programId]?.blocked ?? null,
            evOffense: ev?.offensiveExecution ?? null,
            evDefense: ev?.defensiveExecution ?? null,
            evReadiness: ev?.scoutingReadiness ?? null,
            evDevPlayer: ev?.developedPlayerId ?? null,
            evDevGain: ev?.developedOverallGain ?? null,
            evRecruit: ev?.recruitingPointsAdded ?? null,
            evScouted: ev?.scoutedOpponentId ?? null,
            target: a.posted[programId]?.target ?? null,
            cardSpotlight: a.posted[programId]?.spotlightPlayerId ?? null,
            growthTotal: a.growth[programId]?.total ?? 0,
            growthN: a.growth[programId]?.n ?? 0,
            noneGrowthTotal: arms.NONE.growth[programId]?.total ?? 0,
            noneGrowthN: arms.NONE.growth[programId]?.n ?? 0,
            noneRecruit: arms.NONE.payoffs[programId]?.recruitingPointsAdded ?? null,
            noneOffense: null
          });
        }
      }
    }

    // ---- briefing: how often a card worth >=65 is not being chased ----
    // Two populations. `AI` re-plans its five priorities every single week, so it
    // is the best case. `STANDING` is three programs (one per tier) whose
    // SET_WEEK_FOCUS commands are stripped from the plan after week 1, which is
    // the behaviour the design actually leans on: "priorities carry over, and a
    // player with nothing to change advances the week with one button".
    for (const [pop, ids] of [["AI", sampled], ["STANDING", standing]]) {
      for (const programId of ids) {
        const cards = sim.weekPriorities(state, programId);
        const capacity = sim.focusCapacity(state, programId).capacity;
        const chosen = cards.filter((c) => c.chosen).length;
        const best = cards.filter((c) => !c.chosen && !c.blocked && c.stakes >= 65)
          .sort((l, r) => r.stakes - l.stakes)[0] ?? null;
        const items = sim.weeklyBriefing(state, programId) ?? [];
        briefingRows.push({
          seed, week, programId, pop, capacity, chosen,
          slotsFull: chosen >= capacity,
          missedFocus: best?.focus ?? null,
          missedStakes: best?.stakes ?? null,
          conditionMet: Boolean(best) && chosen >= capacity,
          itemShown: items.some((i) => String(i.id).startsWith("WEEK_FOCUS:")),
          maxStakes: Math.max(...cards.map((c) => c.blocked ? 0 : c.stakes))
        });
      }
    }

    const planned = ai.planWeeklyCommands(state)
      .filter((c) => !(c.type === "SET_WEEK_FOCUS" && week > 1 && standing.includes(c.programId)));
    const result = sim.advanceWeek(state, planned);
    state = result.state;
    process.stderr.write(`${seed} w${week} done\n`);
  }
}


writeFileSync(new URL("./d2-marginal.json", import.meta.url), JSON.stringify(marginal));
writeFileSync(new URL("./d2-delivered.json", import.meta.url), JSON.stringify(delivered));
writeFileSync(new URL("./d2-briefing.json", import.meta.url), JSON.stringify(briefingRows));
console.log("marginal", marginal.length, "delivered", delivered.length, "briefing", briefingRows.length);
