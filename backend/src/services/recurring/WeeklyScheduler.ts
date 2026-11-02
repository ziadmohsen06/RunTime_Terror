export interface SchedulerLogger {
  error(message: string, err: unknown): void;
}

export class WeeklyScheduler {
  private timer: NodeJS.Timeout | undefined;
  private inFlight = false;

  constructor(
    private readonly runCheck: () => Promise<unknown>,
    private readonly intervalMs: number,
    private readonly logger: SchedulerLogger
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    void this.executeCheck();
    this.timer = setInterval(() => void this.executeCheck(), this.intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async executeCheck(): Promise<void> {
    if (this.inFlight) {
      return;
    }

    this.inFlight = true;
    try {
      await this.runCheck();
    } catch (error) {
      this.logger.error('Weekly recurring-task check failed', error);
    } finally {
      this.inFlight = false;
    }
  }
}
