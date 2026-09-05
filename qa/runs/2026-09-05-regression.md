# regression-tester run — 2026-09-05 (QA cycle 3, Brief E)

**Agent:** regression-tester
**Target:** Brief E — determinism, the cycle baseline, and the closed-issue corpus
**Build:** `083127c` (`main`), engine identical to `8502330`
**Comparison build:** `02c3c52` (the cycle-2 triage build), built in a detached
worktree so every "either side of the change" number below is a real A/B rather
than a quotation.

---

## Verdict

**Determinism holds in all three checks. The cycle baseline is unchanged and was
independently re-derived on both builds. The suite is 258 + 19 green.**

**One closed issue reproduces: `2026-09-04-04`** — the coverage guarantee that
every coaching market holds somebody who runs the program's scheme is broken by
the fix for `2026-09-05-11`, and the guard test cannot see it because it runs at
a scale where the new filter cannot bite.

Three smaller candidate findings and two observations below.

---

## Setup

| | |
|---|---|
| Environment | headless, against `dist/`, node 22 |
| Seeds | `qa-baseline-2026-09` (baseline); `qa-c3-determinism`, `-2`; `qa-c3-churn-1..4`; `qa-c3-guarantee-1..4`; `qa-c3-regr-scout-a/b/c`, `qa-c3-regr-trail`, `qa-c3-regr-inj-1..3`, `qa-c3-regr-mkt-1..4`, `qa-c3-regr-tenure`, `-2`, `-3`; plus the original issue seeds `qa-cycle2-readiness` and `qa-c2-inj-1..3` |
| Season driver | `advanceWeek(state, planWeeklyCommands(state))` to the end of the regular season, then `advanceOffseasonStep(state, planOffseasonCommands(state))` through all five steps, then `beginSeason` — the method recorded in the cycle-1 run log |

---

## E1 — the three determinism checks

All three **PASS**.

### 1. Same-process replay

Two runs in one process, 24 programs, a full season including the offseason and
the return to `ROSTER_REVIEW`. Hash is sha256 of the **whole** state, event log
included, first 16 hex.

| seed | run A | run B | |
|---|---|---|---|
| `qa-c3-determinism` | `dc1e9c0805889f21` | `dc1e9c0805889f21` | identical |
| `qa-c3-determinism-2` | `3ca85a0166e86308` | `3ca85a0166e86308` | identical |

### 2. Save round trip

Played a season, `encodeSave` → `decodeSave`, then played **a further full
season on each side**, each with its own event log — the scenario width that
issue `2026-09-04-01` established as the minimum.

| seed | never saved | saved and reloaded | |
|---|---|---|---|
| `qa-c3-determinism` | `84450b811e32ad4a` | `84450b811e32ad4a` | identical |
| `qa-c3-determinism-2` | `6a0f19f153587385` | `6a0f19f153587385` | identical |

### 3. Cross-change replay

Same seed and command stream on `02c3c52` and on `083127c`.

| scenario | `02c3c52` | `083127c` | |
|---|---|---|---|
| `qa-c3-determinism`, 24 programs, 1 season | `54476b6a6f50a514` | `54476b6a6f50a514` | identical |
| `qa-baseline-2026-09`, 72 programs, 3 seasons | `55e8ac644f4875c2` | `55e8ac644f4875c2` | identical |

---

## E2 — the cycle baseline

**Confirmed unchanged.**

| | |
|---|---|
| seed | `qa-baseline-2026-09`, 72 programs, 3 seasons |
| method | sha256 of `JSON.stringify({programs, players, seasonHistory})`, first 16 hex |
| **hash** | **`55e8ac644f4875c2`** |
| runtime | 142s at `083127c`, 121s at `02c3c52` |

Two things worth recording rather than assuming:

- I reconstructed the harness from the recorded method rather than inheriting a
  script, and it reproduced the recorded hash exactly. That is evidence the
  method is the same method, not merely the same number.
- I also **re-derived it on the pre-change build**, so this is a measured A/B
  across the ten commits rather than a comparison against a written-down value.

---

## E3 — is the unchanged hash evidence, or is the path unwalked?

