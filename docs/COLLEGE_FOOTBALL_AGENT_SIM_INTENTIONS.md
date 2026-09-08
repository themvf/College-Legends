# College Football Agent Sim — Design Intentions

Date: September 8, 2026

Status: New product direction and design intent. This document describes what we intend to build, not features already implemented. It supersedes the school-management premise for this new direction. Existing prototypes remain reference material; reuse code only when it supports this game.

## The game we want to make

Build a sports agency by discovering overlooked football players, earning their trust, investing in their development, negotiating opportunities, and sharing financially in their success.

The inspiration is the experience of CD Market: find someone unknown, decide how much to invest and whom to hire around them, watch their career develop, and use the returns to grow a business. There should be many consequential choices around a manageable number of people.

The player runs an agency, not a college football program. Schools, coaches, schedules, games, conferences, and professional teams form the surrounding world. They create opportunities and constraints without requiring the player to manage rosters, call plays, or operate stadiums.

The emotional payoff is: “I believed in this player before anyone else did, helped them succeed, and built my agency with them.” Success is uncertain. A client may never become a star, and an expensive investment can fail.

## Start small

Begin with a modest operating reserve, a basic office, and limited staff capacity. The first meaningful choice is a player to approach for representation—not seven management screens of setup.

The first-year target is approximately three to four clients. Introduce them gradually, allowing the player to understand the first relationship before filling the agency. Starting cash, exact capacity, and prospect availability require balancing.

Keep the calendar, client performances, rankings, and competition visible from the start. Unlock advanced services and business opportunities through milestones. Simplicity means presenting choices at the right time, not stripping away their consequences.

## The core loop

1. Discover prospects and decide which information is worth buying.
2. Approach players and negotiate representation around their interests.
3. Allocate agency money and staff attention to development and commercial opportunities.
4. Follow performances, relationships, reputation, and changing professional prospects.
5. Negotiate NIL, endorsement, appearance, and licensing opportunities where appropriate.
6. Fund preparation for the professional transition, including Pro Day packages.
7. Navigate the draft, undrafted signings, tryouts, and roster decisions.
8. Collect agency income, retain relationships, and finance the next recruiting class.

Money, time, client trust, and reputation connect these steps. None should operate as an isolated minigame.

The current priority is discovering overlooked talent, competing to sign clients, and investing in their development. Money funds the agency and measures financial progress; prestige unlocks services and opportunities. Both remain visible as ongoing goals. Separate ability, opportunity and fame so specialist training, school fit and commercial support have different purposes. See [Agency progression and player development](AGENCY_PROGRESSION_AND_DEVELOPMENT.md) for the September 8 direction, first implementation scope and provisional victory targets. The earlier pitch-production and client-journey documents are historical proposals, not the current core-loop specification.

## Clients are people, not interchangeable investments

Each client has a recognizable identity, position, college, career stage, current ability, uncertain potential, performance history, and commercial profile.

Clients also have personalities and priorities: financial security, privacy, development, family proximity, winning, public recognition, or a professional career. Representation conversations and service choices should respond to those priorities.

Trust depends on delivered service, honest expectations, compatible opportunities, and attention. A large agency may offer prestige but little personal attention; a small agency may win a client by being the better fit.

Development is not guaranteed. Workload, fatigue, confidence, injuries, coaching environment, and support can affect outcomes. Sensitive wellbeing scenarios should offer meaningful support choices and avoid treating a diagnosis as a simple failure statistic.

The agency advises and negotiates. It does not control college playing time, team selection, professional scouting decisions, or the client's personal choices.

## Development, specialists, and collaboration

Translate CD Market's studio, producer, and collaboration choices into football services with different strengths, costs, availability, and compatibility.

- Position specialists address specific technical weaknesses.
- Strength and performance coaches support relevant physical preparation.
- Training facilities provide different equipment, expertise, and environments.
- Media and interview coaches support communication and public obligations.
- Recovery and medical support help readiness without guaranteeing health.
- Compatible training partners can support preparation; commercial collaborations can expand an audience.

Budget, duration, timing, staff attention, and client fit should affect outcomes. The most expensive option must not automatically be best. Paying for testing preparation cannot simply turn an ordinary football player into an elite one.

## Pro Day and professional preparation packages

Professional preparation is a major annual agency investment, made before the return is known.

Offer understandable package starting points with optional adjustments, rather than forcing every expense to be configured individually. Proposed components include:

| Component | Decision |
| --- | --- |
| Training environment | Local preparation or a more expensive specialist facility? |
| Position coaching | Which weakness is worth addressing, and with whom? |
| Combine / Pro Day preparation | How much should testing and execution receive? |
| Interview preparation | What support fits this player's needs? |
| Travel and accommodation | Which opportunities justify the cost? |
| Recovery support | How should readiness and workload be managed? |
| Professional-team outreach | Where should limited agency attention be directed? |

Scouting helps estimate whether investment can materially improve a client's prospects. Reports narrow uncertainty; they do not reveal guaranteed ceilings or draft outcomes.

Before confirming a package, show total cost, payment timing, cash remaining, operating runway, and realistic uncertainty. Projected professional income is never displayed as available cash.

## The first class does not need a star

A credible first-year outcome might be:

| Client | Outcome | Agency consequence |
| --- | --- | --- |
| One | Selected in the seventh round | A modest return and a valuable drafted-client credential |
| Two | Undrafted, then signs with a professional team | A smaller initial opportunity with further upside if retained |
| Three | Undrafted, receives a tryout | More decisions about time, travel, and continued support |
| Four | Undrafted, no immediate offer | No immediate professional income; an uncertain next step |

This represents one drafted player and three undrafted players, one of whom obtains a signing. Being undrafted and being unsigned are different states.

Such a class should be capable of funding another year if the agency controlled expenses and earned suitable income along the way. It should not guarantee survival after reckless spending. Balance around modest successes, not an assumed first-round pick.

## Revenue and continuing professional relationships

Separate client earnings from agency earnings. An endorsement's headline value belongs to the client; the agency receives its agreed compensation. Track agency-funded expenses separately, and make any reimbursement arrangement explicit.

For the game, use a clearly disclosed fictional, accelerated professional-transition payout system. Higher draft positions can create larger agency returns, while undrafted signings and roster milestones provide smaller but meaningful returns. Do not present these payouts as actual regulated agent commission practices.

Proposed payment milestones:

1. A professional contract is signed: an initial agency payment.
2. The client makes a roster: a further payment.
3. The relationship continues: ongoing agency income and future opportunities.

Avoid paying twice for the same contractual entitlement. The precise draft-linked formula, commission structure, payment schedules, and professional-career length remain balancing decisions.

A client can remain with the agency into the professional years. Continuing income from earlier clients helps finance new college prospects. Professional careers can be simulated at a lighter level to preserve focus; becoming successful should not require micromanaging every former client every week.

Retention is earned rather than permanent. Clients may renew, renegotiate, retire, or leave. Contract and termination rules must be visible; rivals cannot silently erase a signed agreement.

## Five competing agencies

The player agency competes with approximately five persistent rival businesses: two established leaders, two mid-sized agencies, and one fellow newcomer. These are additional to the player's agency.

The names below are working fictional names.

| Rival | Starting position | Strength and behavior | Opening for the player |
| --- | --- | --- | --- |
| Summit Sports Group | Established leader | Prestigious client history, broad professional contacts, and resources for expensive preparation; prioritizes elite prospects | Overlooked clients may receive limited personal attention |
| Crownline Representation | Established leader | Strong brand relationships, media capability, and major commercial packages | Commercially quiet players may prefer a more personal development approach |
| Fieldhouse Partners | Mid-sized agency | Regional scouting relationships and careful development investments | Limited reach outside its strongest recruiting areas |
| Northstar Athlete Management | Mid-sized agency | Selective professional preparation and strong specialist relationships | Less capacity for a large client class or extensive commercial service |
| First Step Sports | Fledgling agency | Similar starting scale to the player; hungry for undervalued prospects and early credentials | Limited cash, reputation, staff, and ability to absorb failed investments |

These are starting strategies, not permanent rankings. Rivals can grow, lose clients, overinvest, change priorities, or struggle financially. The player should be able to overtake the newcomer, compete with the mid-sized firms, and eventually challenge the leaders.

### How competition becomes playable

- Multiple agencies may pursue the same prospect, creating a decision about scouting quickly, improving an offer, or walking away.
- Prospects compare service fit, trust, attention, agency credibility, and financial terms—not only the highest spend.
- Rival commitments can compete for finite specialist availability and selected commercial opportunities.
- Agencies earn reputations from client outcomes, delivered promises, and professional transitions.
- A rival's successful class can make next year's recruiting harder; a neglected client may become open to new representation at an appropriate contract decision point.
- The agency leaderboard provides a persistent comparison and a reason to care about rival news.

Rivals should operate under meaningful cash and capacity limits. Their different starting resources are visible advantages, not permission for unlimited spending or arbitrary outcomes. Avoid automatic poaching events that ignore the player's relationship work.

