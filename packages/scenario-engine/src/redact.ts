import type { ScenarioStep } from "./schema.js";

export const REDACTED = "redacted";

const DENIED_KEYS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "set-cookie",
  "password",
  "passwd",
  "secret",
  "token",
  "access_token",
  "accessToken",
  "refresh_token",
  "api_key",
  "apikey",
  "apiKey",
  "body",
  "requestbody",
  "requestBody",
]);

const QUERY_SECRET_KEYS = new Set([
  "token",
  "password",
  "secret",
  "api_key",
  "apikey",
  "access_token",
  "authorization",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keyDenied(key: string): boolean {
  return DENIED_KEYS.has(key) || DENIED_KEYS.has(key.toLowerCase());
}

function looksLikeSecretName(value: string): boolean {
  return /^[A-Z][A-Z0-9_]{1,128}$/.test(value);
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (QUERY_SECRET_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, REDACTED);
      }
    }
    return parsed.toString();
  } catch {
    return url.replace(
      /([?&](?:token|password|secret|api[_-]?key|access_token|authorization)=)[^&]*/gi,
      `$1${REDACTED}`,
    );
  }
}

export function redactRecordedInput(input: unknown): unknown {
  if (typeof input === "string") {
    return redactUrl(input);
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactRecordedInput(item));
  }
  if (!isRecord(input)) {
    return input;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (keyDenied(key)) {
      continue;
    }
    if (key === "secretRef" && typeof value === "string") {
      out.secretRef = looksLikeSecretName(value) ? value : REDACTED;
      continue;
    }
    if ((key === "url" || key === "href") && typeof value === "string") {
      out[key] = redactUrl(value);
      continue;
    }
    if (key === "headers" && isRecord(value)) {
      const headers: Record<string, unknown> = {};
      for (const [header, headerValue] of Object.entries(value)) {
        if (!keyDenied(header)) {
          headers[header] = headerValue;
        }
      }
      out.headers = headers;
      continue;
    }
    out[key] = redactRecordedInput(value);
  }
  return out;
}

export function redactScenarioStep(step: ScenarioStep): ScenarioStep {
  const redacted = redactRecordedInput(step);
  if (!isRecord(redacted) || typeof redacted.action !== "string") {
    return { action: "redacted" };
  }
  const args = redacted.args;
  const secretRef = redacted.secretRef;
  return {
    action: redacted.action,
    ...(isRecord(args) ? { args } : {}),
    ...(typeof secretRef === "string" ? { secretRef } : {}),
  };
}

export function scrubJsonText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._\-+=/]+/gi, `Bearer ${REDACTED}`)
    .replace(
      /([?&](?:token|password|secret|api[_-]?key|access_token|authorization)=)[^"&\s]*/gi,
      `$1${REDACTED}`,
    )
    .replace(
      /"(authorization|cookie|set-cookie|password|token|secret|api_key|access_token|body)"\s*:\s*("[^"]*"|\{[^}]*\}|\[[^\]]*\])/gi,
      `"$1":"${REDACTED}"`,
    );
}
