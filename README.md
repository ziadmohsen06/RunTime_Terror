# Closet, Laundry and Outfit Management System

Software Construction and Testing, Winter 2026. **Layered architecture** (monolithic deployment).

## Structure

```
backend/
  src/
    api/            controllers, routes, middleware, validators (no business logic)
        services/       one folder per module: items, outfits, laundry, ironing, recurring, wearlog
    repositories/   interfaces/ (what services depend on) and implementations/
    domain/         entities, enums, errors shared by all layers
    config/         env and database config
    app.ts          composition root: wires repository -> service -> controller per module
  tests/            unit/ and e2e/
frontend/           static pages served by the backend (items test page, outfit pages); full UI is M3
docs/               M1 document, diagrams, user stories
```

## Layer rules

1. Controllers only parse the request and call a service.
2. Services hold all business rules and depend on repository **interfaces**, never concrete classes.
3. Only repository implementations touch the database.
4. All errors extend `AppError` and go through the error handler (`{ "error": { "message": "..." } }`).

## Run (backend)

```bash
cd backend
npm install
cp .env.example .env   # then set JWT_SECRET in it (see "Auth module")
npm run dev            # http://localhost:3000/health
npm test               # all tests
npm run test:unit
npm run test:e2e
npm run test:coverage
```

## Frontend milestone

The M2 beta is backend-first. `frontend/` holds small static pages served by
Express (`index.html` for closet items, `outfit-builder.html` and
`outfit-suggestions.html` for outfits). The full frontend and integration are
reserved for Milestone 3.

## Auth module

Register and log in with an email and a password. Passwords are stored only as bcrypt hashes
(`bcryptjs`). A login returns a signed token (JWT, valid for 1 hour) that the frontend sends as
`Authorization: Bearer <token>` on every call.

User story: As a user, I want my own account, so that only I can see and change my closet.

### Setup

Open `backend/.env` and set `JWT_SECRET=` to a long random value. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start without it, and there is no default. `.env` is git-ignored: never
commit it. Tests set their own secret in `tests/helpers/testEnv.ts`.

### Pages

With `npm run dev` running, open `/`. A visitor without a valid token is sent to `/login.html`,
where they can log in or choose **Create account**. Every page loads `auth.js`, which keeps the
token in the browser, shows who is logged in with a **Log out** button, and sends the visitor
back to the login page when the token is missing or expired.

