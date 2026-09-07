# A committed recruit's NIL money is invisible, then booked twice

| | |
|---|---|
| **ID** | 2026-09-06-12 |
| **Severity** | P2 |
| **Status** | fixed |
| **Area** | Web UI / recruiting view model |
| **Found by** | gameplay-tester (cycle 3, Brief A, Finding A) |
| **Found in** | `695bcbe` |
| **Run log** | `qa/runs/2026-09-05-gameplay.md` |

Filed after the cycle report was written. Severity proposed by the implementer;
the lead should confirm. The reporter noted it reads as one defect with two
symptoms and offered to have it split — kept as one here because a single
missing fallback causes both, and the second symptom is only reachable because
of the first.

## What happens

Once a recruit commits, his own card reports **"No NIL offer is active"** while
the HUD shows the program paying him. Re-entering the offer — the obvious
response to a card that says there isn't one — reserves the money a second time
against donor capacity.

## Reproduction

```
seed:        web-alpha-program_riser-0
league size: 72 (web default)
```

1. Program Riser → Everglades State Pythons → keep the four incumbents →
   `This is my football team` → `Accept roster & begin season`.
2. Recruiting → Theo Wright (RB) → `Offer scholarship` → `Basic · 5 RP`.
   Advance week 1.
3. Theo Wright → NIL slider to `$2.2K` → `Queue $2K / week` → `Invest 20 RP` →
   `Character · 8 RP`. Advance week 2.
4. Recruiting → Theo Wright. He is now **Committed to you**.

At step 4, three things are on screen at once:

```
HUD          PLAYER PAY COMMITTED   $2K      $2K a week reserved
Scout facts  "No NIL offer is active."
Weekly NIL   Offer amount $0 / week   "No NIL offer is active."
```

5. Set the slider back to $2K and click `Queue $2K / week`.

## Expected

The screen states what the program is paying, and donor capacity counts each
commitment once. "Payoffs are visible" requires the posted figure to be the
figure the engine uses.

## Actual

After step 5, one recruit occupies $4K of a $49K weekly ceiling:

```
before   PLAYER PAY (NIL) AVAILABLE  $48K   $46K a week still free
after    PLAYER PAY (NIL) AVAILABLE  $48K   $44K a week still free
```

It survives the week boundary. The weekly ledger charges $2K, not $4K, so the
loss is **capacity rather than cash** — but donor capacity is the recruiting
budget, so a player working a board silently loses room for other recruits, with
nothing on screen to explain where it went.

## Why it matters

The engine is correct throughout; only the screen is wrong, which is the class
of defect this project keeps finding and the one a player cannot diagnose. The
card actively told the player there was nothing to duplicate immediately before
they duplicated it.

## Diagnosis

On commitment the engine moves the winning offer out of `offersByProspect` into
`commitmentsByPlayer`, and `recruitingScore` reads both with an explicit
fallback:

```ts
const nilOffer = nilOverride
  ?? state.nil?.[programId]?.offersByProspect[prospect.id]
  ?? state.nil?.[programId]?.commitmentsByPlayer[prospect.id]
  ?? 0;
```

`recruiting-view-model.ts` had no such fallback and read `offersByProspect`
only, at two sites. `nilReserved` then summed offers without excluding prospects
already counted in `nilCommitted`.

## Fix

`3397569`. `nilPaidFor()` mirrors the engine's fallback and is used by the card;
`nilReserved` skips any prospect already present in `commitmentsByPlayer`, so
money counted as committed cannot also be counted as reserved. Covered by
`apps/web/src/recruiting-view-model.test.ts` — *"counts a committed recruit's
money once, and admits it is being paid"* — confirmed red against the defect
(`expected +0 to be 2000`).

## Not filed, and why

`prospect.status === "COMMITTED"` leaves the whole decision stack live —
rescind, further evaluations, more pursuit points, another visit. Defending a
commitment before `SIGNING_WEEK` is legitimate, so the reporter deliberately did
not file it and neither does this issue. Only the NIL control misstated the
state.

## Verified fixed

<pending regression-tester>
