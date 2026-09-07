# September 2026 implementation reconciliation

Date: 2026-09-07. B00 documentation deliverable. Baseline: `69793f3be66cd1468c28e2f661d4858123d83c1d`. This is a source and dependency audit, not a new playthrough or a declaration that existing features meet acceptance.

## Decision and current status

The [core specification](CORE_GAME_SPEC.md) governs product direction: an approachable, phone-first program business game centered on uncertain talent, staff, and investment. Preserve the existing deterministic simulation, knowledge boundaries, accounting integrity, and save protections while simplifying the player's work. The [graphics specification](design/GRAPHICS_SPEC.md) replaces the large-banner art direction with people, compact comparisons, original marks, and readable investment feedback.

The execution ledger validates: **0 of 18 V2 targets complete**. **W0 / ARCH-001 — Unify decision, projection, resolution, and audit contracts** is both active and the exact next eligible production target. No explicit blockers or ordering waivers are recorded. All later waves remain dependency-closed. The ledger's most recent evidence is dated August 20; it records approved weekly-business AI work but leaves development, media, recruiting knowledge boundaries and system-wide lifecycle adoption open. Those historical test results were read, not rerun for this document.

Proceed with a bounded sponsorship-feedback slice inside ARCH-001 and the separately isolated B02 visual prototype described below. Neither task completes ARCH-001, B01 as a whole, or the production navigation redesign.

## Sources and authority

Read completely for this reconciliation:

- [Core specification](CORE_GAME_SPEC.md), [implementation backlog](IMPLEMENTATION_BACKLOG.md), and [graphics specification](design/GRAPHICS_SPEC.md).
- [V2 acceptance specification](V2_FIXES.md), all 2,120 lines, read in overlapping chunks.
- [Execution ledger](V2_EXECUTION_STATUS.json), including every target, evidence record, dependency, waiver field, and change-log entry.
- `C:/Users/joshb/.codex/skills/college-legends-v2-manager/SKILL.md` and its complete `references/operating-model.md`.

The operating model places current explicit user direction first. Therefore old instructions to expose exact potential or emphasize a Coach's Desk do not override the new product direction. However, the new core spec and backlog expressly preserve unresolved architecture gates. Product adaptation does not itself record a dependency waiver or establish completion.

## All V2 targets mapped

**Keep** means retain the requirement. **Adapt** means preserve its useful foundation while changing product presentation or scope under the new specification. **Defer** refers to proposed product scheduling only; this document does not write the ledger's `deferred` status. Every acceptance change must be reconciled in the V2 specification before the affected target is implemented or certified.