Show public evidence of competition: announced signings, client results, awards, draft classes, and reputation. Private rival cash balances and unrevealed scouting information should not become magically exact knowledge.

Suggested public comparisons include clients represented, drafted clients by round, notable undrafted signings, client retention, commercial reputation, and agency prestige. Any revenue estimates must be labeled as estimates.

## The surrounding football world

The football simulation supplies evidence and opportunity. Preserve the information football fans expect:

- Weekly recaps centered on agency clients, with wider league headlines.
- Client box statistics and game results, with clear links to their season history.
- School records, conference standings, playoff progress, and championships.
- Weekly awards, annual position honors, and a fictional national player trophy.
- Changing professional draft projections, labeled by round, pick, and uncertainty.
- Actual draft results, undrafted offers, tryouts, roster decisions, and career history.

Distinguish a projection from a completed result. Strong statistics, testing, positional demand, health, and professional evaluations can provide different signals. Publicity should not automatically become football ability or a guaranteed selection.

The player follows this world; they do not need to operate every part of it. Schools retain control of team football decisions. The agency's business concerns its own clients and services, not a school's stadium operations or conference television rights.

## Weekly recap as the main feedback loop

Every advance should explain what changed and what needs attention:

1. How each client performed, with relevant box statistics.
2. Development progress and wellbeing or relationship concerns.
3. Changes in recognition, awards, and draft outlook, with understandable reasons.
4. Deal progress, obligations, and approaching preparation deadlines.
5. Cash received, expenses paid, outstanding payments, and remaining runway.
6. Rival signings or outcomes that matter to the agency.

Use concise summaries with optional detail. The recap is essential gameplay feedback, not a decorative news screen.

## Failure, financing, and growth

Operating costs continue while scouting and preparation investments wait for a return. Losing a client or missing an expected signing can expose an overextended agency.

Loans may provide a lifeline, but must show interest, payment dates, total repayment, and consequences of default. Borrowing cannot erase poor economics. Insolvency can end the career and require a restart, with a clear account of what caused the failure.

Growth should add useful capabilities: scouting coverage, client capacity, negotiating expertise, marketing support, legal support, and access to better services. Hiring creates recurring costs as well as opportunities. Delegation should reduce routine work as the client portfolio grows.

The long-term challenge is to start small, become established, and remain successful while rivals adapt and valuable clients move through their careers.

## Presentation and iOS direction

Use a recognizable agency office as the home scene. Staff, clients, meetings, preparation activity, and career mementos should make progress visible. Start modestly and let the office change with the business.

Original character art, readable client cards, clear money flows, strong touch targets, and short contextual copy are priorities. Aim for the attachment and visible activity of CD Market without copying its assets or reproducing desktop modal stacks on a phone.

Proposed destinations: Agency, Clients, Scouting, Development, Deals, Pro Preparation, Football World, Competitors, and Finances. Group standings, awards, draft boards, and historical charts beneath relevant destinations rather than demanding a separate top-level tab for everything.

## First playable scope and acceptance

Build one connected agency year with three to four client places and the five rival agencies. It must extend through the draft and undrafted signing period into the next year's budget.

The playable is successful when a player can:

- Sign an overlooked prospect while understanding why that prospect chose them over alternatives.
- Make meaningful service and budget choices that have observable consequences.
- Read weekly recaps and box statistics to follow that client's development.
- Earn commercial income with client and agency money accounted for separately.
- Choose a professional preparation package with visible cost and risk.
- Experience drafted, undrafted-signed, and unsigned outcomes.
- Receive understandable agency payments and use them to finance another class.
- See rival agencies compete, succeed, and fail through persistent decisions.
- Retain a professional client without taking on an entire professional-team management game.
- Lose the business through sustained financial mistakes and understand why.

Do not expand the feature list at the expense of this connected experience. Do not silently remove recaps, statistics, commercial systems, or relationship history when changing the interface.

## Open design decisions

- Starting reserve, monthly operating costs, and first-year calendar position.
- Representation terms, client departure rules, and expense reimbursement.
- Exact preparation packages and specialist capacity constraints.
- Fictional payout amounts and timing, including undrafted paths.
- How much professional-client management remains active versus delegated.
- Financing availability and insolvency rules.
- Simulation depth needed to support credible statistics and draft evaluation.

Before implementing real-world contractual or eligibility details, verify the applicable rules and clearly separate them from intentional fictional game mechanics. Use fictional players, agencies, schools, leagues, teams, and awards throughout.
