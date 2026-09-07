# College Legends — core game specification

Date: 2026-09-07. Status: current product direction; implementation and balance remain unverified unless explicitly evidenced. Based on the user's CD Market reference and subsequent direction on business, staff, uncertain player growth, media, NIL, transfers, scouting, and facilities.

Companion documents: [ordered backlog](IMPLEMENTATION_BACKLOG.md), [graphics specification](design/GRAPHICS_SPEC.md). This specification supersedes conflicting product priorities in earlier vision and roadmap documents. It does not change released rules, existing saves, or the V2 execution ledger by itself.

## 1. The game we are building

College Legends is an approachable college football business and management game. Discover overlooked talent, assemble a coaching staff, invest in the school, and turn uncertain athletic and commercial success into a sustainable program.

The emotional center is following people over time. A recruit can become a star, a dependable contributor, a commercial draw, a costly disappointment, or a late success elsewhere. Better decisions improve the odds; spending never guarantees the outcome.

The reference is the user's experience of CD Market: understandable management, investment in unknown talent, several ways to earn returns, and satisfying long-term growth. Borrow those principles, not its artwork, names, screen layouts, or exact rules. Reference listings: [iOS](https://apps.apple.com/us/app/cd-market-music-label-sim/id6670562960), [developer updates](https://steamcommunity.com/app/4622330/). No hands-on CD Market playthrough is claimed.

### Product rules

- Phone-first interaction, responsive web delivery first; desktop can show more context without gaining exclusive actions.
- Recruiting, staff hiring, and business investment are the primary decisions. Coaches execute routine football preparation.
- Set an ongoing plan, then handle material changes. Repeated form completion is not progression.
- Every investment communicates cost, expected benefit, uncertainty, and time to payoff.
- Athletic contribution and commercial appeal are separate. An excellent lineman can be valuable without becoming a merchandise star.
- Scouting estimates are uncertain. Never expose exact latent potential through text, sorting, AI hints, portraits, or accessible labels.
- Wins help the business but do not guarantee profit. Large businesses create obligations and exposure, not endless free income.
- Support people respectfully. Wellbeing is not a hidden moral score or a purchasable guarantee of performance.
- No energy timers, daily streak obligations, or penalties for time spent away from the app.

### Core loop

Discover talent → hire and invest → advance a week → see football, human, and financial outcomes → adapt and reinvest.

A routine week can resolve with one advance action. An unusual week presents a small set of relevant choices. Optional departments remain available without being marked as unfinished chores.

## 2. First playable scope

Deliver one complete season, offseason, and opening of year two using the existing league engine. The slice must connect these actions:

1. Choose a program from three contrasting recommendations; browse all schools optionally.
2. Meet two players and one roster need; see the opening cash position and season outlook.
3. Evaluate an uncertain prospect and make a recruiting commitment.
4. Compare retaining a coordinator against hiring an alternative.
5. Choose between a development facility project and retaining cash.
6. Select a simple local media agreement and operate ticket/sponsor income.
7. Optionally launch one player merchandise campaign with inventory and a defined player share.
8. Let standing coaching and business plans run; review concise weekly changes.
9. Respond to one workload concern when conditions warrant it; no forced crisis in every career.
10. Compare a retention offer with a portal replacement, then inspect year-two changes.

Controlled QA scenarios guarantee coverage of these situations; normal careers do not guarantee that a recruit becomes a star, a concern occurs, or an investment succeeds. The first slice uses a small catalog of each opportunity rather than many near-identical options.

Defer national media negotiation, autograph/event scheduling, expanded scout markets, complex debt, owned media, retail chains, legal cases, and coaching career moves until the annual loop passes its gates. These remain part of the longer-term direction, not prerequisites for the first useful build.

## 3. People, information, and development

### Player identity and history

One persistent ID and profile follows a player from prospect through enrollment, transfers, graduation, and archive. Show position/year, observed ability, scout estimate, season trend, relevant achievements, and commercial history. Let the user pin a few players. Preserve identity even when the player leaves the user's school.

Default player views show a few relevant attributes; detailed ratings remain accessible. Development comes from training opportunity, coaching, facilities, fit, age/eligibility, participation, fatigue, and bounded uncertainty. An internal developmental limit may exist, but it is not a promise or visible exact ceiling.

### Floors and ceilings

Define floor as a scout's estimate of near-term contribution under stated conditions, not a guaranteed minimum outcome. Define ceiling as plausible future upside, not a fixed destined rating. Reports include confidence, date, evidence, and fit context: “Likely reserve now; possible strong starter; low confidence.” Injury, role, and development can change the assessment.

Better scouting should improve calibration and reduce uncertainty on average. It cannot prevent all busts or identify every late bloomer. Repeated reports must use correlated evidence so repeatedly paying for the same observation cannot reveal hidden truth by averaging independent noise.

### Staff

