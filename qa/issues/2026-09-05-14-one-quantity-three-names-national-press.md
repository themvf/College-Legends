# One quantity, three names, across the screen that sells it and the screen that prices it

| | |
|---|---|
| **ID** | 2026-09-05-14 |
| **Severity** | P3 |
| **Status** | open |
| **Area** | Onboarding / clarity |
| **Found by** | new-player-tester (cycle 2 cold read), confirmed by qa-lead |
| **Found in** | `084652b`, still present at `02c3c52` |
| **Run log** | [2026-09-05-new-player.md](../runs/2026-09-05-new-player.md) (F10) |
| **Recurrence of** | cycle 1 F13, the press half — the disposition recorded F13 as fixed, and fixed NIL, Stardom, Game risk and "room plan" without touching this |

## What happens

`program.nationalPress` appears under three different names on three screens,
none of which links to the others:

| screen | wording |
|---|---|
| Marquee game offer | `24 points of national buzz` |
| Dashboard, program panel | `They're talking about you 38/100` |
| Finances, sponsor market | `38 national press points × $900` |

## Reproduction

```
seed:        web-alpha-program_riser-0
click path:  new career → Program Riser → Everglades State Pythons →
             More ▾ → Schedule (marquee offers) · Dashboard · More ▾ → Finances
```

Confirmed by the lead on the week-1 dashboard (`They're talking about you
38/100`) against the reporter's screenshots `10b-marquee-offers.png` and
`16b-sponsor-formula.png` (`38 national press points × $900`).

## Expected

`expected-behavior.md` §3 in spirit and cycle 1's F13 in the letter: a quantity
the player is asked to buy has to be nameable.

## Actual

The marquee decision is once-per-career and irreversible. Its price is stated
as a share of the bank (`$1.5M guarantee, 30% of your budget`) and its payoff in
a unit the player has not met (`around 3,245 fans and 24 points of national
buzz`). The one screen that makes that unit mean anything — the sponsor market
arithmetic, which the same reporter calls the best explanatory panel in the game
— is two clicks away and never referenced.

The reporter declined a purchase they later worked out was worth about +63% of
their program's recognition and ~$21.6K a week of sponsor value.

## Why it matters

A cold player made an irreversible decision wrongly for want of a consistent
noun. It is filed **P3 and not P2**, against the reporter's classification,
because every number involved is correct and consistently derived — only the
label varies, and the same offer states its fan payoff in a unit that *is*
recognisable. It is a naming defect with a decision-shaped consequence, not a
system producing wrong results.

## Diagnosis

*Hypothesis.* Pick one name and use it everywhere `nationalPress` is rendered,
and put the sponsor-market line ("× $900 a week") on the marquee card so the
buzz has a price where it is being sold.
