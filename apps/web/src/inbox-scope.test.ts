import { describe, expect, it } from "vitest";
import type { GameEvent } from "@college-legends/model";
import {
  advanceOffseasonStep,
  advanceWeek,
  beginSeason,
  createFictionalLeague
} from "@college-legends/simulation";
import { planOffseasonCommands, planWeeklyCommands } from "@college-legends/ai";
import {
  INBOX_LEAGUE_NEWS,
  INBOX_NOISE,
  INBOX_OWN_PROGRAM,
  INBOX_SCOPED_BY_RULE
} from "./App.js";

/**
 * Every event type the engine actually emits carrying a `programId`, gathered
 * by playing two full seasons rather than by reading the type union — a grep
 * over the union missed `NIL_OFFER_RESOLVED`, which is the type this test
 * exists for.
 */
function typesCarryingProgramId(): Set<GameEvent["type"]> {
  let state = beginSeason(createFictionalLeague("inbox-scope-audit", 12));
  const carrying = new Set<GameEvent["type"]>();
  const note = (events: readonly GameEvent[]): void => {
    for (const event of events) if ("programId" in event) carrying.add(event.type);
  };
  for (let season = 0; season < 2; season += 1) {
    if (state.phase === "ROSTER_REVIEW") state = beginSeason(state);
    while (state.phase === "REGULAR_SEASON") {
      const result = advanceWeek(state, planWeeklyCommands(state));
      note(result.events);
      state = result.state;
    }
    while (state.phase === "OFFSEASON") {
      const result = advanceOffseasonStep(state, planOffseasonCommands(state));
      note(result.events);
      state = result.state;
    }
  }
  return carrying;
}

describe("inbox scoping", () => {
  it("classifies every event that names a program", () => {
    // The inbox filter used to fall through to `return true`, so an event type
    // that named a program was shown to all seventy-two unless somebody
    // remembered to add it to a list. That is how `NIL_OFFER_RESOLVED` came to
    // report other programs' recruiting as the player's own — under a sentence
    // reading "took *your* $850 a week offer" — five weeks after the identical
    // defect was fixed for BOOSTER_OFFERED by adding it to that same list.
    //
    // Fixing one more type would only have set up the next recurrence. This
    // asserts the classification is total: noise, own-program, or league news,
    // decided deliberately for every type the engine emits.
    const unclassified = [...typesCarryingProgramId()].filter((type) =>
      !INBOX_NOISE.has(type) && !INBOX_OWN_PROGRAM.has(type)
      && !INBOX_SCOPED_BY_RULE.has(type) && !INBOX_LEAGUE_NEWS.has(type));

    expect(unclassified, `these event types name a program but nobody has said whose inbox they belong in.
Add each to INBOX_NOISE (bookkeeping), INBOX_OWN_PROGRAM (the named program's
business), INBOX_SCOPED_BY_RULE (scoped by a rule of its own), or
INBOX_LEAGUE_NEWS (news to everybody) in App.tsx.`).toEqual([]);
  });

  it("keeps the NIL pair out of everybody else's inbox", () => {
    // The specific regression, named so a future reader knows what broke.
    expect(INBOX_OWN_PROGRAM.has("NIL_OFFER_RESOLVED")).toBe(true);
    expect(INBOX_OWN_PROGRAM.has("NIL_OFFER_SET")).toBe(true);
    expect(INBOX_OWN_PROGRAM.has("NIL_COMMITMENT_ENDED")).toBe(true);
  });

  it("does not classify a type as both private and public", () => {
    const both = [...INBOX_OWN_PROGRAM].filter((type) => INBOX_LEAGUE_NEWS.has(type));
    expect(both).toEqual([]);
  });
});