| Wave and gate | Target | Disposition under current direction | New backlog connection and limits |
|---|---|---|---|
| W0, active; no prior wave | ARCH-001 — decision/projection/resolution/audit | **Keep.** Canonical lifecycle, legal commands, bounded knowledge, and causal records are prerequisites for honest simple screens. | B01 feedback slice fits now. Reuse the existing six-state model; do not create a second status engine for the new visual labels. Remaining planner and all-surface coverage still required. |
| W0; ARCH-001 | ARCH-002 — migration/replay/parity/performance | **Keep.** The annual investment cycle needs durable saves and measured full-league behavior. | Foundation for B06 and all mechanic changes; B14/B17 add broader balance/device evidence. Existing isolated tests do not complete this target. |
| W1; W0 | FIN-001 — ledger/cash/obligations/forecast | **Keep and adapt accounts.** Financial truth is central, with school cash, outside NIL funding, and player earnings separated. | B06, plus B01 forecast correctness when eligible. Simple display can summarize detailed accounting; no duplicate money creation. |
| W1; FIN-001 | FIN-002 — dynamic core P&L/operating plan | **Keep and simplify interaction.** Explain revenue sources and recurring obligations; standing policies replace repeated sliders. | B06/B08. Existing media-rights calculations must be inventoried before new contracts replace or supplement them. No double-counted rights income. |
| W1; FIN-002 | FIN-003 — complete business loop and strategy evidence | **Keep.** Wins create opportunity, not guaranteed profit; at least three viable strategies require measured evidence. | B13/B14 share annual-loop evidence. Their placement in the new backlog does not currently unlock W2 early. |
| W2; W1 and FIN-003 | UX-001 — live checklist/Coach's Desk | **Adapt.** Home replaces the coaching-centered identity; keep at most three unique material items, a clear action, and reliable lifecycle feedback. | B03 production shell. B02 is illustrative design evidence only and cannot satisfy this target's live or human-comprehension criteria. |
| W2; UX-001 | POS-001 — DB split into CB/FS/SS | **Keep existing approved direction; defer execution until gate opens.** Role detail can remain in drill-downs. | Missing explicit B-item mapping is a backlog gap. Do not silently delete this approved migration or calibrate new ratings against an incompatible future model. No position counts chosen here. |
| W2; POS-001 | RAT-001 — team and matchup projections | **Keep and adapt prominence.** Shared truthful ratings stay; detailed matchup preparation is optional. | B03/B04/B12. Never expose latent talent through matchup explanations; distinguish measured ability, temporary readiness, and uncertain future development. |
| W2; UX-001 and RAT-001 | UX-002 — shared UI/accessibility/telemetry | **Keep and adapt visual language.** Use Home, Players, Staff, Business, League with compact cards and focused detail navigation. | B02 studies components; B03 integrates; B15/B17 verify humans/devices. Controller, forced-colors, localization and screen-reader criteria remain unproved, not silently waived. |
| W3; W2 | DEV-001 — marginal-benefit development recommendations | **Adapt.** Estimate useful development opportunities without exposing exact hidden ceilings or claiming guaranteed gain. | B04/B05. Coaches handle standing work; recommendations compare outcomes, uncertainty, and opportunity cost rather than requiring weekly 95-entry selection. |
| W3; DEV-001 | DEL-001 — delegation pilot | **Keep and simplify default flow.** Named coaches execute standing approaches within visible authority and limits. | B05. Preserve manual overrides, guardrails, legal parity, and paused responsibility when staff leave. No silent unlimited spending authority. |
| W4; W3 | DEV-002 — skill/readiness/potential/history | **Adapt.** Durable identity and progress are the emotional center; skill/readiness remain separate, but future potential is a scout estimate. | B04/B10/B12/B14. Old exact-potential displays must change. Persistent histories must survive departure; wellbeing is neither public diagnosis nor a hidden universal performance penalty. |
| W4; DEV-002, FIN-003, RAT-001 | REC-001 — season recap phase | **Keep and simplify presentation.** Snapshot the completed season before offseason mutation; concise verdict and changes, optional details. | B12/B13. Avoid duplicate staff setup. A visual result mock cannot establish lifecycle idempotence or save-safe history. |
| W5; W4 plus REC-001/ARCH-002/UX-002 | MKT-001 — shared simultaneous market | **Keep shared invariants; defer expanded rounds in the first product slice.** Capacity, replaceable standing offers, legal matching, and immutable resolution remain essential. | B11 builds on current calendar; advanced rounds move to later expansion. Current ledger still requires this target before COACH-001; formally resolve scope before implementation. |
| W5; MKT-001 | COACH-001 — contracts/vacancies/carousel | **Adapt and stage.** Hiring and coordinator comparison are core; begin with understandable contracts/standing approach. | B05 covers smaller staff work; E04 expands outside offers and relationships. Five-round cascading market is not necessary to the proposed first slice, but its existing target is not completed or erased. |
| W6; W5 and COACH-001/MKT-001 | PORTAL-001 — three-to-five-round pursuit | **Defer expanded round design; keep retention/capacity/accounting needs.** Current core explicitly retains the existing portal calendar for the first slice. | B11 improves existing lifecycle; E04 may add promises and richer negotiation. Old minimum-three-round acceptance directly conflicts with first-slice scope and needs an explicit spec/ledger amendment before rescheduling. |
| W6; PORTAL-001 and DEV-002 | CAMP-001 — offseason improvement | **Adapt.** Attribute changes, eligibility order, health effects, and history stay; staff-led plans and compact payoff replace repeated setup. | B05/B12/B13/B14. Latent headroom remains internal; visible expectations use knowledge-bounded estimates. Keep joint weekly/annual growth calibration and no duplicate gains. |
| W7; W6 and FIN-003/DEL-001/CAMP-001 | FIN-004 — expanded business/governance | **Adapt and split scope.** Local rights, a single facility project, and one merchandise campaign are now proposed early product essentials. | B07–B09; E02/E03/E05/E06 expand media/events/capital/challenges. Complex debt and governance are deferred. Current W7 gate remains closed; moving bounded commercial systems earlier requires a recorded roadmap amendment, not this mapping alone. |

## Product conflicts to resolve before the later production work

1. **B03 versus W1/W2:** the new backlog places production shell work before the financial season gate; UX-001 explicitly depends on FIN-003. B02 can explore the shell now without real state. Before B03, update the affected specification/dependency record with a concrete scoped decision, retaining accounting and command protections. No bypass is needed for today's ARCH-001 slice.
2. **Knowledge presentation:** V2-009/010/011 examples expose exact potential/headroom and sometimes exact projected development. Current direction requires estimates, uncertainty, and no hidden-value leak. Revise those acceptance interpretations in the source specification before implementing their target; debug truth is not player knowledge.
3. **Portal and coach calendar:** V2-007/008 prescribe extended rounds and staff movement before portal entry; the first slice retains the current calendar. Keep current behavior until a versioned lifecycle change is deliberately scheduled. Do not relabel a one-shot bid as a completed multi-round system.
4. **Business feature ordering:** moving media, facility projects, and merchandise ahead of W7 is desirable under current product scope but not yet an execution waiver. Propose a bounded prerequisite split after the shared ledger exists; separate it from later debt/governance instead of bypassing financial truth.
5. **Position model:** POS-001 remains an approved dependency absent from B00–B17. Add its explicit placement when reconciling the later production sequence; retain legal roster and migration evidence. Simplifying phone UI is not grounds to silently remove an existing simulation commitment.
6. **Presentation vocabulary:** graphics labels such as Scheduled, Active, and Complete are player-facing descriptions of domain facts, not additional `DecisionStatus` values. A pending sponsor acceptance can be “Scheduled”; an accepted contract is “Active”; a failed acceptance is “Blocked.” Contract expiry and fulfillment are separate from command completion.
7. **Validation thresholds:** new novice tests and a 45-second routine-week target supplement the old V2 comprehension/accessibility gates. Do not replace the stricter old measures through an undocumented status change. Physical iPhone evidence is still required before any iOS-readiness claim.