### API

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /auth/register` | `{ "email": "a@b.com", "password": "at least 8 characters" }` | 201 and `{ id, email }`; 400 for a bad email or a short password; 409 if the email is taken |
| `POST /auth/login` | `{ email, password }` | 200 and `{ token, user }`; 401 for a wrong password or an unknown email (same message for both) |

Every other route needs the token: a missing, invalid, tampered or expired token gets 401.
`/auth/*`, `/health` and the static pages are public.

### How other modules use it

- **Controllers:** `userId(req)` returns `currentUserId(req)` (from `api/middleware/authenticate.ts`).
  It throws 401 if no user was recorded, so a route can never run as the wrong user.
- **E2E tests:** `authedAgent(app)` from `tests/helpers/auth.ts` registers a fresh user through the
  real endpoints and returns a supertest agent that sends the token on every call. The first user in
  a new app has id 1. A test that needs two users calls it twice.
- **Pages:** load `<script src="auth.js"></script>` in the head and call `authFetch(...)` instead of
  `fetch(...)`. `tests/unit/frontend/pages.test.ts` fails for any page that does not.

### Rules

- Emails are trimmed and lowercased. A password needs at least 8 characters.
- A wrong password and an unknown email give the same error, so nobody can find out which emails
  have accounts.
- The token algorithm is pinned (HS256). A changed payload, a different secret or an expired token
  is rejected.
- The `users` table has `id`, `email` (unique) and `password_hash`. `initUserSchema` creates it.

### Design

- **SRP:** `PasswordHasher` hashes, `TokenService` signs and checks tokens, `AuthService` holds the
  register and login rules, `AuthController` only parses requests.
- **DIP:** `AuthService` depends on `IUserRepository`; `authModule.ts` does the wiring.
- **LSP:** the in-memory and SQLite user repositories pass the same contract tests.

### Tests

- Unit: `tests/unit/auth/` (hashing and verifying, token signing, tampered, expired and wrong-secret
  tokens, the register and login rules including "stored hashed and still verifies"),
  `tests/unit/api/authenticate.test.ts` (the middleware) and `tests/unit/frontend/` (the browser
  client and the page checks).
- Contract: `tests/unit/contracts/userRepositories.contract.test.ts`.
- E2E: `tests/e2e/auth.e2e.test.ts` (register, login, 401 on every protected area, bad, tampered and
  expired tokens, users only see their own data).

## Items module

Stores closet items. Every item has one status: `clean`, `dirty`, `in_laundry`,
`washing`, `drying` or `ironing`. New items start `clean`.

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /items` | `{ name, category, color, season, fabric }` | 201 and the item |
| `GET /items?category=&color=&season=&status=` | optional filters | 200 and the caller's items |
| `GET /items/:id` | — | 200 and the item; 404 if missing or not the caller's |
| `PATCH /items/:id/status` | `{ "status": "dirty" }` | 200 and the updated item; 400 for an unknown status |

`ItemService.updateStatus` is the only place an item's status is written; the
laundry module calls it instead of touching the repository.

## Laundry module

Groups dirty items into loads by color group and fabric group and moves each load
through `pending`, `washing`, `drying` and `done`. Item status follows the load
(State pattern in `services/laundry/status`). Loads are stored in SQLite when the
server runs. When a load is done it asks the ironing module whether each fabric
needs ironing and hands those items over (see the Ironing module).

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /laundry/items/:itemId/dirty` | — | 200 and the item, now dirty |
| `GET /laundry/dirty-items` | — | 200 and the caller's dirty items |
| `GET /laundry/loads` | — | 200 and the caller's loads |
| `POST /laundry/loads` | `{ "itemIds": [1, 2] }` | 201 and the new load |
| `POST /laundry/loads/:loadId/advance` | — | 200 and the load at its next stage |
| `DELETE /laundry/loads/:loadId/items/:itemId` | — | 200 and the load without that item |

## Ironing module

When a laundry load is done, items whose fabric needs ironing go to the ironing queue instead of
straight back to the closet. Each queued item shows how to iron it. Marking an item as ironed moves
it from the queue to `clean`.

User story: As a user, I want to see which of my washed clothes need ironing and at what
temperature, so that I can iron them without damaging them.

### Page

`/ironing.html` lists the queue with each item's iron temperature, the care notes (for example
"Use steam") and a **Mark as ironed** button. Every page links to it.

### API

| Method and path | Response |
| --- | --- |
| `GET /ironing` | 200 and the caller's queue: `[{ item, temperature, notes }]` |
| `POST /ironing/items/:itemId/ironed` | 200 and the item, now `clean`; 400 for a bad id; 404 if the item does not exist; **403 if it is another user's item**; 409 if it is not waiting to be ironed |

### How it works with Laundry

- The queue is simply the user's items whose status is `ironing`; nothing else is stored. Laundry sets
  that status, and only this module moves an item on to `clean` (through `ItemService.updateStatus`).
- Laundry depends on two small interfaces from `services/laundry/ports.ts`, and this module provides
  them: `CareRules.needsIroning(fabric)` (`FabricCareRules`) and `IroningQueue.enqueue(userId, itemId)`
  (`IroningService`). `enqueue` checks the handover: the item is the caller's and is in `ironing`.
- Only linen and silk need ironing today. Change the `NEEDS_IRONING` list in
  `services/ironing/FabricCareRules.ts` (the Laundry tests rely on cotton going straight to `clean`).

### Care instructions (Decorator pattern)

`CareInstruction` has `getTemperature()` and `getNotes()`. `FabricCare` gives a fabric's hottest safe
temperature; `SteamDecorator` and `LowHeatDecorator` (both extend `CareDecorator`) wrap it and change
one thing each. `FabricCareRules.instructionsFor(fabric)` builds the chain:

| Fabric | Temperature | Notes |
| --- | --- | --- |
| linen | 230 °C | Use steam |
| cotton, denim | 200 °C | Use steam |
| wool, cashmere | 150 °C | Use steam |
| silk, satin, chiffon, lace, polyester, nylon, acrylic | 110 °C | Use the low heat setting |
| any other fabric | 150 °C | none |

To add a fabric, add it to the lists at the top of `FabricCare.ts` and `FabricCareRules.ts`.

### Security (NFR)

Each user only sees and changes their own queue: another user's item gets **403**. The rule lives in
`IroningService` and is tested in `IroningService.test.ts` and `ironing.e2e.test.ts`.

### Programming styles and design

- Declarative: the lookup tables for temperatures and for which fabrics get which extras.
- Imperative: `instructionsFor` wraps the care step by step.
- **Decorator:** `SteamDecorator` and `LowHeatDecorator` extend `CareDecorator`.
- **DIP / ISP:** `IroningService` depends on the small `IroningItemReader`, `ItemStatusUpdater` and
  `CareInstructionProvider` interfaces, not on concrete classes.

### Tests

Unit: `tests/unit/ironing/` (`FabricCare`, `FabricCareRules`, `IroningService`). E2E:
`tests/e2e/ironing.e2e.test.ts` (runs items through the real laundry flow; 403 for another user).
Frontend: `tests/unit/frontend/pages.test.ts` checks the page and the links to it.

## Recurring Tasks module

The module is organized into domain entities/enums, small repository interfaces
and in-memory/SQLite implementations, `RecurringTaskService`,
`ReminderService`, the `WeeklyScheduler`, and separate API controllers/routes.

### API

All responses are JSON except successful task deletion (204). Errors use
`{ "error": { "message": "..." } }`.

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /recurring-tasks` | `{ "title": "Laundry day", "dayOfWeek": "SATURDAY" }` | 201 and the created recurring task |
| `GET /recurring-tasks` | — | 200 and the caller’s active tasks |
| `DELETE /recurring-tasks/:id` | — | 204; deactivates the task |
| `GET /occurrences?period=2026-W45` | Optional ISO week key | 200 and caller-owned occurrence views (`id`, task id/title/day, period, due date, status) |
| `POST /occurrences/:id/complete` | — | 200 and the completed occurrence |
| `GET /reminders` | — | 200 and caller-owned reminders (unread first, newest first) |
| `POST /reminders/:id/read` | — | 200 and the updated reminder |
| `POST /recurring-tasks/run-check` | Optional `{ "asOf": "YYYY-MM-DD" }` | 200 and `{ "periodKey", "created", "skipped" }` |

The demo run-check endpoint is available only when
`ENABLE_DEMO_ROUTES=true`. The supplied `.env.example` enables it for local
demos.

### Generation and reliability

Period keys use ISO-8601 weeks computed in UTC. Due dates are UTC calendar
dates; a task whose weekday has already passed still generates an occurrence
for that week, where it can be treated as overdue by a future frontend.
Creating a weekly task also creates its current-week occurrence and an in-app
reminder immediately.

The repository enforces uniqueness for `(recurring_task_id, period_key)` and
for each reminder’s `occurrence_id`. A weekly check uses conflict-safe inserts
and always attempts reminder creation for an occurrence, allowing a later run
to repair a missing reminder. The scheduler runs once immediately after the
server starts listening and then at
`RECURRING_CHECK_INTERVAL_MINUTES` (default 60); it skips overlapping runs,
logs failures, and stops on SIGINT/SIGTERM.

The server (`server.ts`) opens one shared SQLite database (`DATABASE_PATH`,
default `./closet.sqlite`) and passes it to every module, so recurring tasks
survive a restart. `createApp()` without a database falls back to in-memory
repositories, which is what most tests use. The in-memory and SQLite
repositories pass the same contract tests.

Reminders are in-app only. No email, push notification, or Observer-based
notification mechanism is implemented in this milestone.

### Programming styles and design

- **Declarative:** pure UTC period and due-date functions; `map`/`filter` for
  occurrence views; `reduce` for run summaries; unread/newest reminder ordering;
  SQL `WHERE` and `ORDER BY` clauses in SQLite repositories.
- **Imperative:** the generation loop in `runWeeklyCheck`, scheduler timer and
  in-flight state, and request/service validation with early exits.
- **SRP:** recurring-task rules, reminder rules, and scheduling live in
  separate classes.
- **OCP/LSP:** services use repository interfaces; in-memory and SQLite
  implementations share the same contract tests.
- **ISP/DIP:** repositories expose small focused interfaces, and services
  receive those interfaces plus the `Clock` abstraction through constructors.

The backend uses Express, Jest, Supertest, and `better-sqlite3` (plus its type
definitions).

## Outfits module

Builds outfits and suggests ranked ones. Items are read only through `ItemService`,
behind the small `IItemReader` interface, so this module can never change an item.
Only items with status `clean` can be used: every other status (`dirty`, `in_laundry`,
`washing`, `drying`, `ironing`) is left out of suggestions and refused when building.

### Pages

With `npm run dev` running, open `/outfit-builder.html` to pick items and save an
outfit, and `/outfit-suggestions.html` to choose an occasion and season.

### API

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /outfits` | `{ "name": "Friday", "itemIds": [1, 2] }` | 201 and the outfit with its items |
| `GET /outfits` | — | 200 and the caller's outfits, newest first, with each item's current status |
| `GET /outfits/suggestions?occasion=work&season=winter&limit=5` | `limit` is optional, 1 to 20, default 5 | 200 and ranked `{ items, totalScore, breakdown }` |

Building fails with 400 if an item is not clean, 403 if it belongs to someone else, and
404 if it does not exist.

### Matching decisions

These tables are the team's agreed rules. The code version is
`services/outfits/matching/matchingTables.ts`: change both together.

Item text is compared in a standard form, so `Tops`, `T-Shirt`, `Light Blue` and
`All Season` all work. Occasions are `casual`, `work`, `formal` and `sport`.

**Which categories fit which occasion**

| Slot | Category | Casual | Work | Formal | Sport |
| --- | --- | --- | --- | --- | --- |
| Top | top | yes | yes | | |
| Top | t-shirt | yes | | | yes |
| Top | shirt, blouse | yes | yes | yes | |
| Top | sweater | yes | yes | | |
| Top | hoodie | yes | | | yes |
| Bottom | bottom, chinos | yes | yes | | |
| Bottom | jeans | yes | | | |
| Bottom | trousers, skirt | yes | yes | yes | |
| Bottom | shorts, sweatpants, leggings | yes | | | yes |
| Full | dress | yes | yes | yes | |
| Full | suit | | yes | yes | |
| Outerwear | blazer, coat | yes | yes | yes | |
| Outerwear | jacket | yes | | | yes |
| Shoes | shoes, boots | yes | yes | | |
| Shoes | sneakers | yes | | | yes |
| Shoes | dress shoes, heels | | yes | yes | |
| Shoes | loafers | yes | yes | yes | |
| Shoes | sandals | yes | | | |

Also accepted: pants (trousers), tee (t-shirt), jumper (sweater), joggers (sweatpants),
trainers (sneakers), and plurals. A category outside this table, such as `scarf`, can go
in an outfit you build yourself but is never suggested.

**Which colors match**

- A color always matches itself.
- Neutrals match everything: black, white, grey, navy, beige, brown.
- These pairs also match: blue with orange, yellow, pink, green or red; red with pink;
  green with yellow; orange with yellow; purple with yellow or pink.
- Anything else clashes, for example red with green or pink with orange.
- Shades reduce to a base color: denim counts as navy; cream, tan and khaki as beige;
  burgundy and maroon as red; olive as green; teal and turquoise as blue; lilac as purple.

### How suggestions are scored

1. Keep the user's clean items and sort them into slots.
2. Keep the best 6 items per slot, so a large closet stays fast.
3. Build candidates: a top with a bottom, or one dress or suit, each with and without
   shoes and outerwear.
4. Each rule scores a candidate from 0 to 100, and the engine adds the scores:
   - **Occasion:** the share of items that fit the occasion.
   - **Season:** the share of items made for that season or for all seasons.
   - **Color:** the share of item pairs that match.
5. Rank by total, then by the more complete outfit, then by item id so the order never changes.
6. Drop any outfit that is only part of a better one, then return the top `limit`.

### Adding a rule (NFR2)

Write a class that implements `MatchingRule`, then add it to `createDefaultRules()` in
`matching/defaultRules.ts`. `MatchingEngine` does not change: it only knows the interface.
`MatchingEngine.test.ts` proves this with a dummy rule that exists only in the test.

### Programming styles and design

- **Strategy pattern:** each rule is a replaceable `MatchingRule`, chosen in one place.
- **Declarative:** the matching tables, `map`/`filter`/`reduce` in the rules and engine,
  and SQL in the repository.
- **Imperative:** the nested loops in `buildCandidates` and the early-exit loop in
  `pickDistinct`.
- **SRP:** rules score, the engine ranks, `candidates.ts` combines, and `OutfitService`
  applies the business rules.
- **OCP:** new rules need no engine change.
- **LSP:** in-memory and SQLite repositories pass the same contract tests.
- **ISP/DIP:** `OutfitService` depends on `IItemReader` and `IOutfitRepository`, not on
  concrete classes.

## Adding your module (copy the Items example)

## Wear Log module

Lets a user log what they wore (items and a date) and shows wear stats: most worn,
least worn, items not worn in the last 90 days, and a summary of the current week.
Logs are stored in SQLite when the server runs.

User story: As a user, I want to log what I wear and see my wear stats, so that I know
which clothes I wear the most and which ones I never wear.

### Page

With `npm run dev` running, open `/wear-log.html`.

### API

| Method and path | Request | Response |
| --- | --- | --- |
| `POST /wearlog` | `{ "itemIds": [1, 2], "wornOn": "2026-11-06" }` (`wornOn` optional, default today) | 201 and the log |
| `GET /wearlog` | — | 200 and the caller's logs, newest first |
| `GET /wearlog/stats` | — | 200 and `{ mostWorn, leastWorn, notWornIn90Days, weeklySummary }` |

Logging fails with 400 for no items, a repeated item, a badly written date or a future date,
403 if an item belongs to someone else, and 404 if it does not exist.

### Rules

- **Not worn in 90 days:** never worn, or last worn more than 90 days before today
  (worn exactly 90 days ago still counts as recent).
- **Weekly summary:** the current Monday-to-Sunday week (UTC).
- **Most and least worn:** top 5 each; least worn includes items worn 0 times; ties are broken by item id.
- Logging a wear **never changes item status**. The module reads items through
  `IWearItemReader`, which has no way to change them.
- "Today" always comes from the shared `Clock`, never from `new Date()`, so tests can set the date.

### Performance (NFR3)

All stats are computed in one pass over the logs with `reduce` (no nested loops), and
SQLite reads a user's logs with one indexed query. A unit test checks that the report
for 1,000 wear logs is built in under 3 seconds.

### Programming styles and design

- **Declarative:** `flatMap`/`reduce` for counting, `map`/`filter`/`sort` for the lists,
  pure date helpers in `dates.ts`, and SQL `JOIN`/`ORDER BY` in the SQLite repository.
- **Imperative:** the validation loop in `requireOwnItems` that stops at the first bad item.
- **SRP:** the controller parses requests, `WearLogService` holds the rules, repositories store logs.
- **LSP:** the in-memory and SQLite repositories pass the same contract tests.
- **ISP/DIP:** `WearLogService` depends on `IWearItemReader`, `IWearLogRepository` and `Clock`, not on concrete classes.

### Tests

- Unit: `tests/unit/wearlog/WearLogService.test.ts` (counts, 90-day boundary at 89/90/91 days,
  weekly summary, validation, status unchanged, NFR3 performance).
- Contract: `tests/unit/contracts/wearLogRepositories.contract.test.ts`.
- E2E: `tests/e2e/wearlog.e2e.test.ts` (happy path, errors, page served).
1. Add entities/enums to `domain/`.
2. Write the repository interface in `repositories/interfaces/` and an in-memory implementation.
3. **Write the unit test first**, then the service in `services/<your-module>/`.
4. Add a controller and routes, and register them in `app.ts`.
5. Add an E2E test in `tests/e2e/`. Reference your user story in a comment on each test.

## Team rules

- Work on feature branches (`feature/<module>-<what>`), merge through pull requests, never push to `main`.
- Commit the failing test before the code that makes it pass (this is our TDD evidence).
- Item `status` is changed only by the Laundry module. Items just stores it.
- Shared tables (users, items): tell the team before changing them.

## Temporary parts to replace

- `InMemoryItemRepository`: swap for a database-backed repository.
