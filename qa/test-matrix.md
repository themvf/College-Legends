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

Recorded from the state of the repository at the time this framework was
written. Update it each cycle.

| area | committed tests | driven in browser | notes |
|---|---|---|---|
| Game resolution | 46 (`rng-distribution`) | via soak | calibrated, reconciliation asserted |
| Simulation core | 45 (`simulation`) | via soak | |
| Recruiting | 20 | partial | |
| Portal | 15 | yes | |
| Board review / firing | 17 (`tenure`) | yes, incl. dismissal | |
| Economy | 13 | partial | finance panel verified |
| NIL | 10 | no | |
| Offseason | 19 across 3 files | yes, all 5 steps | |
| AI knowledge bounds | 21 | n/a | field-list assertions |
| Decision contracts | 33 across 2 files | n/a | |
| Dynasty regression | 6 | n/a | |
| CLI lifecycle | 3 | n/a | |
| **Onboarding** | **0** | **0** | **no tutorial exists** |
| **Mobile** | **0** | **0** | 187MB heap — likely a problem |
| **Careers > 4 seasons** | partial | **0** | soak reached 4 |

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

**Cycle 3 — is the football right?**
7. `simulation-accuracy-tester` — reconciliation and distribution shape.
8. Re-run everything above against whatever the first two cycles changed.

## Known blank cells worth filling

- **Nobody owns mobile.** 187MB main-thread heap after four seasons suggests it
  will not survive a phone, and iOS is the stated target.
- **Nobody owns accessibility** — keyboard navigation, contrast, screen readers.
- **Nobody owns a twenty-season career.** Save size and latency both extrapolate
  rather than being measured there.

Add agents or extend charters rather than leaving these implicitly covered.
