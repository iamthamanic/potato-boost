import { type PotatoConfig, potatoConfigSchema } from "@potato-boost/schemas";
import type { CandidateKind } from "../discovery/types.js";

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
    "",
  ].join("\n");
}

export function buildInitPreview(options: {
  canonicalRoot: string;
  kinds: readonly CandidateKind[];
  configExists: boolean;
  gitignoreExists: boolean;
}): InitPreview {
  const config = potatoConfigSchema.parse({
    schemaVersion: "1.0.0",
    adapterId: pickAdapterId(options.kinds),
    root: ".",
    commands: { start: startArgv(options.kinds) },
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

export { CONFIG_REL, GITIGNORE_REL, LOG_REL, POTATO_IGNORE };
