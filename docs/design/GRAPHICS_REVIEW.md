# College Legends graphics review and art direction

Reviewed September 7, 2026. Three simulated AI specialist roles independently reviewed UX, systems/game loop, and UI/accessibility. Source review was followed by coordinator browser checks. These are expert assessments, not player-test results.

## Group verdict

The game has meaningful management decisions and useful state-derived feedback, but its original career screen lacks collegiate atmosphere and recruiting uses a separate brown/green visual vocabulary. Adopt a restrained navy/gold sports-editorial system. Use artwork at emotional entry points while keeping numbers, scouting uncertainty, actions, and results as native interface text. The initial implementation covers career selection, the dashboard matchup, recruiting atmosphere, and program operations.

## Scorecard

Scores describe the original source-reviewed experience; targets remain goals, not completion claims.

| Dimension | Original | Target | Evidence |
| --- | --- | --- | --- |
| Visual consistency | 2 | 5 | Global navy panels versus independent recruiting brown/green tokens in `apps/web/src/styles.css` |
| Next-action clarity | 3 | 5 | `ProgramDashboard` supplies actionable priorities; `Dashboard` repeats six metrics and navigation above each screen |
| Accessibility | 3 | 5 | Recruiting has focus and touch rules; original `.depth-actions button` minimum width was 2rem |
| Feedback and learning | 3 | 5 | State-derived weekly stories and injury impacts exist; mobile prospect reports can update below a long board |
| Simulation honesty | 4 | 5 | Matchup and scouting data derive from selectors; visual mappings must preserve hidden information |

## Prioritized recommendations

1. **P1 — Mobile recruiting navigation (remaining).** Selecting a target currently changes a report below the full board (`Recruiting.tsx`, `Recruiting` and `ProspectReport`). Show the report as a focused mobile view, preserve filters and scroll, and return focus to the selected target on Back. Requires local interaction state, not simulation changes. Accept when selecting the last target of a 50-item board exposes its heading immediately and Back restores its original place.
2. **P1 — Touch and phone hierarchy (partly implemented).** Global 44px button/select minimums, visible focus, depth-control sizing, safe-area spacing, and reduced-motion rules are added. The repeated header remains large. Combine secondary metrics into an accessible summary in a subsequent interaction pass. Accept when the first material decision is visible at 390×844, all control states work by keyboard, and VoiceOver/200% zoom retain the complete flow. Current browser checks are not full accessibility certification.
3. **P2 — Cohesive art family (implemented initial slice).** Add stadium, recruiting atmosphere, and generic facility artwork; unify navy/gold surface tokens. Preserve live typography, budgets, ratings, and existing controls. Dependency: original art plus compressed local assets. Accept when phone and desktop images render without text collisions, fallback backgrounds remain readable, and mobile variants stay below 250 KB each. Actual mobile files: approximately 23, 22, and 54 KB.
4. **P2 — State-specific narrative and progression art (remaining).** Extend `weeklyStories` mappings with truthful victory/loss/health/bye fallbacks; map facility progression to the actual five-level model. Preserve score and causal explanations. Never display championship art before a resolved championship. No hidden rating may determine a portrait. Accept using fixtures for each supported story/state; changing hidden prospect talent must leave art identity unchanged.

## Art system and delivered files

- Ink `#091522`, panel `#102337`, line `#35495c`, gold `#e9bd70`, paper `#f4f1e8`, secondary text `#bcc9d5`. Green/red remain semantic status accents with text labels.
- Bold native title lettering, quiet body typography, restrained gold rules, dark text-protection overlays. No generated words are used as interface labels.
- `apps/web/src/visual-system.css` owns the new visual layer and responsive backgrounds; `main.tsx` imports it after the existing stylesheet.
- `apps/web/src/art/` contains six deployment assets: three 1600px-wide WebP images and three 800px-wide mobile versions. These are bundled through Vite CSS references and have no external runtime dependency.
- `docs/design/art-masters/` contains the three original PNG masters. Masters are not shipped by the web build.
- `docs/design/art-direction-prompts.json` records the exact three prompts and built-in image generator provenance. WebP derivatives use format compression and proportional resizing only.
- Stadium and facility art are generic atmosphere, not a depiction of the selected school's exact seating capacity or upgrade level. The recruiting image is a section illustration, never assigned to an individual prospect or hidden talent grade.

## Validation

- `pnpm web:build`: passed TypeScript and Vite production build; six hashed WebP outputs emitted.
- `pnpm --filter @college-legends/web test`: 4 files, 15 tests passed.
- Browser: title presentation inspected at 390×844 and 1440×1000; resumed the existing career for read-only dashboard/recruiting/finance navigation. No week advanced and no management commands submitted.
- Browser DOM: title, dashboard, and recruiting at 390px had no horizontal page overflow. Dashboard visible button/select dimensions met the 44px minimum. Facility artwork visually checked in finance at 390px.
- Background asset loading was corrected after Vite initially cached CSS before asset creation; the production build resolves all assets.
- Physical iPhone, Safari/WebKit, VoiceOver, suspension/relaunch, offline behavior, all game states, controller support, and full contrast/zoom coverage remain untested.

## iOS direction and risks

Keep the simulation/model packages independent of graphics. Before choosing and shipping an iOS container, prototype phone navigation, validate save interruption recovery and offline relaunch, measure memory and week-advance time on the target device, and test safe areas in portrait and landscape with VoiceOver. This work establishes portable visual assets and responsive presentation; it does not constitute an iOS port.

The panel's main tradeoff is atmosphere versus decision density. Keep large imagery on career entry; use compact contextual banners in management screens. Do not add mandatory splash screens, animations, or portrait decoration to every list row. Next implementation priority is mobile board-to-report navigation, followed by compact shell disclosure and device validation. V2 status and simulation rules are unchanged by this graphics pass.
