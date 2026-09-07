# College Legends — ordered implementation backlog

Date: 2026-09-07. Status: implementation sequence for the [core specification](CORE_GAME_SPEC.md). Graphics requirements live in [GRAPHICS_SPEC.md](design/GRAPHICS_SPEC.md). Existing code is a starting point, not acceptance evidence.

First slice delivered: B00 [reconciliation](RECONCILIATION_2026_09.md), B02 interactive design preview for visual review, and a bounded B01 sponsor-feedback fix within ARCH-001. See [implementation and verification evidence](design/PROTOTYPE_REVIEW_2026_09.md). B01 and ARCH-001 remain incomplete; later production dependencies are not unlocked by the prototype.

## Repository starting point

Inventory is based on source inspection and the September 7 annual playthrough; it is not a complete regression audit.

| Area | Starting evidence | Disposition |
|---|---|---|
| Calendar, games, eligibility | `packages/simulation/src/index.ts`, `game.ts`, `rotation.ts` | Keep; verify correctness and rollover |
| Sponsor/ticket economy | `business.ts`, `economy.ts`, `boosters.ts` | Reuse; simplify views and reconcile cash |
| Scouting, recruiting | `scouting.ts`, `index.ts`, `apps/web/src/Recruiting.tsx` | Redesign knowledge and list/detail workflow |
| NIL and portal | `nil.ts`, `portal.ts`, model contract types | Reuse calendar; extend money/retention lifecycle |
| Staff and preparation | `installation.ts`, `priorities.ts`, `App.tsx` | Keep hiring; replace recurring manual setup with standing execution |
| Facilities/departments | `department.ts`, model and simulation commands | Audit current modifiers; adapt to project/cost model |
| People and stories | `stories.ts`, player models, result UI | Add shared profiles and persistent history |
| Saves and workers | `persistence.ts`, web worker, persistence package | Preserve boundaries; add migrations and recovery evidence |
| Art | `apps/web/src/art`, `visual-system.css`, `docs/design/art-masters` | Reuse selectively; supersede large-banner direction |
| Media rights and player campaigns | Broadly described in historical docs | Treat as new work until executable paths and tests are mapped |

## Ordering and existing V2 work

`V2_EXECUTION_STATUS.json` remains the existing execution record. Its inspected W0 is in progress; this document neither advances it nor grants a waiver. B00 must validate and reconcile the ledger before implementation selects a target. The new sequence describes product dependencies; map compatible V2 targets into it and retain unmet architecture gates. If a true ordering conflict remains, record the precise conflict before implementation rather than silently replacing the ledger.

Each item below names a dependency, deliverable, and evidence gate. Complete a phase before expanding scope. Relative size is planning guidance, not a date estimate: S = focused change; M = several connected components; L = cross-system work.

## Phase A — reconcile and establish the new screen language

| ID | Size | Dependencies | Deliverable | Acceptance evidence |
|---|---|---|---|---|
| B00 | M | None | Reconcile current source, released behavior, V2 targets, and this specification; record keep/change/defer map and exact next eligible task | Ledger validator passes; every existing active target has a disposition; no completion inferred from code existence |
| B01 | M | B00; applicable V2 gates | Correct turnover totals, queued-action feedback, inaccurate forecast inputs, and misleading career restart label; review overtime fairness; remove/rebalance dominated camp choice | Targeted resolving-data tests and observed UI states; documented overtime/camp rule change; unaffected seeded scenarios remain stable |
| B02 | M | B00 | Build code-native visual prototype of Home, Player, Staff comparison, Business investment, and Results using fixed illustrative data | Phone and desktop screenshots; focus/order/text-scale checks; required action visible; mock data and inactive actions labeled |
| B03 | M | B01, B02 | Introduce five-destination shell, shared cards, list/detail navigation, and lifecycle vocabulary in production UI | Every old core action has a reachable route; Back restores state; no horizontal page overflow at 320/390px; no simulation change from navigation |

Phase exit: a readable shell with reliable state feedback. B02 is a prototype, not the playable release. Do not mass-produce portraits or facility variants before its visual grammar passes review.

## Phase B — people, staff, and financial foundations

| ID | Size | Dependencies | Deliverable | Acceptance evidence |
|---|---|---|---|---|
| B04 | L | B03 | Persistent player profile/history and scout assessments of readiness/upside/confidence; redact latent potential | Prospect → roster → transfer → archive identity fixture; no hidden-value leak through UI, accessibility, sorting, AI, or portrait assignment |
| B05 | L | B04 | Staff comparison, contracts, and persistent coaching/development approach with optional expert controls | Changes affect documented channels; plans survive advance/reload; no weekly re-entry; AI follows same costs and limits |
| B06 | L | B01, B03 | Separate school cash, external NIL funds, and player earnings; contract ledger and season forecast | Money conservation/reconciliation fixtures; forecast/settlement parity; expiry/cancellation/insufficient-funds tests; migrated saves reload |
| B07 | M | B05, B06 | One facility project with construction, specific effect, capacity/upkeep, and comparison against cash retention | No modifier before completion; correct upkeep and save recovery; no stacking bypass; measured development comparison |
| B08 | M | B06 | One local media rights package plus existing sponsor/ticket income in a compact Business screen | No overlapping rights sale; correct payment dates; clear gross/net and fixed/variable income; forecast distinguishes home/away weeks |

