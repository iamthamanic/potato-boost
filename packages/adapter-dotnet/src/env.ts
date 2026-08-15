import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";
import type { DotnetFs } from "./types.js";

export type DotnetEnv = {
  exists: (path: string) => Promise<boolean>;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
};

export function createNodeDotnetEnv(): DotnetEnv {
  return {
    exists: async (path) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
    env: process.env,
    platform: process.platform,
  };
}

export function createNodeDotnetFs(): DotnetFs {
  return {
    readFile: async (path) => {
      const { readFile } = await import("node:fs/promises");
      return readFile(path, "utf8");
    },
    readdir: async (path) => {
      const { readdir } = await import("node:fs/promises");
      return readdir(path);
    },
    exists: async (path) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
  };
}

function exeName(platform: NodeJS.Platform): string {
  return platform === "win32" ? "dotnet.exe" : "dotnet";
}

function wellKnownRoots(platform: NodeJS.Platform): string[] {
  if (platform === "win32") {
    return [
      join("C:", "Program Files", "dotnet"),
      join("C:", "Program Files (x86)", "dotnet"),
    ];
  }
  if (platform === "darwin") {
    return [
      "/usr/local/share/dotnet",
      "/opt/homebrew/opt/dotnet/libexec",
      "/usr/local/opt/dotnet/libexec",
    ];
  }
  return ["/usr/share/dotnet", "/usr/lib/dotnet"];
}

export async function locateDotnetSdk(env: DotnetEnv): Promise<{
  path: string | null;
  checked: string[];
}> {
  const checked: string[] = [];
  const name = exeName(env.platform);
  const roots: string[] = [];

  const rootEnv = env.env.DOTNET_ROOT;
  if (rootEnv !== undefined && rootEnv.length > 0) {
    roots.push(rootEnv);
  }
  const explicit = env.env.DOTNET;
  if (explicit !== undefined && explicit.length > 0) {
    checked.push(explicit);
    if (await env.exists(explicit)) {
      return { path: explicit, checked };
    }
  }

  for (const dir of wellKnownRoots(env.platform)) {
    roots.push(dir);
  }

  const pathVar = env.env.PATH ?? "";
  for (const dir of pathVar.split(delimiter)) {
    if (dir.length > 0) {
      roots.push(dir);
    }
  }

  for (const dir of roots) {
    const candidate = join(dir, name);
    checked.push(candidate);
    if (await env.exists(candidate)) {
      return { path: candidate, checked };
    }
  }

  return { path: null, checked };
}
