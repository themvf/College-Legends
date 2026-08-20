# College Legends V2 fixes

The currently released game is the V1 baseline. This document records changes
being considered for V2; it does not redefine how an existing V1 save is
supposed to behave.

## V2-001: Recommend development work by marginal benefit

**Status:** Proposed

### V1 behavior

The weekly development screen always presents three distinct stories: the
player with the most remaining ceiling, the biggest existing star, and the
player considered most at risk. The at-risk candidate is currently the healthy
scholarship player with the highest value of:

```text
fatigue - (durability * 0.4)
```

This can label a zero-fatigue, low-durability reserve as "Closest to breaking
down." The selection ignores whether he is a starter, how many snaps he is
expected to play, the quality of his replacement, and whether conditioning him
would be more valuable than developing another player or an entire position
room.

### V2 behavior

Generate recommendations from the projected marginal benefit of the available
training choices.

- **Individual development value:** projected position-weighted rating gains,
  remaining eligibility, potential, expected snap share, and opportunity to
  move into the rotation.
- **Conditioning value:** fatigue that can actually be recovered plus the
  reduction in projected injury risk, weighted by expected snaps and the
  player's importance relative to his replacement.
- **Position-room value:** the combined projected benefit to the players who
  can realistically contribute, reduced by the diluted room-work intensity.

An at-risk recommendation must have meaningful expected playing time and must
cross a fatigue or projected-injury-risk threshold. Low durability by itself is
not enough. If nobody qualifies, replace the at-risk card with the next-best
individual or position-room development opportunity.

The recommendation card must state the projected result, such as "reduces this
week's injury risk from 3.1% to 2.6%" or "projects +0.4 position-weighted
development." It must not claim that a player is breaking down when his fatigue
is zero.

### Acceptance criteria

- A zero-fatigue, low-durability reserve is not automatically recommended.
- A fatigued starter is preferred over an unused reserve when conditioning has
  greater projected value.
- No at-risk card appears when no player crosses the risk threshold.
- A position-room recommendation can outrank an individual when its combined
  benefit is greater.
- Every recommendation exposes the same payoff calculation the engine will
  apply.
- Recommendations remain deterministic for the same state and commands.
- Regression tests cover preseason, normal rotation, injuries, redshirts, and
  shallow position rooms.

### Initial tuning notes

Expected snap share should come from the active depth chart and current scheme,
not a new parallel starter table. Injury benefit should compare
`playerInjuryRisk` before and after conditioning. Exact eligibility thresholds
and score weights are balance hypotheses and should be set with multi-season
distribution tests rather than frozen as correctness rules.

## V2-002: Make the dashboard a live weekly decision checklist

**Status:** Proposed

### V1 behavior

The dashboard briefing is built only from the last committed `GameState`. Most
choices made elsewhere in the interface live in a separate `pendingCommands`
queue until the player advances the week, and the dashboard is not given that
queue. As a result, returning to the dashboard can still show "Nobody is
getting extra coaching this week" after a player or room has been selected.
The header reports only a count of queued decisions and never confirms what was
chosen.

Development is especially confusing because two related decisions can appear
as independent warnings. A weekly staff priority may say "Coach up [player]"
while a separate card says nobody is receiving the development spotlight. The
first refers to staff-wide development hours; the second refers to the
individual or position room receiving the extra work, but V1 does not explain
that distinction.

### V2 behavior

Turn the dashboard into a live checklist with one source of truth for the
effective plan the player has assembled for the current week.

Each decision has one of four explicit states:

- **Needs action:** a required or clearly wasteful omission that is unresolved.
- **Worth reviewing:** an optional recommendation where the current choice may
  still be intentional.
- **Queued:** a command has been selected but cannot settle until the week or a
  market advances. Use an amber clock and the words "Queued for advance," not a
  success check.
- **Confirmed:** the choice has settled successfully. Use a green check plus a
  plain-text summary of the exact choice; color alone must not communicate the
  status.

The top of the panel should summarize both sides, for example, "2 items need
attention · 4 decisions set." Keep unresolved cards in **What needs you this
week**, then show a compact **Ready for Saturday** checklist beneath them. A
confirmed development row should read something like:

```text
✓ Extra coaching — Aaron Caldwell · Technique
```

The row links back to the relevant control so the choice can be changed. If the
engine rejects a command, do not show a green check: restore the alert and show
the rejection reason beside the control that produced it.

### State and command design

- Route reversible pre-week choices through the engine's immediate preparation
  path and refresh the worker state as soon as they settle. Weekly focus and
  scouting target already have engine support for this; the web command router
  must use it. Add the development spotlight to the same immediate path so its
  confirmation is real, autosaved state rather than a UI-only promise.
- For decisions that genuinely must wait for resolution, build the dashboard
  from an explicit effective-plan projection that overlays pending commands on
  committed state without mutating the simulation.
- Do not infer completion from `pendingCommands.length`. Build typed status
  records containing the decision id, status, summary, destination, and any
  rejection or recommendation text.
- Clear week-scoped confirmations when a new week begins. Persistent settings
  such as ticket price remain confirmed until the matchup or recommendation
  changes enough to make them worth reviewing again.
- Allow an optional recommendation to be acknowledged without following it.
  For example, "Keep tickets at $28" marks the price as reviewed for this week;
  it does not pretend $28 is the engine's recommended price. Re-open the alert
  after a material context change rather than nagging forever.

### Development terminology

Use distinct labels for the two development layers:

- **Staff development priority:** how much of the staff's finite weekly capacity
  goes toward development and therefore affects the broader roster.
- **Extra coaching recipient:** the one player or position room receiving the
  concentrated spotlight.

The dashboard may show both rows, but it must never describe one as satisfying
the other. If choosing the staff priority automatically assigns a recipient,
identify it as "Auto-selected" and allow the player to change that recipient.

### Acceptance criteria

- Selecting an extra-coaching recipient immediately removes the missing-choice
  alert and adds a green confirmation naming the player or room and focus.
- Selecting or changing weekly priorities immediately updates their dashboard
  status and any recommendation derived from them.
- Pending, confirmed, and rejected choices have visually and textually distinct
  states.
- The attention count includes only unresolved items; confirmed rows do not
  inflate it.
- The dashboard never simultaneously says that nobody is receiving extra
  coaching and names an extra-coaching recipient.
- Staff development priority and extra coaching use distinct, consistent copy.
- Navigating away and back, refreshing, resuming a save, and advancing to the
  next week all preserve or clear confirmations according to their scope.
- Status icons have text labels and accessible names; the design does not rely
  on green, amber, or red alone.
- UI tests cover selection, replacement, rejection, acknowledgment, navigation,
  save/resume, and week rollover.

## V2-003: Expose offense, defense, overall, and matchup ratings

**Status:** Proposed

### Goal

Give the player an immediate answer to two different questions:

1. How strong is my team on offense, defense, and overall?
2. Against this specific opponent, am I the favorite or the underdog?

These are related but must not be collapsed into one unexplained number. A team
rating describes the current team; favorite status also depends on the opponent,
location, health, preparation, and what the player actually knows about the
opponent.

### Rating model

Build the three public totals from the four unit ratings the simulation already
uses:

```text
Offensive Total Rating = mean(rush offense, pass offense)
Defensive Total Rating = mean(rush defense, pass defense)
Overall Total Rating   = mean(offensive total, defensive total)
```

Expose these calculations through a single pure projection such as
`teamRatingSummary(state, programId)`. It must use the active depth chart and
rotation, so injuries, redshirts, fatigue, replacements, current development,
and preparation affect the displayed totals exactly when they affect the game.
Do not create a second UI-only roster average.

The base totals should remain stable, comparable team-strength numbers. Keep
scheme and matchup modifiers visible as adjustments rather than burying all of
them in the headline rating. A detail view can retain the four source ratings
so the player can see, for example, that a 72 offense consists of an 80 passing
unit and a 64 rushing unit.

### Matchup projection

Create a separate `matchupRatingSummary` that compares the two sides the same
way the game engine does:

- Our offensive total against their defensive total.
- Our defensive total against their offensive total.
- Current injuries, fatigue, active replacements, preparation, and scheme
  execution.
- The engine's real home-field modifier: add it to the home team, subtract the
  same relative edge when the player is away, and use zero at a neutral site.

Return an effective rating edge and a plain-language band such as **Strong
favorite**, **Favorite**, **Even**, **Underdog**, or **Heavy underdog**. The
thresholds are balance hypotheses and must be calibrated against thousands of
simulated games. Do not label the rating difference as a predicted score margin
or betting spread unless a separate calibration test demonstrates that meaning.

Win probability may be added later, but only from a measured mapping between
pre-game rating edge and actual win rate. It must never be an arbitrary linear
percentage.

### Scouting and uncertainty

The player's own three totals are exact. Opponent totals must respect the
existing scouting information boundary:

- Before the personnel tier is unlocked, show **Unknown — scout their
  personnel** rather than leaking the opponent's true ratings.
- Once personnel is unlocked, aggregate the existing scouted unit ranges into
  offensive, defensive, and overall ranges.
- Narrow those ranges as scouting confidence improves; do not collapse them to
  exact values.
- Express favorite status as a range when uncertainty crosses a verdict
  boundary, such as **Even to slight underdog**.

Record, national rank, and reputation remain public context but are not a
substitute for secretly revealing the opponent's underlying team rating.

### Interface

- Add **Offense**, **Defense**, and **Overall** to the dashboard's team summary.
- Add a matchup card for the next game showing our totals, the opponent's known
  totals or ranges, the location adjustment, and the resulting favorite or
  underdog verdict.
- Repeat the compact verdict on schedule rows and the weekly opponent report;
  all screens must read from the same projection.
- Let the player open the calculation to see rush/pass components and modifiers.
- Use text and symbols as well as color. A green/red treatment alone is not an
  accessible favorite indicator.
- Integrate with V2-002 so a newly confirmed depth-chart or weekly-preparation
  choice updates the dashboard projection immediately.

