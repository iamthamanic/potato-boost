import { type ChildProcess, spawn } from "node:child_process";

export type LaunchedProcess = {
  pid: number;
  kill: () => Promise<void>;
};

export type ProcessLauncher = {
  start: (argv: readonly string[], cwd: string) => Promise<LaunchedProcess>;
};

const CLEANUP_MS = 10_000;

function waitExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve();
    }, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function createArgvLauncher(): ProcessLauncher {
  return {
    async start(argv, cwd) {
      const command = argv[0];
      if (command === undefined) {
        throw new Error("start argv is empty");
      }
      const child = spawn(command, argv.slice(1), {
        cwd,
        stdio: "ignore",
        shell: false,
      });
      return {
        pid: child.pid ?? 0,
        async kill() {
          if (!child.killed) {
            child.kill("SIGTERM");
          }
          await waitExit(child, CLEANUP_MS);
        },
      };
    },
  };
}

export function createNoopLauncher(): ProcessLauncher {
  return {
    async start() {
      return {
        pid: 0,
        async kill() {
          return;
        },
      };
    },
  };
}
