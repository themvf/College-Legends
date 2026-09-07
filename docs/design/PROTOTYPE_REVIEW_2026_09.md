# First implementation slice — design preview and sponsor feedback

Date: 2026-09-07. Implements the bounded next step after the new specification, not the entire game redesign.

## Delivered

- B00 reconciliation: [all 18 V2 targets mapped](../RECONCILIATION_2026_09.md), validator passes, ARCH-001 remains the next eligible production target.
- B02 interactive preview: `apps/web/public/design-preview/index.html`. Five permanent destinations (Home, Players, Staff, Business, League), a player profile with three sections, staff comparison, investment/media confirmations, and a Results flow.
- B01/ARCH-001 partial production fix: Dashboard and Finances share `sponsorshipDecision`; queued sponsors no longer remain unanswered; stale offers permit replacement; foreign-program queues do not disable local controls.

## Open the preview

Run `pnpm --filter @college-legends/web dev --host 127.0.0.1 --port 5190 --strictPort` from the repository root, then open [the local preview](http://127.0.0.1:5190/College-Legends/design-preview/index.html). Use the explicit `index.html` URL: Vite development directory fallback can otherwise open the existing game. Production build copies the standalone page into `dist/design-preview/index.html`.

The preview uses fixed illustrative data and in-memory choices. It does not read browser storage, open a worker, issue game commands, or modify a career. Reload/Reset clears choices. Hire, facility, and media actions are explicitly demo selections; one sample week resolves once. No national media, live NIL, real training, or simulation connection is implied.

## Graphics and interaction

Original editable inline SVG school marks, numbered jersey identity, staff initials, facility illustration, navigation icons, and growth bars establish the new visual language. Warm neutral background, white cards, ink text, deep-blue actions, and restrained gold replace the old large-banner emphasis. These are prototype identity graphics; portrait production remains a later task.

Home puts cash and business opportunities ahead of the optional matchup on phones. Player identity persists across profile, merchandise, and Results. School cash, player earnings, and external NIL funds have separate labels. Details disclose sample assumptions. Text can be enlarged through the preview's 100%/200% control.

Source/provenance: all SVG geometry, jersey composition, and layout were authored in `index.html`; no external images/fonts, generated portraits, copied reference assets, or remote runtime dependencies. No latent player values select artwork. No image-generation asset batch was produced in this slice.

## Observed browser evidence

CUA browser inspection used separate local origins from the previously played career. Screenshots were captured inline in the task conversation; they are not a committed screenshot-baseline suite.

| Check | Result |
|---|---|
| Desktop Home and Player composition at 1280×720 | Inspected; compact navigation and two-column cards render |
| Phone Home, Business, Staff, Player agreements, Results | Inspected; money/opportunities and original jersey/facility graphics visible |
| 390×844 and 320px narrow view | Inspected without horizontal page overflow in tested views |
| Visible Home and narrow Player controls | No button below 44×44 after correcting reset/header button overrides |
| 200% text control at 390px | Home, Players, Staff, Business, League, Results have no horizontal page overflow; text explicitly enlarges; this is not native Safari zoom certification |
| Keyboard confirmation | Enter opens staff confirmation; focus starts on Keep current; Escape dismisses and restores Compare & hire focus |
| Demo accounting | $480,000 − $50,000 buyout − $180,000 project + $42,000 sample week = $292,000; displayed correctly |
| Cancel/reset behavior | Cancel does not hire; Reset clears choices and restores opening sample state |
| Sponsor live browser flow | Week 1 Gateway: six unanswered/two urgent before selection; five/one after queue. Both surfaces show pending, name Summit Family Markets, and retain $1.5M before advance |
| Sponsor settlement | After advance: active Summit Family Markets contract, $65K earned so far; no false immediate signing |

The preview fan badge was corrected from an inconsistent +8% to rounded +21% for the illustrative 15,200 → 18,420 chart. No claim of human-pilot results, native iPhone/VoiceOver testing, complete contrast certification, or all-screen localization/controller coverage is made.

## Code and automated evidence

- `pnpm check`: passed.
- `pnpm web:build`: passed after the final source changes; standalone preview copied to build.
- `pnpm --filter @college-legends/web exec vitest run src/sponsorship-briefing.test.ts src/Finances.test.tsx`: independent verifier passed 9/9.
- `node --test --test-name-pattern="sponsorship|dashboard tells" tests/simulation.test.mjs tests/rng-distribution.test.mjs`: passed 4/4 relevant existing regressions.
- Full web suite: passed 32/32 with `--maxWorkers=1`. Default parallel attempt had one pre-existing inbox test exceed its five-second timeout; no assertions or timeout values were weakened.
- `git diff --check`: passed.
- Independent static review found the stale-offer recovery gap; the shared projection and UI recovery tests fixed it before handoff.

## Remaining work and boundaries

ARCH-001 remains in progress. This sponsor view does not complete durable rejection/audit presentation, all-domain lifecycle adoption, AI knowledge boundaries, save interruption, or broad performance gates. After a rejected command clears, ordinary selection can reappear; persistent rejection history is not claimed.

B01 still includes turnover totals, forecast correctness beyond this sponsor state, career wording, overtime, and camp choice review. B03 production navigation is not integrated. B02 is delivered for visual review, not acceptance of a final art style or proof of game balance. Future gate/scope conflicts are recorded in the reconciliation rather than bypassed.
