import { type ChildProcess, spawn } from "node:child_process";

export const CLEANUP_MS = 10_000;

export type LaunchedProcess = {
  pid: number;
  kill: () => Promise<void>;
};

export type ProcessLauncher = {
  start: (argv: readonly string[], cwd: string) => Promise<LaunchedProcess>;
};

export function processAlive(pid: number): boolean {
  if (pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  if (pid <= 0) {
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      return;
    }
  }
}

function waitExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
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
        detached: true,
      });
      const pid = child.pid ?? 0;
      if (pid <= 0) {
        throw new Error("failed to start process");
      }
      let stopped = false;
      return {
        pid,
        async kill() {
          if (stopped) {
            return;
          }
          stopped = true;
          signalGroup(pid, "SIGTERM");
          await waitExit(child, CLEANUP_MS);
          if (processAlive(pid)) {
            signalGroup(pid, "SIGKILL");
            await waitExit(child, 1_000);
          }
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
