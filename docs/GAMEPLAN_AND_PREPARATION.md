# Game Plan and Preparation

The weekly decision layer: what the player settles before a game is played, and
what they can pay someone else to settle for them.

## Intent

The reference this game borrows its shape from is a business simulation where
almost every screen is a decision with a posted price and a posted payoff. Three
patterns carry that, and all three apply directly to football preparation.

**Salaried specialists with visible modifiers.** A distribution executive costs
$60,807 a week and states exactly what he does: maintenance −15%, deal boost
+10%, competitiveness +15%, with a replace button beside him. The player is
never guessing what a hire buys. A coordinator should read the same way.

**Multi-week projects with named stages.** A legal case shows research at 100%,
response at 74%, settlement at 0%, an overall 58%, and a settlement price that
rises as the deadline approaches. Installing a playbook is the same object:
staged, partially complete, and worse to abandon halfway.

**Finite staff capacity.** `Employees: 15, Available: 0` is the whole economy of
attention in one line. Preparation must draw on a pool that runs out, or every
decision collapses into "do all of them."

The player should end a week having spent something scarce on a plan, and start
the next one able to see whether the plan was right.

## Load-bearing dependency: unit-level game resolution

None of this can be built on the current engine.

`teamStrength` averages all 25 starters into a single number, and
`simulateGameScore` reads only the difference between two such numbers. There is
no rushing offense, no pass defense, no matchup of any kind. "Commit to stopping
the run" has nothing to modify, and neither does a playbook, a scouting report,
or a run-pass balance.

So the game plan and unit-level resolution are one piece of work, not two.

### Minimum viable unit model

Replace the single scalar with four ratings per team, each derived from the
position groups that actually produce it:

| Unit | Primary inputs |
|---|---|
| `rushOffense` | OL strength and technique, RB overall, QB mobility |
| `passOffense` | QB technique and arm, WR/TE overall, OL pass protection |
| `rushDefense` | DL strength, LB overall, safety run support |
| `passDefense` | DB overall and technique, DL pass rush, LB coverage |

Each possession then picks run or pass from the offense's balance and the game
script, and resolves that call against the matching defensive unit rather than
against an average. Playbook, install progress, emphasis, and scouting all
modify specific units, which is what gives them meaning.

This also settles the question deferred from the box-score work: once the
simulation resolves by unit, the box score becomes the *output* of play
resolution instead of a plausible fiction fitted to the final score, and a star
quarterback starts winning games rather than merely posting numbers.

## The weekly decision set

### 1. Playbook installation — a staged project

A playbook is a scheme identity with an install percentage, not a setting.

Offense: `SPREAD_TEMPO`, `PRO_BALANCED`, `POWER_RUN`, `AIR_RAID`, `TRIPLE_OPTION`
Defense: `FOUR_THREE_BASE`, `NICKEL_PRESSURE`, `ZONE_BLITZ`, `BEND_DONT_BREAK`

Each carries:

- **Stages** — Base Concepts, Situational Package, Counters and Adjustments —
  each with its own percentage, exactly like the legal case screen.
- **Personnel fit** — `AIR_RAID` wants arm strength and a deep receiver room;
  `POWER_RUN` wants offensive-line strength and a featured back. Fit scales the
  ceiling, so the right scheme for the wrong roster underperforms.
- **Effect scaled by install** — a playbook at 40% installed delivers 40% of its
  unit modifiers and carries a penalty for unfamiliarity.

Switching playbooks resets progress. A new scheme is a real investment that
makes the team worse for weeks before it makes them better — the competitive
equivalent of a facility that drains cash while it is being built.

### 2. Play concepts — incremental unlocks

Inside a playbook, individual concepts install over one or more weeks: a deep
shot package, a counter run, a coverage trap. Each buys a narrow, specific
advantage — a bonus in a situation, or a counter to one opponent tendency.

This is the small, frequent decision that fills weeks when nothing large is in
progress.

### 3. Opponent scouting — tiered reveal

Modelled on the existing prospect scouting report, which already earns its keep:
pay for information, receive an estimate whose width narrows with the quality of
the people producing it.

| Tier | Reveals |
|---|---|
| none | Record and ranking |
| `TENDENCIES` | Run/pass balance as a band |
| `PERSONNEL` | Unit strengths and their star players |
| `GAME_PLAN` | The emphasis they have actually chosen this week |

The top tier is what makes the emphasis decisions a game rather than a coin
flip. It should be expensive and never perfectly reliable.

