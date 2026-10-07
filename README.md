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
frontend/           React app (see below)
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

## Frontend

Create it once (one person), then commit:

```bash
npm create vite@latest frontend -- --template react-ts
```

Organize it by feature: `src/features/items`, `outfits`, `laundry`, `ironing`, `recurring`, `insights`, plus `shared`.

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
