# The coaching market offers the coach it has just hired

| | |
|---|---|
| **ID** | 2026-09-05-11 |
| **Severity** | P3 |
| **Status** | fixed |
| **Area** | Staff hiring |
| **Found by** | new-player-tester (cycle 2 cold read), confirmed in code by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F18) |

## What happens

After hiring a coordinator, the market list for that post still contains him:

```
Bryce Scott · $257K to sign him + $441K buyout · +0 on Bryce Scott
```

$698K to replace a man with himself, for a posted gain of zero. Screenshot
`07b-rehire-self-bug.png`.

## Reproduction

```
seed:        web-alpha-program_riser-0
click path:  takeover screen → DEFENSIVE COORDINATOR → See who's available →
             hire any candidate → reopen the same post
```

## Expected

A market lists people who are not already in the chair.

## Actual

`staffCandidates()` in `packages/simulation/src/installation.ts` keys its RNG
on `("staff-market", season, programId, role)` and returns six candidates by
index. That is deliberate and documented — *"Keyed on the post rather than the
person, so hiring somebody does not re-roll the market: a player who works down
the list can still go back to the coach he passed on"* — and it is the right
design. The gap is that nothing removes the candidate who has since been hired,
and the arriving staff id is derived from the candidate id
(`${programId}-staff-${candidateId…}`), so re-hiring him deletes and re-creates
the identical record while charging `signingCost + buyout`.

## Why it matters

Real money for a stated +0, on the screen that is meant to make a hire "never a
guess". It is filed P3 rather than P2 because the card posts the +0 honestly —
the player can see the deal is worthless — so this is noise in a list rather
than a hidden trap. It still costs the market its credibility on the screen
where a new player is spending a third of their opening bank.

## Diagnosis

*Hypothesis.* Filter the returned list by whether the derived arriving id is
already the incumbent's id, rather than re-rolling anything. That keeps the
market stable, which is the property the current keying exists to protect.
