import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunPhaseStepper } from "./run-phase-stepper.js";
import { parseSseChunk } from "./run-phases.js";

describe("live run phases", () => {
  it("parses SSE chunks and shows named operations", () => {
    const parsed = parseSseChunk(
      'id: 1\ndata: {"phase":"warmup","detail":"ready"}\n\npartial',
    );
    expect(parsed.events).toEqual([
      { id: 1, phase: "warmup", detail: "ready" },
    ]);
    expect(parsed.rest).toBe("partial");
    const html = renderToStaticMarkup(
      createElement(RunPhaseStepper, {
        current: "warmup",
        detail: "ready",
      }),
    );
    expect(html).toMatch(/warmup/);
    expect(html).toMatch(/Current operation/);
    expect(html).toMatch(/<strong>ready<\/strong>/);
    expect(html).not.toMatch(/spinner-only/);
  });
});
