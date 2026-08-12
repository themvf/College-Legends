# Focus group: five functionality proposals

Synthetic panel exercise, not user research. Five recurring player archetypes —
built to represent the audiences the design docs already assume — were used to
pressure-test five open items pulled from the engine review log in
`CLAUDE.md`, each anchored to a measured number rather than a guess. Treat this
as a premortem: the value is in the tensions it surfaces between player types,
not in the specific words attributed to anyone.

An HTML version with the full reactions ran as a Claude Artifact during
review; this doc keeps the durable result — the proposals, the friction, and
the sequencing call — in the repo.

## The panel

| tag | archetype | what they want |
|---|---|---|
| DG | The Dynasty Grinder | Twenty-season saves, three careers deep. Consequences that outlast a single roster. |
| NN | The Numbers Nerd | Reads the box score before the recap. Trusts a stated formula, distrusts a hidden roll. |
| BF | The Business-Sim Fan | Came from spreadsheets-as-games. Wants a price and a payoff posted on every screen. |
| CC | The Casual Commuter | Twelve minutes on the train, once a day. Wants "Advance week" to keep working. |
| RP | The Roleplayer | Plays one coach, one program, one story. Wants the job to feel like a job. |

## The five proposals

### 1. Performance at real league size — unanimous

Replace the full player-table scans inside recruiting (`prospectValue` called
from a sort comparator, `projectedRecruitingOpenings` re-run per prospect per
program) with indices built once per week: players by program, prospects by
status.

At 12 programs a week costs 65ms combined. At the real league size of 72 it's
6.4s of AI planning plus 3.7s of simulation — about 10 seconds behind every
tap of "Advance week," growing worse than linearly. No panelist argued the
other side; it's an indexing problem, not a design tradeoff.

### 2. A living economy that can go broke — broad support

Turn `weeklyRevenue` into a function of fan base, national press, prestige,
and championships instead of a stored constant. Give facilities and staff
recurring costs. Make insolvency a condition the engine checks, not a line in
the README.

Programs currently net roughly $34.9M a season by year six against about $23M
of lifetime spending available in the whole game — nothing has ever gone
negative because nothing is watching.

**Flagged:** the failure state must be recoverable — a bad season and a bad
budget landing in the same week should open a worse next chapter, not end the
save.

### 3. Recruiting as one row: a range, a price, a percentage — broad support

Collapse four search types and six evaluation types into one row per
recruit — an overall range, an asking price, a percentage to sign. Make money
the recruiting budget's primary sink. Keep criteria as eligibility to bid,
never a guarantee, and let scouting reveal what a recruit wants, not only
narrow his range.

A LOW program opens with a $1.5M recruiting budget against a POWER program's
$20M — a $5M quarterback is a third of a powerhouse's annual revenue and
triple a LOW program's entire opening budget. That asymmetry is the point.

**Flagged:** the odds have to resolve from a stated formula a player can
eventually infer, or it reads as a slot machine. The Dynasty Grinder's caveat:
signing day is a means, not the payoff — the roster still has to be developed
for years before it cashes out.

### 4. An offseason phase — contested on scope

Add a phase between rollover and week one for signing day, coach hiring and
firing, portal *acquisition* (not only churn-out), and training camp, so
decisions that currently exist exactly once in a career get to recur.

`marqueeGameOptions` requires `ROSTER_REVIEW`, which occurs exactly once, ever,
in the opening preseason. A redshirted player is excluded from
`activeDepthChart` entirely, so the four-game redshirt rule the engine
carefully models can never be exercised. Uncommitted prospects are silently
withdrawn at rollover.

**Flagged:** a real fork, not a nitpick. The Dynasty Grinder and Roleplayer
want offseason depth to match the regular season; the Casual Commuter wants a
handful of high-leverage prompts and out. Resolvable if the phase is skippable
by default and rewarding to open — that's a scope call, not a "whether."

### 5. Job security as a mechanic, not a display value — wanted, but sequenced

Have the simulation read `championshipDeadline` instead of only rendering it.
Evaluate `coachSecurity` against a stated expectation instead of letting it
only ever increase. Make firing a visible, stated risk — the design rule
already on record is that it must never be a hidden roll.

`coachSecurity` today moves in exactly one direction: +10 for a coach of the
year award, +20 for a title. `championshipDeadline` is shown in the header of
every season and read by nothing.

**Flagged:** there is nowhere to fire a coach *to* without proposal 4 — no
coaching market exists outside the takeover screen today. Wanted, but wants to
be built on top of the offseason, not ahead of it.

## Synthesis

| rank | proposal | support | main friction | depends on |
|---|---|---|---|---|
| 1 | Performance at real league size | Unanimous | None raised | Nothing — infrastructure |
| 2 | Recruiting: offer, price, odds | Broad | Odds formula must be legible | Pairs with the economy work |
| 3 | A living, insolvable economy | Broad | Failure state must be recoverable | Pairs with recruiting |
| 4 | Offseason phase | Broad | Scope: three prompts or fifteen | Nothing, but gates #5 |
| 5 | Job security as a mechanic | Wanted | Needs a stated formula, not a roll | Proposal 4 |

**Reading the room.** The performance work is a prerequisite, not a pitch, and
should move regardless of which of the other four win the next planning pass.
The other four split into two natural pairs rather than a flat ranking: the
living economy and the recruiting overhaul are the same finding from two ends
— a faucet with no drain, which `CLAUDE.md` already names recruiting as the
intended fix for — and the offseason phase and job security are the same
relationship, since nobody can be fired from a program without somewhere else
to go.

The Casual Commuter's objection recurred on three separate proposals — the
economy, the offseason, and job security — and never as "don't build this."
Every time it was *"make the bad outcome a new chapter, not a wall."* That's
one cheap guardrail that de-risks three proposals at once: whatever
insolvency, coaching changes, and firing turn into, none of them should be
able to end a save outright.

**Recommended order:**

1. Ship the indexing work first — no design risk, and it makes every other
   measurement in this doc trustworthy at real league size.
2. Build the economy and recruiting together — sequencing them apart just
   means shipping half a loop twice.
3. Offseason next, scoped to what it unlocks first — redshirting and
   repeatable marquee scheduling alone justify it before coach hiring is
   touched.
4. Job security rides on the offseason's back, with the one hard rule the
   design doc already states: post the formula, never roll it in secret.

**Not chased in this pass:** position-vs-individual development spotlight
balance, AI scheme diversity, and the third-and-long play-selection issue that
compresses pass-rate identity. Logged, smaller than the above, worth a future
round.