### Acceptance criteria

- Offensive, defensive, and overall totals are derived from the four engine
  unit ratings and agree on every screen.
- Changing the active depth chart, losing a starter, redshirting a player, or
  accumulating fatigue moves only the totals affected by that engine change.
- The overall total cannot disagree with the displayed offensive and defensive
  components because all three come from one projection.
- Home, away, and neutral versions of the same matchup apply the configured
  location advantage in the correct direction.
- An unscouted opponent's exact ratings never reach the UI.
- Scouted opponent ranges and matchup-verdict ranges narrow monotonically with
  confidence.
- Favorite bands are calibrated against deterministic multi-seed simulation
  results and publish their observed win-rate ranges.
- The same seed, state, and knowledge produce identical rating summaries.
- UI tests cover exact own-team ratings, unknown opponents, scouted ranges,
  home/away changes, injuries, queued decision updates, and accessible labels.

## V2-004: Staff delegation with review, guardrails, and overrides

**Status:** Proposed

### Goal

Let the player decide which football operations to handle personally and which
to entrust to named staff members. Delegation should remove repetitive work
without becoming a hidden auto-play mode, creating free resources, or taking
high-consequence actions the player did not authorize.

Every delegated decision must answer four questions before it is enabled:

1. **What domain is delegated?**
2. **Which staff member owns it?**
3. **Does the staff member recommend or act automatically?**
4. **What limits and priorities must the staff member obey?**

### Delegation modes

Each domain supports three explicit modes:

- **Manual:** the player makes every choice. The staff member may still provide
  explanatory projections already available on the screen.
- **Recommend:** the staff member prepares a proposed set of ordinary game
  commands. Nothing applies until the player accepts or edits the proposal.
- **Automatic within guardrails:** the staff member submits those commands when
  the decision window opens, but only inside the policy and limits the player
  approved.

Delegation can last for **this decision**, **the rest of the season**, or **until
changed**. The UI must state the duration. A one-time delegation must not
silently become a career-long setting.

### Initial delegation domains

#### Depth chart and availability

- Eligible owners: head coach for the full chart, offensive coordinator for
  offensive rooms, defensive coordinator for defensive rooms.
- Policies: **best team now**, **balanced rotation**, or **develop the future**.
- Optional health rule: automatically promote healthy replacements when a
  starter is unavailable.
- Player locks prevent named players from being moved above or below a chosen
  slot.
- Redshirt decisions remain manual by default. Automatic redshirting requires a
  separate explicit permission and guardrails such as "never redshirt a current
  starter" and "never redshirt a player in his final season."

#### Scouting

- Eligible owners: head coach or a coordinator, with film-study skill and role
  fit visible before assignment.
- Policies: **next opponent**, **highest-value future game**, or **balanced file
  building**.
- Guardrails can reserve a minimum file on the next opponent before work moves
  to a later marquee game.
- The delegate sees only public information and the program's purchased
  scouting knowledge. Delegation must never reveal true opponent ratings or
  tendencies that the player has not unlocked.

#### Weekly staff priorities and planning

- Eligible owner: head coach, with coordinator input shown in the explanation.
- Policies: **win this week**, **balanced program**, **development first**, or
  **recruiting first**.
- Player locks can reserve one priority slot, such as always installing the
  offense or always recruiting, while the staff chooses the remaining slots.
- The delegate may allocate the same finite staff capacity the player has; it
  does not create extra focus slots or coaching hours.
- A delegated plan cannot change the program's permanent scheme during the
  season.

#### Extra coaching and player development

- Eligible owner: strength coach or head coach.
- Policies: **highest marginal gain**, **protect important players**, **develop
  young rotation players**, or **strengthen the weakest room**.
- Selection must use the V2-001 marginal-benefit projection rather than the V1
  low-durability shortcut.
- The staff member must name the recipient, focus, projected payoff, and why
  that option beat the alternatives.

#### Recruiting

- Eligible owners: head coach or a coordinator, with recruiting aptitude shown
  before assignment.
- Policies may define position priorities, prospect profile, geographic bias,
  risk tolerance, and how aggressively to chase contested recruits.
- Hard guardrails include Recruiting Point reserves, maximum weekly NIL per
  prospect, maximum total NIL reservations, scholarship-space protection, and
  whether visits may be scheduled.
- The delegate reads public hype plus only the evaluations this program has
  purchased. It cannot inspect hidden potential or another program's private
  interest values.
- Scholarship offers, evaluations, and pursuits can be delegated independently;
  enabling one does not authorize all recruiting actions.

### Actions that remain manual by default

Staff hiring and firing, permanent scheme changes, sponsorship acceptance,
facility purchases, marquee guarantees, portal/NIL commitments above an
approved cap, and any decision that can irreversibly spend a large share of the
budget remain manual. Later V2 work may add opt-in delegation for these domains,
but no broad "delegate everything" control may silently authorize them.

### Decision quality and information boundaries

Delegated decisions must be emitted as the same typed `GameCommand` values and
resolved through the same engine boundaries as manual decisions. They receive
the same costs, capacity, arbitration, rejection rules, and market timing.

Split the existing rival AI into reusable domain planners rather than calling
one league-wide auto-play function for the human program. Each planner receives
an explicit knowledge context and policy. Staff rating, role fit, and traits may
change how options are scored or how good the recommendation is, but even a weak
staff member must remain deterministic, legal, and unable to read hidden data.
Poor staff should make explainably weaker judgments, not fail through invisible
random mistakes.

Delegating a responsibility does not add hours or ratings. The staff member is
deciding how to spend resources the program already has.

### Proposal, confirmation, and override flow

At the start of each applicable decision window:

1. Build at most one proposal per delegated domain from the current state,
   knowledge, policy, and guardrails.
2. In **Recommend** mode, show the proposal and projected effects without
   submitting it.
3. In **Automatic** mode, submit its ordinary commands and report whether each
   settled, queued, or was rejected.
4. Let the player edit or override any reversible choice before the window
   closes. A manual override always wins and prevents the delegate from
   reapplying its old choice during that cycle.
5. Record the final decision, owner, reason, and outcome in an audit trail.

Use V2-002 dashboard states for this flow. Examples:

```text
✓ Depth chart — delegated to DC Marcus Reed · best team now
◷ Scouting — Coach Reed proposes moving the film room to Coastal Tech
! Recruiting — NIL offer blocked by your $2,000/week guardrail
```

The player can open any row to inspect the reasoning, accept a recommendation,
change its policy, take the domain back, or undo a reversible automatic choice.

### Data model and save behavior

Add persisted, versioned settings rather than storing delegation only in React
state. The model should include concepts equivalent to:

- `DelegationDomain`
- `DelegationMode`
- `DelegationDuration`
- `DelegationPolicy` with domain-specific guardrails
- `DelegationAssignment` containing the responsible staff id
- Typed proposed/applied/overridden/blocked delegation events

Assignments must survive save/resume and season rollover according to their
duration. If the assigned staff member leaves, becomes vacant, or changes role,
pause that delegation and ask the player to reassign it; do not silently give it
to someone else.

### Interface

- Add a **Responsibilities** section to the Staff screen showing every domain,
  owner, mode, duration, policy summary, and current status.
- Put a small **Delegate** or **Take control** control on each affected screen so
  responsibility can be changed in context.
- Show the assigned staff member's relevant aptitude and explain why that person
  is or is not a good fit for the responsibility.
- Mark delegated choices on the dashboard and affected screen, always naming
  the staff member responsible.
- Provide a weekly staff-decisions summary instead of flooding the inbox with
  one event per automated command.

### Acceptance criteria

- Every delegated outcome is composed of legal player-facing commands and can
  be reproduced manually.
- Manual, recommend, and automatic modes behave differently and visibly.
- A manual override wins and is not overwritten again in the same decision
  window.
- Guardrails prevent spending, NIL, scholarship, redshirt, and locked-player
  violations before commands are submitted.
- Delegated staff never access hidden opponent or recruit information.
- Staff rating, role, and traits affect decisions through posted scoring rules,
  not hidden random failure.
- Removing or replacing an assigned staff member pauses the responsibility and
  produces a dashboard alert.
- Settings and appropriate durations survive save/resume and rollover.
- Delegated choices update V2-002 confirmation states and V2-003 ratings as soon
  as they settle.
- Deterministic tests cover each domain, all three modes, player overrides,
  rejected commands, staff departure, save migration, and knowledge-boundary
  enforcement.

## V2-005: Restore the business simulation as the primary game loop

**Status:** Proposed — highest V2 product priority

### Product correction

College Legends is a college-football **business simulation**. Football is the
largest source of uncertainty, attention, and institutional momentum, but it is
not the whole management game. V1 has moved too far toward roster, recruiting,
scheme, and game simulation while finance has become a thin status screen around
a budget number.

V2 must restore this core loop:

```text
Inspect the institution
  → make commercial and operating decisions
  → fund people, reach, and infrastructure
  → play football under those constraints
  → convert results and reputation into—or fail to convert them into—revenue
  → service obligations, absorb risk, and reinvest
```

Winning creates opportunities; it does not automatically create a healthy
business. A prudent 5–7 rebuilding program should be able to improve its
financial position, while a reckless 10–2 program can still face a cash crisis.
Money must help build an institution without becoming a direct "buy wins"
button.

This section is the V2 implementation anchor for the broader direction already
described in [PRODUCT_VISION.md](./PRODUCT_VISION.md), [GAME_DESIGN.md](./GAME_DESIGN.md),
and [PROGRAM_IDENTITY_AND_ECONOMY.md](./PROGRAM_IDENTITY_AND_ECONOMY.md).

### V1 gap

V1 includes ticket prices, advertising, attendance, concessions, one primary
sponsor, staff payroll, NIL expense, facility purchases, and occasional booster
offers. Those are useful pieces, but they do not yet form a business game:

- Base weekly revenue and operating expense are still largely fixed values set
  by program tier.
