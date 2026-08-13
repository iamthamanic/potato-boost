export class EvidenceError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "EvidenceError";
    this.code = code;
    this.retryable = retryable;
  }
}
