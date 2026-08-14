import { dirname } from "node:path";
import { assertInsideRoot } from "../discovery/fs.js";
import {
  CONFIG_REL,
  GITIGNORE_REL,
  type InitPreview,
  LOG_REL,
  POTATO_IGNORE,
} from "./preview.js";
import type { ConfigFs } from "./types.js";

export type InitApplyResult = {
  wrote: boolean;
  writtenPaths: readonly string[];
};

function nextGitignore(existing: string | undefined): string {
  const body = existing ?? "";
  if (body.split(/\r?\n/).some((line) => line.trim() === POTATO_IGNORE)) {
    return body.endsWith("\n") || body.length === 0 ? body : `${body}\n`;
  }
  const prefix = body.length === 0 || body.endsWith("\n") ? body : `${body}\n`;
  return `${prefix}${POTATO_IGNORE}\n`;
}

function auditLine(preview: InitPreview): string {
  return `${JSON.stringify({
    at: new Date().toISOString(),
    action: "init",
    adapterId: preview.config.adapterId,
    paths: preview.plannedPaths,
  })}\n`;
}

export async function applyInit(
  fs: ConfigFs,
  preview: InitPreview,
  confirm: boolean,
): Promise<InitApplyResult> {
  if (!confirm) {
    return { wrote: false, writtenPaths: [] };
  }

  const configPath = assertInsideRoot(preview.root, CONFIG_REL);
  const gitignorePath = assertInsideRoot(preview.root, GITIGNORE_REL);
  const logPath = assertInsideRoot(preview.root, LOG_REL);

  const previousGitignore = preview.gitignoreExists
    ? await fs.readFile(gitignorePath)
    : undefined;

  await fs.writeFile(configPath, preview.configYaml);
  await fs.writeFile(gitignorePath, nextGitignore(previousGitignore));
  await fs.mkdirp(dirname(logPath));
  const previousLog = (await fs.exists(logPath))
    ? await fs.readFile(logPath)
    : "";
  await fs.writeFile(logPath, `${previousLog}${auditLine(preview)}`);

  return { wrote: true, writtenPaths: [...preview.plannedPaths] };
}
