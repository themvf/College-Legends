# Connected business and campus slice

September 7, 2026. Implements the user's approval of the researched business direction and request for a more living world. This supersedes the initial player-signing opening. It remains a deliberately bounded prototype, not completion of the legacy V2 roadmap.

## Playable changes

The default app now loads `EnterpriseGame`. Begin with an inherited program and a renewal-campaign choice. Campaigns spend real operating reserves and sell advance packages; those admissions are not sold a second time at home games. Play six home dates, service an optional local sponsorship contract, choose a next-season road guarantee versus retaining a home date, and accept or decline a restricted donor-backed hospitality project. Annual settlement opens another renewal season with the committed schedule and recurring upkeep intact.

The $600,000 is an opening operating reserve. The funded inherited base budget is separate. The ledger explicitly covers incremental commercial receipts/costs and an annual shared athletics contribution, not a complete university financial statement. All prices and demand parameters are fictional balancing assumptions. Home matches have named opponents and simple score resolution; away results and full roster economics are not simulated in this slice.

The university's $100,000 reserve minimum is disclosed in the investment and annual review. Annual failure ends delegated authority; no personal franchise bankruptcy is implied. Emergency credit and recovery negotiations remain unimplemented. Restricted donor money is recorded separately and applied directly to construction, never added to spendable reserves. No real NCAA rule, universal financing threshold, or market quotation is implied by these values.

## World response

- Animated students/supporters follow campus paths; runners practice on the field. Falling leaves and a moving flag add ambient motion.
- Ticket sales increase office-area activity. Home-game stages populate the stands and paths and bring out a concessions cart. Crowd size is an illustrative sample derived from attendance, not one sprite per ticket.
- After-game scenes gain evening color and floodlight glow. Rain in the attendance report produces visible rain.
- Signing the school sponsor installs signage. Funding the modular hospitality terrace adds a structure and an inspectable location.
- Office, ground and terrace hotspots explain their actual business state. Staff/news messages change with outcomes.
- CSS transform animation avoids a continuous JavaScript simulation loop. Motion can be paused and is disabled under reduced-motion preferences.

This uses the existing original campus bitmap as scenery with new code-native SVG layers. It is not yet a fully simulated NPC world or an animated football match. Static figures embedded in the background art remain; future art should separate environment and characters into proper layers. No new image generation was needed for this pass.

## Save and route boundaries

New key: `college-legends-enterprise-v1`. Export/import, restore validation, damaged-data recovery and explicit reset are provided. Previous player prototype is at `?prototype=1`; original dynasty remains `?legacy=1`. No prior save is migrated or overwritten. The old `design-preview/index.html` includes a prominent link to the current playable so players do not mistake that study for the current game.

## Evidence

Nine focused tests cover advance receipts, no admission double count, restricted funding, ledger reconciliation, deterministic restore, schedule carryover, road-payment timing, sponsor expiration, insufficient funds, terminal annual failure, initial UI, motion toggle and damaged-save recovery. Production TypeScript/Vite build passes.

Browser playthrough covers the renewal campaign, all six home dates, sponsor signage, future road commitment, matching-fund deduction and the terrace hotspot, plus the annual projection. The sampled run sold 345 packages, funded the terrace, and projected $437,634 reserves after annual settlement. Moving SVG figures changed screen coordinates between observations. Desktop and 390-pixel phone layout were visually inspected with no horizontal overflow.

## Next substantive work

Balance multiple years and alternative strategies with players. Add university-approved borrowing/recovery and staff contract choices. Add the inherited budget's roster/NIL compartments, retention/eligibility and coaching consequences before claiming a complete college-football business simulation. Replace background-baked figures with layered character art and add better transitions and activity variety. Keep future league/media mechanics subject to the research distinctions documented in `COLLEGE_FOOTBALL_BUSINESS_RESEARCH.md`.

Final validation: all 50 web tests passed across 12 files with one worker and a 20-second per-test timeout. Final production build passed. Browser reload restored the 2028 five-home-date schedule, terrace and exact 437,634-dollar reserve balance; the test-only career was reset through the UI for handoff. Motion pause held the observed character coordinates fixed across observations.
