import { describe, expect, it } from "vitest";
import { collectOs } from "./collect.js";
import { createNodeOsSampler, type OsSampler } from "./sampler.js";

describe("collectOs", () => {
  it("emits CPU and RSS with units from the current Node process", async () => {
    const result = await collectOs({
      rootPid: process.pid,
      sampler: createNodeOsSampler(),
    });
    expect(result.capability.status).toBe("ok");
    expect(result.processTree?.some((item) => item.pid === process.pid)).toBe(
      true,
    );
    const cpu = result.samples.find((item) => item.metric === "cpu.user");
    const rss = result.samples.find((item) => item.metric === "memory.rss");
    expect(cpu?.unit).toBe("us");
    expect(rss?.unit).toBe("byte");
    expect(cpu?.source).toBe("os");
    expect(Number.isInteger(cpu?.timestampNs)).toBe(true);
    expect(
      rss !== undefined &&
        cpu !== undefined &&
        rss.timestampNs >= cpu.timestampNs,
    ).toBe(true);
  });

  it("captures child processes in the tree and as separate sources", async () => {
    const sampler: OsSampler = {
      nowNs: (() => {
        let n = 100;
        return () => {
          n += 1;
          return n;
        };
      })(),
      tree: async () => [
        { pid: 10, ppid: 0, name: "app" },
        { pid: 11, ppid: 10, name: "child" },
      ],
      cpuUserUs: async (pid) => pid,
      rssBytes: async (pid) => pid * 10,
    };
    const result = await collectOs({ rootPid: 10, sampler });
    expect(result.processTree?.map((item) => item.pid)).toEqual([10, 11]);
    expect(result.samples.some((item) => item.source === "os.11")).toBe(true);
  });
});
