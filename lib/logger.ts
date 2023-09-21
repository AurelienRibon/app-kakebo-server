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
}