- The finance screen reports current numbers but does not show a real ledger,
  commitments, cash runway, or season-end forecast.
- Facilities are mostly one-time linear purchases rather than capital projects
  with maintenance, financing, capacity, and long-term obligations.
- Media, merchandise, licensing, donor programs, events, conference
  distributions, and broader commercial contracts are absent or inert.
- Recognition and fan growth have too few economically distinct uses.
- There is no complete debt, liquidity, insolvency, board intervention, or
  financially driven dismissal loop.
- There is no business-centered scorecard that can distinguish institutional
  success from the win–loss record.
- Rival programs do not visibly compete on a complete shared economic model.

Adding more isolated revenue buttons would preserve the problem. V2 must first
create financial truth, then build decisions and content on top of it.

### Design principles

1. **One financial source of truth.** Every dollar enters or leaves through a
   categorized ledger entry. Screens summarize the ledger; they never maintain
   parallel balances.
2. **Post the payoff and obligation.** Before confirming a decision, show its
   immediate cash impact, recurring impact, forecast range, break-even point,
   and non-financial effects.
3. **Growth creates exposure.** Better staff, facilities, reach, and contracts
   create payroll, upkeep, expectations, debt service, and downside.
4. **Results influence demand, not guaranteed profit.** Winning affects
   attendance, sponsor triggers, donor enthusiasm, media value, and merchandise,
   but conversion depends on capacity, pricing, contracts, and execution.
5. **Strategic cadence, not weekly busywork.** Weekly controls exist only where
   the context changes. Persistent policies carry forward until a material
   change makes them worth reviewing.
6. **Several viable businesses.** A small diehard program, a volatile
   front-runner, a development pipeline, and a national brand should require
   different strategies rather than forming a single upgrade ladder.
7. **Money buys capability, not outcomes.** Investment can buy staff,
   infrastructure, information, health, reach, and capacity. Games still resolve
   through football systems and uncertainty.
8. **Failure is legible and recoverable until it is terminal.** The game warns
   about runway, covenants, and board thresholds well before a firing or
   insolvency outcome.

### The financial foundation

Build this before adding new commercial feature screens.

#### General ledger

Every transaction receives a season, week, program, amount, category,
counterparty or source, related decision/event id, and whether it is actual,
committed, or forecast. Initial categories should cover:

- media and conference distributions;
- tickets, concessions, parking, premium seating, and game-day operations;
- sponsorship and licensing;
- merchandise and retail;
- donations and institutional support;
- staff payroll and buyouts;
- facility capital spending, upkeep, and debt service;
- recruiting, travel, scouting, and visits;
- NIL-related program obligations where applicable;
- postseason distributions and exceptional events.

`Program.budget` becomes a derived cash balance or a strictly reconciled cache,
not an independently mutated number. Every budget change must be explainable by
ledger entries that sum to the same result.

#### Forecast and runway

The finance dashboard must show:

- cash available now;
- this week's operating result;
- committed recurring obligations;
- projected season-end cash as a range;
- weeks of runway under the expected case;
- best, expected, and downside cases with stated assumptions;
- debt balance, available credit, and covenant or board thresholds;
- actual versus budgeted performance by category.

Forecast uncertainty should come from known variables such as remaining home
games, attendance ranges, sponsor triggers, and postseason qualification. It
must not pretend uncertain football outcomes are guaranteed.

#### Contracts and obligations

Represent staff deals, sponsorships, media arrangements, leases, debt, and
major vendor or facility obligations as dated contracts with payments,
incentives, termination costs, and renewal windows. A contract is not merely a
one-time modifier; it changes future decisions and cash flow.

### Core business systems

#### Game-day business

Expand tickets and advertising into a coherent home-game operation:

- general, premium, and student pricing or a deliberately simpler tested
  segmentation;
- season-ticket commitments versus variable single-game inventory;
- concessions, parking, and per-cap spending;
- promotions with a posted acquisition cost and expected attendance/fan effect;
- staffing and operating cost that scale with crowd and venue level;
- weather, opponent value, record, rivalry, kickoff context, and fan character
  in demand forecasts;
- customer goodwill and retention effects from pricing decisions.

The player should see contribution margin, not merely gross gate revenue.

#### Sponsorship, media, and licensing portfolio

Move beyond one sponsor card into a small portfolio of meaningfully different
contracts:

- guaranteed versus performance-heavy sponsors;
- local, regional, and national inventory with exclusivity conflicts;
- activation requirements that cost money or staff attention;
- media and conference distributions tied to reach, standing, and contract
  cycles rather than a fixed weekly faucet;
- licensing and merchandise agreements with royalty rate, minimum guarantee,
  inventory or fulfillment risk, and player-brand interaction;
- renewal leverage driven by delivered audience and contract performance.

Keep the number of simultaneous decisions small. The depth comes from terms,
timing, conflicts, and future obligations—not dozens of interchangeable logos.

#### Donors, institutional support, and relationships

Turn boosters from occasional modal events into a relationship portfolio while
preserving uncertainty and tradeoffs:

- donor segments with interests, reliability, and influence;
- campaigns for facilities, operations, endowment, or NIL capacity;
- restricted gifts that cannot be spent on unrelated needs;
- promises and relationship costs that persist after the cheque arrives;
- university support that responds to financial discipline, compliance,
  visibility, and institutional goals.

Fan base, fan support, local press, national press, prestige, championships, and
donor culture should each have visible but different economic jobs.

#### Facilities, capital planning, and debt

Replace the simple upgrade ladder with capital decisions:

- project cost, construction duration, financing choice, and cash draw schedule;
- recurring maintenance and staffing costs that rise with level and capacity;
- renovation versus expansion versus replacement tradeoffs;
- debt service, interest, covenants, and refinancing risk;
- capacity or capability benefits that can be underused when demand is weak;
- deferred maintenance that preserves short-term cash while creating future
  cost and operational risk.

A prestige project can be a strategically bad business decision even when the
facility itself is excellent.

#### Operating budget and resource allocation

At preseason, set a financial plan across broad departments rather than forcing
fourteen weeks of repeated sliders. The plan establishes targets and guardrails
for football operations, recruiting, scouting, player development, marketing,
game-day operations, and reserves. Weekly exceptions should explain what changed
and show the cost of deviating from plan.

V2-004 delegation may eventually support business operations, but football
coaches should not silently act as financial executives. If operational
delegation expands, introduce appropriate administrative roles and give them
the same posted authority, limits, and accountability as coaching delegates.

### Governance, objectives, and consequences

The institution should evaluate both football and business performance through
explicit preseason objectives and a visible scorecard:

- competitive target and trajectory;
- operating result and liquidity;
- revenue growth and audience conversion;
- debt and capital-plan compliance;
- facility or program commitments;
- donor, sponsor, fan, and university confidence;
- promises made and delivered.

Negative cash is a condition, not an instant game-over roll. Use a staged path:

1. runway warning and recovery plan;
2. credit usage, spending restrictions, or board conditions;
3. forced cuts, asset/project cancellation, or emergency fundraising choices;
4. loss of autonomy or dismissal after clearly stated thresholds;
5. institutional insolvency or program collapse only after the documented
   long-term failure window.

Business excellence should have its own career recognition and legacy outcomes.
The player may build a durable institution without winning every championship;
the game should remember that as success rather than treating it as a lesser
football ending.

### Dashboard and information hierarchy

The primary dashboard must lead with the institution, not only Saturday:

- current cash, forecast, runway, and largest upcoming obligation;
- actual versus planned operating result;
- the most consequential business decision or risk this week;
- next game's financial opportunity and football context;
- contract renewal, capital project, or board deadlines;
- V2-002 confirmations showing which operating choices are settled.

Football ratings and matchup status from V2-003 remain important, but they sit
inside the broader question: what does this game mean for the institution?
Weekly recaps should connect result → audience → contract triggers → revenue →
forecast change in one traceable chain.

### Implementation order

1. **Financial truth:** typed ledger, reconciled cash, transaction events,
   historical statements, forecast, obligations, and runway.
2. **Dynamic core P&L:** replace fixed tier revenue/expense with explainable
   media/conference income, operating costs, payroll, upkeep, and game-day
   contribution margin.
3. **Contracts and capital:** sponsorship portfolio, media/licensing terms,
   facilities, maintenance, debt, and renewals.
4. **Audience conversion:** merchandise, donors, premium inventory, relationship
   effects, and distinct economic uses for fame measures.
5. **Governance and failure:** budgets, objectives, board interventions,
   recovery plans, dismissal, and business legacy.
6. **Rival economy and balance:** AI programs use the same decisions,
   constraints, contracts, debt, and consequences.

Do not begin with a merchandise minigame or a debt screen before the ledger and
forecast exist. Every later system depends on that common accounting foundation.

### Acceptance criteria

- Every dollar-changing event reconciles to categorized ledger entries and the
  displayed cash balance.
- Fixed tier-level weekly revenue and expense are replaced by traceable dynamic
  components or clearly named institutional contracts.
- The player can explain why cash changed this week and why the season-end
  forecast moved.
- At least three financially viable program strategies emerge in multi-season
  tests; one linear facility/revenue upgrade path does not dominate.
- Winning correlates with opportunity but does not guarantee profitability or
  solvency.
- A financially disciplined losing rebuild can survive and improve, while an
  overextended winner can enter distress.
- Facilities, staff, and major growth choices create visible recurring
  obligations and downside as well as benefits.
- Fan, press, prestige, championships, and donor culture have distinct posted
  economic effects rather than collapsing into one fame multiplier.
- Negative cash activates forecast warnings and staged governance consequences
  before terminal failure.
- The dashboard gives business condition and decisions at least equal hierarchy
  to football status and makes the result-to-revenue chain visible.
- Rival programs use the same economic rules; no major business system is
  human-only.
- Deterministic multi-seed tests cover ledger reconciliation, forecasts,
  contracts, debt, demand, recession/downside cases, AI solvency, and long-run
  inflation or budget explosion.

