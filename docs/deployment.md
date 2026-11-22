# Deployment

The backend already serves the frontend (`express.static` on `/frontend`) and stores everything in one SQLite file. So the whole app is **one web service plus one persistent disk**. No separate frontend host and no database server.

## Recommended: Render (Railway works the same way)

Why: one service, a Git-connected deploy, and a persistent disk for the SQLite file. A host without a persistent disk (for example a free tier with an ephemeral filesystem) would **lose every account and item on each restart**, so do not skip the disk.

### What you must do (I cannot do these for you)

1. Create an account at <https://render.com> and connect your GitHub account to this repository.
2. Create a **Web Service** from the repo with:
   - **Root Directory:** `backend`
   - **Runtime:** Node (use Node 22, the version used in development)
   - **Build Command:** `npm install && npm run build`
     (`npm run build` runs `tsc`, which also compiles the tests, so the dev dependencies must be installed. A plain `npm install` does that unless `NODE_ENV=production` is set at build time.)
   - **Start Command:** `npm start` (runs `node dist/src/server.js`)
   - **Health Check Path:** `/health`
3. Add a **Disk** (paid instance type required on Render): mount path `/var/data`, size 1 GB is plenty.
4. Set the **Environment Variables**:

   | Variable | Value |
   | --- | --- |
   | `JWT_SECRET` | a long random value, generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Required: the server refuses to start without it. Never reuse your local one. |
   | `DATABASE_PATH` | `/var/data/closet.sqlite` (must be on the disk from step 3) |
   | `ENABLE_DEMO_ROUTES` | `false` |
   | `NODE_VERSION` | `22` (Render setting; optional if the default works) |
   | `RECURRING_CHECK_INTERVAL_MINUTES` | optional, default `60` |

   Do **not** set `PORT`: Render provides it and the server reads `process.env.PORT`.
5. Deploy, then open `https://<your-service>.onrender.com/login.html`.

### Checked locally

The production path was run on a development machine: `npm run build`, then
`PORT=3100 JWT_SECRET=... DATABASE_PATH=<file> ENABLE_DEMO_ROUTES=false npm start`.
Result: `/health` returns `{"status":"ok"}`, `/recurring.html` is served, registration and login work, the SQLite file is created at `DATABASE_PATH`, and `POST /recurring-tasks/run-check` returns 404. The actual host (Render) was **not** deployed or tested.

## Production checklist

- [ ] `JWT_SECRET` set to a fresh random value (not in the repo, not the example value)
- [ ] `ENABLE_DEMO_ROUTES=false`
- [ ] `DATABASE_PATH` points into the persistent disk
- [ ] Only **one** instance of the service (SQLite is a single file; do not scale out)
- [ ] `.env` is not committed (it is in `.gitignore`)
- [ ] `/health` returns 200 after deploy
- [ ] Register, add a weekly task, restart the service, and confirm the task is still there

## Keeping demo routes on for a live demo

`POST /recurring-tasks/run-check` (optionally `{"asOf": "YYYY-MM-DD"}`) generates the next week's occurrences on demand, which is handy to show the weekly generation without waiting a week.

1. In the Render dashboard, set `ENABLE_DEMO_ROUTES` to `true` and save (the service redeploys).
2. Demo it, for example from the Postman collection, with a valid login token:
   `POST https://<your-service>.onrender.com/recurring-tasks/run-check` with `{"asOf": "2026-11-30"}`, then reload the Recurring tasks page and pick that week.
3. **Set it back to `false` afterwards** and save. While it is on, any logged-in user can call it.

Locally, the default `.env` (copied from `.env.example`) already has it `true`.

## Not covered

- A custom domain and HTTPS certificate management (Render gives HTTPS on the `onrender.com` URL).
- Backups of the SQLite file (Render disk snapshots, or download the file before risky changes).
- The in-app reminders are not email or push; nothing extra to deploy for them.