**Answer: the path is walked. The unchanged hash is benign, not vacuous.**

`d022c4b` is the only commit that can move a result: `staffCandidates` now
filters whoever already holds the post, and `packages/ai` reads the same list.
Instrumented the baseline scenario itself (72 programs, 3 seasons), computing
both the filtered (`083127c`) and pre-filter (`02c3c52`) planner views at every
`COACHING` step.

| | |
|---|---|
| offseason `COACHING` steps | 3 |
| coaching posts inspected | **862** |
| posts where the incumbent **was** in the pre-filter candidate list | **56**, across **32** distinct programs |
| successful `STAFF_REPLACED` events in the scenario | **58** |
| times the rival planner selected the incumbent (pre-filter view) | **0** |
| programs whose planned coaching command differs pre-filter vs filtered | **0 of 862** |
| `COMMAND_REJECTED` on a `REPLACE_STAFF` | 0 |

So the market was opened 862 times, the filter had 56 real opportunities to
change what was on offer, and the planner's choice never moved. The reason is
mechanical rather than lucky: `AI_COACHING_UPGRADE_THRESHOLD` is 12, and the
filtered candidate never cleared it (see E3b — max +9 over 114 removals).

---

## E3b — what the filter actually removes (follow-on measurement)

`staffCandidates` keys its RNG on `("staff-market", season, programId, role)`,
so rating, name, trait and scheme preference are **re-drawn every season**. But
the candidate **id** is `${programId}:${role}:candidate:${index}` — no season in
it. The filter compares a derived id. So once a program hires slot *k* for a
post, slot *k* of that market is filtered out **for the rest of the career**,
and in every later season the man in that slot is a different person.

Measured on `qa-baseline-2026-09`, 72 programs, 4 seasons, at each `COACHING`
step:

| | |
|---|---|
| markets returning 6 candidates | 1,023 |
| markets returning 5 | **114** (10.0%) |
| removals by season | 18 → 38 → 58 (it accumulates) |
| removed man shares the incumbent's **name** | **0 of 114** |
| removed man shares the incumbent's **name and rating** | **0 of 114** |
| removed man was the **best available** in that market | **25 of 114** |
| rating(removed) − rating(incumbent) | min −21, median −8, max +9 |
| removals clearing the AI's +12 upgrade bar | **0 of 114** |

Driven as a command rather than reasoned about, on both builds:

```
season 2028  program-10  HEAD_COACH
  incumbent : Trevor Matthews  89  CLOSER
  offered   : Lamar Alvarez    73  TACTICIAN   (id …:HEAD_COACH:candidate:0)
  HEAD    : rejected "That candidate is no longer available."   hired 0
  02c3c52 : rejected "He already has the job."                  hired 0
  shown on the player's screen?  HEAD: no    02c3c52: yes
```

**Reading (labelled as such):** the id collision is *older* than the fix — that
post could never hire slot 0 on either build, because `resolveCommands` derives
the same id and refuses. `d022c4b` changed a visible-but-unhireable option into
an invisible one. That is an improvement to the screen and it is also what makes
the next finding possible.

---

## E4 — the one real behavioural change: coaching churn

**No material move. The measurement is a null result and that is the useful
part**, because `CLAUDE.md` records this list tripling league churn once before.

Four leagues × 24 programs × 3 seasons = 288 program-years, both builds:

| seed | `02c3c52` | `083127c` |
|---|---|---|
| `qa-c3-churn-1` | 39 (0.542) | 39 (0.542) |
| `qa-c3-churn-2` | 38 (0.528) | 38 (0.528) |
| `qa-c3-churn-3` | 35 (0.486) | 35 (0.486) |
| `qa-c3-churn-4` | 41 (0.569) | 41 (0.569) |
| **pooled** | **0.531 / program / year** | **0.531 / program / year** |

Coaches fired: 6 either side. `CLAUDE.md` records 0.52 after the last change to
this list; 0.531 over four fresh leagues is the same number independently
measured.

---

## E5 — the closed corpus, re-verified by outcome

### `2026-09-04-01` — save/load divergence · **holds**

