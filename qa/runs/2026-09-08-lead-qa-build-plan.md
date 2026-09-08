# Lead QA: next build order

2026-09-08. Planning only; based on the diehard, newcomer, and combined beta reports plus the current local agency source. These were brokered simulated personas, not human tests. Observed decision paths support the priorities below; visual usability and retention remain unverified. Paths below are relative to `apps/web/src/agency/`.

**Priority update after user clarification:** The user identified a missing core loop: offseason school offers, NIL decisions, draft payoffs, and retention. The next core build is specified in [Offseason agency market](../../docs/OFFSEASON_AGENCY_MARKET.md). The five QA items below remain useful supporting fixes, but their original order no longer places request polish ahead of building that offseason. Neither beta persona exercised transfers, and returning clients currently have no comparable representation-renewal contest.

## 1. Let recent support satisfy the recurring coaching appeal

**Observed:** Caleb and Owen received redundant investment requests. **Verified:** `gameplay.ts::weeklyGameplay()` uses request spacing and falls back to Opportunity; it does not consult development records.

**Build:** Before issuing that fallback, check active skill work, completed skill work, and paid request coaching within the existing request cadence. Acknowledge the named work in the existing follow-up/history instead of creating another payment decision for unchanged circumstances. Keep real workload, injury, income, and changed playing-time needs eligible. No new personality system.

**Files:** `gameplay.ts::weeklyGameplay`, `requestText`, `storyAction`; `growth.ts::activeDevelopment` and growth records; `GameplayPanels.tsx::ClientRequests`.

**Accept:** (1) Active/recent coaching prevents the unchanged starting-player appeal. (2) A newly injured or overloaded supported client can still ask for recovery. (3) Without relevant support, legitimate requests retain their deadlines and consequences; answering charges once, and repeated/expired answers are rejected. Verify in `gameplay.test.ts`; add a UI assertion only for changed presentation. **Dependency:** none.

## 2. Surface returning clients' school and NIL decisions before compressing downtime

**Coverage correction:** Neither persona exercised transfers; both retained current starters at their existing schools. Owen's six quiet advances describe that narrow path, not the value of offseason portal activity.

**Verified:** Return/draft choices open Weeks 12–14. Moves execute only in preseason (Week 0), cost $2,500, allow one/client/year, and require completed commitments. `SchoolChoices` is a collapsed comparison in Clients and Development showing destination role, snaps, and local endorsement value. `DecisionDesk` omits school decisions. Returning preserves commission terms and renews annual sponsor opportunities. NIL here means sponsor campaigns; no school/collective compensation bidding or negotiated transfer offers exist in the agency model.

**Build:** At the return decision and offseason handoff, prominently link each returning client's stay/move comparison and explain when a move can execute. In preseason, surface school fit before new NIL/training commitments lock it. Keep staying a valid choice. This exposes existing agency work; competing school offers would be a separate proposed mechanic.

**Files:** `AgencyGame.tsx::SchoolChoices` (317), Clients/Development; `GameplayPanels.tsx::DecisionDesk` (27); `model.ts` career/transfer branches (832/856), `depth`, `dealValue`, `nextYear` (1537).

**Next test / acceptance:** One focused return-to-preseason UI session with a benched client and a returning starter: (1) Find school comparisons without coaching. (2) Compare staying, more snaps at a smaller school, and greater exposure with tougher competition; explain the displayed NIL tradeoff. (3) Move one, retain one, then book next-year NIL; verify quoted cost/role/value, retained earnings/terms, and commitment locks. Unit tests cover transfer rules, renewal and carried school ambitions; persona coverage does not establish discoverability. **Dependency:** this test precedes any skip feature. Compress only subsequently verified empty steps, preserving costs, deadlines, results, and meaningful decisions.

## 3. Explain development results and earned opportunities together

**Observed:** Zero gain said only “reassess”; performance-point goals were hard to connect to box scores. **Verified:** Training already models uncertainty, missed sessions, workload, and limits; `StatLine` omits existing `Box.points`.

**Build:** Record an honest outcome explanation and one relevant next option: missed sessions, workload constraint, limited assessed headroom, or ordinary variability. Do not invent a diagnosis or reveal hidden exact potential. Clarify immediate request coaching versus a targeted block. Put individual performance points beside recap stats and link earned sponsor offers/unlocks to the actual triggering event; never claim training caused a particular game.

**Files:** `growth.ts::resolveDevelopment`, `developmentQuote`; `GrowthPanels.tsx::DevelopmentHistory`; `gameplay.ts::requestOptions`, `weeklyGameplay`; `AgencyGame.tsx::StatLine`, Weekly Recap.

**Accept:** (1) Zero-gain explanations match recorded factors without promising success next time. (2) Recap scores agree with opportunity/milestone checks. (3) Existing gains, costs, fatigue, and reward rules remain unchanged. **Dependency:** none.

## 4. Put financial comparisons where money is committed

**Observed:** Caleb's first deal missed his net-income ambition; Micah's preparation lacked accessible outlook context. Owen's capital loss does **not** establish broken balance.

**Build:** Add client take-home and remaining income ambition to deal quotes. Beside preparation, show the existing researched outlook or assessment action. After payout, surface current overhead runway, known obligations, and one currently available earning action using existing data. Avoid a new finance dashboard or predicted guaranteed draft earnings.

**Files:** `AgencyGame.tsx` Deals, Pro Preparation, Agency; `model.ts::researchedOutlook`, `burn`, `dealValue`; `gameplay.ts::ambitionProgress`.

**Accept:** (1) Quote net matches settlement rounding. (2) Unresearched outlook stays uncertain. (3) Guaranteed receipts and speculative opportunities remain distinguishable. **Dependency:** none.

## 5. Give the first prospect comparison plain reasons to care

**Observed:** Newcomer compared mostly ability and eligibility; diehard found a compelling plan in researched skill weaknesses. **Hypothesis:** Short explanations improve discovery.

**Build:** Add concise, evidence-based opportunity/eligibility descriptions and expandable position/NIL definitions to existing cards; after research, highlight a relative weakness and estimated potential. Keep the full prospect list and current recruiting contest.

**Files:** `AgencyGame.tsx` Scouting, `ScoutingReport`, `FootballProfile`; `growth.ts::playerSkills`; `model.ts::depth`, `potentialRange`.

**Accept:** Unscouted cards reveal no private ratings; researched descriptions match actual skills and opportunity. **Dependency:** none.

**Preserve:** Always-visible money/prestige, local development work, uncertain potential, named rivals, LIGHT/full sponsor tradeoffs, ambitions/referrals, and separate draft/roster outcomes. Preserve all existing uncommitted changes.

**Defer:** Economy rebalancing, new recruiting systems, personality engines, broader football simulation, and V2 expansion. Validate these slices through another focused playthrough before expanding scope.
