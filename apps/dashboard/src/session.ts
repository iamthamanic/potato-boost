let runToken: string | undefined;
let apiBase = "http://127.0.0.1";

function isLoopbackHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

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

export function applySessionFromDevPayload(body: unknown): boolean {
  if (getRunToken() !== undefined) {
    return false;
  }
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const token = "token" in body ? body.token : undefined;
  const api = "api" in body ? body.api : undefined;
  if (typeof token !== "string" || token.length === 0) {
    return false;
  }
  if (typeof api !== "string" || !isLoopbackHttpUrl(api)) {
    return false;
  }
  runToken = token;
  apiBase = api;
  return true;
}

export async function applyDevSession(): Promise<void> {
  if (getRunToken() !== undefined || !import.meta.env.DEV) {
    return;
  }
  try {
    const response = await fetch("/__potato/session");
    if (!response.ok) {
      return;
    }
    applySessionFromDevPayload(await response.json());
  } catch {
    return;
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
