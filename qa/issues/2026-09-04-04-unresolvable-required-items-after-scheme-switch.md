# A scheme switch can leave two permanent REQUIRED items the market cannot resolve

| | |
|---|---|
| **ID** | 2026-09-04-04 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Staff hiring · Weekly priorities · Career loop |
| **Found by** | new-player-tester |
| **Found in** | `710251b` |
| **Run log** | [`../runs/2026-09-04-new-player.md`](../runs/2026-09-04-new-player.md) (F5) |

## What happens

After switching scheme between seasons, the dashboard raised two **REQUIRED**
items — *"Replace him, or change what you run"* for each coordinator — and the
coaching market contained **zero** coaches who run the newly chosen scheme.

Neither branch of the instruction can be taken. The items persist every week.

## Reproduction

Reporter's path (Program Riser → Everglades State Pythons, DEVELOPER, mid-tier):

1. Play season 2027 to completion.
2. At the season-2 takeover screen, the offense that read 66–76% "Good fit" now
   reads **19–29% "Wrong personnel"**.
3. Switch to the scheme the screen scores 89–99%.
4. Open the coordinator market: no candidate coaches that scheme.
5. The two REQUIRED items remain for the rest of the run.

Not yet independently reproduced by the QA lead — see status below.

## Expected

`agents/docs/game-design/expected-behavior.md` §7 — consequences are visible
before they land, and the briefing exists to name *"the one decision that
matters this week"* with a destination that resolves it.

A REQUIRED item whose only two remedies are both unavailable is a standing
instruction the player cannot follow.

## Actual

Two permanent REQUIRED items. The reporter: *"This is where I stopped reasoning
and started clicking Advance week."*

## Why it matters

The briefing is the game's answer to "what do I do now". An item that cannot be
resolved trains the player to ignore the briefing, which costs the game its
single best comprehension tool.

There is a second, larger question underneath it: **the scheme fit inverted
across an offseason with no explanation**, from Good fit to Wrong personnel. The
reporter could not tell whether that was graduation, the portal, the incoming
class, or a bug. That is filed here as context; it may deserve its own
investigation.

## Status

**Resolved.** The open question was settled by measurement, and the diagnosis
filed as a hypothesis was correct.

## Diagnosis

*Confirmed.* Each of the six candidates in a market drew his offensive and
defensive scheme independently and uniformly, with no coverage guarantee. With
six candidates and two of them out of a low-tier program's reach, a program
could simply come up empty.

Measured across six leagues at 24 programs, over the coordinator posts the
dashboard actually flags:

| | before |
|---|---|
| flagged coordinator posts | 50 |
| with no reachable candidate clearing the item's own 0.78 fit | **5 (10%)** |
| with nobody better than the incumbent at all | 3 (6%) |
| reachable candidates clearing 0.78, distribution | 0:5 1:15 2:17 3:10 4:3 |

**Systematic, not seed-specific.** One flagged post in ten was unresolvable by
hiring, and scheme is only changeable in the preseason, so the item's other
branch was unavailable for the rest of the season regardless.

## Fix

One candidate in every market — index 0, always reachable — runs the program's
own scheme. Overriding him shifts no other draw: `AddressableRng` keys on the
path rather than on call order, so the draws skipped were never feeding another
candidate.

Re-measured after: **0 of 50** flagged posts have no candidate clearing 0.78,
**0** have nobody better than the incumbent, and across all 288 coordinator
posts in the six leagues every one has an on-threshold candidate available.

Guarded by a test in `tests/offseason-staff-camp.test.mjs` that asserts both
properties across the same six seeds, and asserts the flagged count is non-zero
so it cannot pass vacuously.

## The consequence, recorded rather than absorbed

A better market means more hiring. League coaching churn went from 0.18 to a
mean of **0.52** changes per program per year, measured across six leagues
(0.44 0.52 0.58 0.54 0.54 0.52) — the rival planner filters on scheme fit before
it compares ratings, so markets that offered nobody it would consider now offer
someone.

`tests/offseason-ai.test.mjs` was re-baselined from 0.4 to 0.7 with that
measurement in the comment. 0.52 across four posts is an average tenure near
eight years, still longer than a real coordinator's; the 0.18 it used to measure
was a post turning over roughly every twenty years, and it was only that low
because a third of the markets had nobody worth considering.

## The second question: scheme fit inverting across an offseason

Filed here as context, and it was a real defect of its own.

The reporter's offense read 66–76% "Good fit" in the opening preseason and
19–29% "Wrong personnel" a season later. Measured over 48 programs across two
leagues, that was the ordinary case rather than bad luck:

| over one offseason | before | after |
|---|---|---|
| median move in the program's own scheme fit | 30 points | **9** |
| 90th percentile / max | 44 / 48 | 19 / 23 |
| programs whose verdict changed | 41 of 48 (85%) | 34 of 48, **every one a single adjacent band** |
| "Good fit" or "Built for it" → "Wrong personnel" | 19 | **0** |
| displayed spread across schemes, opening preseason | 18 | 18 (unchanged) |
| displayed spread, one season later | **70** | 27 |

The cause was the comparative scale, not the roster. `rosterSchemeFit` amplified
every roster's deviation from its own mean by a flat ×3.2 — correct for the
freshly generated roster it was calibrated on, which is internally uniform, and
saturating for one that a season of development, graduation, the portal and a
recruiting class has separated. Every scheme was driven into the 24/94 clamps.

The gain is capped now, so the opening screen is untouched (×3.2 never binds
there) and a settled roster stops reading as a disaster. It is a monotone
transform, so the ordering is unchanged — and ordering is the only part
`bestSchemeFor` consumes, which is why this could be corrected without touching
what any program actually runs.

Guarded by a test in `tests/rng-distribution.test.mjs` that plays a full season
and asserts no verdict jumps more than one band, while also asserting the
opening screen still separates the schemes — a cap that flattened it would
defeat the reason the amplification exists.
