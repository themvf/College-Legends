# The Inbox is other programs' booster offers under an unrelated sentence

| | |
|---|---|
| **ID** | 2026-09-05-05 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Onboarding / clarity |
| **Found by** | new-player-tester (cycle 2 cold read), reproduced by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F6, and the cause of F8's second half) |
| **Recurrence of** | cycle 1 F20, recorded as "Unchanged" in that run's disposition |

## What happens

Every row of the Program Inbox reads:

```
✓
Booster Offered
Weekly development report completed.
```

Twelve of twelve at week 6. The title and the body describe different events,
and nothing about the player's own season appears at all — not the sponsor
signed, the two coaches hired, the four injuries, the eight results, the ranked
win, or the recruit who committed.

## Reproduction

```
seed:        web-alpha-program_riser-0
league size: 72 (web default)
click path:  new career → Program Riser → any program → begin season →
             Advance week × 5 → More ▾ → Inbox
```

Reproduced by the lead at week 6 of season 2027: 12 identical rows, verbatim as
above.

## Expected

`expected-behavior.md` §5: events are structured and the UI writes the
sentences from them. The Inbox is the only screen whose job is to report what
happened to this program.

## Actual

Two independent causes, both in `apps/web/src/App.tsx`:

1. **`eventText` ends in a catch-all** returning the literal string
   `"Weekly development report completed."` for any event type without a
   renderer. `BOOSTER_OFFERED` has no renderer, so it gets that sentence under
   a title derived from its type name.

2. **`eventRelevantToProgram` returns `true` by default.** `BOOSTER_OFFERED` is
   not in its list of program-scoped types, so every program's booster offer
   passes the filter. On a booster week (3, 6, 9, 12) that is 24 events at test
   size and 72 in the real league, all landing in a `.slice(-12)` window — so
   they evict everything the player might have wanted.

## Why it matters

Three things at once:

- The screen that exists to report the program reports other programs.
- Its rows carry a sentence about an event that did not happen.
- It is why the reporter never learned that a recruit had committed to them.
  `PROSPECT_COMMITTED` *is* emitted, *is* scoped to the player's program, and
  *has* a written sentence at `App.tsx:2204` — it simply never gets a row.
  The reporter found the commitment by noticing a counter change from
  `0 coming in` to `1 coming in`.

That last point is why this is P2 rather than P3: the Inbox is not merely
unhelpful, it is swallowing the only announcement of a system the game spends a
whole season telling the player to engage with.

## Diagnosis

*Hypothesis.* Two small changes, either of which alone leaves the screen
broken: add `BOOSTER_OFFERED` (and any other league-wide type) to
`INBOX_NOISE` or to the program-scoped branch of `eventRelevantToProgram`, and
replace the `eventText` catch-all with something that cannot be mistaken for a
real report — or drop the row entirely when there is no renderer, so an
unrendered event is invisible rather than actively wrong.
