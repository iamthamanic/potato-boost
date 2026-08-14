import type { ProcessInfo } from "@potato-boost/collector-hub";

export type OsSampler = {
  nowNs: () => number;
  tree: (rootPid: number) => Promise<readonly ProcessInfo[]>;
  cpuUserUs: (pid: number) => Promise<number>;
  rssBytes: (pid: number) => Promise<number>;
};

export function createNodeOsSampler(): OsSampler {
  return {
    nowNs: () => Number(process.hrtime.bigint()),
    tree: async (rootPid) => [{ pid: rootPid, ppid: 0, name: "node" }],
    cpuUserUs: async () => process.cpuUsage().user,
    rssBytes: async () => process.memoryUsage().rss,
  };
}