Retain head coach, offensive coordinator, defensive coordinator, and strength staff foundations. A card shows identity/style, two or three strengths, roster fit, salary/term/buyout, and a comparison with the incumbent. Compare expected unit or development effects with ranges where warranted.

The coach runs a standing approach automatically. Expert preparation is optional. Contracts, coaching quality, and fit create tradeoffs; an expensive coordinator is not a universal upgrade. Evaluate staff through multiweek results and player development, not a single game. Staff workload, satisfaction, and outside interest can later create contextual decisions.

### Wellbeing and trust

Model manageable workload and stated preferences before building a large personality simulation. Football, commercial appearances, and recovery compete for available time. Concerns should have context and proportionate responses: reduce appearances, adjust responsibilities, provide support, or discuss expectations.

Anxiety is not an exploitable negative trait, a public diagnostic label, or an automatic performance penalty. A player's private support details stay outside public marketing and sponsor reports. Support can help without guaranteeing recovery. Avoid fixed “mental toughness” rankings, instant cures, and rewarding the user for deliberately overloading people.

Trust responds to recorded promises and actions. Commercial participation requires an agreement; declining an optional appearance is not automatically disloyalty. Initial implementation should be modest and reviewable, not a collection of random penalty popups.

## 4. The business model

Use an explicitly fictional college sports economy. Do not present its contract or NIL rules as a reproduction of current real-world regulation. Define the rules in-game and keep the model internally consistent.

### Money boundaries

Maintain distinct accounts for school operating cash, external NIL partner funds, and player earnings/obligations. Outside NIL sponsorship is not school revenue. A donor commitment is not spendable cash until its payment settles. School spending on an athlete is recorded separately from external support.

Every transaction records payer, recipient, amount, purpose, contract/campaign ID, settlement date, and related participant IDs. A player's earnings display is a reporting view of transactions, not a second money-creation mechanism. Transfers between modeled accounts balance; external inflows/outflows have named sources or sinks.

For a merchandise campaign:

`school contribution = sales receipts − production − distribution/fees − marketing − contractual player share`

Show units sold, inventory remaining, cash paid, and accrued obligations separately. Inventory consumes cash on purchase; revenue arrives on sale. Do not call gross sales profit. Returns, cancellation, and departure handling must be specified before a contract is offered.

### Revenue and investment systems

| System | Return and driver | Cost/risk | First scope |
|---|---|---|---|
| Tickets | Attendance × realized price; driven by demand, opponent, reputation, schedule | Capacity limits, price sensitivity, goodwill | Reuse and simplify existing model |
| Sponsors | Fixed or performance-linked payments | Contract obligations, expiry, uncertain performance | Reuse; make queued/active state clear |
| Local radio/TV | Small recurring contract and regional audience | Term commitment, rights exclusivity, expectations | One non-overlapping rights package in slice |
| National media | Larger audience and rights income | Higher thresholds, scheduling/appearance obligations | Expansion; no double-selling the same rights |
| Newspaper coverage | Awareness and reputation from events/access | Coverage can be unfavorable; no guaranteed editorial endorsement | Earned coverage story channel, not a broadcast payment |
| Player merchandise | Demand based on appeal, recognition, price, results, loyalty | Inventory, player share, demand decay, departure | One bounded campaign type in slice |
| Appearances/autographs | Local demand and participant agreement | Time, recovery, partner fees, cancellation | Expansion |
| Youth camps/alumni events | Community demand and participant appeal | Staffing, venue capacity, scheduling, operating expense | Expansion |
| NIL agreements | Recruiting/retention appeal and player earnings | Funding capacity, terms, uncertain contribution | Adapt existing recruiting/portal contracts |
| Scouting | Better decisions across future recruiting classes | Payroll, time, region/position coverage | Basic assignment/report first; expanded market later |
| Facilities | Specific development or revenue capacity | Capital, construction time, upkeep, utilization | One staged development project first |

Popularity responds to exposure and performance but differs from ability. Exposure saturates; a small audience cannot be monetized infinitely. Prevent circular cash creation through sponsor-to-popularity-to-sponsor feedback. Distinguish new fans from increased engagement among existing fans.

### Facilities

Weight room supports strength gains; practice facilities support technical training; film facilities support awareness and learning; medicine supports rehabilitation and availability; recovery supports fatigue management; stadium/hospitality adds commercial capacity when demand exists.

Each project has start/completion dates, capital payment schedule, upkeep, capacity, and an explicit modifier applied only while operational. Effects depend on relevant staff and use, respect development limits, and have diminishing returns. Medical support never guarantees health. Stadium expansion does not create attendance by itself. First slice offers one real upgrade choice, not six buildings at once.

### Cash, forecasts, and failure

Show current cash plus season outlook, upcoming obligations, and scheduled home/away revenue differences. Ranges must use known information and state assumptions, not reveal hidden future events. Forecasts and settlement share formulas.

