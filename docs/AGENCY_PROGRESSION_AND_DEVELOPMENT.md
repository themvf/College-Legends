# Agency progression and player development

Agreed direction: September 8, 2026. This is the current direction, superseding the mandatory pitch-production loop and earlier review proposals. The AAA review skill is paused at the user's request.

## What the player is trying to achieve

Build a wealthy, prestigious sports agency by discovering overlooked talent, beating rival agents to sign clients, and helping those clients become successful. Money funds bets on people. Prestige opens access to new services and business opportunities. Neither fame alone nor cash alone completes the game.

The emotional payoff is a player the agent believed in becoming a star. The agent arranges specialist help, advises on school opportunities, and supports the client. Coaches and athletes retain control of football performance; expensive services do not guarantee success.

The first playable goal is $1,000,000 in agency cash after outstanding bridge-loan obligations and 85 current prestige, reached together. These numbers are provisional balance choices, not user-specified final targets. There is no ten-season deadline. Reaching the goal is recorded and permits continued play. No valuation, acquisition, investment portfolio, or property system is implemented in this slice.

Money and prestige remain visible while navigating and scrolling, including mobile and result dialogs. The goal bar shows current cash, progress after debt, prestige, and the next unlock. Detailed goals explain costs, commission income, and why a client contract's face value is not agency cash. The loan reserves its full $44,800 repayment against the financial goal, preventing borrowed cash from satisfying victory.

## The repeatable loop

Discover a lead → choose what to investigate → compete to sign the player → identify what is holding him back → invest in help or a better opportunity → watch actual performances → earn money and prestige → pursue the next client.

Recruiting should eventually emphasize the tradeoff between learning more and moving before rivals. Existing scouting and recruiting competitions remain in this first slice. The proposed eight-prospect, two-rival encounter is a future playtest design, not a new population configuration in this implementation.

## Three different forms of progress

| Dimension | Agent influence | Visible result |
| --- | --- | --- |
| Ability | Arrange training for a specific weakness | Skill and overall ability changes, then game performance |
| Opportunity | Compare schools, competition, health, and expected playing time | Role and expected snaps; actual weekly participation |
| Fame | Arrange media preparation and commercial work | Public profile, buyer interest, contract income |

Players have three position-specific skill ratings. For example, receivers have catching, route running, and release technique. A consistent initial profile creates relative strengths and weaknesses; film scouting reveals those ratings. Represented clients can inspect them in Development and their client file. Potential remains uncertain behind existing scouting tiers.

In this initial implementation, the football simulation continues to use overall ability. Every three points gained in a targeted skill contributes one point of overall ability, bounded by the player's ceiling. Skills do not yet independently resolve drops, interceptions, or specific plays. Other existing ability changes move all three skill ratings together. This keeps current saves and training compatible while making targeted investment meaningful.

## First implemented development choices

- Target a football skill: two weeks with a community coach ($1,500), targeted specialist ($4,500), or elite development team ($8,000). A relative weakness offers more room for improvement than polishing a strength. Results vary deterministically with the saved simulation seed. Potential, fatigue, and missed sessions can limit gains; some blocks produce no measurable improvement.
- Media coaching: two weeks, $2,000, 4–8 public-profile points subject to the profile cap; no football ability gain.
- Recovery coordination: two weeks, $1,500, removes up to 24 fatigue when completed. Does not shorten an injury or promise a recovery date.
- Personal mentor: four weeks, $2,500, 8–12 trust and up to 8 fatigue reduction subject to caps; no football ability gain.

All spending is upfront and appears in the agency ledger. One active development commitment per client, with two simultaneous agency places plus staff capacity. New and legacy blocks share these limits. Blocks must finish by Week 12. A player who is currently injured cannot start a skill block; an injury during training reduces attendance and potential improvement. School transfers cannot bypass active commitments.

Completed plans persist across seasons with provider/target, cost, completion week, direct effect, and period snapshots. Reports distinguish the plan's effect from total changes during the block. On old saves, tracking starts at the loaded player's current ability; earlier gains are not invented. Existing in-progress legacy blocks continue under their original rules.

## Prestige and unlocks

The existing saved reputation value becomes player-facing agency prestige; no parallel reputation currency is introduced.

| Prestige | Agency tier | Implemented access |
| --- | --- | --- |
| 0 | Unknown | Community training and local services |
| 18 | Local name | Targeted specialist and existing client-service staff hires |
| 40 | Regional contender | Elite development team |
| 65 | National agency | New national licensed-merchandise agreements; client profile requirements still apply |
| 85 | Powerhouse | Prestige side of the victory goal |

Unlocks use earned peak prestige and remain available. Current prestige is required for victory. Previously signed agreements continue to pay even if their category is now gated. Future expansion can add elite prospect access and relationship-driven invitations to these tiers; those are not implemented here.

Prestige rewards in this slice:

- Paid commercial contracts: 2 below $50,000 gross, 6 from $50,000, 10 from $100,000. The reward happens on payment, once, and is stated in the recap.
- Developed breakout: 5 once per client after at least 3 overall-ability points from completed targeted training and a subsequent actual game with at least 18 performance points and positive snaps. Buying training alone earns nothing.
- Player of the week: 1 per award; season honors: 3 per award. Recorded once and only while representing the athlete.
- Existing season ambition and draft rewards continue. Scouting purchases, loans, and expensive offices do not directly award prestige.

## Deferred scope

September 8 follow-up: the user has identified the offseason market and client retention as the next core gameplay work. See [Offseason agency market](OFFSEASON_AGENCY_MARKET.md) for the proposed compressed timeline, school offers, retention, and draft integration. These features remain unimplemented; the earlier deferral of team-compensation negotiations is no longer the intended next-work priority.

The six proposed commercial categories remain a candidate catalog. Mandatory pre-deal video production is on hold. Full contract bargaining/renewals, specialist staff personalities, five client personality traits, team-compensation negotiations, new recruiting encounters, and asset ownership require subsequent slices. No native iOS migration or legal/compliance metagame is included.

## Verification targets

Verify cost/ledger reconciliation, deterministic save/reload outcomes, targeted skill gains and potential ceilings, no football gain from media/support, injury attendance limits, shared capacity, transfer locks, persistent completed records, real prestige gates, one-time rewards, and victory requiring both money after debt and prestige. Check the goal bar on desktop and mobile while scrolling, navigating, and opening dialogs.

## First-slice verification — September 8

- Production web build passed. Full web suite: 111 tests passed. The final focused UI check passed all 8 tests after correcting a test-only TypeScript option.
- New coverage includes ten development/economy tests and a UI flow that books a plan, verifies changing money/prestige displays, completes the block, and opens the unlock dialog.
- Browser playthrough: Miles Ellis's first pocket-movement block produced no measurable gain. A second block improved the skill from 55.0 to 59.6 and overall ability from 64.0 to 65.5. He moved from rotation to starter, played 85% of snaps, and earned an existing season-ambition reward of 2 prestige. This was not yet the separate 3-ability developed-breakout milestone.
- Browser reload retained the $89,000 cash balance, 12 prestige, and development history. At a 390 × 844 viewport, the goal bar stayed visible while scrolling the planner and the goal dialog. No horizontal page overflow or browser console errors were observed. The viewport override was reset after testing.
- This slice is available locally; no GitHub push or public deployment was performed for this implementation turn. Further balance testing is required before treating the financial and prestige thresholds as final.