### 4. Weekly emphasis — the calls

Free to choose, but only meaningful against what the opponent chose.

**Offense**

- Run/pass balance: `RUN_HEAVY` · `BALANCED` · `PASS_HEAVY`
- Backfield: `FEATURE_BACK` · `COMMITTEE`
- Targets: `SPREAD_IT` · `FEED_THE_STAR`
- Tempo: `HURRY_UP` · `NORMAL` · `CONTROL_CLOCK`

**Defense**

- Priority: `STOP_THE_RUN` · `BALANCED` · `STOP_THE_PASS`
- Posture: `TAKEAWAY_HUNT` · `CONTAIN` · `BEND_DONT_BREAK`
- Pressure: `HEAVY_BLITZ` · `SITUATIONAL` · `COVERAGE_FIRST`

Every one of these is a genuine trade, never a strict upgrade:

- `PASS_HEAVY` into `STOP_THE_PASS` is punished; into `STOP_THE_RUN` it is
  rewarded.
- `TAKEAWAY_HUNT` raises interceptions *and* yards allowed.
- `FEATURE_BACK` raises the lead back's production and his fatigue and injury
  risk; `COMMITTEE` keeps the room fresh and caps any one back's stardom — which
  matters, because stardom feeds fans and revenue.
- `FEED_THE_STAR` concentrates targets into one marketable player and is easier
  to take away.
- `HURRY_UP` adds possessions for both teams, which helps the better offense and
  hurts the thinner roster.

The fatigue, stardom, and injury couplings are what keep these decisions tied to
the rest of the game instead of sitting in a box by themselves.

### 5. Delegate or decide

The coordinator card, built like the distribution executive.

Coordinators gain `tendencyRead` (how reliably they infer an opponent's plan
without scouting), `schemePreference` (which playbook they install fastest), and
`aggression` (their bias when guessing). Assign one to `AUTO_GAMEPLAN` and they
choose the week's emphasis; the card posts what they intend to call and why, and
the player may override it.

A strong coordinator is worth more than a scouting report and costs more than
one. A weak one guesses wrong confidently. That is the decision the player is
really making, and it is the point where preparation becomes a payroll question
— which is exactly where it should connect to the revenue work.

### 6. Preparation capacity — the scarcity

A weekly pool of prep points from staff assigned to `GAME_PREP` plus facility
level, spent on installation, play concepts, and scouting. Emphasis choices are
free, because they are decisions rather than work.

The pool must be small enough that installing a playbook, learning concepts, and
scouting deeply in the same week is impossible. Without that, there is no plan —
only a checklist.

## Feedback

A weekly plan report, in the spirit of the chart screen: what was called, what
the opponent called, which matchups were won, and what each choice was worth in
yards, points, turnovers, and fatigue. Decisions the player cannot review are
decisions they cannot learn from.

## Build order

1. ~~Unit-level ratings and possession resolution, with box scores emitted from
   play results.~~ **Done** — `packages/simulation/src/game.ts`.
2. ~~Weekly emphasis commands plus the matchup table, with projections and the
   plan report.~~ **Done** — the `SET_GAME_PLAN` command, `GAME_PLAN_OPTIONS`,
   `projectGamePlan`, and the `GAME_PLAN_REPORT` event.
3. ~~Prep capacity, opponent scouting tiers, and the AI spending prep like a
   rival.~~ **Done** — `packages/simulation/src/scouting.ts`, the
   `SCOUT_OPPONENT` command, and `prepareWeek`.
4. ~~Named strategy presets, so the seven emphasis axes collapse to one
   offensive and one defensive choice.~~ **Done** — `OFFENSIVE_PRESETS`,
   `DEFENSIVE_PRESETS`, and the "This Week" screen.
5. Playbook installation as a staged project, then play concepts.
6. Coordinator delegation and the `AUTO_GAMEPLAN` card.

Each stage is playable on its own, and each one adds decisions without waiting
on the stage after it.

Two lessons from stage 3 that apply to the stages left.

**Information has to be taken away before it can be sold.** The matchup
projection was handing over the opponent's exact unit ratings for free, which was
the personnel tier given away. Check what a screen already reveals before
pricing it.

**A pre-week decision has to resolve pre-week.** Scouting bought through the
normal command queue would only have resolved during `advanceWeek`, so the
report would have arrived after the game it was meant to inform. `prepareWeek`
exists for that reason, and playbook installation will need the same treatment.