## V2-006: Add a mandatory season recap before the offseason

**Status:** Proposed

### Goal

Create a deliberate end-of-season checkpoint after awards and postseason results
are final but before graduations, eligibility rollover, transfer decisions, the
portal, or any other offseason mutation begins. The player should be able to
understand what the season meant before being asked to rebuild for the next one.

The required lifecycle becomes:

```text
Final regular-season week
  → division titles, awards, and postseason
  → finalize and snapshot the completed season
  → SEASON_RECAP
  → player chooses "Enter the offseason"
  → contract decisions and coaching carousel
  → eligibility, departures, and portal generation
  → portal and remaining OFFSEASON steps
```

The web game must never jump directly from the final game or championship into
the portal. Headless simulations may acknowledge the recap automatically, but
they must traverse the same explicit phase and command boundary.

### Lifecycle and state design

Add `SEASON_RECAP` as a real game phase, not a UI overlay inferred from recent
events. Split the current rollover into two idempotent operations:

1. **Finalize season:** resolve awards, division champions, playoff games,
   championship effects, final rankings, season statistics, financial close,
   and an immutable `SeasonRecap` snapshot. Set the phase to `SEASON_RECAP`.
2. **Begin offseason:** after a typed `CONTINUE_TO_OFFSEASON` command, enter the
   first explicitly ordered offseason stage. V2-008 places contract decisions
   and the coaching carousel before transfer decisions so a staff change can
   affect retention. Eligibility, graduations, transfer decisions, NIL releases,
   and portal listings occur at their subsequent documented boundary.

The completed season number remains active while its recap is open. No player
departure or portal RNG draw may occur before the continue command. Reopening,
saving, resuming, or repeatedly viewing the recap must never finalize the season
twice or reroll any outcome.

Store recap data with season history rather than rebuilding it later from the
live roster, current contracts, or mutable program totals. Players transfer,
graduate, change ratings, and sign new deals; the archived recap must continue
to describe the completed season exactly as it ended.

### Recap structure

#### Season verdict

Lead with one clear summary:

- final record and national rank;
- division finish and title status;
- postseason qualification, path, and result;
- national champion and runner-up;
- preseason competitive objective and whether it was met;
- board or athletic-director evaluation, including job status when the V2-005
  governance loop is implemented.

The verdict must distinguish a successful rebuild from a failed championship
mandate rather than grading every program only on total wins.

#### Football performance

- Offensive Total, Defensive Total, and Overall Total from V2-003, including
  start-of-season versus final values and national standing.
- Rush/pass unit strengths and material changes caused by development, injury,
  or depth-chart movement.
- Full schedule with scores, opponent ranks, home/away context, and postseason
  games.
- Best win, worst loss, closest finish, and defining upset selected by posted,
  deterministic rules.
- Points scored/allowed, unit production, strength of schedule, and other
  summary measures only where the engine has a reconciled source.

#### Players and staff

- Statistical leaders with season totals.
- National awards, finalists, and relevant staff awards.
- Breakout player, largest development gain, and major injury stories selected
  from structured evidence.
- Staff performance and scheme fit in the context of what each coach was asked
  to do.
- A preview of known eligibility exhaustion and projected scholarship openings.

Do not show transfer outcomes before the offseason begins. The recap may flag
retention risk using information the player already knows, but portal entrants
must not be generated early merely to populate the page.

#### Business and institutional performance

Make this a central half of the recap, not a small footer:

- opening cash, closing cash, and total change;
- revenue, expense, and operating-result breakdown from the V2-005 ledger;
- actual versus preseason budget and forecast;
- attendance, ticket yield, per-cap spending, and game-day contribution margin;
- sponsorship, media, licensing, merchandise, donor, and postseason results;
- new obligations, debt, facility investment, and remaining runway;
- fan, support, press, prestige, and sponsor/donor relationship changes;
- business objectives met, missed, or still at risk.

Every number links to its source statement or ledger category. The recap should
make it possible to say, for example, "the team won three more games, but two
poorly priced home dates and a facility obligation reduced closing cash."

#### Forward look

End with the known decisions waiting in the offseason:

- confirmed graduating or eligibility-exhausted players;
- projected position-room and scholarship needs;
- signed and committed class summary;
- staff contracts or business contracts reaching a decision window;
- capital, debt, budget, or board deadlines;
- the first offseason step and what it will decide.

This is a preview, not an early offseason. No portal result, staff-market result,
or new recruiting cohort should be revealed or resolved here.

### Interface

- Use a dedicated full-page recap with a clear **Enter the offseason** primary
  action at the end and a persistent action in the page header.
- Start with the season verdict and a compact football/business scorecard, then
  allow progressive disclosure into schedule, players, finances, and history.
- Use comparison language such as "from 58 to 64" and "+$1.2M versus plan"
  rather than presenting isolated totals with no baseline.
- Preserve the recap in a season-history archive that can be reopened in later
  years.
- On mobile, keep the verdict, primary action, and key comparisons readable
  without wide tables; detailed schedules and statements may use stacked rows.
- Use structured facts for generated narrative. Do not invent causes that the
  simulation cannot trace to events, ratings, or ledger entries.

### Data model

Add a versioned immutable summary equivalent to `SeasonRecap`, linked from
`SeasonHistory`, containing the player program's:

- final competitive result and objective evaluation;
- opening/final team-rating snapshots;
- schedule and postseason summary;
- leader, award, development, and injury snapshots;
- opening/final roster and eligibility outlook;
- opening/final financial and institutional measures;
- categorized season ledger totals and budget comparison;
- evidence-backed highlights and lowlights.

Store stable ids and the display names needed for historical rendering. A later
rename, transfer, contract change, or roster cleanup must not corrupt an older
recap. Add typed events for recap creation and acknowledgment.

### Acceptance criteria

- Every completed season enters `SEASON_RECAP` exactly once before `OFFSEASON`.
- Awards, postseason, final rankings, statistics, and season financial close are
  complete when the recap opens.
- Eligibility, graduations, transfer RNG, NIL releases, and portal listings do
  not occur until the player enters the offseason.
- Saving and resuming on the recap reproduces the same page and cannot duplicate
  rewards, awards, statistics, ledger entries, or postseason games.
- The recap preserves historical values after players transfer, ratings change,
  contracts renew, and future seasons advance.
- Football totals agree with V2-003; business totals reconcile with the V2-005
  ledger.
- The forward look contains only information legitimately known before the
  offseason begins.
- The web UI cannot bypass the checkpoint, while CLI and AI flows explicitly
  acknowledge it through the same command.
- Desktop and mobile tests cover champions, non-playoff teams, objective success
  and failure, negative cash, save/resume, archive reopening, and progression
  into the first offseason step.

## V2-007: Expand the transfer portal into a three-to-five-round pursuit

**Status:** Proposed

### Goal

Replace the V1 one-shot portal bid with a short, escalating market in which the
player builds a pursuit, receives feedback, chooses where to concentrate limited
resources, negotiates terms, and can lose or retain a player for understandable
reasons.

The window should normally take four rounds. A player may commit after round
three when one option clearly meets his needs, continue through a normal fourth
round, or remain unresolved for a fifth and final round. No pursuit may resolve
before round three or continue beyond round five.

More rounds must create new information and decisions, not ask the player to
raise the same two sliders five times.

### Round structure

#### Round 1: Contact and portfolio

- The portal opens with public player identity, production, ratings,
  eligibility, asking-price range, and the priorities he is willing to state.
- Programs choose which players to contact and rank those pursuits in their own
  portal portfolio.
- Contact has a real, posted Recruiting Point cost and uses a limited active
  pursuit capacity derived from existing recruiting staff and facilities. It
  cannot be free to contact every listing.
- The incumbent program may contact its own departing player through the same
  market and receives its posted relationship advantage.
- The player responds with an initial interest band and any obvious blocker,
  such as no credible path to playing time or insufficient NIL capacity.

#### Round 2: Pitch and preliminary terms

- A program chooses one primary pitch grounded in real program state: playing
  time, scheme/role fit, development, contender status, location/pipeline,
  visibility/brand, or financial terms.
- The pitch card shows the evidence supporting it. A weak or false pitch does
  not receive full value merely because it was selected.
- Programs may set preliminary absolute NIL terms and increase cumulative
  pursuit effort.
- The player reveals which parts of the proposal matter, where the program
  stands in broad terms, and what must improve to remain viable.

#### Round 3: Visit and shortlist

- Programs decide which limited portal visits or meetings deserve their time.
  A visit is a high-leverage, non-refundable Recruiting Point spend and shares
  capacity with the rest of the portal portfolio.
- The player cuts to a shortlist. Programs receive a status such as **Leading**,
  **Contending**, **Trailing**, or **Out**, plus evidence-backed reasons without
  seeing exact rival bids.
- A player may commit at the end of this round only when one eligible program
  clears both the commitment threshold and a calibrated lead margin.
- Programs removed from the shortlist release NIL and scholarship reservations;
  already spent contact, pitch, and visit resources are not refunded.

#### Round 4: Negotiation and counteroffer

- Shortlisted players communicate a counter or decision pressure: NIL range,
  role expectation, scheme concern, development need, location preference, or
  decision deadline.
- Programs may revise their complete absolute offer, make an enforceable promise,
  hold, or withdraw. A new offer replaces the prior terms; command order never
  stacks several bids into an accidental advantage.
- Most remaining players sign after the simultaneous round-four market resolves.

#### Round 5: Final decisions

- Only unresolved finalists and holdouts enter round five.
- Programs submit a final offer or walk away; there is no additional visit or
  open-ended escalation.
- Capacity-aware deferred acceptance resolves all remaining commitments
  together. A player displaced by another signing may fall to his next eligible
  finalist if that program's offer and guardrails still stand.
- Every remaining listing finishes as signed, retained, withdrawn, or unclaimed.
  Nobody remains stranded in portal state.

### Terms, promises, and resources

An offer may contain:

- weekly NIL commitment;
- cumulative Recruiting Point pursuit effort;
- one primary pitch;
- an optional role or playing-time promise;
- an optional scheme-position promise when the position model supports it;
- the program's priority rank for that player.

NIL is a live reservation and is charged only after a signing; eliminated or
withdrawn offers release it. Lowering or withdrawing established terms may
carry the same visible interest cost as other NIL negotiations. Contact, pitch,
visit, and added pursuit effort represent work already performed and are spent
when used, including when the program eventually loses.

Do not add a separate portal currency. Use Recruiting Points, scholarship
openings, donor/NIL capacity, staff capacity, and financial guardrails the game
already teaches. V2-005 must record signed obligations and any applicable
transaction or contract consequences.

Promises must persist into the next season and have visible fulfillment rules.
A playing-time promise that can be ignored without consequence is not a
negotiation term. Breaking one should affect the player's satisfaction,
retention risk, staff credibility, and future portal pitches through posted
rules rather than a hidden punishment roll.

### Market and information rules

- Every round resolves all programs' valid commands simultaneously.
- Program iteration, command submission order, UI order, and network timing can
  never decide a leader, shortlist, or signing.
- Addressable RNG keys include season, portal round, player, program, and purpose
  so replay remains byte-identical and adding an unrelated pursuit cannot shift
  another negotiation.
- Programs see interest bands, their own terms, and evidence-backed feedback—not
  exact rival scores, private bids, or hidden preference numbers.
- A portal player's established college ratings and production remain public;
  there is no artificial high-school-style potential fog. Uncertain preference
  and negotiation are not permission to hide known football ability.
- The incumbent advantage remains smaller than a recruit's commitment inertia:
  a player who entered the portal is dissatisfied, not an ordinary verbal
  commitment waiting to be defended.
- A program cannot hold more active pursuits, NIL, Recruiting Points, or likely
  scholarship acceptances than its posted portfolio guardrails allow.

### Portfolio and capacity resolution

The player ranks active portal targets rather than treating every pursuit as
independent. When several players are ready to accept the same program:

1. Players propose to programs in their deterministic preference order.
2. Programs tentatively hold their highest-ranked affordable targets within
   scholarship, NIL, Recruiting Point, and player-approved guardrails.
3. Displaced players proceed to their next eligible finalist.
4. The process repeats until no proposal can move.

This extends the V1 capacity-safe deferred-acceptance invariant across multiple
rounds. Early round-three commitments are permitted only when the program can
actually reserve and honor the scholarship and terms; they cannot create a
later over-capacity signing.

### Feedback and interface

- Keep the portal as one board with a visible **Round 1 of up to 5** timeline,
  not five disconnected screens.
- Show a portfolio header with active pursuits, available Recruiting Points,
  spent points, reserved NIL, projected scholarships, visits, and guardrail
  warnings.
- Each card shows the current relationship state, last-round movement, player's
  response, standing terms, next useful action, and why the program is leading
  or trailing.
- Summarize unchanged standing offers so advancing a round does not require a
  maintenance click on every target.
- Provide batch actions for holding terms or withdrawing from eliminated/low-
  priority pursuits.
- After each round, present a concise movement report: commitments, shortlist
  cuts, counteroffers, programs entering or leaving, and resources released.
- Use V2-002 confirmation states for submitted and resolved actions and V2-004
  delegation for optional staff recommendations or guarded automatic pursuit.
- The fifth round must feel like a deadline: show every final term, capacity
  conflict, and fallback before the player commits the portfolio.

### AI and performance

Rival programs use the same round structure, public information, resource
spends, portfolio rankings, promises, and capacity rules. Split portal planning
into round-specific planners so an AI cannot submit final-round knowledge or
actions in round one.

Pre-index rosters, projected openings, active pursuits, reservations, and fit
inputs once per round. A five-round 72-program portal cannot multiply the V1
one-shot market's prior full-roster scan cost by five. Performance targets must
be measured at the supported full league size in both engine and browser.

### Balance targets

- Most serious pursuits receive at least one meaningful response before the
  player is eliminated or signs.
- Uncontested fits can close after round three; ordinary contests close in round
  four; only genuinely close or conflicted decisions reach round five.
- Increasing only NIL should show diminishing returns and should not routinely
  overcome severe playing-time, role, location, or relationship disadvantages.
- Elite, scarce players attract more competition, higher terms, and longer
  negotiations than replacement-level depth pieces.
- The entry pool and asking-price curve must be tuned with the negotiation
  system. A five-round interface is not justified if nearly every listing is
  still an unwanted fringe player.
- Retention, upward transfers, lateral role changes, and depth acquisitions must
  all occur at measurable non-trivial rates.

### Acceptance criteria

- Every portal listing resolves in three, four, or five rounds and never outside
  that range.
- Each round exposes a distinct decision or new information; repeatedly holding
  the same terms requires no busywork.
- Round results and final signings are independent of command and program order.
- Losing programs release live reservations but do not recover resources already
  spent on contact, pitches, visits, or pursuit work.
- Capacity-safe matching prevents aggregate scholarship, NIL, Recruiting Point,
  and guardrail violations when several players choose one program.
- Early signings reserve real capacity and cannot be invalidated by later market
  resolution.
- Feedback never exposes exact rival bids, hidden scores, or private preference
  values.
- Promises persist into the following season and their fulfillment or breach has
  posted consequences.
- Save/resume works at every round without duplicate spends, visits, responses,
  shortlist changes, or commitments.
- Incumbent retention uses the same market and remains meaningfully harder than
  defending an ordinary recruiting commitment.
- AI programs participate in every round under the same knowledge and resource
  rules.
- Deterministic tests cover early commitments, round-five holdouts, withdrawals,
  counteroffers, shortlist cuts, simultaneous capacity conflicts, runner-up
  fallback, broken promises, delegation, and 72-program performance.

## V2-008: Build a real coaching carousel with contracts and vacancies

**Status:** Proposed

### V1 behavior

V1 coaches are not signed to a time frame. A `StaffMember` carries an annual
salary, role, rating, trait, weekly allocation, and scheme preference, but no
contract start, end, remaining guarantee, option, expiration, or departure
terms. The current buyout is a simplified 60% of one annual salary because no
multi-year contract model exists.

The offseason coaching screen is a program-specific replacement list. Coaches
do not reach free agency, decline extensions, retire, get promoted, or leave for
another program. The player or AI can pay to replace an incumbent, but an
incumbent otherwise remains forever. Candidates are generated separately for
each program and post, so they are not unique people competing in one shared
market.

### Goal

Create a league-wide coaching carousel where contracts expire, programs compete
for unique coaches, assistants earn promotions, successful staff can be
poached, vacancies cascade through the market, and the player must respond when
a coach leaves.

The carousel belongs immediately after the season recap and before portal entry.
Staff continuity, scheme fit, recruiter relationships, player promises, and
delegated responsibilities should all be known before players decide whether to
transfer and before programs negotiate with replacements.

### Contract model

Every occupied staff position must reference a versioned contract containing:

- contract id, staff id, program id, and role;
- signed season, start season, and end season;
- annual salary by season;
- guaranteed compensation remaining;
- employer termination buyout schedule;
- coach departure or poaching buyout schedule;
- signing bonus and any performance incentives;
- school or mutual option years where offered;
- extension eligibility and negotiation status.

Use two clearly named buyouts rather than the V1 generic charge:

- **Termination buyout:** money the current program owes when it fires the coach
  before the guarantee ends.
- **Departure buyout:** money owed to the current program when a coach leaves
  early for another job, paid according to the signed terms by the coach/new
  employer model the game adopts.

All salary, bonus, buyout, and settlement payments flow through the V2-005
ledger and forecast. Staff cards must show term, years remaining, annual cost,
guaranteed amount, both relevant exit costs, and the next decision date.

Initial term ranges should be role-appropriate and negotiated rather than fixed:

- head coach: generally three to five years;
- coordinators: generally two to four years;
- strength coach: generally two to three years.

These are starting balance ranges, not correctness invariants. Program stature,
coach leverage, prior performance, security, and market competition affect the
terms a coach will accept.

### Staff positions and vacancies

Separate the persistent **staff position** from the person occupying it. A
program retains head-coach, offensive-coordinator, defensive-coordinator, and
strength-coach posts even when one is vacant. The post stores responsibility and
delegation ownership; the coach stores identity, career, ability, preferences,
and contract.

If a coach leaves, the position becomes visibly vacant and every V2-004
delegation owned by that coach pauses. A vacancy produces posted losses to the
work the position normally supplies; it must not silently retain the departed
coach's hours or modifiers.

The player must replace a departed coach, but the game cannot dead-end if no
preferred candidate accepts. The player may:

- hire a permanent replacement;
- promote a current assistant where role transitions are allowed;
- appoint a named interim through the next decision window;
- leave the post vacant and accept the posted consequences.

If the carousel closes with an essential post unresolved, install a visible
interim baseline rather than secretly generating a permanent coach. The next
season remains playable, but the vacancy and its cost remain part of the game.

### Coach identity, career, and preferences

Coaches become persistent league people rather than program-scoped candidate
cards. Preserve:

- career history and prior programs;
- roles held and promotions;
- scheme preferences, trait, rating, and role-specific aptitudes;
- contract and earnings history;
- performance and development trajectory;
- regional ties and recruiting relationships when those systems exist;
- job preferences and career ambition.

A coach evaluates a job from posted inputs such as role/promotion, compensation,
term and guarantee, program stature, resources, scheme authority and fit,
location/relationships, expectations, job security, staff structure, and other
real offers. A deterministic preference score may include addressable uncertainty,
but the player receives a range and reasons before offering. There is no hidden
coin flip that unexpectedly removes a coach with no warning.

Retirement requires an authored career stage or age model and advance notice.
Until that exists, omit retirement rather than disguising it as random annual
attrition.

### Carousel sequence

The shared market runs in ordered rounds. Standing offers persist unless changed,
so advancing does not require a maintenance click on every post.

