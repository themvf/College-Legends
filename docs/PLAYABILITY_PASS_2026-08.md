# Playability pass — 2026-08

Walked in the browser as a new player: career choice → job selection → scheme and
staff → roster review → week 1 → advance → postgame → every nav tab. The test
applied to each control: does the cost have a name, does the payoff have a name,
and does any screen contradict another. Findings ordered by severity.

## A. Misleading or dead controls — these lie to the player

1. **The offensive/defensive strategy presets are dead, and they queue.**
   This Week → Business still renders "4 · Offensive strategy" and
   "5 · Defensive strategy" preset pickers. The engine has refused
   `SET_GAME_PLAN` since the five-priorities rework, and the *Your week* tab
   one click away says verbatim: "There is no weekly call to make and no preset
   to pick." Clicking a preset increments "1 decision queued", the header shows
   it as a real pending decision, the card optimistically flips to the chosen
   preset — and on advance the command is refused and vanishes with no message.
   A control that takes input, confirms it, and silently discards it is the
   worst state a control can be in. The panel even ends with "Fine-tune the
   individual calls on the Playbook tab" — a tab that no longer exists.
   *Fix: delete sections 4 and 5 from the Business tab (the matrix code stays
   intact per the design note; only the UI goes), and drop the dangling
   Playbook sentence.*

2. **Job security is displayed five places and read by nothing.** It headlines
   the career-choice cards (92/100), sits in the permanent header stat row, and
   titles the dashboard week banner ("WEEK 1 · JOB SECURITY 92/100"). The
   audit's own finding 4: `championshipDeadline` and `coachSecurity` are never
   read by the simulation — no evaluation, no firing. An 0–1 start moved it not
   at all. Until the firing loop exists, showing it as a headline stat is a
   promise the game does not keep. *Fix: remove it from the header and week
   banner until it does something; `seasonExpectation`'s "5 wins keeps
   everybody happy" already carries the pressure honestly.*

3. **The group development intensity says 55%; the engine runs 0.28.** The
   Development screen: "one position room for a 55%-intensity group session"
   and "GROUP INTENSITY 55% payoff". `SPOTLIGHT_INTENSITY` has been
   `{ PLAYER: 1.6, POSITION: 0.28 }` since the spotlight rebalance. The copy
   still describes the constants from before that work — the exact defect class
   (card disagrees with engine) that the staff-card work declared an invariant
   violation. *Fix: read the constant, or better, replace the percentages with
   projected Overall, which is what the rework made honest.*

4. **Recruiting points: "they reset every week" vs "investments persist."**
   The dashboard briefing says "25 recruiting points are going to waste — they
   reset every week." One week later the Recruiting screen shows 25 banked + 27
   produced = 52 available, under the sentence "Investments persist."
   The points visibly bank; the briefing copy is false. One of the two
   sentences must go.

5. **The Spread tempo personnel contradiction, three screens wide.** The scheme
   screen sells Spread tempo as `1 QB · 1 RB · 4 WR · 1 TE · 5 OL`. After
   choosing it, This Week says "Your offense puts 3 WR, 1 TE, 1 back on the
   field" and the Depth Chart shows "WR — 3 starters". Either the UI reads a
   stale starter table instead of `schemePersonnel`, or `SET_SCHEME` did not
   reach the lineup — either way the player was sold a four-receiver offense
   and given a three-receiver one. *This one needs a code trace, not a copy
   edit: check what the depth chart and the "What you run" panel read, against
   what `schemeSpots`/`snapShares` actually field.*

## B. The simulation talking to itself

6. **The inbox is twelve identical "Week Focus Payoff — Weekly development
   report completed." rows.** Every program in the league emits
   `WEEK_FOCUS_PAYOFF` weekly; the event type postdates the inbox's
   sixteen-type system-event filter and never got added, and its fallback
   renderer prints a meaningless generic line. This is a regression of the
   exact "Prep Points Added" defect the inbox work fixed. *Fix: filter the
   event for non-player programs (the player's own payoff already has a home on
   the postgame screen).*

7. **Design-doc prose leaks onto the postgame screen.** Under "What you chased
   last week": "These are the numbers your week actually bought. A choice the
   game never mentions again is a choice that reads as optional." The second
   sentence is the design *rationale for the panel's existence*, addressed to
   the designer, not the player. Cut it.

## C. Vague — the cost or payoff has no name

