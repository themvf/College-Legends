# A scheme switch can leave two permanent REQUIRED items the market cannot resolve

| | |
|---|---|
| **ID** | 2026-09-04-04 |
| **Severity** | P2 |
| **Status** | open |
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

**Needs evidence** on one point before it is fully confirmed: whether the empty
market is a property of that seed and program, or systematic. The unresolvable
REQUIRED items are confirmed from the run; the *cause* is not.

Suggested next step for whoever picks this up: sample the coordinator market
across several seeds and count, for each scheme, how many candidates coach it.
If some schemes are systematically unstaffable, that is the real defect and this
issue is a symptom.

## Diagnosis

*Hypothesis.* Candidate coaches carry a `schemePreference` drawn at generation.
If the draw does not guarantee coverage of every scheme in a small market, a
program that switches to a rare scheme can find nobody. The briefing rule that
raises the item does not appear to check whether a remedy exists.
