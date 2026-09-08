# Client journeys and visible results

Date: September 7, 2026.

Status: historical proposal. See [Agency progression and player development](AGENCY_PROGRESSION_AND_DEVELOPMENT.md) for the current September 8 direction: money, prestige, discovery, recruiting competition and agent-arranged player development. The visible-results and history principles below remain useful, but this note is not the current implementation plan. The playable at the time of the original discussion was commit `db217d1`.

## User priority

The user wants each client to have recognizable progression, comparable to the demos, production, releases, sales, tours and festivals of an artist's career. Their concern is that the agency game barely makes results visible. Earlier constraints still apply: build into the current demo and avoid overcorrection.

Make the client file answer four questions: What are we trying to achieve? What have we completed? What is happening now? What result or decision comes next?

Each stage should produce an inspectable result, useful information or a consequential choice. Completing a purchase or waiting another week is insufficient by itself. Routine work advances with the existing calendar; gates require attention when cost, scope, timing or direction can change.

## Structure

Give each client one current career goal, chosen with the client, and compact journeys beneath it. Surface the most relevant football and commercial work together. Scouting, development, deals and professional preparation remain detailed workspaces reached through the client file.

The journeys can overlap. Games continue while training and commercial work are underway. A client already starting does not need to repeat an 'earn a start' stage. A player with strong local earnings has a valid successful career even without a professional contract. A missed goal changes the plan while preserving completed work.

### Development journey

Assessment → development plan → work underway → progress report → game evidence → review the next goal.

- Assessment records the player's current role, ability, health, playing opportunity and researched uncertainty.
- The plan specifies the provider, focus, duration, investment and reason for the choice.
- Progress and completion reports show measured changes, remaining gaps and workload. Retain them after the project ends.
- Game evidence records actual participation and production. A training improvement does not guarantee a start, touchdown or win.
- At review, continue developing, change support, recover, or consider a school move in the appropriate window.

Tangible outputs: scouting assessment, development report, first-start record, game report, season review.

### Commercial journey

Audience and opportunity → proposal → agreement → campaign preparation/delivery → results and payment → renewal or next opportunity.

- A regular opportunity may be available immediately. A recorded standout performance can create an additional offer. A breakout is not required for every commercial career.
- Show which evidence qualifies this player: audience, school reach, existing relationship or a particular game.
- Proposals disclose client earnings, agency commission, activation cost, workload and deadline before commitment.
- Initially, delivery progress uses the existing campaign duration. Add a separate preparation or launch decision only when it produces a real deliverable or changes scope, cost, schedule or results.
- A later campaign-builder extension could create an agreed brief and content preview, followed by launch, audience response and a settlement. Audience, sales or production-quality statistics require corresponding simulation; do not invent them for presentation.
- Results retain the exact client payment, agency commission, costs and margin. Guarantees remain guaranteed; uncertain bonuses remain estimates until resolved.
- A larger campaign is a possible next step with visible requirements, not an automatic reward for completing a smaller one.

Tangible outputs: media profile, sponsor proposal, signed agreement, delivery record and earnings statement. Campaign previews and audience reports are future extensions requiring underlying mechanics.

### Next-chapter journey

Season review → compare eligible options → choose a route → prepare → receive an outcome → revise or continue.

Routes:

- **Return to school:** eligibility and role review → return decision → next-season plan → new football and NIL opportunities.
- **School move:** identify the need → compare schools and playing opportunity → choose an available move → enroll → review actual role, production and commercial impact.
- **Professional attempt:** career assessment → preparation → Pro Day report → draft or undrafted opportunities → tryout/roster outcome → continuing representation or another decision.

The existing demo supports a simplified preseason school move, not a coach-negotiation market. School talks, interest and formal offers must be simulated before becoming stages. The agency coordinates support and commercial representation; coaches and teams determine football opportunities.

Tangible outputs: options comparison, return/transfer decision, preparation report, selection/offer result and career review. An undrafted outcome opens its supported alternatives rather than erasing ambition or marking the entire client journey as failed.

## Client presentation

Replace the generic next-step block with a compact career plan:

1. **Goal:** what this client wants now.
2. **Latest result:** one meaningful completed milestone, with its report.
3. **Working on:** current work, delivery time and committed cost.
4. **Next decision:** a relevant action, or an honest waiting state and expected date.

Use a vertical journey on phones. Expand a stage to see its evidence and history. Reuse the same records in the weekly recap. Keep the next action bound to the selected client when opening another workspace.

Use explicit statuses: Completed, In progress, Awaiting a game, Available now, Opens Week X, Possible later, Paused, Expired, Not chosen, Unsuccessful. Calendar time alone cannot mark a client outcome as achieved. Display measurable progress such as client NIL received toward a goal; avoid percentages suggesting certainty of professional success.

Illustrative layout, not a new observed result:

