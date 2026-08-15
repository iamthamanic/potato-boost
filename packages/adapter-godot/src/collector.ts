import type {
  Collector,
  CollectorResult,
  SampleInput,
} from "@potato-boost/collector-hub";
import { readProjectFile } from "./addon.js";
import {
  GODOT_PERFORMANCE_SNAPSHOT,
  type GodotPerformanceRow,
  type GodotPerformanceSnapshot,
} from "./performance.js";

export type GodotCollectEnv = {
  readSnapshot: () => Promise<string | null>;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function parseRow(raw: unknown): GodotPerformanceRow | null {
  if (!isRecord(raw)) {
    return null;
  }
  const row = raw;
  const timestampNs = row.timestampNs;
  if (
    typeof timestampNs !== "number" ||
    !Number.isInteger(timestampNs) ||
    !Number.isFinite(timestampNs)
  ) {
    return null;
  }
  const parsed: GodotPerformanceRow = { timestampNs };
  const timeProcessS = finiteNumber(row.timeProcessS);
  if (timeProcessS !== undefined) {
    parsed.timeProcessS = timeProcessS;
  }
  const fps = finiteNumber(row.fps);
  if (fps !== undefined) {
    parsed.fps = fps;
  }
  const drawCalls = finiteNumber(row.drawCalls);
  if (drawCalls !== undefined) {
    parsed.drawCalls = drawCalls;
  }
  const memoryStatic = finiteNumber(row.memoryStatic);
  if (memoryStatic !== undefined) {
    parsed.memoryStatic = memoryStatic;
  }
  return parsed;
}

export function parseGodotPerformanceSnapshot(
  text: string,
): GodotPerformanceSnapshot | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  const body = raw;
  if (body.schemaVersion !== "1.0.0" || body.source !== "godot.performance") {
    return null;
  }
  if (!Array.isArray(body.samples)) {
    return null;
  }
  const samples: GodotPerformanceRow[] = [];
  for (const entry of body.samples) {
    const row = parseRow(entry);
    if (row === null) {
      return null;
    }
    samples.push(row);
  }
  return { schemaVersion: "1.0.0", source: "godot.performance", samples };
}

function frameTimeMs(row: GodotPerformanceRow): number | undefined {
  if (row.timeProcessS !== undefined) {
    return row.timeProcessS * 1000;
  }
  if (row.fps !== undefined && row.fps > 0) {
    return 1000 / row.fps;
  }
  return undefined;
}

export function snapshotToSamples(
  snapshot: GodotPerformanceSnapshot,
): SampleInput[] {
  const samples: SampleInput[] = [];
  for (const row of snapshot.samples) {
    const frameTime = frameTimeMs(row);
    if (frameTime !== undefined) {
      samples.push({
        source: "godot.performance",
        metric: "frame_time",
        timestampNs: row.timestampNs,
        value: frameTime,
        unit: "ms",
      });
    }
    if (row.fps !== undefined) {
      samples.push({
        source: "godot.performance",
        metric: "fps",
        timestampNs: row.timestampNs,
        value: row.fps,
        unit: "fps",
      });
    }
  }
  return samples;
}

export async function collectGodotPerformance(
  env: GodotCollectEnv,
): Promise<CollectorResult> {
  const text = await env.readSnapshot();
  if (text === null) {
    return {
      capability: {
        id: "godot.performance",
        status: "unsupported",
        required: false,
        detail: `no ${GODOT_PERFORMANCE_SNAPSHOT}; rules that need Godot Performance skip`,
      },
      samples: [],
    };
  }
  const snapshot = parseGodotPerformanceSnapshot(text);
  if (snapshot === null) {
    return {
      capability: {
        id: "godot.performance",
        status: "incomplete",
        required: false,
        detail: "invalid Godot Performance snapshot",
      },
      samples: [],
    };
  }
  const samples = snapshotToSamples(snapshot);
  if (samples.length === 0) {
    return {
      capability: {
        id: "godot.performance",
        status: "incomplete",
        required: false,
        detail: "snapshot has no FPS or frame-time monitors",
      },
      samples: [],
    };
  }
  return {
    capability: {
      id: "godot.performance",
      status: "ok",
      required: false,
      detail: `collected ${samples.length} Godot Performance sample(s)`,
    },
    samples,
  };
}

export function godotPerformanceCollector(env: GodotCollectEnv): Collector {
  return {
    id: "godot.performance",
    collect: () => collectGodotPerformance(env),
  };
}

export function createNodeCollectEnv(root: string): GodotCollectEnv {
  return {
    readSnapshot: () => readProjectFile(root, GODOT_PERFORMANCE_SNAPSHOT),
  };
}

export async function hasValidGodotSnapshot(root: string): Promise<boolean> {
  const text = await readProjectFile(root, GODOT_PERFORMANCE_SNAPSHOT);
  return text !== null && parseGodotPerformanceSnapshot(text) !== null;
}
