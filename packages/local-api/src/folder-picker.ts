import { spawn } from "node:child_process";
import { platform } from "node:os";

export type FolderPickResult =
  | { status: "picked"; path: string }
  | { status: "cancelled" }
  | { status: "unavailable"; message: string };

export type ChooseDirectory = () => Promise<FolderPickResult>;

type SpawnOutcome = {
  spawned: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

const PICKER_PROMPT = "Select a Potato Boost project";

export function normalizePickedPath(raw: string): string {
  const trimmed = raw.replace(/\r/g, "").trim();
  if (trimmed.length <= 1) {
    return trimmed;
  }
  if (trimmed.endsWith("/") || trimmed.endsWith("\\")) {
    const without = trimmed.slice(0, -1);
    if (/^[A-Za-z]:$/.test(without)) {
      return `${without}\\`;
    }
    return without;
  }
  return trimmed;
}

export function interpretPickerOutput(input: {
  code: number | null;
  stdout: string;
  stderr: string;
}): FolderPickResult {
  const path = normalizePickedPath(input.stdout);
  if (input.code === 0 && path.length > 0) {
    return { status: "picked", path };
  }
  if (/user canceled/i.test(input.stderr) || input.code === 1) {
    return { status: "cancelled" };
  }
  return {
    status: "unavailable",
    message: "The folder picker could not be opened.",
  };
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function run(command: string, args: readonly string[]): Promise<SpawnOutcome> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    });
    child.once("error", (error: unknown) => {
      if (isErrnoException(error) && error.code === "ENOENT") {
        resolve({ spawned: false, code: 127, stdout, stderr });
        return;
      }
      reject(
        error instanceof Error ? error : new Error("folder picker failed"),
      );
    });
    child.once("close", (code) => {
      resolve({ spawned: true, code, stdout, stderr });
    });
  });
}

async function chooseDarwin(): Promise<FolderPickResult> {
  const result = await run("osascript", [
    "-e",
    `POSIX path of (choose folder with prompt "${PICKER_PROMPT}")`,
  ]);
  if (!result.spawned) {
    return {
      status: "unavailable",
      message: "The macOS folder picker could not be opened.",
    };
  }
  return interpretPickerOutput(result);
}

async function chooseWindows(): Promise<FolderPickResult> {
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    `$dialog.Description = '${PICKER_PROMPT}'`,
    "$dialog.ShowNewFolderButton = $true",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {",
    "Write-Output $dialog.SelectedPath",
    "} else { exit 1 }",
  ].join("; ");
  for (const command of ["powershell.exe", "pwsh"] as const) {
    const result = await run(command, [
      "-STA",
      "-NoProfile",
      "-Command",
      script,
    ]);
    if (!result.spawned) {
      continue;
    }
    return interpretPickerOutput(result);
  }
  return {
    status: "unavailable",
    message: "The Windows folder picker could not be opened.",
  };
}

async function chooseLinux(): Promise<FolderPickResult> {
  const zenity = await run("zenity", [
    "--file-selection",
    "--directory",
    `--title=${PICKER_PROMPT}`,
  ]);
  if (zenity.spawned) {
    return interpretPickerOutput(zenity);
  }
  const kdialog = await run("kdialog", [
    "--getexistingdirectory",
    ".",
    PICKER_PROMPT,
  ]);
  if (kdialog.spawned) {
    return interpretPickerOutput(kdialog);
  }
  return {
    status: "unavailable",
    message: "Install zenity or kdialog, or enter the project path manually.",
  };
}

export async function chooseDirectoryNative(): Promise<FolderPickResult> {
  const os = platform();
  if (os === "darwin") {
    return chooseDarwin();
  }
  if (os === "win32") {
    return chooseWindows();
  }
  return chooseLinux();
}
