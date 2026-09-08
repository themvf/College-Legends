# College Football Agent Sim — First playable

Built September 7, 2026. This is the new default web demo, based on [the intention document](COLLEGE_FOOTBALL_AGENT_SIM_INTENTIONS.md).

## Playable scope

Start Origin Sports Agency with $100,000 and four college-client places. Approach prospects with a service promise and commercial commission offer. Client cards now show fictional school division and conference, year in school, eligibility including this season, depth-chart role, expected snaps and health. Pay for scouting reports, client meetings and onboarding. Compete against Summit, Crownline, Fieldhouse, Northstar and First Step, each with a persistent strategy, cash budget and capacity.

School reach affects recruiting difficulty, performance exposure and new sponsor guarantees. Role reflects ability against a school standard; actual snaps also account for health and competition among tracked players. Fatigue can limit participation, and occasional short injuries produce missed games with zero production. Signed campaign guarantees remain protected.

The existing client file includes a preseason school comparison: projected role, healthy playing time and the current local endorsement quote. One move costs $2,500 per client each preseason; active campaigns and training block a move. This is a small transfer slice, not a portal auction or coach-negotiation system.

After Week 12 and before Pro Days, clients with more than one eligible season can choose to return. A booked Pro Day package locks the draft path. Returning clients skip the draft, keep their client place and terms, advance a school year and consume one eligible season at annual rollover. New annual NIL campaigns become available; old recaps and payments remain archived. Existing saves migrate with their original final-season draft path; new prospects include Years 3–5. Eligibility is a simplified fictional demo value, not a model of NCAA waivers or current regulations.

Choose training specialists, facilities, partners, duration and intensity. Fulfill development, visibility or financial-security promises. Fatigue, support and delivered service affect trust. Two client-service hires become available at 18 reputation, adding client and project capacity along with recurring payroll.

Negotiate local endorsements, media/podcast campaigns and licensed merchandise. Choose guaranteed fees or lower guarantees with recognition bonuses. Activation costs come from the agency; the client's gross contract payment is separate from agency commission. Each campaign settles once after delivery.

A twelve-week college season runs around the agency. Weekly recaps show client box statistics, training progress, commercial payments, draft-projection changes, awards, rival signings and cash movement. Browse the recap archive, individual game statistics, standings, all game scores, annual awards and the four-team playoff.

Pro Day bookings open after Week 12 and close after the championship. Choose one of three packages, a preparation priority, optional travel and recovery. Phase 15 resolves preparation; 16 resolves the draft; 17 resolves undrafted offers; 18 resolves roster decisions. Undrafted clients can receive targeted outreach before offers. Draft selections among tracked players have unique slots; projections are explicitly uncertain.

Agency income comes from commercial commissions and disclosed fictional professional signing, roster and continuing-representation payouts. A $40,000 bridge loan costs $44,800 at review. Negative cash closes the agency. Continuing professionals can renew for up to four years; clients with trust below 50 leave at renewal. The next class, existing cash, staff, reputation, rival agencies and career records carry forward.

## Presentation and saves

Team and conference profiles now include five-star stature/exposure ratings derived from the fictional school data. The scouting guide explains the scale and separates it from player ability. Client priorities use plain-language labels: improve my game (arrange training), build my name (media/brands), and earn NIL income (deliver a paying commercial campaign). Recognition is presented as public profile.

Unresearched prospects no longer show a draft verdict. Film review costs $1,000 and reveals a broad potential range; the $5,000 player/market assessment adds career-route and commercial information; $25,000 full due diligence narrows estimates and adds current draft evaluation, school alternatives and actual rival signing priorities. Previous research is credited toward upgrades. Old scouted saves retain the first tier. Assessments update with player development and do not guarantee outcomes.

Every pitch opens an accessible result dialog with acceptance/decline, costs, service expectations, next steps and rival position. The last pitch remains reviewable, and the scouting screen identifies previously pitched prospects who subsequently signed elsewhere. Rival reports use the same target ranking as rival recruitment; they are not invented competing offers.

High-school recruiting remains a proposed next extension: a small watchlist of prospects, early research and a transition into the college client pool. A separate high-school league is outside this update. NIL representation and professional sports representation should remain distinct in any future rules expansion; the demo's current professional transition uses fictional mechanics.

The new interface uses an original SVG agency office with scouting, client and meeting areas. Client and staff occupancy changes with the agency. Portraits are procedural SVG illustrations; no school-management artwork is used in the agency interface. The interface adapts to phone widths and respects reduced-motion preferences. It remains prototype art, not a final production asset set.

The browser save key is `football-agent-sim-v1`, separate from all prior demos. The previous core-player demo remains at `?core=1`; other earlier prototypes remain at `?enterprise=1`, `?prototype=1` and `?legacy=1`.

## Deliberate limits

