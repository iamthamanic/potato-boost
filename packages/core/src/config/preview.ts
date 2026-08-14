import { type PotatoConfig, potatoConfigSchema } from "@potato-boost/schemas";
import { assertInsideRoot } from "../discovery/fs.js";
import type { CandidateKind } from "../discovery/types.js";
import type { ConfigFs } from "./types.js";

const CONFIG_REL = "potato.config.yaml";
const GITIGNORE_REL = ".gitignore";
const LOG_REL = ".potato/logs/config-change.log";
const POTATO_IGNORE = ".potato/";

export type InitPreview = {
  root: string;
  plannedPaths: readonly string[];
  config: PotatoConfig;
  configYaml: string;
  gitignoreExists: boolean;
  configExists: boolean;
};

export type StartSource = PotatoConfig["commands"]["startSource"];

export function isGenericKinds(kinds: readonly CandidateKind[]): boolean {
  return kinds.every((kind) => kind === "unknown");
}

export function pickAdapterId(kinds: readonly CandidateKind[]): string {
  const preferred: CandidateKind[] = ["threejs", "vite", "react", "web"];
  for (const kind of preferred) {
    if (kinds.includes(kind)) {
      return kind;
    }
  }
  return "unknown";
}

export function startArgv(kinds: readonly CandidateKind[]): string[] {
  if (kinds.includes("vite")) {
    return ["npx", "vite"];
  }
  return [];
}

export function parseArgvLine(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
}

function sameArgv(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

export function serializePotatoConfig(config: PotatoConfig): string {
  const parsed = potatoConfigSchema.parse(config);
  const startLines =
    parsed.commands.start.length === 0
      ? "  start: []"
      : [
          "  start:",
          ...parsed.commands.start.map(
            (entry) => `    - ${JSON.stringify(entry)}`,
          ),
        ].join("\n");
  return [
    `schemaVersion: ${JSON.stringify(parsed.schemaVersion)}`,
    `adapterId: ${JSON.stringify(parsed.adapterId)}`,
    `root: ${JSON.stringify(parsed.root)}`,
    "commands:",
    startLines,
    `  startSource: ${JSON.stringify(parsed.commands.startSource)}`,
    "",
  ].join("\n");
}

export function parsePotatoConfigYaml(text: string): PotatoConfig {
  const adapterId = quotedField(text, "adapterId");
  const root = quotedField(text, "root");
  const schemaVersion = quotedField(text, "schemaVersion");
  const startSourceMatch = text.match(
    /^\s*startSource:\s*("inferred"|"override")\s*$/m,
  );
  const start: string[] = [];
  const startBlock = text.match(/^\s*start:\s*\[\]\s*$/m);
  if (startBlock === null) {
    for (const line of text.split("\n")) {
      const item = line.match(/^\s+-\s+("(?:\\.|[^"\\])*")\s*$/);
      if (item?.[1] !== undefined) {
        const value: unknown = JSON.parse(item[1]);
        if (typeof value === "string" && value.length > 0) {
          start.push(value);
        }
      }
    }
  }
  return potatoConfigSchema.parse({
    schemaVersion,
    adapterId,
    root,
    commands: {
      start,
      startSource:
        startSourceMatch?.[1] === '"override"' ? "override" : "inferred",
    },
  });
}

function quotedField(text: string, key: string): string {
  const match = text.match(
    new RegExp(`^${key}:\\s*("(?:\\\\.|[^"\\\\])*")\\s*$`, "m"),
  );
  if (match?.[1] === undefined) {
    throw new Error(`invalid potato.config.yaml: missing ${key}`);
  }
  const value: unknown = JSON.parse(match[1]);
  if (typeof value !== "string") {
    throw new Error(`invalid potato.config.yaml: ${key}`);
  }
  return value;
}

export function buildInitPreview(options: {
  canonicalRoot: string;
  kinds: readonly CandidateKind[];
  configExists: boolean;
  gitignoreExists: boolean;
  adapterId?: string;
  start?: readonly string[];
}): InitPreview {
  const inferred = startArgv(options.kinds);
  const start = options.start !== undefined ? [...options.start] : inferred;
  const startSource: StartSource =
    options.start !== undefined && !sameArgv(start, inferred)
      ? "override"
      : "inferred";
  const config = potatoConfigSchema.parse({
    schemaVersion: "1.0.0",
    adapterId: options.adapterId ?? pickAdapterId(options.kinds),
    root: ".",
    commands: {
      start,
      startSource,
    },
  });
  return {
    root: options.canonicalRoot,
    plannedPaths: [CONFIG_REL, GITIGNORE_REL, LOG_REL],
    config,
    configYaml: serializePotatoConfig(config),
    gitignoreExists: options.gitignoreExists,
    configExists: options.configExists,
  };
}

export async function resolveRunStart(
  fs: ConfigFs,
  root: string,
  kinds: readonly CandidateKind[],
): Promise<string[]> {
  const path = assertInsideRoot(root, CONFIG_REL);
  if (await fs.exists(path)) {
    const config = parsePotatoConfigYaml(await fs.readFile(path));
    if (config.commands.startSource === "override") {
      return [...config.commands.start];
    }
  }
  if (isGenericKinds(kinds)) {
    return [];
  }
  return startArgv(kinds);
}

export { CONFIG_REL, GITIGNORE_REL, LOG_REL, POTATO_IGNORE };