8. **The five priority cards carry a bare unlabeled number** (48, 65, 30, 83,
   21). It is the 0–100 stakes score, and nothing on the screen says so, or
   says what 100 would mean. The game's own rule: a control whose units are
   unstated is a control nobody touches. *Fix: label it ("How much this matters
   this week: 83/100") or drop the number and keep the "Worth a look" ribbon,
   which already ranks.*

9. **The develop card's payoff describes the wrong beneficiary.** "Coach up
   Aaron Caldwell … Chased: +43% faster growth for everybody." The card is
   about one man; the payoff line describes the roster-wide coaching modifier.
   Both effects are real, but the card must separate them: what Aaron gets
   (the spotlight) and what the room gets (the modifier). As written the player
   cannot tell whether this develops Aaron or everybody. The dashboard version
   of the same item has a broken headline on top: "Coach up Aaron Caldwell is
   worth more this week than what you're chasing."

10. **Recruiting is still nine unlabeled spends per prospect.** Ten cards, each
    showing six "Unknown" rows, six evaluation buttons priced in points
    ("Basic · 5 … Projection · 12") and three entice buttons ("+5 / +10 / +20")
    with no stated unit and no stated effect on anything — no odds, no price,
    no percentage anywhere. This is the screen the "offer, price, percentage"
    redesign already condemns; the pass confirms every word. Until that
    redesign, the minimum honest fix is one line per entice button: what +5
    buys ("moves you ahead of 2 rival programs" or "+X% chance he commits").

11. **The scouting board prices reliability without defining it.** "29%
    reliable · nothing readable yet" — reliable how, of what? (It is scouting
    confidence in the ranges a file will report.) One clause fixes it.

12. **Facility abbreviations on the job-selection cards.** "TRAI 4 · RECR 1 ·
    STAD 2 · ACAD 3 · SCOU 1" — five cryptic four-letter codes with bare
    numbers, no scale (they are 1–5), on the screen the game most needs a new
    player to understand. The Finances screen proves the fix already exists:
    it names every facility and states each level's payoff in a sentence.

13. **Team abbreviations without first use of the full name.** The marquee
    offers are "#1 GCO · Week 11 · $1.5M" — eight abbreviated programs the
    player has never seen abbreviated before, on a $1.5M decision. The scouting
    board's card titles ("Put the film room on KAN") have the same problem;
    its body copy never names the opponent either.

## D. Traps and overload

14. **The marquee decision is a silent, once-ever forfeit.** It is only legal
    during ROSTER_REVIEW, it lives only on the Schedule tab, the roster-review
    header ("Accept roster & begin season") never mentions it, and accepting
    forfeits it forever with no warning. Its price ($1.1–1.5M) is also the
    player's entire opening budget, and the card does not say either fact.
    *Fix: surface it on the roster-review screen itself with "this offer
    expires when you accept the roster" and the budget consequence.*

15. **Development is decided in three places with three vocabularies.** The
    This Week priority card ("+43% faster growth"), Business section 3 ("who
    gets the extra work", three candidates), and the Development tab
    ("TEC +0.31 · CON +0.06 · INJ +0.03") all set overlapping state, and none
    references the others. The Development tab speaks raw engine tokens
    (TEC/STR/CON/INJ/ARM) — the only screen left that does. The build-order
    item "Overall is derived, post +2.4 Accuracy → +0.7 Overall" is the real
    fix; until then the tab should at least translate its abbreviations.

16. **The opening roster review is an actuarial table.** 85 rows × 9 columns,
    including per-player "1.44% before coach · 0% fatigue" injury odds, as the
    first thing a new player sees, with one real action on it (accept). The
    injury detail belongs behind a tap; the review screen should lead with the
    few facts the takeover already curated (best players, headroom, weak rooms).
    Also "1 seasons left" (grammar) and "(1 reps)", "(2 reps)" on the week
    cards.

17. **The dashboard's top line undercuts the loop.** "0 decisions queued ·
    Advance week" sits directly above a briefing listing six things worth
    doing. "Decisions queued" is developer vocabulary for the command buffer;
    to a player it reads "nothing to do here". *Fix: count unresolved briefing
    items instead ("3 things need you"), or drop the counter.*

18. **The stat header row wastes its scarcest real estate.** Seven always-on
    stats: Record, Rank, Fans, Budget, Job security (inert, see #2), National
    titles (0 for decades of play), Roster 85/85 (static). Fans/titles/roster
    earn nothing weekly. The header is the one piece of UI on every screen —
    it should carry the things that change when a week resolves.

## What already works — keep this register

The best screens share one voice and it should be the template for fixing the
rest: the scheme cards ("Built for it / Wrong personnel", personnel groupings
posted), the staff market ("+11 on Cedric Newman", "$452K a year · $158K to
sign him", "He can run it, but it isn't his"), the sponsor market (the pricing
formula shown as arithmetic), the gate lock ("You're on the road this week.
Gate business happens at home."), the box score (every column unit named), and
the payoff panel's first half ("Offense on Saturday: 70% of the plan held up").
The five priority cards' structure — who runs it, leave-alone vs. priority,
both priced — is right; they just need their numbers labeled (#8, #9).

## Suggested fix order

1. Delete the dead preset UI + dangling Playbook reference (#1) — pure removal.
2. Filter `WEEK_FOCUS_PAYOFF` from the inbox (#6) — one list entry.
3. Copy fixes in one sweep: #3, #4, #7, #9, #11, #12, #16 grammar, #17.
4. Trace and fix the Spread-tempo 3-WR/4-WR mismatch (#5) — possible engine bug.
5. Marquee forfeit warning on roster review (#14).
6. Retire job security from header/banner until firing exists (#2).
7. The recruiting and development overhauls are already specced in CLAUDE.md
   ("an offer, a price, and a percentage"; "Overall is derived") — #10 and #15
   are their briefs, not new work.