Proposed default: temporary losses are recoverable; worsening finances trigger visible restrictions and restructuring opportunities before termination. Strict board/firing pressure belongs to an explicit challenge setting. Exact insolvency duration, starting budgets, and borrowing limits remain balance decisions. Do not silently replace existing tenure or eight-year design rules in old saves.

## 5. Recruiting, NIL, and transfers

Recruiting is the pursuit of a limited shortlist, with remaining prospects searchable. Present current need, estimate, interest, relevant competition, recurring cost, and next useful action. Standing effort and budget ceilings prevent repeated entry. Offer, scheduled action, verbal commitment, signed agreement, and enrolled player are distinct states.

Retention competes with replacement and other investment. Transfers offer more evidence of past performance, not certainty of future fit. Existing players may value role, relationships, development, location, and compensation differently; the highest payment does not automatically win.

Respect eligibility, roster limits, contract terms, and timing. Warn before an offer can exceed capacity. Define what happens to NIL obligations and commercial inventory when a player departs; do not silently erase liabilities. The portal must show incoming commitments and position needs before bidding, then a clear resolution summary.

The first version uses the existing season/portal calendar. No new transfer window is introduced through UI wording alone. Persistent promises and advanced negotiation can follow after the basic lifecycle is reliable.

## 6. Five-screen information architecture

| Destination | First view | Detail routes |
|---|---|---|
| Home | Week/opponent, cash and outlook, up to three material changes, Advance Week | Result, inbox/history, readiness explanation |
| Players | Roster / Recruit / Transfers; pinned people and needs | Shared profile, scouting, agreements, optional depth chart |
| Staff | Current staff, cost, vacancies or meaningful opportunities | Candidate comparison, contract, standing approach |
| Business | Cash outlook, active earnings, investment opportunities | Tickets, media, sponsors, merchandise, facilities, account ledger |
| League | Schedule, standings, rankings, significant stories | Opponent, game details, season archive |

Business drill-downs are not additional permanent navigation tabs. Settings/save controls remain globally reachable. Use focused list → detail navigation; Back restores filters, scroll, and focus. Advanced statistics never precede the selected player's identity or action.

Advance behavior: show missing blocking requirements with exact destinations; offer safe defaults where valid; do not block for optional opportunities. Display queued actions before resolution, prevent duplicate advance, show worker progress, then open the new result/change summary before next week's work. Bye weeks show development/business changes without fabricated match drama.

Results: score and standout first, measured plan/player changes second, finance summary third. Match statistics and national stories are drill-downs. Do not claim causation that event data cannot support.

## 7. Architecture and compatibility

Preserve the platform-neutral model/simulation, addressable RNG, worker boundary, and validated persistence foundations. New systems require typed commands, projections, resolution events, and audit records. Manual, delegated, and rival actors use the same legal rules and their own knowledge boundaries.

Introduce versioned schemas and ordered migrations for contracts, commercial histories, scout reports, and facility projects. Keep backups; test load/export/import and interrupted save recovery. Legacy saves need explicit defaults and a documented transition path before adoption. Do not rewrite saves merely to show a visual prototype.

Engine truth, player knowledge, and presentation are separate. UI receives a knowledge-bounded view; debug tools can inspect latent values but player screens and rivals cannot. Art IDs are independent of hidden talent and risk.

## 8. Validation and release gates

These are targets, not claims of completed testing:

- First-time pilot: at least four of five players reach a first result within five minutes and explain one investment risk.
- After three weeks: at least four of five identify a player they care about and distinguish school cash from player/NIL money.
- Routine settled week: under 45 seconds; no forced department visits.
- Full annual pilot: players can explain a disappointing investment and two changes to next year's roster; record qualitative desire to continue, not only speed.
- Economy: reconcile every money flow; no duplicate rights income, unbounded inventory sales, overspent NIL pool, or retroactive project benefit.
- Uncertainty: multi-seed, multi-season cohorts show both successful and disappointing investments; better scouting improves aggregate calibration without perfect prediction. Establish measured baselines and tolerances before tuning.
- Staff/facilities: compare matched scenarios over several seasons; no universal dominant purchase, unlimited stacking, or all-player stat inflation.
- UI: complete core flow at 390×844 and 320px width, keyboard, 200% text scaling, reduced motion, and screen reader. Physical iPhone Safari/WKWebView tests precede an iOS readiness claim.
- Performance: measure initial load, week advance, rollover, memory, and save growth on a named target phone; set release budgets from that baseline.

## 9. Deliberate scope changes from older plans

Replace desktop-primary design with phone-first flows. Replace “controlled overload” with standing plans and exceptions. Keep institutional/business depth but defer legal/tax/retail/media-ownership complexity. Replace mandatory detailed coaching with staff-led execution. Replace visible exact potential with estimates. Do not use the former 70/20/10 outcome split as a validated mathematical requirement.

Retain existing V2 correctness, knowledge boundaries, save integrity, and evidence requirements. The backlog begins with an explicit mapping to that ledger; this specification does not declare old work complete or authorize an undocumented dependency bypass.
