# Development Roadmap

## Operating rule

The next useful evidence is running code and distributions. Architecture changes should answer observed problems, not extend prose indefinitely.

## Milestone 0 — Foundation

Create the monorepo, strict TypeScript configuration, shared linting/testing, and packages for model, content, simulation, AI, persistence, and analytics plus the simulator CLI.

Exit criteria:

- Tests and type checks run from the repository root
- Balance configuration loads from validated data
- Fixed seeds produce repeatable output

## Milestone 1 — Simulation kernel

Implement only the minimum model required to generate programs, players, rosters, eligibility, commands, and events.

Add:

- Annual cohorts, scholarships, walk-ons, redshirts, graduation, and departures
- Addressable partitioned RNG
- Command validation
- Explicit contested-command arbitration
- A simple recruiting market
- Weekly player development
- Possession-level games
- Season calendar and rollover
- Basic AI using the same commands as the human

Deliberately omit React, accounts, media, stores, lawsuits, advanced facilities, and polished persistence.

Exit criteria:

- Command input order cannot change contested winners
- Unrelated random draws cannot shift an addressed outcome
- A league can complete 50 seasons without invalid state
- Eligibility creates sustained roster turnover
- Scores, upsets, ratings, and records are exportable

## Milestone 2 — Balance laboratory

Build the CLI to run multiple fixed seeds and export CSV/JSON for:

- Ratings by position and experience
- Development and decline curves
- Recruiting class strength
- Roster composition and turnover
- Records, scoring, margins, and upset rates
- Program concentration and parity
- AI decisions and unmet needs
- Initial financial distributions when added

Commit a known-good baseline with run configuration, metrics, and explicit tolerances.

Correctness bugs stay in unit tests. Distribution drift uses baseline comparison. Baseline or tolerance changes require an intentional reviewable update.

Exit criteria:

- Obvious runaway or collapsed curves are corrected
- Baseline comparison fails on meaningful drift
- Results are reproducible for compatible versions

## Milestone 3 — Worker and web shell

Create the Web Worker request/response protocol with progress and serialized errors. Let the worker own active state and expose events plus UI projections.

Build desktop-primary React screens for:

- Weekly dashboard and inbox
- Roster and player profile
- Recruiting board and shortlist
- Depth chart and preparation
- Schedule, games, and results
- Basic program finances
- History and explanations

Exit criteria:

- Advancing a week does not block the main thread
- Season rollover reports progress
- Core loop is playable without developer tools
- Tablet and phone can complete essential decisions

## Milestone 4 — Save integrity

Implement the persistence interface and IndexedDB adapter:

- Rotating autosaves
- Manual saves
- Persistent-storage request and status
- File export/import
- Validation
- Ordered GameState and storage migrations
- Recovery tests for interrupted saves

Exit criteria:

- A save survives reload and version migration
- Exported files restore on another browser
- Invalid saves fail safely with a useful message
- The user is warned when persistent storage is unavailable

## Milestone 5 — Private alpha

Invite a small group only after balance metrics are within the accepted baseline.

Measure:

- Whether decisions are understandable
- Whether the weekly/season loop creates momentum
- Where players abandon sessions
- Which events become memorable
- Whether information is too dense or too vague
- Save reliability and performance
- Desktop, tablet, and phone workflow quality

Balance changes continue through validated content data and baseline updates.

## Milestone 6 — Institutional depth

Add systems incrementally, each with headless metrics and player-facing explanation:

1. Finances, debt, and eight-year failure pressure
2. Coaching market and richer AI
3. Facilities and departments
4. Merchandise, inventory, and retail
5. Tickets, schedules, and events
6. Media and recognition
7. Legal, compliance, insurance, and taxes
8. Historical summaries and legacy

A system ships only if it changes meaningful decisions rather than merely adding bookkeeping.

## Milestone 7 — Cloud and iOS evaluation

Add server backup if tester save value and support burden justify accounts and synchronization.

Profile Safari and WKWebView on real devices, build a locally bundled Capacitor prototype, and decide whether the iOS presentation can share the responsive UI or needs a focused mobile layer.

## Immediate first coding slice

The first pull request after these documents should create packages/model, packages/content, packages/simulation, packages/ai, packages/analytics, and apps/simulator-cli with:

- Minimal entity IDs and schemas
- Eligibility rules
- Addressable RNG
- Development processor
- Crude possession resolver
- CLI capable of simulating 50 seasons
- CSV/JSON output
- Unit tests for invariants

Formula constants are provisional until the first distributions are visible.
