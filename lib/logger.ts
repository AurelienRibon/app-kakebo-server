export class Logger {
  namespace: string;
  startTime: number;
  lastTime: number;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.startTime = Date.now();
    this.lastTime = this.startTime;
  }

  log(message: string): void {
    const now = Date.now();
    const durationMs = now - this.lastTime;
    const totalDurationMs = now - this.startTime;
    this.lastTime = now;
    console.log(`${this.namespace} - ${message} +${durationMs}ms, +${totalDurationMs}ms`);
  }

  error(err: unknown): void {
    const now = Date.now();
    const durationMs = now - this.lastTime;
    const totalDurationMs = now - this.startTime;
    this.lastTime = now;

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.log(`${this.namespace} - Error: ${message} +${durationMs}ms, +${totalDurationMs}ms`);
    console.error(message);

    if (stack) {
      console.error(stack);
    }
  }
}
