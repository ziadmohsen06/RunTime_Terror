
import Database from 'better-sqlite3';
import { createApp } from './app';
import { SystemClock } from './domain/Clock';
import { createRecurringModule } from './services/recurring/recurringModule';

const port = process.env.PORT || 3000;
const intervalMinutes = Number(
  process.env.RECURRING_CHECK_INTERVAL_MINUTES ?? '60'
);

if (!Number.isSafeInteger(intervalMinutes) || intervalMinutes < 1) {
  throw new Error('RECURRING_CHECK_INTERVAL_MINUTES must be a positive integer');
}

const db = new Database(process.env.DATABASE_PATH ?? './closet.sqlite');
db.pragma('foreign_keys = ON');

const clock = new SystemClock();

const recurring = createRecurringModule({
  clock,
  db,
  enableDemoRoutes: process.env.ENABLE_DEMO_ROUTES === 'true',
  intervalMs: intervalMinutes * 60 * 1000,
  logger: { error: (message, error) => console.error(message, error) },
});

const server = createApp({ clock, recurring, db }).listen(port, () => {
  console.log(`Server running on port ${port}`);
  recurring.scheduler.start();
});

const shutdown = () => {
  recurring.scheduler.stop();
  server.close(() => {
    db.close();
  });
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