> Miles Ellis · Goal: earn the first NIL payment  
> Completed · Development report available  
> Completed · First start recorded  
> Completed · Standout game attracted an offer  
> In progress · First campaign, one week until delivery  
> Next result · Client payment and agency commission, under signed terms  
> Possible later · A larger campaign if its requirements are met

## Ideas retained for later design

The following were discussed and should inform journeys; they are not all approved implementation commitments:

- Personality: ambition, loyalty, risk tolerance, professionalism and temperament. Learn them through scouting and conversations. They can influence preferred plans, reactions and relationship choices without becoming a universal good/bad score.
- Client chemistry and collaborations.
- Local, regional and national fanbases, including transfer consequences.
- Signature NIL campaign building.
- Representation terms and renewals that evolve with success.
- Named specialists, compatibility and later staff delegation.
- Agency-hosted offseason events.

Visible progression takes priority over adding these as separate feature menus. Chemistry belongs in collaboration choices; fanbases in commercial evidence; specialists in project plans; renewals in career reviews; events in later commercial opportunities.

## Evidence and simulated review

Three independent simulated AI specialist roles reviewed the current source: UX/interaction, systems/game loop, and UI/content/accessibility. No external developers were contacted and no new player study was performed for this assessment.

Observed evidence:

- `apps/web/src/agency/model.ts:1257`: development already changes ability, public profile and fatigue weekly.
- `apps/web/src/agency/model.ts:1283`: completed jobs produce prose with final totals and are then removed from the active jobs array; durable structured development reports and baselines are absent.
- `apps/web/src/agency/GameplayPanels.tsx:141`: client ambitions currently emphasize a percentage and completion reward.
- `apps/web/src/agency/AgencyGame.tsx:1150`: the next-step area exposes general department navigation rather than a connected sequence of this client's decisions.
- `apps/web/src/agency/gameplay.ts:695`: actual game results can already trigger sponsor offers, providing an existing causal connection to extend.
- `apps/web/src/agency/model.ts:1292`: campaigns settle with a real client/agency payment split.
- `apps/web/src/agency/model.ts:1465`: recaps preserve news, game boxes and career results, offering an archive to reuse.

Group verdict: connect actual results into branching client journeys, retain completed work, and focus attention on the next meaningful decision. Confidence is high in the source findings and medium in expected usability benefits pending a prototype/playtest.

| Dimension | Current assessment | Target | Reason |
| --- | --- | --- | --- |
| Next-action clarity | 3/5 | 5/5 | Actions exist, but the client file does not prioritize the next relevant step. |
| Feedback and learning | 2–3/5 | 5/5 | Results appear in separate areas; development completion loses its structured project record. |
| Cognitive load | 3/5 | 4/5 | Existing screens can remain, with the client plan directing navigation. |
| Simulation honesty | 4/5 | 5/5 | Future progression must preserve uncertain roles, selection and alternative routes. |

These scores are design assessments, not telemetry. Reviewers differed on whether the first prototype should start with development or commercial work. Combine the two through one client's existing development → game evidence → opportunity → campaign → payment sequence. The prototype must also demonstrate an unsuccessful or delayed branch so its milestones do not imply guaranteed success.

## Priorities and acceptance

**P1 — Durable result records.** Preserve project identity, client, dates, chosen provider/terms, starting snapshot, measured effects, commitments, actual payments and links to relevant game/ledger records. Distinguish direct training effects from later game results. Existing saves retain their history; missing old baselines are labeled unavailable rather than reconstructed from current values.

**P1 — A client plan and derived stage states.** Combine ambition, current work, latest result and next decision. Stage availability derives from the same eligibility, calendar, capacity and financial rules as the action. Preserve all existing paths and controls.

**P1 — Causal result feedback.** Join a recorded game to the offer it actually generated and the resulting signed campaign/payment. Do not claim that any training purchase caused a particular win or score. Reuse these records in the client history and recap.

**P2 — Mobile presentation and cadence.** Use a compact vertical list with progressive disclosure, readable status text, keyboard focus and touch targets of at least 44px. Routine weeks resolve through the existing advance action without mandatory stage acknowledgments.

Acceptance criteria for the first prototype:

1. A new player can identify the client's goal, current stage, latest result and next action within five seconds; target four of five participants in a small comprehension test.
2. Every completed training block and campaign has an inspectable result after reload and year rollover.
3. Every historical number is stored evidence; every forecast is labeled and derived from resolving logic.
4. A paused/injured client, expired offer, college return and unsuccessful professional attempt each retain earlier accomplishments and expose valid next steps.
5. Football and commercial work can overlap without forcing all clients through the same sequence.
6. A settled week requires no extra approvals. Any new stage decision changes cost, scope, risk, timing or direction.
7. The journey works at 320px width and 200% zoom without horizontal stage scrolling, color-only status or hover-only information.

Recommended implementation slice: one client plan, persistent development/campaign receipts and a connected training-to-payment history inside Clients and Weekly Recap. Add richer production, campaign-launch and audience mechanics only after this progression is clear.
