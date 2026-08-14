export class CollectorError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "CollectorError";
    this.code = code;
    this.retryable = retryable;
  }
}
