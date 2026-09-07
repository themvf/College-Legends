# College Legends — graphics and interface specification

Date: 2026-09-07. Status: production brief; new assets and screen designs described here are not yet built. Companion: [core game](../CORE_GAME_SPEC.md), [backlog](../IMPLEMENTATION_BACKLOG.md).

## Direction

Create a clean, warm, contemporary management game with collegiate identity. People and business growth carry the visual interest: recognizable athletes, distinctive schools, an improving campus, merchandise, and restrained moments of achievement.

The default screen is a readable decision surface. Reserve large imagery for career entry or optional milestone views. Replace the previous war-room/broadcast-heavy direction and oversized departmental background banners. Existing stadium art can remain as a cropped entry or milestone asset if it fits; it is not the main organizing device.

CD Market is a product-experience reference, not an asset or layout template. Build original marks, portraits, iconography, and composition. Use fictional people and schools.

## 1. Visual grammar

| Element | Proposed treatment |
|---|---|
| Background | Warm neutral `#F5F3EE`; quiet surfaces separate groups |
| Cards | White `#FFFFFF`, restrained border `#D8DEE4`, minimal shadow |
| Primary text | Ink `#172638` |
| Secondary text | Slate `#526171`; verify contrast at intended sizes |
| Primary action | Deep blue `#174A67` with white label |
| Accent | Muted gold `#D1A34A` for emphasis/decorative detail, not small white-on-gold text |
| Outcomes | Positive `#246B4A`, concern `#9A4A18`, negative `#A33434`, always paired with words/icons |
| Team identity | Restrained team-color stripe, mark, jersey accents; never recolor semantic statuses |
| Typography | Locally available system sans; native text with tabular currency/numerals; no external font dependency |
| Spacing | 4/8/12/16/24/32 scale; 16px phone content margins |
| Type | Body starts at 16px; secondary labels 14px; headings 22–28px, scalable rather than fixed-height |

These tokens are starting values, not verified accessibility certification. Validate contrast, text scaling, and forced colors in B02. Dark mode follows the accepted layout with equivalent contrast; it is not a separate art production effort before the first slice.

## 2. Screen compositions

### Home

Compact school mark/name and Week 6 · vs opponent. Cash and season outlook on one compact row with expandable details. One leading change and up to two other material items. Persistent Advance Week action above the five-tab navigation, respecting safe areas and text expansion. No large stadium image above the first decision.

Illustrative content only: “Collins committed”; “Merchandise: 42 sold this week”; “Coordinator contract expires after the season.” Actual priority and totals come from projections. Never imply a task is required just because an opportunity exists.

### Player profile

Stable 96–128px portrait or jersey fallback, name/position/year, and plain status. Compact progression timeline with visible labels. Three sections: Football, Career, Agreements. Default view shows a few relevant strengths and uncertain scout outlook. A business summary distinguishes school contribution from the player's earnings.

Public recognition and private wellbeing information use different sections and permissions. Do not depict distressed expressions or broken imagery based on anxiety, injuries, or hidden traits. Age/jersey changes can update documented appearance attributes without regenerating identity each week.

### Staff comparison

Incumbent and candidate share identical fields, stacked on phone and side by side where space allows. Portrait, role/style, two strengths, fit explanation, salary/term/buyout. Show the total change in obligations before Hire. Unknown effects use uncertainty language, not invented exact percentage improvements.

### Business investment

Current cash and season outlook first. Investment card: small facility/product/contract image, cost now, ongoing cost, completion/term, expected benefit, uncertainty. One compare action and one commit action. Media logos are fictional partner identities; newspaper stories are not disguised paid endorsements.

For merchandise, show actual proposed product, inventory quantity, player share, and margin assumptions. A sales sparkline includes axis/time labels or an accessible textual summary. It never implies future sales are guaranteed.

### Results

Score and team marks, one named standout, then development and business changes. Small portrait reinforces continuity with the roster. Show factual cause/effect only. Full stats and stories open on demand. Bye weeks have their own development/business composition.

### Offseason

Season record, memorable player, and net financial outcome together. Departures, incoming players, and needs precede portal bids. Signed player card shows actual role/eligibility. End with a before/after roster and obligations summary rather than repeating new-game setup.

## 3. Component and state inventory

Build reusable native components for: school header, five-tab navigation, player row/card, staff comparison, money/outlook pair, uncertainty label, contract card, facility project, inventory summary, change item, result panel, and confirmation summary.

