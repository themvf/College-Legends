# The Development screen is unreachable from everything that points at development

| | |
|---|---|
| **ID** | 2026-09-05-07 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Player development / onboarding |
| **Found by** | new-player-tester (cycle 2 cold read), reproduced by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F9) |

## What happens

`More ▾ → Development` holds the only screen in the game that shows the five
per-position attributes, the only one that lets the player choose *what* a
player trains, and the only one that can target anybody outside three curated
names. The reporter played a full season without finding it.

Every route that points at development goes somewhere else:

| route | lands on |
|---|---|
| Dashboard briefing, `Nobody is getting extra coaching this week → Pick somebody →` | This Week → **Business** |
| The `Coach a player up` priority card | names one player, no focus control |
| This Week → Business → `3 · Who gets the extra work` | three curated players, no focus control |

None of the three mentions the Development tab.

## Reproduction

```
seed:        web-alpha-program_riser-0
click path:  new career → any career → any program → begin season →
             Dashboard → "Pick somebody →"
```

Measured by the lead: the button lands on `This Week`, tab `Business`. The
Development screen (`More ▾`, item 4 of 10) is never referenced by any briefing
item, priority card or payoff panel.

## Expected

`expected-behavior.md` §7 and the briefing's own contract — an item states a
verb and a destination, and the destination is where the decision is made.
`CLAUDE.md` build-order step 4 is "Development popup, wired so the box score
reflects the attribute that grew"; the screen exists, the wiring does not.

## Actual

Worse than "no focus control on the lesser screen". In
`apps/web/src/App.tsx`, all three spotlight commands issued from the Business
tab hard-code the attribute:

```ts
onQueue({ type: "SET_DEVELOPMENT_SPOTLIGHT", programId,
          target: { type: "POSITION", position }, focus: "TECHNIQUE" })   // :2572
onQueue({ type: "SET_DEVELOPMENT_SPOTLIGHT", programId,
          target: { type: "PLAYER", playerId: player.id }, focus: "TECHNIQUE" }) // :2588
```

and the same at `:2556`. The Development screen (`:1348`–`:1362`) is the only
site where `focus` is a choice between `BALANCED` / `TECHNIQUE` / `STRENGTH` /
`CONDITIONING`.

So a player following the briefing does not merely miss a decision — the game
makes it for them, silently, one of four ways, every week, for a season.

## Why it matters

`CLAUDE.md` records that development was measured at 2.74 Overall a season for
a concentrated player against 1.29 for none, and that
`SPOTLIGHT_INTENSITY.PLAYER` was raised to 1.6 specifically to make
concentrated work worth taking. The screen that spends that value is the one
nothing routes to. Conditioning work also lowers this week's injury risk by 15%
and strength work raises it by 15% — a health consequence the player is never
offered the chance to choose.

## Diagnosis

*Hypothesis.* Point the briefing item and the priority card at `Development`
rather than at This Week → Business, and either give the Business picker the
focus control or delete it. Two screens for one decision, one of which silently
picks a default, is the "development state reported two ways" defect from cycle
1 (F16) in a different shape.
