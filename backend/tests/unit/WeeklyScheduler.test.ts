import { WeeklyScheduler } from '../../src/services/recurring/WeeklyScheduler';

describe('WeeklyScheduler', () => {
  let scheduler: WeeklyScheduler | undefined;
  const logger = { error: jest.fn<void, [string, unknown]>() };

  beforeEach(() => {
    jest.useFakeTimers();
    logger.error.mockReset();
  });

  afterEach(() => {
    scheduler?.stop();
    scheduler = undefined;
    jest.useRealTimers();
  });

  it('runs once immediately when started', async () => {
    const runCheck = jest.fn().mockResolvedValue(undefined);
    scheduler = new WeeklyScheduler(runCheck, 1000, logger);

    scheduler.start();
    await Promise.resolve();

    expect(runCheck).toHaveBeenCalledTimes(1);
  });

  it('runs again after the configured interval', async () => {
    const runCheck = jest.fn().mockResolvedValue(undefined);
    scheduler = new WeeklyScheduler(runCheck, 1000, logger);

    scheduler.start();
    await jest.advanceTimersByTimeAsync(1000);

    expect(runCheck).toHaveBeenCalledTimes(2);
  });

  it('prevents further runs after stop', async () => {
    const runCheck = jest.fn().mockResolvedValue(undefined);
    scheduler = new WeeklyScheduler(runCheck, 1000, logger);
    scheduler.start();
    await Promise.resolve();

    scheduler.stop();
    await jest.advanceTimersByTimeAsync(3000);

    expect(runCheck).toHaveBeenCalledTimes(1);
  });

  it('skips overlapping ticks while a check is in flight', async () => {
    let finishRun: (() => void) | undefined;
    const runCheck = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRun = resolve;
        })
    );
    scheduler = new WeeklyScheduler(runCheck, 1000, logger);
    scheduler.start();
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(3000);
    expect(runCheck).toHaveBeenCalledTimes(1);

    finishRun?.();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1000);
    expect(runCheck).toHaveBeenCalledTimes(2);
  });

  it('logs a failed check and continues scheduling later checks', async () => {
    const failure = new Error('database unavailable');
    const runCheck = jest.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined);
    scheduler = new WeeklyScheduler(runCheck, 1000, logger);

    scheduler.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalledWith('Weekly recurring-task check failed', failure);

    await jest.advanceTimersByTimeAsync(1000);

    expect(runCheck).toHaveBeenCalledTimes(2);
  });
});