## Smallest safe next production slice

**Sponsor selection feedback across Home/dashboard and Finances, within ARCH-001 lifecycle adoption.**

Observed source evidence:

- `apps/web/src/App.tsx`, `ProgramDashboard`, receives committed state and the weekly-priority in-flight command, but no `pendingCommands`.
- `packages/simulation/src/briefing.ts`, sponsorship branch, reports no primary sponsor from committed state alone.
- `apps/web/src/App.tsx`, `Finances`, independently finds a queued `ACCEPT_SPONSORSHIP` and changes its button copy. Thus the department can show a queued choice while the dashboard still requests a sponsor.
- `apps/web/src/weekly-priority-decision.ts` demonstrates a shared typed lifecycle projection. `packages/model/src/index.ts` defines canonical `DecisionStatus`; `packages/simulation/src/decisions.ts` owns the lifecycle transition table and command identity helper.

Implement one sponsorship decision projection, consumed by the dashboard and finance control, using committed contract state, relevant queued commands, and applicable rejection/audit evidence. Scope by program and season. Show the selected sponsor and the actual settlement timing. A queued command is not signed, paid, or durably saved merely because it appears in React state. An active contract must not be displaced visually by stale or invalid queue entries. Keep canonical status values and command/audit identity; do not introduce UI-only account balances or a parallel projection engine.

Required evidence for the slice:

- No sponsor: correct available action; unrelated-program commands have no effect.
- Queued valid offer: the same sponsor and pending state on both surfaces, without contradictory missing-sponsor warning or false cash change.
- Successful advance: actual active contract shown from resolving state.
- Rejection/stale offer: explanatory blocked or unavailable state, no false active contract; a later valid selection can recover.
- Navigation, normal reload behavior, active-contract save/resume, and season expiration behave honestly according to persistence scope.
- Accessible visible status text, focused behavior/UI checks, and targeted worker/projection tests; no changes to costs, RNG, sponsorship settlement, or save schema.

The complete ARCH-001 target remains open afterward. Turnover correction, forecast arithmetic, career wording, overtime, and camp balance are other B01 work, not implied by this slice. Rules changes require their own evidence and specification.

## B02 graphics prototype boundary

The backlog explicitly permits B02 after B00. Build original code-native layouts with fixed illustrative data for Home, Player profile, Staff comparison, Business investment, and Results. Use the specified warm neutral/ink/deep-blue grammar, small team marks, jersey fallbacks, and labeled progress graphics. Include uncertain talent, separate school/player money, a meaningful investment cost, and compact results. Five production destinations and these five prototype compositions are related but not identical; Results is a flow screen, not a sixth permanent destination.

Isolate the prototype from simulation state, worker commands, and existing saves. Label illustrative data and inactive actions. Navigation and local comparison toggles may work, but a Hire/Invest/Advance illustration cannot imply an actual game transaction. Do not expose or rewrite a user's save to populate the demo.

Capture phone and desktop screenshots and inspect narrow width, text expansion, keyboard focus/order, contrast, and required-action visibility. B02's own visual/accessibility evidence should be recorded by its implementer. No portrait mass production is warranted before this visual grammar is reviewed; use original editable marks/jerseys now. This is concrete graphics work without inventing unsupported commercial mechanics.

## Evidence recorded in this reconciliation

| Check | Observed result |
|---|---|
| `python C:/Users/joshb/.codex/skills/college-legends-v2-manager/scripts/validate_v2_status.py docs/V2_EXECUTION_STATUS.json` | Exit 0: ledger valid; 0/18 complete; W0 active; exact next eligible ARCH-001. |
| `git rev-parse HEAD` | `69793f3be66cd1468c28e2f661d4858123d83c1d`. |
| `git status --short` at orientation | Existing edits in README/design/roadmap documents, three new specification documents, and unrelated `.codex-offseason-fix/`; preserved. |
| Full specification/ledger/operating-model reading | Every V2 target mapped above; no status inferred from code presence. |
| Focused source inspection | Confirmed existing lifecycle helper/model, missing dashboard pending input, and independent sponsor queue display in Finances. |
| Programmatic target-ID coverage and repeat ledger validation | All 18 ledger target IDs occur in this document; validator still exits 0 with ARCH-001 next eligible. |

No game code or execution ledger is changed by this document. No fresh gameplay, regression, balance, native-device, or human-pilot pass is claimed here. The coordinator records subsequent implementation and verification evidence separately.
