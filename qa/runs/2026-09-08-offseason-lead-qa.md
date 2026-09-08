# Lead QA: offseason follow-up

2026-09-08. Based on the [diehard](2026-09-08-offseason-diehard.md) and [newcomer](2026-09-08-offseason-newcomer.md) reports. Both are brokered simulated personas, not human usability tests.

**Assessment:** Keep the new offseason sequence. Both players understood a school comparison, negotiated a guarantee, reconciled the commission, and verified the destination next year. Their stated desire to continue now comes from meaningful offseason agency work. This supports the direction, not a claim of proven retention or balanced economics.

## Completed fixes — do not reopen as build items

Root reports these fixes completed during the follow-up:

- Returning-client recap now respects the committed destination and agreement status.
- Used counters show their exhausted state instead of a hypothetical next ask.
- Receipts distinguish payment during the current offseason from the next football season.
- A free draft baseline explains signing income and subsequent roster uncertainty before paid research.
- Handoff summarizes the paid agreement rather than describing it as future business.

Evidence is mixed and should remain explicit: automated UI regression covers the recap, counter label, and payout; both browser sessions observed the clarified receipt and correct school handoff. Neither persona replayed the corrected original payout recap or independently verified the replaced counter label. Root reported 126 tests and the build passing before the final handoff-copy edit; final focused/build verification was still running when this report was written.

## Ordered next steps

1. **Test the difficult branches before changing rewards.** Both sessions had loyal clients, successful renewal, a successful counter, and a signed transfer to Mountain Tech. Next, run one focused UI session with an at-risk client: verify renewal cost/risk, then exercise a rejected school counter and choose an available fallback with a retained client. Separately let an offer expire. Confirm the player understands what was lost, what remains available, and the financial consequences. Automated coverage does not replace this comprehension check. Do not force outcomes by changing the live save.

2. **Show effective renewal benefits.** Both clients had 98 trust and guaranteed free renewal, making a paid nominal +8 trust misleading about its useful increment. Show current headroom and actual capped benefit beside the price; keep the free current-terms choice obvious. Acceptance: the quote matches the eventual trust change, and no extra training/retention benefit is implied when none applies. No reward changes are needed.

3. **Sample school alternatives before introducing tradeoff mechanics.** Mountain Tech was superior on most displayed measures in both draws. That is a hypothesis about offer variety, not proof every market is trivial. Compare offers for a benched prospect, a strong starter, and different client priorities. Check whether playing time, guarantee, exposure, priority fit, and agency cost create assessable reasons to choose differently. Only if the pattern persists, propose one bounded adjustment using existing factors; do not add scheme/adaptation systems merely to manufacture friction.

4. **Verify the draft explanation with an unfamiliar player.** The newcomer avoided $24,000 research. The free baseline is now implemented; test whether a player can explain its uncertain income path and what paid research adds before considering a price change. An expensive information purchase being declined does not establish incorrect pricing.

**Preserve:** Earned renewal, school/representation separation, explicit deadlines and commitment locks, projected snaps, client/agency income split, finite school budgets, counter risk and fallbacks, paid guarantees separate from sponsors, and the actual next-year destination. Defer broader economy balancing, new portal subsystems, and further offseason compression until these narrower checks justify them.

## Final verification

The final handoff-copy change passed the nine AgencyGame UI tests and a fresh production build. The complete web suite passed 126 tests across 19 files before that copy-only adjustment. Browser walkthroughs verified both transfer paydays and destination/role/eligibility handoffs; the updated payment-year receipt was observed. Root checked desktop and phone-width handoff layouts, with no horizontal page overflow at the observed 375px phone viewport and no captured browser errors. The old draft recap correction and spent-counter control replacement passed the UI regression; those earlier states were not replayed in the beta browsers. The Vite build retains its existing public portrait asset resolution warning; the file exists in public. Changes are local and have not been pushed or published in this task.
