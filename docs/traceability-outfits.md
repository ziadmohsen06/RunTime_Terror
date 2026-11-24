# Traceability: Outfits and Matching (FR2, NFR2)

Maps each user story to the tests that cover it. All paths are relative to `backend/`.

**Source of the stories.** `docs/Milestone1_Idea_and_Architecture.pdf` contains FR2 (outfit building and ranked suggestions) and NFR2 (extensibility of the matching rules). The remaining stories (marked **derived**) break FR2/NFR2 down into the things a user can actually do on the two Outfits pages. **Please check the derived ones against the M1 PDF / your team's story list.**

Short names used below:

- **SVC** = `tests/unit/outfits/OutfitService.test.ts` (covers both `OutfitService` and `SuggestionService`)
- **CONTRACT** = `tests/unit/contracts/outfitRepositories.contract.test.ts`
- **E2E** = `tests/e2e/outfits.e2e.test.ts`
- **E2E-ERR** = `tests/e2e/outfits.errors.e2e.test.ts` (added in M3)
- **PAGES** = `tests/unit/frontend/pages.test.ts`

## Stories

| ID | Source | User story |
| --- | --- | --- |
| US-O1 | M1 FR2 | As a user, I want to build an outfit from my own clean items so that I can save a look and wear it later. |
| US-O2 | M1 FR2 | As a user, I want ranked outfit suggestions for an occasion and season so that I can decide what to wear from what is actually clean. |
| US-O3 | derived | As a user, I want to see my saved outfits, with each item's current status, so that I know if one needs rewashing before I wear it again. |
| US-O4 | derived (NFR4) | As a user, I want to see and build only with my own items, never someone else's. |
| US-O5 | derived | As a user, I want a clear error when I try to use a dirty or ironing item, so that I know why my outfit was not saved. |
| US-O6 | derived | As a user, I want a clear message when no outfit can be built yet, so that I know to add more clean items rather than assume something broke. |
| US-O7 | derived | As a user, I want a clear error when I ask for an occasion or season that does not exist, so that I can correct my request instead of getting a silent empty result. |
| US-O8 | derived (NFR4) | As a user, I want to be asked to log in before I can see or change my outfits, so that nobody else can use my account. |
| US-O9 | M1 NFR2 | As a user, I want the matching rules (occasion fit, season fit, color match) to be easy to extend with a new rule, without the ranking engine itself changing. |
| US-O10 | derived | As a user, I want a page where I can do all of this in light or dark mode. |

## Story to test

| Story | Test file | Test name |
| --- | --- | --- |
| US-O1 | E2E | saves an outfit and lists it with its items |
| US-O1 | SVC | saves an outfit made of the user's clean items |
| US-O1 | SVC | keeps the occasion and season an outfit was built for |
| US-O1 | PAGES | `outfit-builder.html` loads the auth client / calls the API through `authFetch` |
| US-O2 | E2E | suggests ranked outfits and leaves out DIRTY and IRONING items |
| US-O2 | SVC | ranks the outfit that fits best first |
| US-O2 | SVC | reports the score of each rule |
| US-O2 | PAGES | `outfit-suggestions.html` loads the auth client / calls the API through `authFetch` |
| US-O3 | SVC | shows the current status of an item that went to the wash after saving |
| US-O4 | SVC | shows only the caller's outfits |
| US-O4 | SVC | rejects an item owned by someone else |
| US-O4 | SVC | never suggests another user's items |
| US-O5 | E2E | refuses to build an outfit with a %s item (DIRTY, IRONING) |
| US-O5 | E2E-ERR | rejects building an outfit with a dirty item, naming the item |
| US-O5 | E2E-ERR | rejects building an outfit with an item still at the ironing stage |
| US-O5 | SVC | rejects an item that is %s (every non-CLEAN status) |
| US-O6 | SVC | returns nothing when the only top is dirty |
| US-O6 | E2E-ERR | returns an empty list, not an error, when no outfit can be built |
| US-O7 | E2E | rejects the query %j (bad occasion, bad season, bad limit) |
| US-O7 | E2E-ERR | rejects an invalid suggestions query %j |
| US-O7 | E2E-ERR | rejects an unknown occasion or season when creating an outfit |
| US-O7 | SVC | rejects an unknown occasion or season |
| US-O7 | SVC | rejects an invalid %s (occasion, season, limit) |
| US-O8 | E2E-ERR | requires login for %s %s (every outfits route) |
| US-O8 | E2E-ERR | rejects a request with a garbage bearer token the same way as a missing one |
| US-O9 | SVC | uses rules it is given, so a new rule changes the ranking |
| US-O10 | — | Visual/manual check: both pages use `theme.css`'s `[data-theme]` tokens and `shell.js`'s theme toggle, same as every other page. |

## Notes for the team

- **Strategy pattern**: `MatchingRule` (occasion, season, color — see `src/services/outfits/matching/`) is the strategy interface; `MatchingEngine` only knows how to sum scores from whatever list of rules it is given (`createDefaultRules()`). The `SVC` test *"uses rules it is given, so a new rule changes the ranking"* proves this directly — it hands the engine an extra ad-hoc rule and shows the ranking changes with no edit to `MatchingEngine` itself. That is what satisfies NFR2.
- **Repository pattern + DI**: `IOutfitRepository` has both an in-memory and a SQLite implementation (`CONTRACT` runs the same behavior contract against both), selected in `outfitModule.ts`'s composition root — the service never knows which one it got.
- The frontend rebuild for M3 (`outfit-builder.html`/`.js`, `outfit-suggestions.html`/`.js`) added no new backend behavior, so it needed no new unit tests beyond `PAGES` and `E2E-ERR` above — the service layer was already fully covered.
