# Game rules

What the engine does, stated as rules a tester can check against. This is the
reference for **correctness** — whether the game did what it is supposed to do.
Whether the result is *good* is `game-balance.md`; whether a system is *honest*
about itself is `expected-behavior.md`.

Everything here is drawn from the engine as it stands. If the code and this
document disagree, that is itself a finding: file it and say which you believe.

---

## 1. Shape of a career

A career is a loop over three phases. There is no other state.

```
ROSTER_REVIEW ──beginSeason()──► REGULAR_SEASON ──week > 14──► OFFSEASON
      ▲                                                            │
      └──────────────── completeOffseason() ◄──────────────────────┘
```

| phase | what is legal |
|---|---|
| `ROSTER_REVIEW` | scheme, staff hiring, marquee scheduling, depth chart |
| `REGULAR_SEASON` | the weekly loop (below) |
| `OFFSEASON` | one step at a time, in a fixed order |

**Engine entry points.** These are the only ways state advances:

| function | moves |
|---|---|
| `createFictionalLeague(seed, programCount?)` | nothing — builds the league |
| `beginSeason(state, commands?)` | `ROSTER_REVIEW` → `REGULAR_SEASON` |
| `prepareWeek(state, commands)` | resolves pre-week decisions in place |
| `advanceWeek(state, commands?)` | one week, or rolls the season over |
| `advanceOffseasonStep(state, commands?)` | one offseason step |

A league is **72 programs**, about **6,190 players** and **2,160 prospects**.
Smaller leagues (`programCount`) are legal and are what most tests use.

## 2. The regular season

Twelve playing weeks with two byes: `1 2 3 4 · 6 7 8 9 · 11 12 13 14`.
Weeks 5 and 10 exist but hold no fixtures.

`advanceWeek` resolves in a **fixed order**. Order matters and is load-bearing:

```
commands → recruiting market → fatigue recovery → development → games
  → player brands → injury recovery → new injuries
  → recaps/finances → rankings → recruiting points
```

Two consequences a tester should hold onto:

- **Injuries recover before new ones are drawn.** A one-week injury therefore
  costs exactly one game.
- **Finances resolve after the game**, so the gate reflects the result.

`prepareWeek` resolves *before* `advanceWeek` and settles scouting, practice
reps and staff allocation — so a bought scouting report can inform the plan for
the same Saturday.

## 3. Season rollover

When the week passes 14, `advanceWeek` runs the rollover instead of a week:

```
awards → division titles → 12-team playoff → champion
  → eligibility and portal churn → OFFSEASON opens
```

The season number does **not** increment here. It increments at the *end* of
the offseason, in `completeOffseason`, along with the wins/losses reset. A
tester reading `state.season` during the offseason is looking at the season that
just finished.

## 4. The offseason

Five steps, always in this order, one `advanceOffseasonStep` call each:

| # | step | decision |
|---|---|---|
| 1 | `BOARD_REVIEW` | none — a verdict, not a choice |
| 2 | `PORTAL` | bid on listed transfers |
| 3 | `SIGNING_DAY` | the class you signed arrives |
| 4 | `COACHING` | hire and fire staff |
| 5 | `TRAINING_CAMP` | one camp focus |

`BOARD_REVIEW` is first deliberately: whether you still have the job precedes
every decision that assumes you do.

`CONTINUE_OFFSEASON` is the universal no-op and is valid at every step. A
command belonging to a different step is **refused with the step that owns it**,
not silently dropped.

## 5. The board review

Runs on all 72 programs in one pass, in sorted id order, consuming no RNG.

`jobReview(state, programId)` is the single source of truth and is the same
call the dashboard makes mid-season. Movement:

| reason | delta |
|---|---|
| each win above/below the tier target | ±7 |
| national championship | +25 |
| reached the playoff | +10 |
| finished the year with a negative budget | −20 |
| first season in the job | half of any damage, forgiven |
| championship mandate expired | **ends the tenure, no delta** |

Tier targets: **POWER 10 · MID 7 · LOW 5** wins, shared with `seasonExpectation`.

Bands: `EXTENDED` ≥85 · `SECURE` 60–84 · `WATCHED` 35–59 · `HOT_SEAT` 15–34 ·
`FINAL_WARNING` 1–14 · `FIRED` ≤0.

**Mid-season the review grades the pace**, not the partial record. Once every
game is played the pace *is* the record, so the projection and the verdict are
the same number.

On dismissal the chair empties, `coachSecurity` resets to the tier baseline
(45/55/62), tenure resets to 0, and any mandate is cleared.

## 6. Money

Both sides are derived. Nothing is a stored constant.

**Revenue** = media rights + gate + concessions + sponsorship.
`mediaRights` = a tier conference floor + national press + prestige +
championships.

**Expenses** = operating cost + staff payroll + NIL + advertising (home only).
`operatingCost` = squad (scholarship limit) + facility upkeep (`level^1.7` each)
+ stadium (per seat) + **operations, a flat share of revenue**.

Facilities carry weekly upkeep forever. The upgrade card must post both the
purchase price and the recurring cost.

## 7. Recruiting and the portal

- Offers are durable; a prospect holds them and resolves against all bidders.
- Contested markets resolve **all valid commands together**. Command order and
  program iteration order must never decide a winner.
- Portal listings are bid on with points and weekly NIL. The program a player is
  leaving may bid to keep him — that is a *retention*.
- Scholarship limits are enforced; a program cannot leave a market over its cap.

## 8. Commands

Roughly sixty command types exist. The ones a tester will use most:

`SET_WEEK_FOCUS` · `SET_SCOUTING_TARGET` · `SET_TICKET_PRICE` ·
`SET_ADVERTISING` · `ACCEPT_SPONSORSHIP` · `UPGRADE_FACILITY` ·
`CHOOSE_BOOSTER` · `SET_SCHEME` · `SET_DEPTH_CHART` ·
`SET_DEVELOPMENT_SPOTLIGHT` · `OFFER_PROSPECT` · `SCHEDULE_VISIT` ·
`SET_NIL_OFFER` · `BID_PORTAL_PLAYER` · `REPLACE_STAFF` ·
`SET_TRAINING_CAMP_FOCUS` · `CONTINUE_OFFSEASON`

**Three commands are deliberately refused** with an explanation, because what
they used to set is now derived from the week's priorities:

| refused | reason given |
|---|---|
| `SET_WEEK_HOURS` | "Hours follow from the week's priorities." |
| `SET_STAFF_ALLOCATION` | "…set the week's priorities instead." |
| `SET_PRACTICE_REPS` | "Make a side of the ball a priority to drill it." |

A refusal emits `COMMAND_REJECTED` carrying the reason. **A rejection is not a
bug** — a rejection with a wrong or missing reason is.

## 9. Events

Processors emit typed events with stable fields; the UI writes the sentences.
`eventHistory` is capped at 10,000 entries.

Events are the tester's primary evidence. `WEEKLY_FINANCES`,
`BOARD_REVIEW_COMPLETED`, `GAME_COMPLETED`, `COACH_FIRED`,
`PORTAL_PLAYER_SIGNED` and `COMMAND_REJECTED` carry enough structure to verify
most rules without reading engine internals.

## 10. Saving

`encodeSave` / `decodeSave` round-trip a career through gzip. A loaded career
must advance to **byte-identical** state against one that was never saved.
Completed seasons are folded into per-player season lines; per-game rows are
kept for the live season only.