#### Round 1: Contract review and retention

- Present every current coach's years remaining, market interest, extension
  eligibility, expected terms, and risk of testing the market.
- Programs may exercise an option, offer an extension, permit interviews, deny
  contact where contracts allow it, fire the coach, or hold.
- Expiring coaches respond simultaneously. An accepted extension removes the
  coach from the market; a rejected or absent extension sends him into the
  appropriate pool.

#### Round 2: Openings, candidates, and interviews

- Publish every league vacancy and the unique available/poachable coach pool.
- Programs build a ranked interview list for each opening within a limited
  search capacity.
- Coaches decide which interviews they will take based on job interest; programs
  receive interest ranges, fit, expected contract terms, and competing-market
  context without exact rival offers.
- Assistants may interview for promotions, including coordinator-to-head-coach
  moves, creating potential downstream vacancies.

#### Round 3: Offers and matching

- Programs submit complete absolute contract offers and rank acceptable
  candidates by post.
- Coaches rank acceptable offers. A league-wide, order-independent matching pass
  tentatively assigns each coach to at most one job and each post to at most one
  coach.
- Early departures, promotions, and poaching payments settle only when the new
  contract is accepted.

#### Round 4: Cascades and secondary market

- Newly opened assistant jobs and programs rejected in round three pursue the
  remaining market.
- Candidates may receive revised complete offers; revisions replace rather than
  stack with prior terms.
- The same matching and affordability rules apply.

#### Round 5: Final hires and interims

- Remaining programs make final offers, promote internally, appoint interims,
  or knowingly carry a vacancy.
- No coach or post remains in an unresolved negotiation state after this round.
- The carousel publishes a league movement summary before portal entry.

### Firing, expiration, poaching, and promotion

- **Firing:** permitted when the rules allow, charges the remaining contractual
  termination obligation, removes delegation ownership, and creates a vacancy.
- **Expiration:** creates no employer termination buyout. The program may extend,
  re-sign in the open market, or replace the coach.
- **Poaching:** another program can hire a coach under contract only when the
  candidate is permitted to leave and the departure terms can be covered. The
  original program receives the stated compensation where applicable.
- **Promotion:** a coordinator or other eligible assistant may pursue a larger
  role. Promotion changes the role and contract but preserves the coach's
  identity and career history.
- **Voluntary departure:** happens only through the visible market and stated
  coach preferences. There is no invisible offseason departure roll.

The incumbent program may counter an outside offer where the contract calendar
allows, but a counter is not guaranteed to win. Relationship, role, authority,
security, and career ambition can outweigh money through posted diminishing
returns.

### Scheme, players, and continuity

Hiring a coach does not instantly and freely rewrite the program. Show before
the hire:

- scheme fit and any proposed scheme authority;
- installation/familiarity loss or transition plan;
- recruiting and regional relationships arriving or leaving;
- player-development and health effects;
- expected portal-retention response;
- staffing and delegation conflicts;
- total contract and transition cost.

Head-coach and coordinator movement must affect portal interest and retention at
the subsequent V2-007 stage through a visible rule. A player promised a role by
a departed coach receives a clear opportunity to reconsider; the game cannot
pretend the promise and relationship still belong to the building.

### Performance evaluation and market demand

Coach demand should evaluate what the coach controlled, not only team wins:

- performance versus roster and program expectations;
- unit improvement and V2-003 ratings;
- development, health, recruiting, scouting, and execution contributions;
- scheme fit and delivery of assigned responsibilities;
- financial cost and contract value;
- championships and high-profile results without making winning the only input.

Ratings may progress or decline from multi-season evidence, role experience,
and age/career stage once supported. Changes must be bounded, deterministic, and
explained in the season recap.

### Interface and notifications

- Show contract term and market status on every Staff card during the season.
- Add extension and expiration deadlines to the dashboard before they become
  emergencies.
- Include staff contract status, likely departures, and evaluation in V2-006's
  season recap.
- Use one league carousel board with filters for role, availability, interest,
  scheme, trait, rating, term demand, and current employer.
- Show the player's openings, ranked candidate lists, competing interest bands,
  complete offer terms, budget/forecast impact, and cascade risk.
- After each round, summarize extensions, firings, promotions, poaching,
  accepted offers, new vacancies, and unresolved posts.
- End with a complete movement log showing where every departing and arriving
  coach went.

### AI, fairness, and determinism

AI programs evaluate extensions, firings, interviews, offers, internal
promotions, and vacancies through the same contract, budget, fit, and matching
rules. They may not generate a private candidate after losing a contested hire.

All offers in a round resolve simultaneously. Program iteration, command order,
screen order, and network timing cannot decide a hire. Addressable RNG is keyed
by season, carousel round, coach, program, post, and purpose. One coach can sign
only one contract, one post can hold only one coach, and every accepted contract
must fit the program's V2-005 forecast and approved obligations.

### Save migration

Existing V1 staff have no contract terms. On V2 save migration, assign each
incumbent a deterministic, visible bridge contract derived from role, salary,
program, and save seed. Do not immediately expire or randomly remove a user's
staff on first load. The migration report should state every assigned term and
first extension date.

### Acceptance criteria

- Every coach has a visible contract term, years remaining, salary, guarantee,
  termination cost, departure cost, and decision date.
- Coaches can expire, reject extensions, be fired, be promoted, or be poached
  through visible deterministic market rules.
- A departure creates a real vacancy, pauses that coach's delegations, removes
  his contributions, and requires a player response or visible interim.
- Unique coaches cannot accept multiple jobs, and unique posts cannot accept
  multiple coaches.
- Carousel matching is independent of command and program order.
- Contract payments, buyouts, bonuses, and settlements reconcile with the
  V2-005 ledger and forecast.
- Coordinator and head-coach changes affect scheme continuity, player promises,
  and subsequent portal retention through posted rules.
- The market can cascade across rounds when one program hires another's coach,
  but every post and negotiation reaches a final state by round five.
- A program that loses every preferred candidate remains playable through a
  named interim or explicit vacancy; no silent permanent replacement appears.
- AI programs participate under the same candidate, information, contract,
  budget, and matching rules.
- Save/resume works in every carousel round without duplicate payments,
  extensions, interviews, offers, departures, or hires.
- V1 migration produces deterministic bridge contracts and no surprise initial
  departures.
- Full-league deterministic tests cover expiration, extension, firing, poaching,
  promotion, counteroffers, cascade vacancies, interims, delegation transfer,
  portal effects, ledger reconciliation, and 72-program performance.

## V2-009: Resolve and show player improvement from offseason training

**Status:** Proposed

### V1 behavior

V1 training camp does not improve player ratings. The player chooses
**Conditioning**, **Balanced**, or **Install**, and the choice only creates a
temporary four-week modifier to opening-season injury risk or scheme execution.
There is no offseason player-development pass, no named improvement result, and
no screen showing which players changed.

### Goal

Make offseason training a visible roster-development event. Returning players,
transfers, and the incoming class should arrive at preseason with attributable
rating changes based on headroom, work ethic, coaching, facilities, development
plan, and camp emphasis. The player must see exactly who improved, which
attributes changed, why the change occurred, and how it affected the team.

This is not permission to add a free annual rating bonus to every player. V2
must define one measured annual development budget across weekly work and
offseason training so camp does not create runaway roster inflation.

### Roster timing

Resolve the full next-season roster before training:

```text
coaching carousel
  → portal
  → signing and scholarship resolution
  → enroll transfers, freshmen, and late fills
  → offseason training plan
  → training resolution and results
  → preseason roster/depth-chart review
```

Graduated, departed, or unsigned players do not train with the program. Incoming
freshmen and signed transfers do. Save migration and lifecycle tests must guard
against the V1 ordering where the recruiting class enrolled only after the camp
choice had already resolved.

### Two connected camp decisions

Preserve the current team-level tradeoff, but distinguish it from player
development.

#### Team preparation emphasis

- **Conditioning:** better opening health and fatigue resilience; less scheme
  installation.
- **Balanced:** moderate health and installation with no extreme.
- **Install:** better opening execution and familiarity; greater workload and
  health exposure.

The temporary opening-week modifiers remain visible and expire according to
their posted duration.

#### Player-development allocation

Give the staff a small number of camp-development slots derived from existing
development coaching capacity, staff quality/traits, and training facilities.
Each slot can fund:

- one individual intensive with concentrated gains;
- one position-room emphasis with smaller gains spread across contributors; or
- recovery/rehabilitation work for an eligible player where the health model
  supports it.

The player may select targets manually, accept V2-001 marginal-benefit
recommendations, or delegate the plan through V2-004. Selecting nobody applies
only the program's baseline offseason development; it must not silently assign
the engine's preferred player without reporting that choice.

### Improvement projection

Before camp resolves, every proposed target shows a range or exact projection
from the same function the engine will use. Factors include:

- remaining potential headroom;
- work ethic;
- experience and remaining eligibility;
- expected rotation opportunity;
- relevant staff contribution, role fit, and teaching trait;
- training facility level and any V2-005 operating investment or maintenance
  limitation;
- individual or room intensity;
- selected development emphasis and position-specific attributes;
- health or rehabilitation restrictions;
- whether the player joined early enough to receive the full program.

Do not directly add an arbitrary number to Overall. Apply gains to the player's
position attributes, then recompute Overall through the same `computeOverall`
function used everywhere else. No player may exceed his potential or rating
caps.

If development contains uncertainty, post the complete projected range and use
addressable deterministic draws keyed by season, program, player, attribute,
and camp purpose. Prefer explainable deterministic factors for the initial
version; do not hide a breakout coin flip behind generic “good camp” prose.

### Development shape and balance

- Most players receive modest baseline gains or no visible Overall movement.
- High-work-ethic players with real headroom should improve more often.
- Individual intensives create the strongest concentrated result.
- Position-room work creates more total roster value but less value per player.
- Veterans near their ceiling should not consume a recommendation merely because
  their current Overall is high.