- The existing 18-phase season and professional transition remain. Returning to school is optional; the default remains the draft path for this draft-eligible prospect pool.
- Football statistics cover the tracked QB, HB, WR, FS and EDGE players. Supporting roster production remains aggregate.
- The wider professional draft has untracked prospects. This is not a complete professional league or contract simulation.
- Professional follow-up is a simplified annual representation-income and retention model. There is no professional game schedule in this slice.
- Rival financial decisions and client signings are simulated. Contested pitches now include one final counteroffer; shared specialist auctions, multi-round contract negotiations and detailed rival expense reports remain future work.
- Campaigns are licensed/contracted opportunities, not a merchandise manufacturing or inventory-management system.
- Legal specialists, transfer negotiations, detailed health narratives, elaborate contract clauses and custom agency naming remain future work.
- The two fictional D-I FBS/FCS conferences share the existing demo schedule and invitational playoff; separate real-world division championships are not modeled.
- All professional payouts are accelerated fictional game economics. They must not be read as actual agent compensation rules.
- The calendar compresses the offseason into labeled career phases while using one operating-cost charge per advance. Economics require further balancing.
- This is a browser playable, published on [GitHub Pages](https://themvf.github.io/College-Legends/), not a native iOS build.

## Gameplay expansion — September 7, 2026

Five additions run inside the existing agency, scouting, client, deal and recap screens:

1. **Client conversations.** Up to three requests per client, spaced across Weeks 2–10, react to workload, income and playing opportunities. Each has three disclosed cost/consequence choices, an end-of-week deadline and a follow-up two weeks after the answer. Requests alter fatigue, trust, profile or ability. Ignoring one costs four trust once. Conversations remain in the client file and follow-ups appear in the recap.
2. **Contested recruiting.** After an initial $500 meeting, eligible rivals can reserve $4,000 and a client place. The player gives the agency through the next week to submit one final offer, changing commission, service and an optional $2,500 dedicated planning session. The displayed probability compares both offers; the session is charged only if signed, alongside normal $1,500 onboarding. Rival funds are refunded if the agency wins. A loss, walkaway or missed deadline assigns the prospect to that rival. Reserved prospects cannot be silently signed by another agency.
3. **Breakout sponsor windows.** Actual standout game results in Weeks 2–10 can generate Saturday Spotlight offers, capped at two per client and spaced at least four weeks apart. Choose the full guarantee with two weeks and 14 fatigue, a 60% guarantee with one week and four fatigue, or pass. Activation costs are $1,000/$500. Existing campaigns block overlaps. Client take-home, agency commission and margin are shown before signing; injury cannot cancel a signed guarantee. Offers expire after the next week without a penalty.
4. **Season ambitions and memories.** Clients pursue a starting role, ability improvement, $15,000 of client NIL take-home or a public-profile milestone. A career conversation can change an unfinished ambition to a stronger school with real playing time, carrying that plan into a returning client's next season. Achievement grants eight trust and two reputation once; during recruiting it also provides an eight-point referral advantage when an unrepresented prospect is available. Ambitions and earned memories persist across saves and years.
5. **Senior watchlist.** Three fictional seniors per year can be watched without a fee. A $500 film report reveals an ability range; a $1,500 follow-up opens in Week 6 and adds a priority and potential estimate. They commit to one of three schools in Week 10, then enter next year's college pool. Watching/research contributes up to ten points of initial recruiting interest, with no guaranteed signature. They arrive in Year 1 with four seasons of eligibility; this demo keeps them in college through Year 2. Owned, rival-owned and unrepresented underclassmen carry forward. This is a small pipeline, with no high school season or high school commercial contracts.

The deadline desk stays visible when a request or offer is open. Existing saves gain these systems without resetting money, rosters, matches or archived recaps. The original college scouting tiers ($1,000 / $5,000 / $25,000), five-star school and conference ratings, and professional transition remain available.

## Verification details

The gameplay expansion passed the 100-test web suite and a production build. Focused tests cover request deadlines and follow-ups, rival cash reservations/refunds and capacity, winning/losing counters, one-time sponsor settlements, injury guarantees, ambition rewards/referrals, school-goal carryover, senior research gates, college commitments, early-year draft restrictions and multi-year save persistence.

A desktop/390-pixel phone browser run verified a lost Owen Hill negotiation and a successful Micah Ward counter. Position coaching moved Miles Ellis into the starting role; his Week 4 performance attracted a $22,963 full / $13,778 light sponsor offer. The light campaign paid the client $11,711 and the agency $2,067 in Week 5. Darius Bennett's researched senior profile committed to Mountain Tech, entered the 2028 college class with four eligible seasons and +10 recruiting interest, and survived a browser reload. No browser console errors were recorded during that run.

Automated coverage exercises representation, commercial accounting, project constraints, complete football seasons, recaps, rival activity, Pro Day bookings, unique draft slots, undrafted paths, roster and renewal income, loans, insolvency, and deterministic save/reload behavior. UI coverage follows first recruitment through a commercial payment and client statistics, and verifies the explicit new-save confirmation.

Browser verification includes recruitment, development, sponsorship and media contracts, the full college season, preparation, draft and undrafted outcomes, the next agency year, and phone layouts.

One browser playthrough recruited three clients, completed training and all three commercial opportunity types, and booked two preparation packages. Micah Ward was selected in Round 7, Pick 27; Owen Hill signed after going undrafted; Miles Ellis received a tryout. Only Micah made a professional roster. The agency entered Year 2 with his retained relationship and $135,668, including $22,000 in continuing professional income. Reopening the game restored that career and its archived client statistics. These are observed outcomes from one run, not guaranteed starting results.
