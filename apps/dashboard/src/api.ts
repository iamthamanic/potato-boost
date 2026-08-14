import { getApiBase, getRunToken } from "./session.js";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getRunToken();
  const headers = new Headers(init.headers);
  if (token !== undefined) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}

export async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiRequestError(
      `Local API returned ${response.status}. Retry when the loopback server is up.`,
      response.status,
    );
  }
  return (await response.json()) as T;
}
