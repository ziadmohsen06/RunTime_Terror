# Closet, Laundry and Outfit Management System

Software Construction and Testing, Winter 2026. **Layered architecture** (monolithic deployment).

## Structure

```
backend/
  src/
    api/            controllers, routes, middleware, validators (no business logic)
    services/       one folder per module: items, outfits, laundry, ironing, recurring, insights
    repositories/   interfaces/ (what services depend on) and implementations/
    domain/         entities, enums, errors shared by all layers
    config/         env and database config
    app.ts          composition root: wires repository -> service -> controller per module
  tests/            unit/ and e2e/
frontend/           reserved for the M3 frontend integration
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
cp .env.example .env
npm run dev            # http://localhost:3000/health
npm test               # all tests
npm run test:unit
npm run test:e2e
npm run test:coverage
```

## Frontend milestone

The M2 beta is backend-only. Frontend implementation and integration are
reserved for Milestone 3; `frontend/` contains only the original placeholder.

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

SQLite repositories and their restart/contract tests are included, but this
repository does not yet contain the shared database module. Therefore the
current server and default `createApp()` use in-memory repositories: data does
not survive a server restart until the shared database is injected. The SQLite
repositories accept an injected `better-sqlite3` connection, and the module
initializes its schema when one is supplied.

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

## Adding your module (copy the Items example)

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
- `ItemController.userId()`: hardcoded to 1 until auth middleware exists.
