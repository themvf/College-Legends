# Game Design

## Core experience

The player runs a fictional college-football institution across weeks, seasons, and decades. Every major system competes for the same finite resources: cash, staff capacity, time, scholarships, attention, facilities, and reputation.

## Weekly rhythm

A normal week contains:

1. Review inbox, forecasts, injuries, finances, and deadlines.
2. Issue commands: recruiting actions, training assignments, staffing decisions, depth-chart changes, spending, and preparation.
3. Advance the week.
4. Resolve contested markets and weekly systems.
5. Receive structured results, explanations, and new decisions.

During the season, games become the flagship weekly event. Offseason phases emphasize eligibility turnover, recruiting, transfers, staffing, budgets, and preparation.

## Foundational systems

### Eligibility and roster pressure

Eligibility is a first-class domain concept, not a label derived from age.

The model must represent annual cohorts, seasons enrolled, seasons participated, remaining eligibility, redshirt availability and use, games played, scholarship status, walk-ons, portal status, graduation, and exhausted eligibility.

Roughly a quarter of a mature roster should turn over each year. Recruiting is therefore both improvement and replacement. Scholarship limits and position needs prevent the player from simply collecting every desirable prospect.

Exact rule values must be fictionalized/configurable and validated against the intended game experience rather than hard-coded throughout the engine.

### Recruiting and scouting

Programs discover high-school prospects, junior-college players, transfers, and other sources. Scouting reveals estimates with uncertainty around ability, potential, work ethic, durability, academics, personality, scheme fit, marketability, and transfer risk.

Programs issue commands into a contested market. All valid actions concerning the same prospect are evaluated together. Processing order must never determine the winner.

Recruit interest should combine understandable primary effects—opportunity, program recognition, staff relationships, scheme, geography, facilities, investment, and playing-time path—with bounded modifiers and uncertainty.

### Player development

Development is constrained by potential, age/experience curve, coaching, work ethic, facilities, plan, role, health, and fatigue.

Primary drivers should use weighted additive terms with explicit units. Multipliers are reserved for genuine amplifiers or constraints and kept in narrow, clamped ranges. A weak factor should not silently nullify every strong choice.

Development events should expose structured contributing factors so the UI, tests, and balance reports can explain changes.

### Coaches, staff, and schemes

Programs hire head coaches, coordinators, position coaches, and eventually executives and department staff. Fit among personnel, scheme, teaching, recruiting, leadership, and organizational capacity matters more than a single overall number.

Coaching and transfer markets require the same explicit contested-resolution architecture as recruiting.

### Game resolution

The initial engine will be possession-level: deeper than one strength roll, far smaller than play-by-play.

A game contains approximately 20–28 possessions. Each possession uses offensive and defensive unit ratings, quarterback quality, scheme matchup, field position, fatigue, home advantage, coaching, turnovers, and explosive-play variance.

Initial outcomes include touchdown, field goal, punt, turnover, turnover on downs, and missed field goal. This should produce credible score distributions, comebacks, and upsets while keeping player attributes and runtime manageable.

Possession-level resolution is a starting commitment. It can become more detailed only if testing shows meaningful player decisions require it.

### Finances

Revenue can include tickets, media, merchandise, sponsorships, donors, events, camps, licensing, retail, and conference distributions.

Expenses can include staff, recruiting, development, travel, facilities, inventory, marketing, insurance, legal costs, debt service, retail, media operations, and taxes.

Investments create both benefits and recurring obligations. A facility can improve recruiting and development while burdening cash flow for years.

The current concept allows an eight-year financial failure window so deliberate investment is possible while sustained insolvency remains a real failure condition.

## Expansion systems

These follow only after the core loop is proven:

- Merchandising, inventory, suppliers, pricing, and licensing
- Ticketing, schedules, rivalry events, camps, combines, and showcases
- Media contracts, owned media, audience growth, and recognition
- Departments, executives, delegation, capacity, and forecast quality
- Facilities, loans, construction, maintenance, and insurance
- Legal cases, settlements, compliance, and taxes
- Historical records, awards, eras, and institutional legacy

## AI programs

Rival programs create the market and must receive design attention equal to the player-facing systems.

AI should use the same command types as the human program. Difficulty should primarily alter information quality, planning horizon, risk tolerance, and decision noise—not unexplained resources or silent outcome bonuses.

AI must evaluate roster needs, recruiting targets, staff, schemes, budgets, debt, development, injuries, transfers, schedules, and expansion.

## Events and history

Processors emit structured events with stable IDs and values, not prewritten prose. Events support weekly summaries, notifications, explanations, debugging, analytics, and selected historical records.

The game is not fully event-sourced. Current state remains authoritative for loading; persisted events explain significant changes. Event retention must be deliberate: important events persist, routine detail can be summarized, and history must remain queryable rather than an undifferentiated log.

## Balance philosophy

Formula values are disposable hypotheses until simulation evidence supports them. Correctness rules belong in unit tests. Statistical behavior belongs in committed multi-season baselines with explicit tolerances.