- Rare breakout gains must be earned by posted factors or a posted projection
  range, remain bounded, and never exceed potential.
- Conditioning and rehabilitation may meaningfully improve health attributes
  without producing a large Overall jump.
- Install work may improve scheme-relevant technique/familiarity and opening
  execution without masquerading as broad athletic growth.

Calibrate offseason and in-season development together. If camp adds meaningful
annual gains, reduce or redistribute weekly growth so the same player does not
receive two full seasons of progression in one calendar year.

### Training results checkpoint

After the engine resolves training, enter a dedicated
`TRAINING_CAMP_RESULTS` subphase before preseason roster review. Do not make the
player infer gains by comparing two roster screens.

The results page includes:

- **Most improved:** the top meaningful Overall gains with before/after values.
- **Attribute gains:** exact changed ratings for each highlighted player.
- **Why he improved:** headroom, work ethic, staff, facility, selected target,
  camp emphasis, and other applied factors.
- **Focused work:** every individual and position-room target and the payoff
  actually delivered.
- **Newcomers:** transfers and freshmen who improved after arriving.
- **Health and readiness:** conditioning, recovery, rehabilitation, and opening
  risk effects separated from football-rating growth.
- **Team effect:** V2-003 Offensive, Defensive, and Overall totals before and
  after camp, including which units moved.
- **Depth-chart impact:** players who now project above someone ahead of them,
  with a link to review rather than silently reordering player-controlled charts.
- **Full roster table:** sortable/filterable before, after, delta, potential,
  focus, and explanation for every eligible player—including zero gains.

The page requires an explicit **Continue to preseason review** action. Preserve
the results in the season/offseason archive so the player can revisit who
developed later.

### Events and data model

Add typed, immutable output equivalent to:

- `OFFSEASON_PLAYER_DEVELOPED` with player id, before/after Overall, exact
  attribute deltas, focus, intensity, and factor breakdown;
- `TRAINING_CAMP_COMPLETED` with team emphasis, selected targets, team-rating
  snapshots, health/readiness effects, and player result ids;
- `TrainingCampSummary` stored for archive rendering;
- an acknowledgment event or command for leaving `TRAINING_CAMP_RESULTS`.

Use stable snapshots for historical display. Later weekly development, injury,
position change, transfer, or rating progression must not alter an archived camp
report.

### Interface and confirmation

- Show available camp-development slots, their source, and the tradeoff between
  individual and room work before selection.
- Reuse V2-001 recommendations but identify them as camp projections, not weekly
  outcomes.
- Use V2-002 green confirmations for settled targets and team emphasis.
- Name the responsible coach and relevant skill; if the coaching carousel left
  a vacancy, show the reduced capacity and projected loss.
- V2-004 delegated plans must remain reviewable, overridable before resolution,
  and attributed to the coach who chose them.
- Report rating and health outcomes separately so “+15% injury protection” is
  not mistaken for an Overall increase.

### AI and full-league behavior

AI programs choose camp targets and emphasis through the same projection,
capacity, roster, coaching, facility, and health rules. They must not receive
automatic development without allocating the same slots and accepting the same
tradeoffs.

Index eligible rosters, position rooms, coaching contributions, and projections
once per program. Resolving and recording player-level offseason gains for a
72-program league must remain within the supported offseason performance budget
and cannot perform repeated full-league scans per candidate.

### Acceptance criteria

- Training camp produces real player-attribute changes and recomputes Overall
  rather than applying a disconnected Overall bonus.
- The full next-season roster, including enrolled freshmen and transfers, is
  eligible before training resolves; departed players are not.
- Every changed player receives an exact before/after event and explanation.
- The results checkpoint shows meaningful gains, zero gains, health effects, and
  team-rating changes before preseason review.
- Individual and position-room work preserve their posted concentration-versus-
  breadth tradeoff.
- No player exceeds potential or rating caps.
- Weekly and offseason development are jointly calibrated and do not create
  long-run rating inflation.
- A coaching vacancy, staff change, facility level, work ethic, headroom, and
  selected emphasis alter results through visible rules.
- Player-controlled depth charts are not silently reordered after gains.
- Manual and delegated selections produce legal, attributable, deterministic
  outcomes under the same rules as AI programs.
- Save/resume before and after resolution cannot duplicate gains or lose the
  archived results.
- Deterministic tests cover freshmen, transfers, veterans at ceiling, injuries,
  individual versus room work, coaching changes, facility differences, skipped
  selections, V2-003 rating effects, archive integrity, long-run progression,
  and 72-program performance.

## V2-010: Show in-season player progression, form, and decline

### V1 problem

The simulation already develops healthy scholarship players during the season.
Weekly development can increase individual attributes, recomputes Overall, and
emits a `PLAYER_DEVELOPED` event with before/after values and the factors that
caused the gain. The current interface, however, mostly shows only the player's
present ratings and projected next payoff. Development events are excluded from
the Inbox, and there is no durable season-opening baseline, weekly trend, or
player development history. A user therefore cannot readily tell who improved,
by how much, when it happened, or why.

V1 also has no permanent in-season skill regression. Fatigue and injury can
reduce availability or effective team strength, but stored attributes only move
upward. That distinction is not visible enough, which makes a tired or injured
player's temporary weakness easy to confuse with a ratings decline.

### Design rule: separate three different concepts

Do not represent all player change with one number. Every relevant screen must
clearly distinguish:

1. **Skill** — durable football attributes and the derived Overall rating.
2. **Readiness** — temporary game-day effectiveness caused by fatigue, health,
   recovery, confidence/form, and current workload.
3. **Potential** — remaining long-term development ceiling and headroom.

Example: `Skill 74 (+1.2 this season) | Readiness 69 (-5 fatigue) | Potential
82`. Temporary readiness penalties must never silently rewrite permanent skill.
Poor game statistics alone must not reduce skill; if confidence/form is added,
it affects readiness and is labeled as temporary.

### Durable progression history

Add an immutable player-development history that does not depend on the capped
general event feed. Capture:

- a preseason or post-camp rating baseline;
- current and season-to-date Overall and attribute deltas;
- material weekly development results;
- injury, rehabilitation, position-change, and other explicit regression
  causes;
- postseason/end-of-season ratings for V2-006 and the player archive; and
- the coach, facility, focus, reps, work ethic, headroom, health, and other
  applied factors behind each change.

Use typed records equivalent to `PlayerRatingSnapshot` and
`PlayerDevelopmentHistoryEntry`. Each history entry should include player id,
season, week/phase, source, before/after attributes, before/after Overall, and a
factor breakdown. Suggested sources are `WEEKLY_TRAINING`, `GAME_REPS`,
`TRAINING_CAMP`, `REHAB`, `INJURY_EFFECT`, `POSITION_CHANGE`, and `REGRESSION`.

Do not store a full copy of every attribute for every player every week across
the entire league. Preserve opening/current/closing snapshots plus material
change entries, and aggregate negligible increments until they cross a visible
threshold. This keeps 72-program, multi-decade saves tractable while retaining
an auditable history.

### In-season development model

- Continue to change real attributes and derive Overall from them; never award
  a disconnected Overall bonus.
- Resolve growth from remaining headroom, work ethic, staff skill, facilities,
  selected focus, practice workload, meaningful game reps, health, and fatigue.
- Show projected gains before the week and actual gains afterward so the user
  can judge whether a coaching choice paid off.
- Accumulate fractional internal gains, but display a rating arrow only after a
  meaningful threshold is reached. Avoid celebrating rounding noise every week.
- Use a derived status such as `IMPROVING`, `STALLED`, `AT_CEILING`,
  `REHABBING`, or `DECLINING` to support filters and explanations; do not make
  the status a second source of truth.
- Calibrate weekly growth together with V2-009 training camp so ratings do not
  inflate simply because the game now exposes both systems.

### Legitimate decline and regression

College-age players should not lose permanent skill through unexplained weekly
randomness. Permanent decline should be uncommon, bounded, recoverable when
appropriate, and tied to a visible cause such as:

- a severe injury with a disclosed lasting effect and rehabilitation path;
- extended missed development or skill atrophy, if that system is enabled;
- a position conversion that changes role-specific Overall while preserving
  the player's underlying attributes; or
- an explicit offseason development outcome with a documented tradeoff.

Do not add generic age decline for normal 18–23-year-old players. A slump,
fatigue, minor injury, or bad performance belongs in readiness/form, not
permanent skill. Never apply hidden negative RNG. The user must receive a notice
with the exact change, cause, expected duration or recovery opportunity, and the
responsible system.

### Interface

- **Roster and depth chart:** show `OVR 74 (+1.2 this season)` with an accessible
  arrow, text label, and color; show readiness separately when it differs.
- **Player profile:** add a progression timeline for Overall and key
  position-specific attributes, plus a chronological explanation of material
  changes.
- **Weekly results/dashboard:** add a compact Player Development result showing
  meaningful improvers, stalled focus targets, regressions, and a link to the
  full report. Completed development choices receive V2-002 confirmation.
- **Development screen:** show opening, current, season delta, potential,
  projected next gain, actual last gain, and why the result occurred.
- **Filters:** support improving, stalled, declining, rehabilitating, and near-
  ceiling views, along with position room and class year.
- **Team ratings:** explain how player changes moved the V2-003 Offensive,
  Defensive, and Overall team ratings.
- **Season recap and camp:** feed the same history into V2-006 season awards and
  V2-009 offseason training results rather than creating disconnected summaries.

### AI and simulation integrity

AI players use the same development, readiness, regression, staff, facility,
and workload rules. AI programs do not receive invisible ratings bonuses. All
outcomes must remain deterministic for the same seed and commands, and a saved
game resumed midseason must reproduce the same history without duplicated gains.

### Acceptance criteria

- A user can see each player's season-opening, current, and season-to-date skill
  values and inspect the causes of every material change.
- Weekly increases displayed in the interface match the underlying attributes
  and emitted simulation results.
- Permanent skill, temporary readiness, and potential are visually and
  mechanically distinct.
