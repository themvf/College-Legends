# gameplay soak — 2026-09-05

**Agent:** run by the implementation team, not an agent — the cycle-1 report
listed this as the coverage gap ("careers past four seasons remain unverified by
anyone") and it is cheap to run alongside other work.
**Target:** does a long career hold together, and what does it look like at
season twelve?
**Build:** `6165cc4`

## Setup

| | |
|---|---|
| Seed | `soak-2026-09` |
| League size | 24 programs |
| Seasons | 12, played end to end with rivals planning both phases |
| Watched program | `program-3` (POWER, 10-win target) |

## Result: the loop holds

Twelve seasons, no crash, no thrown error, no stuck phase. Every season completed
its regular season, all five offseason steps, and rolled into the next.

```
season record rank  budget     fans    roster  verdict         insolvent security  ms
2027    12-2     4    30.2M   114451   84/85  SECURE            0/24        45    4390
2028    14-1     2    44.0M   171352   85/85  EXTENDED          0/24        69    5337
2029    11-3     3    56.7M   206788   85/85  EXTENDED          0/24       100    5943
2030    13-2     1    75.4M   307038   85/85  EXTENDED          0/24       100    6787
2031    11-3     3    93.0M   373582   85/85  EXTENDED          0/24       100    7360
2032     8-6     7   109.3M   395120   85/85  EXTENDED          0/24       100    8963
2033     8-5     3   125.9M   455714   85/85  EXTENDED          0/24        96    9090
2034     6-7    12   142.1M   470213   85/85  SECURE            0/24        92    9843
2035     7-6     9   157.5M   506170   85/85  SECURE            0/24        74   10198
2036     5-7    13   171.5M   511565   84/85  HOT_SEAT          0/24        63   10966
2037     6-7    11   186.4M   530735   85/85  FINAL_WARNING     0/24        28   11584
2038     8-5     4   203.2M   605550   85/85  FINAL_WARNING     0/24        10   12430
```

**Job security behaves as designed over a horizon nobody had tested.** It rises
to the 100 ceiling on three straight double-digit seasons, holds, then falls
through SECURE → HOT_SEAT → FINAL_WARNING across a 6-7 / 5-7 / 6-7 stretch. An
8-5 season against a 10-win target still costs security, which is correct for a
POWER job and is the rule working rather than a defect. The bands arrive in
order and the coach is warned years before the verdict.

**Rivals keep their rosters full.** 85/85 in eleven of twelve seasons.

**Save size stays bounded.** 1.71 MB compressed after twelve seasons, against
live state of 27.2 MB. That is well under the ~8 MB a twenty-season career was
extrapolated to. Round trip after twelve seasons: programs identical.

## Two known items, now with long-horizon numbers

Neither is a new defect. Both are open items in `CLAUDE.md` that had only
short-horizon evidence.

**Budgets compound and nothing stops them.** $30.2M → $203.2M over eleven
seasons, about 6.7x, with **zero** insolvencies in 24 programs across the whole
run. `CLAUDE.md` records "POWER budgets grow about 2.5x over four seasons" and
that it is earned rather than automatic; over twelve seasons it is 6.7x and the
program has nothing to spend it on. The recruiting money sink is the intended
answer and is only half built.

**A season costs 2.8x more at season twelve than at season one** — 4,390 ms to
12,430 ms, at only 24 programs. Growth is steady and super-linear rather than a
cliff. This is the known performance item (`CLAUDE.md` §10), measured over a
career for the first time: it is not just slow at league size, it gets slower as
a career runs.

## Process note

The first run of this logged `wins` after the rollover had already reset it, so
the record column read `0` for every season and the verdict column could not be
interpreted. Corrected and re-run rather than reported. Worth stating because
the fix cost two minutes and the alternative was a table that looked like a
catastrophic bug.

## Determinism baseline, re-established

Cycle 1's baseline was invalidated by the coaching-market change. New one, with
the method recorded — cycle 1 recorded a hash and not how it was produced.

| | |
|---|---|
| seed | `qa-baseline-2026-09`, 72 programs, 3 seasons |
| method | sha256 of `JSON.stringify({programs, players, seasonHistory})`, first 16 hex |
| hash | `55e8ac644f4875c2` |

**Re-measured at `d022c4b`**, after the nineteen commits that closed thirteen
cycle-2 issues: **`55e8ac644f4875c2`, unchanged**, and replay at 24 programs over
one season is still byte-identical.

That is a real result rather than a formality — five of those commits touched
engine code. It also caught a false claim: an unchanged hash prompted checking
whether the scouting path is exercised by this scenario at all. It is (all 24
programs build files and set the refund marker), which meant one engine change
reported in issue 02 had been inert, and it had been — see the correction in
that issue.
