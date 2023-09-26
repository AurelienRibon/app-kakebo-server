export class Logger {
  namespace: string;
  sessionId: string;
  startTime: number;
  lastTime: number;

  constructor(namespace: string, sessionId: string) {
    this.namespace = namespace;
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.lastTime = this.startTime;
  }

  log(message: string): void {
    const now = Date.now();
    const durationMs = now - this.lastTime;
    const totalDurationMs = now - this.startTime;

    this.lastTime = now;
    console.log(`${this.sessionId}::${this.namespace} - ${message} +${durationMs}ms, +${totalDurationMs}ms`);
  }

  error(err: unknown): void {
    const now = Date.now();
    const durationMs = now - this.lastTime;
    const totalDurationMs = now - this.startTime;

    this.lastTime = now;
    console.log(`${this.namespace} - Error! +${durationMs}ms, +${totalDurationMs}ms`);

    const stack = err instanceof Error ? err.stack : String(err);
    console.error('\n' + stack + '\n');
  }
}