- Fatigue, minor injury, form, and a poor game never masquerade as permanent
  ratings decline.
- Any permanent decrease has an explicit cause, exact before/after values, and
  a recovery or permanence explanation.
- A position change can alter role-specific Overall without silently destroying
  the player's underlying skills.
- Development respects potential and rating caps and remains balanced with
  offseason training.
- History survives save/resume, transfer, graduation, and archived season
  review without relying on the capped Inbox/event list.
- Manual and delegated development choices remain attributable to the coach or
  user who selected them.
- UI tests cover positive, zero, temporary negative, and permanent negative
  changes using text/icons as well as color.
- Deterministic and performance tests cover multi-season 24- and 72-program
  leagues without excessive save growth or repeated full-league scans.

## V2-011: Replace prose-heavy screens with a scan-first decision language

### AAA-style review consensus

A simulated review by three senior AAA roles—sports-game UX direction, dynasty
systems design, and UI/content/accessibility—reached the same conclusion: the
problem is not a lack of explanation. The game repeats instruction, current
state, consequence, flavor, and action at equal visual weight. The dashboard
can show up to six briefing cards with a flag, headline, paragraph, and link,
then the weekly hub repeats much of the same information. Players must read the
simulation before they can act.

The target interaction is **scan → choose → confirm → learn**. Preserve the
simulation's depth, but reveal it only when the player requests it or when it is
necessary to make the current choice.

### One weekly command center

Replace the dashboard briefing wall with a **Coach's Desk**. Above the fold,
show exactly one highest-priority **Next Action** and no more than two other
unresolved decisions:

1. **Interrupt:** injury, illegal lineup, expiring deadline, blocked staff plan,
   or material financial danger.
2. **Football:** the highest-leverage preparation, scouting, lineup, or
   development decision.
3. **Program:** the highest-leverage business, recruiting, staffing, contract,
   or investment decision.

This is a display budget, not a claim that the other systems disappeared.
Rank underlying issues by legality and deadline first, then projected material
impact and freshness. Deduplicate issues that refer to the same command or
domain. Put lower-priority choices behind `2 more opportunities` and successful
staff work behind one collapsed `Staff handled 6 items` row.

The dashboard order should be:

- compact institutional health: cash forecast and season objective;
- one dominant Next Action;
- at most two additional `Needs You` rows;
- `Week ready: 4/4` with completed and delegated work collapsed;
- next opponent with V2-003 offense, defense, Overall, and favorite/underdog
  comparison;
- one-line previous-week result; and
- a persistent `Play Week — plan ready` or `Review 1 required item` action.

Remove the full `Around the program` event feed from the dashboard, combine the
duplicated opponent headers, and merge the program snapshot into the top
metrics. Keep news and event history in the weekly recap or Inbox.

### Three information layers

Every recurring decision uses progressive disclosure:

- **Glance:** status, short task name, and one meaningful consequence.
- **Decide:** two or three comparable options with real projected effects.
- **Details:** formulas, uncertainty, factor breakdowns, tutorials, and full
  alternatives behind `Why?`, an expanded drawer, or a deeper system screen.

Do not place design rationale or permanent tutorial prose in the primary flow.
Teach a system fully on first use, dismiss the coaching after acknowledgment,
and leave it available through `Why?` or Help.

### One visual and verbal grammar

Use the same structure for every compact decision:

`Status → Decision → Projected effect → Primary action`

Use a controlled status vocabulary:

- green check + **Done** — committed and saved;
- amber exclamation + **Required** — blocks readiness or loses material value;
- blue spark + **Optional** — upside is available, but skipping is legal;
- gray staff icon + **Delegated** — a named staff member owns the decision;
- red stop + **Blocked** — the action cannot resolve; and
- neutral clock + **Pending** — queued but not yet committed.

Icons and color reinforce visible text and never replace it. Replace idiomatic
critical actions such as `Worth a look`, `Work the phones`, and `Who gets the
extra work` with consistent verbs: **Choose, Change, Review, Set, Scout,
Coach, Spend,** and **Play**.

### Card content limits

Each collapsed decision card contains only:

- status: no more than 2 words;
- title: no more than 5–6 words;
- one number, comparison, or consequence: no more than 12–15 words;
- one dominant verb-led action: no more than 3 words; and
- an optional `Why?` disclosure.

A collapsed card should stay below 22 visible words. The default dashboard
should stay near 120 words total. Expanded explanation is limited to two short
bullets unless the player opens the full system screen. Never repeat a metric in
prose, and never expose an internal unlabeled `importance 65/100` score when an
actual projected result can be shown.

Prefer real-unit comparison chips:

- football: `WIN EDGE +3`, `FATIGUE +6`, `INJURY +0.3%`;
- development: `OVR +0.4`, `HEADROOM +12`, `READINESS -2`;
- business: `CASH +$180K`, `FANS -120`, `RISK Medium`; and
- changes: `Current → Proposed`, `Cost / Gain`, or `Now / After`.

If the engine cannot know an exact result, display a range and confidence rather
than false precision. All displayed projections must come from the same engine
logic that later resolves the choice.

### Example rewrites

| Current prose pattern | Scan-first default |
| --- | --- |
| “Nobody is getting extra coaching this week…” | `Required · Player development` / `Unused this week` / **Choose player** |
| After choosing Aaron | `Done ✓ · Player development` / `Aaron Caldwell · Technique` / **Change** |
| “31 recruiting points are sitting unspent…” | `Optional · Recruiting` / `31 points unspent` / **Spend points** |
| “You're charging well under what this program can get…” | `Ticket price` / `$28 current → $39 market` / **Review price** |
| “Your staff has one priority nobody has claimed…” | `Required · Weekly priorities` / `1 slot open` / **Set priority** |
| “You know nothing about Saturday's opponent…” | `Required · Scouting` / `No report · vs Alabama` / **Assign scouts** |

The separate Development screen becomes progression history and advanced
analysis. The weekly extra-coaching choice has one canonical entry point, shows
only three recommended candidates, and offers `Browse roster` for full control.

### Guided, Standard, and Advanced presentation

All modes use the same simulation rules, information boundaries, and commands:

- **Guided:** staff recommendations are preselected; show at most one exception
  and one opportunity, with `Accept plan & play` as the dominant action.
- **Standard:** default Coach's Desk with one to three recommended decisions.
- **Advanced:** the same front door plus `Full control` access to exact ratings,
  probability ranges, alternatives, formulas, locks, audit history, and batch
  controls.

The player can change presentation globally or by domain. This setting changes
presentation and default authority, never difficulty or simulation outcomes.

### Delegation and cadence

Integrate V2-004 so delegated work disappears when it succeeds. Automatic
domains appear only in the collapsed staff digest unless a guardrail blocks the
choice, a vacancy pauses it, a deadline requires player authority, or projected
downside breaches a user-set threshold.

Use a predictable cadence:

- **Weekly, 30–60 seconds:** review exceptions, accept/change the staff plan,
  and play.
- **Every four weeks or on a material threshold:** business forecast review;
  do not manufacture a slider chore when the recommendation has not changed.
- **Milestone windows:** deeper recruiting, portal, coach carousel, contract,
  facility, season recap, and offseason decisions.

After the same manual choice is repeated two or three times, offer `Use this
policy for the season`; never increase staff authority silently.

### Confirmation and learning through results

After a selection, update the card immediately and retain its V2-002 state:
`Done ✓ · Aaron Caldwell · Technique`. After the week resolves, show one compact
`Your calls mattered` strip with up to three causal outcomes, for example:
`Scouted Coastal · Readiness +1.8` or `Raised tickets · Cash +$92K · Attendance
-740`. Link to the detailed recap rather than flooding the dashboard or Inbox.

This closes the decision/results loop and allows setup copy to remain short.

### Accessibility, mobile, and controller behavior

- Interactive targets are at least 44×44 px throughout the app.
- Every state has text and an accessible name; nothing important is hover-only.
- Selection confirmation uses `aria-live="polite"` and retains focus.
- Tab/D-pad order is status → decision → action → details.
- Mobile keeps status, consequence, and primary action visible; `Why?` opens a
  full-width sheet.
- Add global `:focus-visible`, forced-colors support, reduced-motion support,
  200% zoom coverage, and testing with 30% copy expansion.
- Controller prompts appear only when a controller is active.

### Implementation direction

Create a pure projection equivalent to
`weeklyCommandCenter(state, pending, delegationSettings, presentationMode)`
that returns required interrupt, football decision, program decision, handled
count, readiness, and typed actions. Build one reusable compact `DecisionCard`
and shared `OutcomeChip`. Existing full screens remain the deeper management
layer.

Add telemetry before tuning rank thresholds: time to identify the next action,
time to advance, expanded `Why?` use, staff-plan acceptance, abandoned screens,
and whether players can distinguish required from optional work.

### Acceptance criteria

- In a five-second dashboard test, at least 90% of players identify the next
  required action and whether the week is ready.
- At least 80% of first-time players complete a normal week without assistance
  in under 90 seconds and reach Week 2 without external help.
- A settled returning player can accept the staff plan and advance in two clicks
  and under 20 seconds.
- No more than three unresolved decisions appear above the fold, and each has
  one primary action with no mandatory paragraph.
- The same underlying decision never appears twice in the weekly flow.
- Completed and delegated work does not consume the unresolved attention count.
- A novice can resolve any dashboard alert with one navigation action.
- Every visible payoff and risk comes from the resolving engine projection;
  uncertain results use ranges and confidence.
- Guided, Standard, and Advanced produce identical outcomes for equivalent
  commands, while expert detail remains reachable within one extra interaction.
- Required, optional, done, delegated, blocked, and pending remain distinct in
  grayscale, forced-colors mode, keyboard, controller, touch, and screen reader.
- The complete weekly loop works at 390 px width and 200% zoom without
  horizontal scrolling or hover dependence.

## Open V2 design questions

- Should the combined `DB` room become distinct cornerback and safety roles?
