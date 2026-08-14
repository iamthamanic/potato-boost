import { stat } from "node:fs/promises";
import { createServer } from "node:net";
import type { DoctorEnv } from "./types.js";

const DEFAULT_APP_PORT = 5199;

export async function locatePlaywrightChromium(): Promise<string | null> {
  try {
    const { chromium } = await import("@playwright/test");
    const path = chromium.executablePath();
    await stat(path);
    return path;
  } catch {
    return null;
  }
}

export function isTcpPortInUse(
  port: number,
  host = "127.0.0.1",
): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => {
      resolve(true);
    });
    server.listen(port, host, () => {
      server.close(() => {
        resolve(false);
      });
    });
  });
}

export function createNodeDoctorEnv(): DoctorEnv {
  return {
    nodePath: process.execPath,
    nodeVersion: process.version,
    wantedNodeRange: ">=24",
    locateBrowser: locatePlaywrightChromium,
    isPortInUse: isTcpPortInUse,
    appPort: DEFAULT_APP_PORT,
  };
}