Phase exit: user can understand a player, hire a coach, and choose a cash-consuming investment with a truthful forecast. Do not tune player growth until the measured effects of staff and facilities are separated.

## Phase C — connect player investment to revenue and risk

| ID | Size | Dependencies | Deliverable | Acceptance evidence |
|---|---|---|---|---|
| B09 | L | B04, B06, B08 | One player merchandise campaign: demand range, inventory, player share, margin, sales history | Bust/breakout/injury/departure fixtures; cash tied up in unsold units; no negative inventory; no double-counted earnings; honest demand uncertainty |
| B10 | M | B04, B05, B06 | Modest workload/preference model and contextual concern with support or workload adjustment | Warning and recovery paths; no forced concern every season; no diagnosis exposed to business screens; support does not guarantee performance |
| B11 | L | B04, B06, B09 | Recruiting/NIL/retention/portal workflow connected to roster needs and obligations | Offer/commit/sign/enroll transitions; capacity warnings before spend; departure handles inventory/contracts; rival and manual parity |
| B12 | M | B05, B08, B09, B10, B11 | Compact result reveal and season archive connecting performance, development, revenue, and material concerns | Win/loss/upset/bye/commitment/negative-cash fixtures; no invented turning point or causality; skippable motion and full details reachable |
| B13 | M | B07, B11, B12 | Complete onboarding, annual review, simplified staff/camp flow, and year-two comparison | Fresh career → season → portal → year two → reload; no duplicate staff setup; user can explain roster and financial changes |

Phase exit: first complete playable investment cycle. A high-variance prospect may disappoint; do not script success to make the slice look rewarding.

## Phase D — prove fun, balance, graphics, and durability

| ID | Size | Dependencies | Deliverable | Acceptance evidence |
|---|---|---|---|---|
| B14 | L | B13 | Seeded multi-season balance harness for growth, scouting calibration, business returns, retention, and AI | Versioned seeds/config/results; tolerances established from inspected baselines; divergent viable strategies; recoverable losses; no cash/popularity runaway |
| B15 | M | B13 | First-time and full-season human pilots | Record comprehension/time/abandonment/attachment; four-of-five initial comprehension targets; qualitative continuation feedback; failures create fixes before expansion |
| B16 | M | B02, B12, B15 | Produce and integrate approved portrait, mark, facility, merchandise, and milestone art families | Asset manifest, original-source provenance, small-screen inspection, compressed bundle sizes, identity stability and fallback tests |
| B17 | L | B14, B15, B16 | Release candidate and device verification | Migration/export/import/interrupted-save recovery; phone memory/advance/rollover baselines; offline assets; VoiceOver, keyboard, text scaling, reduced motion |

First-playable completion requires B17 evidence. A working web preview does not imply an iOS app or native-device approval.

## Phase E — expand only after the annual loop works

Ordered extension targets, all dependent on B17 and prior listed targets where relevant:

1. **E01 — Scout market:** region/position specialties, assignment capacity, costs, and accuracy history. Gate: improved aggregate information, no perfect foresight or repeated-scout exploit.
2. **E02 — Regional/national media ladder:** non-overlapping rights, fixed versus variable deals, term/exposure tradeoffs, and earned newspaper/radio stories. Gate: no duplicate audience monetization or guaranteed positive editorial coverage.
3. **E03 — Appearances and events:** autographs, youth camps, donor events, participant agreement, calendar capacity, fees, and cancellation. Depends on B10 and expanded contracts. Gate: workload and money settle once; delegation prevents repetitive scheduling.
4. **E04 — Richer staff/retention stories:** outside offers, overload, promises, fit changes, and relationship history. Gate: contextual warnings and fair choices; no random punitive popups masquerading as depth.
5. **E05 — Facility portfolio and stadium finance:** specialized projects, upkeep, demand-based capacity, then bounded borrowing. Gate: no universal best build order or unavoidable late-game inflation.
6. **E06 — Explicit challenge modes/career continuation:** choose board pressure and financial recovery rules; same-world job changes if validated. Gate: transparent terms, preserved history, tested migrations.
7. **E07 — iOS packaging evaluation:** locally bundled web shell prototype, physical-device lifecycle and storage validation, distribution planning. Native technology and release date remain undecided until evidence supports them.

Owned media corporations, retail chains, taxes, lawsuits, detailed playcalling, and large additional staff departments remain deferred. Reintroduce only with a demonstrated benefit that exceeds the attention required.

## Work-item completion contract

- Update model, resolving rules, knowledge-bounded projection, UI, rival behavior, and persistence together when a mechanic changes.
- Include default, selected, scheduled, resolving, resolved, unavailable, and recoverable-error states as applicable.
- Record observed test commands and outputs; do not mark a target complete from a screenshot alone.
- Tests must assert outcomes/invariants, not duplicate implementation arithmetic.
- Separate deterministic correctness from statistical balance and human enjoyment.
- Document rule changes and save transition behavior. Keep original saves recoverable.
- Graphics/UI changes cannot invent revenue, certainty, capability, or player state unsupported by the engine.

## First implementation assignment

Execute B00, then select the smallest dependency-eligible portion of B01 alongside a bounded B02 prototype if its dependencies permit. Deliver the reconciliation map, concrete corrected behavior, and five-screen prototype evidence before adding commercial systems. This prevents another broad graphics pass that leaves the core interaction unchanged.
