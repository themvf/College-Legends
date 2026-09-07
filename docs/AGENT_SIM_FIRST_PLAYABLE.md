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

The new interface uses an original SVG agency office with scouting, client and meeting areas. Client and staff occupancy changes with the agency. Portraits are procedural SVG illustrations; no school-management artwork is used in the agency interface. The interface adapts to phone widths and respects reduced-motion preferences. It remains prototype art, not a final production asset set.

The browser save key is `football-agent-sim-v1`, separate from all prior demos. The previous core-player demo remains at `?core=1`; other earlier prototypes remain at `?enterprise=1`, `?prototype=1` and `?legacy=1`.

## Deliberate limits

- The existing 18-phase season and professional transition remain. Returning to school is optional; the default remains the draft path for this draft-eligible prospect pool.
- Football statistics cover the tracked QB, HB, WR, FS and EDGE players. Supporting roster production remains aggregate.
- The wider professional draft has untracked prospects. This is not a complete professional league or contract simulation.
- Professional follow-up is a simplified annual representation-income and retention model. There is no professional game schedule in this slice.
- Rival financial decisions and client signings are simulated; sophisticated competing offer negotiations, shared specialist auctions and detailed rival expense reports remain future work.
- Campaigns are licensed/contracted opportunities, not a merchandise manufacturing or inventory-management system.
- Legal specialists, transfer negotiations, detailed health narratives, elaborate contract clauses and custom agency naming remain future work.
- The two fictional D-I FBS/FCS conferences share the existing demo schedule and invitational playoff; separate real-world division championships are not modeled.
- All professional payouts are accelerated fictional game economics. They must not be read as actual agent compensation rules.
- The calendar compresses the offseason into labeled career phases while using one operating-cost charge per advance. Economics require further balancing.
- This is a browser playable, published on [GitHub Pages](https://themvf.github.io/College-Legends/), not a native iOS build.

## Verification

Automated coverage exercises representation, commercial accounting, project constraints, complete football seasons, recaps, rival activity, Pro Day bookings, unique draft slots, undrafted paths, roster and renewal income, loans, insolvency, and deterministic save/reload behavior. UI coverage follows first recruitment through a commercial payment and client statistics, and verifies the explicit new-save confirmation.

Browser verification includes recruitment, development, sponsorship and media contracts, the full college season, preparation, draft and undrafted outcomes, the next agency year, and phone layouts.

One browser playthrough recruited three clients, completed training and all three commercial opportunity types, and booked two preparation packages. Micah Ward was selected in Round 7, Pick 27; Owen Hill signed after going undrafted; Miles Ellis received a tryout. Only Micah made a professional roster. The agency entered Year 2 with his retained relationship and $135,668, including $22,000 in continuing professional income. Reopening the game restored that career and its archived client statistics. These are observed outcomes from one run, not guaranteed starting results.
