import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate.js";
import { parseRulePack } from "./pack.js";

const packPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../rules-web/pack.json",
);

function loadWebPack(): unknown {
  return JSON.parse(readFileSync(packPath, "utf8"));
}

const overBudget = {
  metrics: [{ name: "frame_time_p95", value: 50, unit: "ms" }],
  evidenceIds: ["ev-1"],
  capabilities: ["web.cdp"],
};

describe("rules-web golden pack", () => {
  it("parses the committed pack", () => {
    const pack = parseRulePack(loadWebPack());
    expect(pack.id).toBe("rules-web");
    expect(pack.version).toBe("1.0.0");
  });

  it("is a pure evaluate: same inputs yield the same findings", () => {
    const pack = loadWebPack();
    const first = evaluate(pack, overBudget);
    const second = evaluate(pack, overBudget);
    expect(first).toEqual(second);
    expect(first.evaluations[0]?.verdict).toBe("fail");
    expect(first.evaluations[0]?.finding?.ruleId).toBe("web.frame_time.p95");
    expect(first.evaluations[0]?.finding?.severity).toBe("warning");
    expect(first.evaluations[0]?.finding?.confidence).toBe("high");
  });

  it("does not fail a budget when required evidence is missing (BR-005)", () => {
    const result = evaluate(loadWebPack(), {
      metrics: [{ name: "frame_time_p95", value: 50, unit: "ms" }],
      evidenceIds: [],
      capabilities: ["web.cdp"],
    });
    expect(result.evaluations[0]?.verdict).toBe("observation");
    expect(result.evaluations[0]?.verdict).not.toBe("fail");
    expect(result.evaluations[0]?.finding?.confidence).toBe("low");
  });

  it("skips when a metric precondition is missing", () => {
    const result = evaluate(loadWebPack(), {
      metrics: [],
      evidenceIds: ["ev-1"],
      capabilities: ["web.cdp"],
    });
    expect(result.evaluations[0]?.verdict).toBe("skip");
    expect(result.evaluations[0]?.finding).toBeNull();
  });

  it("skips when the collector capability is unsupported", () => {
    const result = evaluate(loadWebPack(), {
      metrics: [{ name: "frame_time_p95", value: 50, unit: "ms" }],
      evidenceIds: ["ev-1"],
      capabilities: [],
    });
    expect(result.evaluations[0]?.verdict).toBe("skip");
  });
});
