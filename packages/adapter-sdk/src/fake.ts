import type { AdapterManifest } from "./manifest.js";

export const FAKE_MANIFEST: AdapterManifest = {
  id: "adapter-fake",
  version: "1.0.0",
  capabilities: ["detect", "doctor", "launch", "collector"],
  detectors: ["fake"],
  schemaVersion: "1.0.0",
};

export const FAKE_MARKER = "potato-fake.json";

export type FakeDetectResult = {
  kind: "fake" | "unknown";
  confidence: number;
  evidence: readonly string[];
};

export function detectFake(rootFiles: readonly string[]): FakeDetectResult {
  if (rootFiles.includes(FAKE_MARKER)) {
    return { kind: "fake", confidence: 1, evidence: [FAKE_MARKER] };
  }
  return { kind: "unknown", confidence: 0, evidence: [] };
}

export type FakeDoctorCheck = {
  id: string;
  status: "ok" | "missing";
  detail: string;
};

export type FakeDoctorResult = {
  ok: boolean;
  checks: readonly FakeDoctorCheck[];
};

export function doctorFake(env: { nodePresent: boolean }): FakeDoctorResult {
  const node: FakeDoctorCheck = env.nodePresent
    ? { id: "node", status: "ok", detail: "fake node" }
    : { id: "node", status: "missing", detail: "node missing" };
  return { ok: node.status === "ok", checks: [node] };
}

export type FakeLaunched = {
  pid: number;
  killed: boolean;
  kill: () => Promise<void>;
};

export function launchFake(): FakeLaunched {
  const launched: FakeLaunched = {
    pid: 0,
    killed: false,
    async kill() {
      launched.killed = true;
    },
  };
  return launched;
}

export type FakeSample = {
  source: "fake";
  metric: "frame_time";
  timestampNs: number;
  value: number;
  unit: "ms";
};

export type FakeCollectResult = {
  samples: FakeSample[];
  dropped: number;
  quality: "valid" | "degraded";
};

export function collectFake(
  options: { count?: number; maxBuffer?: number } = {},
): FakeCollectResult {
  const count = options.count ?? 3;
  const maxBuffer = options.maxBuffer ?? count;
  const samples: FakeSample[] = [];
  for (let i = 0; i < count; i += 1) {
    if (samples.length >= maxBuffer) {
      break;
    }
    samples.push({
      source: "fake",
      metric: "frame_time",
      timestampNs: i + 1,
      value: 16,
      unit: "ms",
    });
  }
  const dropped = Math.max(0, count - samples.length);
  return {
    samples,
    dropped,
    quality: dropped > 0 ? "degraded" : "valid",
  };
}
