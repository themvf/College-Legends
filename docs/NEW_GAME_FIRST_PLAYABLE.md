# Fresh business-game track — September 7, 2026

The user authorized a fresh start without retaining previous code unless helpful. This track supersedes the old prototype's opening and feature ordering. It does not mark legacy V2 ledger targets complete. The default web entry now loads this game; `?legacy=1` opens the previous game. Saves use distinct keys.

## Implemented first playable

- Fictional Gateway State begins with $600,000 and one choice: sign a quarterback. Inherited coaches and operations run automatically.
- Three prospects trade immediate expense, ongoing compensation and uncertain development. Exact potential is hidden in the interface.
- Twelve-game seasons with automatic results, player growth, fans, ticket receipts and itemized cash movements.
- Sponsors unlock after game three, merchandise after five, a coordinator after seven, facilities after nine and lending after ten. Unlocks persist across seasons. No prerequisite management tour.
- Local sponsorship pays reliably; performance sponsorship pays only for wins. Merchandise requires inventory purchases and pays a player share on each sale.
- Coordinator payroll continues all year. Facility benefits start after eight calendar weeks, with ongoing upkeep.
- A $150,000 loan at 12% annual interest amortizes over 52 weekly payments, including the offseason. No repeat borrowing. Three consecutive unresolved weekly cash shortfalls end the run.
- The offseason settles 40 calendar weeks. Alumni support arrives first; salary, debt and upkeep persist. Obligations are disclosed before advancing.
- Autosave, export/import and explicit restart. Invalid existing saves are preserved in a recovery key before replacement. The previous game's saves are untouched.
- Original illustrated campus and three fictional athlete portraits, compressed to approximately 653 KB combined; responsive phone UI and native modal dialogs.

## Deliberate limits

This is a playable foundation, not the finished game or an App Store build. It follows one player across repeatable seasons; graduation, replacement recruiting, wellbeing, transfers, scouting, media markets, paid opponents, conference movement, coach selection/termination and long-term prestige are not implemented. Campus artwork is atmospheric and does not yet reflect construction. Values are provisional and need multi-season balance testing with players.

The new engine imports nothing from the dynasty simulation. Cash, transactions, financing and time settlement form a small foundation that can later be extracted for other sports. Football prospects, fans and match results remain sport-specific. Do not generalize an entire multi-sport platform before the football loop is fun.

## Next development decisions

1. Playtest the first three seasons: does each recruit create a different business story, and can users explain why they ran out of money?
2. Add annual recruitment and eligibility, uncertain scouting and player wellbeing with clear choices and fair consequences.
3. Build the ascent: paid fixtures, local-to-national media and fictional conference economics. Tie unlocks to meaningful business achievements.
4. Add visible campus growth and a consistent portrait/venue art pipeline, then iOS packaging, device accessibility and performance validation.

## Validation

Production TypeScript/Vite build; focused tests cover signing, deterministic reloads, milestone gates, ledger reconciliation, 52-week settlement, loan amortization, insolvency, construction timing and merchandise player payments. Browser review at 390 × 844 checks signing disclosure, first-week results and the sponsor unlock after three games. See final delivery for test outcomes and any outstanding legacy failures.

## Artwork provenance

Generated original assets using ImageGen; no CD Market assets, real school logos or athlete likenesses were supplied. Masters are retained under `docs/design/new-game-art`; optimized assets ship under `apps/web/public/new-art`.

Campus direction: detailed warm autumn pixel-art small fictional American college football campus, brick athletic office, weight room, practice field, modest bleachers, no lettering or real logos.

Portrait direction: three equal square panels, adult fictional male college players aged 20–22, plain forest green jerseys and cream collars, shared muted olive backdrop, consistent pixel-art treatment and equal prominence. Left short brown hair, center natural black hair, right wavy dark hair. No lettering, numbers, logos or real likenesses.

Validation outcome: production build passed; all 9 fresh-game tests passed. The broad web run passed 38 tests and timed out one unchanged legacy inbox test at its 5-second limit. That inbox file passed all 3 tests when rerun with a 20-second limit (no test source changes). Browser reload restored Week 4 and the exact cash balance; the test career was then reset through Save options for handoff. Phone viewport had no horizontal overflow.
