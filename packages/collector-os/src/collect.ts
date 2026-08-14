import type {
  Collector,
  CollectorResult,
  ProcessInfo,
  SampleInput,
} from "@potato-boost/collector-hub";
import { createNodeOsSampler, type OsSampler } from "./sampler.js";

export type OsCollectOptions = {
  rootPid: number;
  sampler?: OsSampler;
};

function sourceFor(rootPid: number, processInfo: ProcessInfo): string {
  return processInfo.pid === rootPid ? "os" : `os.${processInfo.pid}`;
}

export async function collectOs(
  options: OsCollectOptions,
): Promise<CollectorResult> {
  const sampler = options.sampler ?? createNodeOsSampler();
  const tree = await sampler.tree(options.rootPid);
  const samples: SampleInput[] = [];
  for (const processInfo of tree) {
    const cpu = await sampler.cpuUserUs(processInfo.pid);
    samples.push({
      source: sourceFor(options.rootPid, processInfo),
      metric: "cpu.user",
      timestampNs: sampler.nowNs(),
      value: cpu,
      unit: "us",
    });
    const rss = await sampler.rssBytes(processInfo.pid);
    samples.push({
      source: sourceFor(options.rootPid, processInfo),
      metric: "memory.rss",
      timestampNs: sampler.nowNs(),
      value: rss,
      unit: "byte",
    });
  }
  return {
    capability: {
      id: "os",
      status: "ok",
      required: true,
      detail: `sampled ${tree.length} process(es)`,
    },
    samples,
    processTree: tree,
  };
}

export function osCollector(options: OsCollectOptions): Collector {
  return {
    id: "os",
    collect: () => collectOs(options),
  };
}