Each applicable component includes default, focused, selected, saved/scheduled, resolving, resolved, disabled-with-reason, empty, loading, and error states. Status is readable without color. Selection moves focus to visible content; list restoration is part of the design.

Use one vocabulary: Cash; Season outlook; Player earnings; NIL funding; Scout estimate; Selected; Scheduled; Active; Complete. Headlines can have personality; controls describe the action literally. Put explanations behind “Details” or first-use help rather than repeating paragraphs.

## 4. Asset production brief

| Family | First approved batch | Source and delivery | Behavior |
|---|---|---|---|
| Program marks | Three prototype schools, then reusable original mark system | Editable SVG; small-size variants | Recognizable at 24/40/64px, named in accessible text |
| Player portraits | Six diverse adult fictional athlete references; expand after acceptance | Consistent illustrated busts, 512px masters, 128/256px WebP derivatives | Stable identity independent of talent, value, wellbeing, and scouting knowledge |
| Staff portraits | Four adult fictional staff references | Same lighting/palette as athletes; distinct clothing | No quality tier encoded in attractiveness or visual prestige |
| Jersey fallback | Team-color jersey with native number/name labels | SVG/code-native composition | Works immediately and offline when portrait unavailable |
| Facilities | One chosen facility at existing/project/complete states | Consistent camera/scale, 1024px master and compact derivatives | Visual upgrade only after actual project completion |
| Merchandise | One jersey/product template | Original vector or rendered product, native price/quantity overlays | Product matches campaign, no generated text or fake real brand |
| Media partners | Small original radio/TV/publisher mark family | SVG and native partner names | Distinct rights/coverage types |
| Milestones | Signing, breakout, upset, facility completion | Reusable layout plus small original accents | Engine event triggers only; no assumed superstar outcome |
| Interface icons | Approximately 12 consistent icons | SVG, one stroke/shape system | Text labels for ambiguous actions |

Raster creation uses an image-generation workflow when original bitmap illustration is needed. Keep prompts, source files, tool provenance, and derivative records. SVG/icons/layout should remain editable code-native assets. Do not create hundreds of portraits before stable IDs and style review exist. No rasterized UI text.

Art brief for first portrait study: “Original editorial sports-game illustration of an adult fictional college athlete, waist-up or bust, relaxed neutral expression, plain unbranded practice jersey, soft consistent studio light, warm neutral background, clean shapes readable at 64 pixels, no lettering, no real person likeness.” Variation is demographic and personal, never tied to hidden performance. Final prompts must match the approved visual sample.

Facility brief: same angle and footprint across states; a modest functional starting building, visibly under-construction state, and credible completed upgrade. Avoid depicting a grand national complex for a small first investment.

## 5. Asset contract and budgets

Manifest fields: asset ID, family, version, original source/provenance, prompt when generated, usage/license notes, source path, derivative paths/dimensions/bytes, crop anchor, fallback, and allowed state triggers. Art assignment is saved or deterministic from public identity fields; it cannot leak latent ratings.

Initial targets: under 40KB per 256px portrait, under 100KB per compact facility illustration, under 250KB for optional large scene, and under 500KB of initially requested art on Home. These are production targets to measure, not current bundle claims. Lazy-load off-screen art; bundle required assets locally for offline use. Layout reserves aspect ratios to avoid content jumps.

Motion: short optional transitions, no blocked controls while celebrations run, no mandatory reveal delays. Respect reduced motion. Haptics may be evaluated in the iOS shell later; they are not required for understanding.

## 6. Review and delivery gates

1. Produce B02's five screens with identical fixed content at 390×844 and desktop widths. Use simple jersey/mark placeholders initially.
2. Verify the first useful action, legible money/uncertainty, and complete navigation before choosing artwork.
3. Review six portrait studies, one staff comparison, and one facility progression in the actual small card sizes.
4. Integrate approved families; verify bust, star, injury, transfer, empty, negative-cash, and loading states without visual stigma or false promises.
5. Inspect keyboard focus, 200% text scaling, VoiceOver, reduced motion, 320px width, landscape, safe areas, and offline fallbacks. Touch targets at least 44×44 CSS pixels; native sizing verified on device.
6. Record screenshots, asset sizes, contrast results, and physical-device evidence. A pretty desktop screenshot is not completion.

The result should be visibly new because its hierarchy, people, and investment feedback are new—not solely because another background illustration was added.