Re-verified against the *outcome*, on seeds the defect was never found on, after
a full season either side of the save:

| | `qa-c3-determinism` | `qa-c3-determinism-2` |
|---|---|---|
| programs whose `lastWeeklyNet` differs after load | **0 of 24** | **0 of 24** |
| planned facility upgrades next week | 20 vs 20, identical list | 20 vs 20, identical list |
| planner view with `eventHistory` emptied | identical | identical |
| state after a further full season | byte-identical | byte-identical |

Sample values are real (−$291,270 / −$406,564 / …), not zeros, so the field is
populated rather than trivially matching.

### `2026-09-05-02` — the scouting card · **fixed on the branch that was filed; a residual on the branch that was not**

Eight weeks, `program-4`, on the issue's own seed and two fresh ones. The
"make it a priority" branch is correct everywhere:

| | posted `02c3c52` | posted `083127c` | delivered |
|---|---|---|---|
| priority branch, weeks 1–4 | 2.1 | **1.5** | 1.46 |
| leave-alone branch, weeks 2–4 | 1.6 | **1.1** | 1.14 |
| **leave-alone branch, week 1** | 1.7 | **1.1** | **1.28** |

The branches differ in 8 of 8 weeks, which is the property the issue asked for.
Week 1's *leave-it-alone* branch is still off by 0.18 (−14%), reproducing on
`qa-cycle2-readiness`, `qa-c3-regr-scout-a` and `-c`. The department files 10
points in week 1 against 8 in later weeks; the card projects the later-week
figure.

**The committed guard test cannot see this**: it asserts only `card.focused`,
and it reads `baseline` solely to check the two branches *differ* from each
other, never against a week actually run without the focus.

### `ad06e2f` — the recruiting card · **holds, on a new seed**

`qa-c3-regr-trail`, five programs × two focus states, posted against both the
`WEEK_FOCUS_PAYOFF` field and the `recruiting.points` delta:

| program | none | RECRUIT |
|---|---|---|
| program-1 | 40 / 40 | 47 / 47 |
| program-2 | 46 / 46 | 52 / 52 |
| program-3 | 52 / 52 | 62 / 62 |
| program-4 | 39 / 39 | 48 / 48 |
| program-5 | 41 / 41 | 53 / 53 |

**10 of 10 exact.** Note `WEEK_FOCUS_PAYOFF` is not emitted at all when no
priority is set, so the unfocused arm is only checkable against the state delta.

### `2026-09-05-10` — injury reported at a 0.0% unit cost · **engine rate unchanged, as intended**

The fix was to the sentence, not the number, so the correct check is that the
rate did not move:

| seeds | injuries | rounding to 0.0% | |
|---|---|---|---|
| `qa-c2-inj-1..3` (the issue's own) | 470 | **84 (17.9%)** | cycle 2 reported 85 (18.1%) |
| `qa-c3-regr-inj-1..3` (fresh) | 488 | 121 (24.8%) | per-league 16.2–29.8% |

Per-league spread is 14 points, so the cycle-2 figure of 18.1% was a three-league
estimate of something noisier than it reads. `unitRatingChangePercent` still
serialises as **`-0`** in 67 of those 84 events; the signed-zero guard is in
`App.tsx`, not in the event. The sentence itself is `apps/web` and belongs to
Brief A.

### `2026-09-05-11` — the market offers the man in the chair · **fixed**

Four leagues, both the takeover path (`prepareWeek` during `ROSTER_REVIEW`, four
posts, hires chained) and the offseason `COACHING` step:

| | |
|---|---|
| markets re-read after a successful hire | **20** |
| incumbent listed | **0** |
| market size after a hire | 6 → 5 in every case |

### `2026-09-04-04` — unresolvable REQUIRED items after a scheme switch · **REPRODUCES**

See the finding below.

### Cycle-1 spot checks

- `2026-09-04-02`: `SET_WEEK_FOCUS` in `ROSTER_REVIEW` commits, emits
  `WEEK_FOCUS_SET`, 0 rejections. Holds.
- `2026-09-04-03`: at 0–0 across 24 programs `jobReview` returns 10 `WATCHED`,
  10 `HOT_SEAT`, **4 `FINAL_WARNING`** on three seeds. The engine still grades a
  0–0 record as missing the target by the whole target; the fix is the
  `MEANINGFUL_RECORD < 4` gate, which lives in `App.tsx` only. Not a
  reproduction — the guard is where it was put — but the guard is one screen
  deep and any second caller of `jobReview` reproduces the cycle-1 symptom.

---

## E6 — fixes that shipped without a test

**Nine of the thirteen closed cycle-2 issues have no committed test.** Five
commits, all `apps/web/src/App.tsx`-only:

| commit | issues left untested |
|---|---|
| `94c626f` | `-04` depth chart, `-07` development screen |
| `050d1f5` | `-05` inbox, `-06` coach install number |
| `02288a2` | `-09` offseason navigation |
| `86fd504` | `-03` scheme change price / fit |
| `3006a35` | `-08` last Saturday postgame |
| `0e30ec5` (App.tsx half) | `-14` national press naming |
| `d022c4b` (App.tsx half) | `-10` injury sentence |

Four do carry one: `-01` (`Recruiting.test.tsx`), `-02`
(`rng-distribution.test.mjs`), `-11` (`offseason-staff-camp.test.mjs`), `-13`
(`ErrorBoundary.test.tsx`).

The lead expected roughly five App.tsx-only fixes; it is five commits and nine
issues. Filed as one candidate, not nine.

---

## E7 — the suite

**258 engine + 19 web, all passing.** Exactly the expected count. No failures,
so no classification required. Engine suite 257s; web 13.8s.

---

## Candidate findings

Severities are my recommendation; triage is the lead's.

### F1 — `2026-09-04-04` reproduces: the scheme-coverage guarantee is gone once a program has hired · suggested **P2**

**What I measured.** The issue-04 fix installed one guarantee: candidate index 0
of every market is always reachable and always runs the program's own scheme, so
the REQUIRED item *"replace him, or change what you run"* always has at least one
branch available. `d022c4b`'s filter removes the candidate whose derived arriving
id matches the incumbent — and that is index 0 whenever the post was filled from
index 0 in an earlier season.

Scale 1 — the offseason `COACHING` step, 4 leagues × 24 programs × 4 seasons:

| | `083127c` | `02c3c52` |
|---|---|---|
| coordinator posts inspected | 768 | 768 |
| posts with **no** reachable candidate at fit ≥ 0.78 | **10** | **0** |

Scale 2 — the issue's own reproduction, run at a scale it has never been run at.
After three played seasons, at the `ROSTER_REVIEW` where scheme is changeable,
every legal scheme switch for every program (**1,824 switches**):

| | `083127c` | `02c3c52` |
|---|---|---|
| coordinator posts flagged (incumbent fit < 0.78) **and** with no reachable scheme-matching candidate | **22** | **0** |
| distinct posts behind those 22 | **5** of 192 | — |
| the removed candidate was `:candidate:0` | **22 of 22** | — |
| that candidate's scheme fit | **1.00** | — |

Example: `program-12` (Blue Ridge Commonwealth Foxhounds), offensive
coordinator, incumbent fit 0.64 after switching to `POWER_RUN`; the market holds
three reachable candidates and the one with fit 1.00 has been filtered out
because the program hired slot 0 for that post in an earlier season.

**Why the guard test does not see it.** `tests/offseason-staff-camp.test.mjs`
asserts the guarantee on `createFictionalLeague(seed, 24)` — a league at season
zero where nobody has hired anything, so the filter has nothing to remove. It is
the "test passed because it tested the wrong scale" pattern exactly. The
issue-11 test in the same file goes further and **asserts the shrink**
(`reopened.length === offered.length - 1`) without checking what was removed.

**Reading, labelled as such.** The player is not stuck as hard as in the
original report — they can pick a different scheme. But the constraint is the
same one the issue was filed about: *you may not run the scheme your roster is
built for, and the screen does not say why.* The rival planner is unaffected
(E3, E4: zero selection changes, churn identical), so this is player-facing
only, which is also why nothing in the suite or the baseline hash moves.

### F2 — the scouting card's "leave it alone" branch is still wrong in week 1 · suggested **P3**

Posted 1.1, delivered 1.28 on `qa-cycle2-readiness` — the issue's own seed —
and 1.2 against 1.34 on two fresh seeds. Weeks 2–8 agree to within 0.02. It is a
**residual, not a regression**: the pre-fix figures were 1.7 against 1.28, and
the direction has flipped from over-posting to under-posting. Same
`expected-behavior.md` §3 contract as the P1 it descends from, on the branch the
committed test does not assert against delivery.

### F3 — nine of thirteen fixes shipped with no test · suggested **P3**, one issue

Detail in E6 above.

### F4 — every hire permanently deletes a candidate slot from that post's market · suggested **P3**

10% of markets already return five candidates instead of six after four seasons
(114 of 1,137), rising 18 → 38 → 58 across three consecutive offseasons. The
removed man shares nothing with the incumbent but an id — 0 of 114 shared his
name, median rating gap −8, range −21 to +9 — and in 25 of 114 he was the best
available candidate in that market. The cause is that the candidate id carries
no season while everything else about the candidate is re-drawn each season.
This underlies F1 and predates `d022c4b`; the filter changed it from a visible
option the engine refused into an invisible one.

---

## Observations, not filed

- **`REPLACE_STAFF` is refused inside `beginSeason` and accepted by
  `prepareWeek`, in the same phase.** `beginSeason` answers *"Only sponsorship,
  depth-chart, redshirt, and preseason scheduling decisions can be made before
  the season begins."* `game-rules.md` §1 lists staff hiring as legal in
  `ROSTER_REVIEW`, and the app uses `prepareWeek`, so no player hits it. Two
  entry points disagreeing about one phase is worth knowing about; it cost me a
  measurement pass.
- **The bye week.** In weeks 5 and 10 the scouting card posts a readiness
  ("+1.2 to every unit that game") for a week with no fixture, naming the *next*
  opponent, while `WEEK_FOCUS_PAYOFF.scoutingReadiness` reports 0. The card is
  honest about which game it means; the payoff event is reporting on a Saturday
  that did not happen. The committed test skips these weeks with
  `payoff.scoutingReadiness === 0`. Not filed — I think it is correct — but it
  is the second skip in that test and both skips hide something.
- **Injury zero-cost rate is noisier than its cycle-2 figure suggests**:
  16.2%–29.8% per league. Any future assertion on it needs more than three
  leagues.

---

## Not covered by this brief

The eight web-screen fixes (`-03` to `-09`, `-13`, `-14`) are Brief A's, and I
did not drive the browser. F1's player-facing half — what the coordinator market
and the REQUIRED briefing item actually *look* like in that state — is worth
one screenshot from Brief A if the lead confirms F1.

## Baseline for the next cycle

```
seed        qa-baseline-2026-09
programs    72
seasons     3
method      sha256(JSON.stringify({programs, players, seasonHistory})).slice(0,16)
hash        55e8ac644f4875c2      (unchanged since cycle 2; measured on both
                                   083127c and 02c3c52 in this run)
```

## Reproducing the A/B

Every "either side of the change" number above was measured by building
`02c3c52` in a throwaway worktree and importing both `dist/` trees into one
process. The worktree was pruned after the run; to recreate it:

```bash
git worktree add --detach /tmp/wt-02c3c52 02c3c52
cp -a node_modules /tmp/wt-02c3c52/node_modules
for p in packages/*/ apps/*/; do cp -a "$p/node_modules" "/tmp/wt-02c3c52/$p/node_modules"; done
(cd /tmp/wt-02c3c52 && ./node_modules/.bin/tsc -b)
```

Package-internal links are relative, so the copied `node_modules` resolves.

Secondary references, for a cheaper check than the 72×3 run:

```
qa-c3-determinism    24 programs, 1 season, full-state hash   dc1e9c0805889f21
qa-c3-determinism    24 programs, 2 seasons, programs+players+seasonHistory
                                                              84450b811e32ad4a
qa-c3-determinism-2  24 programs, 1 season, full-state hash   3ca85a0166e86308
```
