import { afterEach, describe, expect, it } from "vitest";
import { GOLDEN_RUN_ID } from "./golden.js";
import { type LocalApi, startLocalApi } from "./server.js";

describe("run artifact GET", () => {
  let api: LocalApi | undefined;

  afterEach(async () => {
    await api?.close();
    api = undefined;
  });

  it("serves the golden artifact and rejects traversal run ids", async () => {
    api = await startLocalApi();
    const headers = {
      authorization: `Bearer ${api.token}`,
      origin: api.url,
    };

    const denied = await fetch(
      `${api.url}/api/v1/runs/${GOLDEN_RUN_ID}/artifact`,
    );
    expect(denied.status).toBe(401);

    const golden = await fetch(
      `${api.url}/api/v1/runs/${GOLDEN_RUN_ID}/artifact`,
      { headers },
    );
    expect(golden.status).toBe(200);
    const body = (await golden.json()) as {
      schemaVersion: string;
      run: { runId: string; status: string };
      findings: { ruleId: string; confidence: string }[];
    };
    expect(body.schemaVersion).toBe("1.0.0");
    expect(body.run.runId).toBe(GOLDEN_RUN_ID);
    expect(body.run.status).toBe("completed");
    expect(body.findings[0]?.ruleId).toBe("web.frame_time.p95");
    expect(body.findings[0]?.confidence).toBe("medium");

    const summary = await fetch(`${api.url}/api/v1/runs/${GOLDEN_RUN_ID}`, {
      headers,
    });
    expect(summary.status).toBe(200);
    const snap = (await summary.json()) as { status: string };
    expect(snap.status).toBe("completed");

    const traversal = await fetch(
      `${api.url}/api/v1/runs/${encodeURIComponent("../etc")}/artifact`,
      { headers },
    );
    expect(traversal.status).toBe(400);

    const missing = await fetch(`${api.url}/api/v1/runs/not-a-run/artifact`, {
      headers,
    });
    expect(missing.status).toBe(404);

    const samplesRes = await fetch(
      `${api.url}/api/v1/runs/${GOLDEN_RUN_ID}/samples`,
      { headers },
    );
    expect(samplesRes.status).toBe(200);
    const samplesBody = (await samplesRes.json()) as {
      samples: { sampleId: string; timestampNs: number; value: number }[];
    };
    expect(samplesBody.samples).toHaveLength(40);
    expect(samplesBody.samples[20]?.timestampNs).toBe(20);
    expect(samplesBody.samples[20]?.value).toBe(40);
  });
});
