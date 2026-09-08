# Offseason: the agency's biggest opportunity

Direction clarified September 8, 2026. The offseason should be the season's commercial and career climax. The first playable slice is implemented and tested locally; the broader design below includes future balancing and expansion. It supersedes treating offseason compression as the main improvement. The AAA review skill remains paused.

## Starting point before this implementation

The demo already resolves draft preparation, draft payouts, roster outcomes, returning eligibility, and new annual sponsor campaigns. School moves execute immediately for $2,500 in preseason, with previews of role and local endorsement value. There is no competing school-offer market or negotiated school compensation. Returning college clients retain representation automatically; the low-trust renewal departure in `model.ts::nextYear` applies to professional clients. The two beta personas did not exercise school moves.

## Real chronology and intentional compression

The NCAA's adopted football transfer notification window is January 2–16, with exceptions. That window concerns entry into the portal, not a universal deadline for all transfer commitments. The NFL's published 2027 calendar places underclassman declaration deadlines in January (currently marked tentative), followed by evaluation and the April 29–May 1 draft. Transfer activity and declaration decisions therefore overlap well before draft results. Draft eligibility generally requires at least three years since high school; eligible underclassmen may seek early entry.

Sources checked September 8, 2026: [NCAA adopted transfer legislation](https://web3.ncaa.org/lsdbi/search/proposalView?id=108963), [NFL calendar](https://operations.nfl.com/calendar-events/nfl-important-dates), [NFL eligibility rules](https://operations.nfl.com/calendar-events/nfl-draft/nfl-draft-rules).

Use five **compressed stages**, explicitly representing several real months. Implementation keeps the existing playoff semifinals and championship alongside stages 2 and 3. Stage 4 has separate Pro Day and draft/payday reveals; stage 5 has separate undrafted-offer and roster reveals. Existing per-advance overhead remains. These are not five literal calendar weeks.

| Game week | Main activity | Decisions and payoff |
| --- | --- | --- |
| Offseason 1 — Career review | Assess the season and defend representation | Show client income, goals met/missed, development, role and researched draft range. Learn the client's next priority. Renew or negotiate an at-risk agency agreement before doing the next deal. Review staying, exploring schools, or a draft attempt if eligible. |
| Offseason 2 — Transfer market | Seek interest and compare offers | Remaining-college clients can enter the market. Show current-school retention terms and interested destinations. Negotiate a limited counter using actual competing offers. Eligible clients face the draft-declaration decision using known college options and an uncertain pro outlook. |
| Offseason 3 — Commitments and preparation | Close college agreements; prepare declared clients | Finalize stay/transfer choices before each offer's stated deadline. Arrange role-appropriate development and brand opportunities for college returners; select preparation for declared players. Preserve a no-transfer route. |
| Offseason 4 — Draft and commercial results | Deliver the big career and money reveals | Reveal draft outcomes and the agency's game payout. College clients see signed agreement receipts and relevant commercial opportunities. Display client money separately from agency earnings. |
| Offseason 5 — Next-season handoff | Resolve remaining paths and show what the agency built | Handle undrafted offers and later roster outcomes in an explicitly compressed summer stage. Show retained/lost clients, school destinations, active guarantees, cash and prestige changes, and next-season goals. |

The college and professional branches share a timeline but offer different work. No client must do both. A declared draft client cannot wait for a disappointing selection and then collect a college offer as an automatic fallback. Eligibility and commitment checks must be explicit.

## School offers are actual choices

Offers should depend on the client's recorded season, ability, public profile, position demand, eligibility, and the school's resources. Strong performance raises interest; it does not guarantee a better school or a larger offer. Staying can be the best option. An overlooked bench player can benefit from a smaller stage and more opportunity.

Each comparison shows school/conference stature, projected role and snaps, guaranteed client compensation and payment timing, conditional money, commercial exposure, agency commission, costs, and expiry. Projections must not promise starting jobs. Separate school compensation from third-party sponsor work in the model; any combined headline must show its components and avoid double counting. Proposed figures and contract rules are fictional game economics.

Prestige improves access and negotiating credibility. It cannot create unlimited school budgets or make an unsuitable player desirable everywhere. Start with a small number of relevant destinations and one meaningful counter rather than a screen of dozens of interchangeable offers.

## Keep the client before collecting the reward

Representation and school choice are separate decisions. A client can remain at the same school and hire a rival agent, or transfer while retaining this agency.

At review, show a plain reason for confidence or doubt: promised support delivered, money goal met, fees charged, relationship history, or a concrete rival approach. An unhappy client gets a chance to hear a revised plan or commission offer. Exceptional clients may attract rivals even after a good season, but poaching must be explained rather than an arbitrary surprise. High prestige helps demonstrate credibility; it does not erase broken promises.

Judge the agent on delivered services and advice, not simply team wins. Choosing a lower payout with the client's agreement should not count as failing an unrelated money promise. A departing client produces no new agency-controlled transactions; already earned income remains recorded and existing payment rights follow the actual contract. Resolve loss of representation before awarding commissions on new deals.

## First playable slice and acceptance

Prioritize one returning client's end-of-season review through a stay/transfer decision: an explicit renewal decision, current-school terms, up to two interested destinations, one counter, a commitment, and a receipt showing client money, agency income and next-season role. Reuse existing school, performance, trust, prestige and commission data. Then integrate the existing draft branch into the shared timeline. Exact offer amounts, fees and reward rates require balance work; none are settled here.

Verify with a benched client and a breakout starter: the alternatives differ meaningfully; staying is viable; a lower-stage move can improve opportunity; unfulfilled goals can cause a warned, contestable representation loss; prestige has a visible but bounded effect. Preserve deterministic saves, old-save migration, distinct draft eligibility versus remaining college eligibility, finite offer budgets, deadline resolution, single payment, and no duplicate commitments. Money and prestige remain visible in every phase and result dialog.

Repeat the two-persona playtest on this complete offseason. Consider skipping only genuinely settled periods after these decisions exist and are tested. Broader staff politics, real-time countdowns and a compliance simulation remain outside this slice.

## Implemented September 8, 2026

- A dedicated offseason desk, automatic entry after Week 12, five-stage progress timeline, and decision links throughout the existing UI. Persistent cash and prestige goals remain visible.
- Season review snapshots show sponsor take-home, delivered promises, goal completion and trust. Loyal clients renew; contested clients get a single current-fee, reduced-fee or paid-plan proposal. Prestige affects contested retention. Unanswered contested reviews lose representation at the stated deadline.
- Returning clients can seek a current-school offer plus up to two suitable destinations. School value uses actual production, ability, public profile, position demand and school resources. Comparison separates guarantee, projected snaps, unsigned sponsor estimate, client take-home, agency commission and relocation cost.
- One counter per client, possible offer withdrawal, shared finite school budgets, commitment deadline, staying without a contract, and single-payment receipts. College commitments block conflicting draft/preseason moves. School destinations apply at next-season handoff; school commissions settle this offseason before that season starts.
- The existing eligible draft, preparation, undrafted and roster branches share the timeline. Legacy saves migrate without forcing a missed renewal deadline. Existing campaign commission rights survive client departures.
- Two independent AI beta personas chose actions through root-operated visible browser UI from their prior saves. Both completed 2028 seasons, renewed clients, compared school choices, won counters, signed Mountain Tech transfers, received commissions and verified 2029 starter roles. These were brokered AI sessions, not human testing. Failure and shared-budget branches were covered by automated tests rather than these two successful playthroughs.
- Beta fixes: remove exhausted hypothetical counter buttons, distinguish payment year from playing season, correct legacy draft recap school names for signed transfers, add a free plain-language draft explanation, and show paid commitments clearly in handoff summaries.

Current slice uses fixed guarantees and one negotiation round. Conditional school clauses, broader staff/booster politics, elite poaching against already satisfied clients, and varied market balance remain future work. Both beta runs found the same destination strongest; tuning meaningful competing strengths is a next priority.
