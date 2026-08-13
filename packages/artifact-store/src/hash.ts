import { createHash } from "node:crypto";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function integrityHash(bytes: Uint8Array): string {
  return `sha256:${sha256Hex(bytes)}`;
}
