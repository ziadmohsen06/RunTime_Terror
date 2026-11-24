# Traceability: Closet Items (FR1 in the item tests)

Maps each user story to the tests that cover it. All paths are relative to `backend/`.

**Source of the stories.** `docs/Milestone1_Idea_and_Architecture.pdf` has no separate closet-items story, so these are **derived** from the existing `ItemService` tests and the Closet Items page (`frontend/items.html`). **Please check them against your team's story list.**

- **SVC** = `tests/unit/ItemService.test.ts`
- **E2E** = `tests/e2e/items.e2e.test.ts`
- **SQLITE** = `tests/unit/contracts/sqliteItemRepository.contract.test.ts`
- **PAGES** = `tests/unit/frontend/pages.test.ts`

| ID | User story | Tests |
| --- | --- | --- |
| US-I1 | As a user, I want to add a clothing item (name, category, color, season, fabric) so that my closet is recorded. | SVC `adds an item with status clean`; E2E `creates and lists items`; SQLITE `creates an item with CLEAN status` |
| US-I2 | As a user, I want a clear error when I leave a required field empty so that I can fix it. | SVC `rejects an item without a name / category / color / season / fabric`; E2E `returns a consistent error for invalid input` |
| US-I3 | As a user, I want to filter my items by category, color and season so that I can quickly find what to wear. | SVC `filters items by category / color / season / multiple criteria`; SQLITE `filters items by category / color` |
| US-I4 | As a user, I want filters to ignore capital letters so that "Shirt" and "shirt" find the same items. | SVC `... ignoring letter case`; SQLITE `... ignoring letter case`; E2E `filters items ignoring letter case` |
| US-I5 | As a user, I want to filter my items by status (clean, dirty, in laundry, ironing) so that I can see what is ready to wear. | SVC `filters items by status`; E2E `filters items by status through the API` |
| US-I6 | As a user, I want to see only my own items so that my closet stays private. | SVC `returns only items belonging to the specified user`; SQLITE `returns only items belonging to the requested user` |
| US-I7 | As a user, I want to open one item and get a 404 if it does not exist so that I know it is gone. | SVC `gets an item by its ID`; E2E `gets one item by id`, `returns 404 for a missing item and 400 for a bad id` |
| US-I8 | As a user, I want to be sent to the login page when my session has expired so that I can log in again. | E2E `rejects a request without a token`; PAGES `items.html loads the auth client in its head` |
