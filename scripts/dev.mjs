import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const built = spawnSync(
  "pnpm",
  [
    "--filter",
    "@potato-boost/local-api",
    "exec",
    "tsc",
    "-b",
    "--pretty",
    "false",
  ],
  { cwd: root, stdio: "inherit", shell: false },
);
if (built.status !== 0) {
  process.exit(built.status ?? 1);
}

const { startLocalApi } = await import(
  new URL("../packages/local-api/dist/index.js", import.meta.url).href
);

const api = await startLocalApi({ preferredPort: 8788 });

console.log("Local API");
console.log(`  ${api.url}`);
console.log("Dashboard");
console.log("  http://127.0.0.1:5173");

const vite = spawn("pnpm", ["--filter", "dashboard", "exec", "vite"], {
  cwd: root,
  env: {
    ...process.env,
    POTATO_DEV_API: api.url,
    POTATO_DEV_TOKEN: api.token,
  },
  stdio: "inherit",
  shell: false,
});

let shuttingDown = false;

async function shutdown(code) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  if (vite.exitCode === null) {
    vite.kill("SIGTERM");
  }
  await api.close();
  process.exit(code);
}

vite.on("exit", (code) => {
  void shutdown(code ?? 0);
});

process.on("SIGINT", () => {
  void shutdown(0);
});
process.on("SIGTERM", () => {
  void shutdown(0);
});
