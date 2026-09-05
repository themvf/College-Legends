# Test matrix

What gets tested, by whom, and where the coverage currently is.

`●` owns it · `○` contributes · blank = not their concern

| system | gameplay | balance | economy | edge | new player | regression | sim accuracy |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Career loop / phases | ● | | | ○ | ○ | ○ | |
| Weekly priorities | ● | ○ | | ○ | ● | | |
| Game resolution | ○ | ○ | | | | ○ | ● |
| Box scores | ○ | | | | ○ | | ● |
| RNG distributions | | ○ | | | | ○ | ● |
| Scouting department | ○ | ● | | ○ | ● | | |
| Practice / install | ○ | ● | | ○ | ● | | |
| Recruiting | ● | ○ | ○ | ● | ● | ○ | |
| NIL | ○ | ○ | ● | ● | ● | | |
| Transfer portal | ● | ○ | ○ | ● | ○ | ○ | |
| Player development | ○ | ● | | ○ | ● | | |
| Injuries / health | ○ | ● | | ● | ○ | | ○ |
| Depth chart / rotation | ○ | ○ | | ● | ○ | | ● |
| Staff hiring | ● | ○ | ○ | ○ | ● | | |
| Training camp | ● | ○ | | ○ | ○ | | |
| Board review / firing | ● | ● | ○ | ● | ● | ○ | |
| Ticket pricing | ○ | ○ | ● | ● | ● | | |
| Sponsorship | ○ | | ● | ○ | ● | | |
| Facilities / upkeep | ○ | ○ | ● | ● | ● | | |
| Media rights | | | ● | ○ | ○ | | |
| Boosters | ○ | ○ | ○ | ○ | ○ | | |
| Rival AI | | ● | ○ | ○ | | ● | |
| AI knowledge bounds | | | | ○ | | ● | |
| Save / load | ● | | | ● | | ● | |
| Performance | ○ | | | ○ | ○ | ● | |
| Determinism | | | | | | ● | ○ |
| Onboarding / clarity | ○ | | | | ● | | |

## Coverage status

Updated after cycle 2 (2026-09-05). Suite: **256 engine + 16 web**, all
passing.

| area | committed tests | driven in browser | notes |
|---|---|---|---|
| Game resolution | 46 (`rng-distribution`) | via soak | calibrated, reconciliation asserted |
| Simulation core | 45 (`simulation`) | via soak | |
| Recruiting | 20 + 1 web | **partial, blocked** | the board crashed through cycle 2 (issue 05-01); the rewritten offer/price/odds market has **no** dedicated coverage |
| Portal | 15 | yes | offseason screen has no navigation — issue 05-09 |
| Board review / firing | 17 (`tenure`) | yes, incl. dismissal | verified over 12 seasons in the soak: bands arrive in order |
| Economy | 13 | partial | finance panel verified; **no dynasty-scale ledger run yet** |
| NIL | 10 | no | never moved in two seasons of cold play |
| Offseason | 19 across 3 files | yes, all 5 steps | |
| AI knowledge bounds | 21 | n/a | field-list assertions |
| Decision contracts | 33 across 2 files | n/a | **two posted-payoff breaches found in cycle 2** — the contract tests do not cover the priority cards |
| Dynasty regression | 6 | n/a | |
| CLI lifecycle | 3 | n/a | |
| **Onboarding** | **0** | 2 cold reads | **no tutorial exists**; 27 findings cycle 1, 30 cycle 2 |
| **Mobile** | **0** | **0** | 187MB heap — likely a problem. Still unassigned |
| **Accessibility** | **0** | **0** | still unassigned |
| **Careers > 4 seasons** | partial | **0** | **soak reached 12** (headless); browser play still stops at ~1.5 |
| Determinism baseline | n/a | n/a | `55e8ac644f4875c2` — 72 programs, 3 seasons, seed `qa-baseline-2026-09`, sha256 of `{programs, players, seasonHistory}`, first 16 hex |

## Priority for the first cycles

Ordered by where the risk actually is, not by what is easiest to test.

**Cycle 1 — can a beta happen?**
1. `new-player-tester` — the largest known gap. No onboarding, and the last
   human playtest failed on comprehension.
2. `gameplay-tester` — a longer soak than four seasons, all three career paths.
3. `regression-tester` — determinism baseline recorded for the cycle.

**Cycle 2 — does it hold up long?**
4. `economy-tester` — twenty seasons, not five.
5. `balance-tester` — pooled competitiveness at 72 programs.
6. `edge-case-tester` — the boundary sweep.

**Cycle 3 — set at the close of cycle 2, and re-ordered.** The football numbers
are the best-covered area in the repository and nothing in cycles 1 or 2
touched game resolution, so `simulation-accuracy-tester` moves to cycle 4. What
changed, what has never been tested, and what has broken before all point the
same way:

7. `gameplay-tester` + `edge-case-tester` — **recruiting, end to end.**
   Rewritten in `cdbd92a`/`084652b`, never tested, produced cycle 2's P1, and
   carries open findings from both cycles.
8. `economy-tester` — twenty seasons, run in the same cycle as (7) because
   recruiting is the intended money sink.
9. `balance-tester` — weekly priority slot values across tiers and capacities;
   competitiveness pooled over **six** leagues.
10. `regression-tester` — re-verify cycle 2's issues 01–09 and re-take the
    baseline.

**Cycle 4 — is the football right?**
11. `simulation-accuracy-tester` — reconciliation and distribution shape.

## Known blank cells worth filling

- **Nobody owns mobile.** 187MB main-thread heap after four seasons suggests it
  will not survive a phone, and iOS is the stated target.
- **Nobody owns accessibility** — keyboard navigation, contrast, screen readers.
- **Nobody owns a twenty-season career.** Save size and latency both extrapolate
  rather than being measured there.

Add agents or extend charters rather than leaving these implicitly covered.
