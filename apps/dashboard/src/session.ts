let runToken: string | undefined;
let apiBase = "http://127.0.0.1";

export function captureSessionFromSearch(search: string): void {
  const query = new URLSearchParams(search);
  const token = query.get("token");
  if (token !== null && token.length > 0) {
    runToken = token;
  }
  const api = query.get("api");
  if (api !== null && api.length > 0) {
    apiBase = api;
  }
}

export function getRunToken(): string | undefined {
  return runToken;
}

export function getApiBase(): string {
  return apiBase;
}

export function resetSessionForTests(): void {
  runToken = undefined;
  apiBase = "http://127.0.0.1";
}
