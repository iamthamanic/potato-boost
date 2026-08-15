import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  cardTone,
  formatConfidence,
  isAmbiguous,
  kindLabel,
  parseArgv,
  pickInitialTarget,
} from "./detect.js";
import { DetectionCard } from "./detection-card.js";

describe("detection confidence", () => {
  it("formats 0–1 confidence and never a fake 96%", () => {
    expect(formatConfidence(0.4)).toBe("0.40");
    expect(formatConfidence(0.4)).not.toMatch(/96|%/);
    expect(
      isAmbiguous([
        {
          kind: "vite",
          confidence: 0.5,
          evidence: [],
          inferredStart: ["npx", "vite"],
        },
        {
          kind: "react",
          confidence: 0.3,
          evidence: [],
          inferredStart: [],
        },
      ]),
    ).toBe(true);
    expect(parseArgv("  npx   vite ")).toEqual(["npx", "vite"]);
    expect(
      cardTone(
        { kind: "unknown", confidence: 0, evidence: [], inferredStart: [] },
        false,
      ),
    ).toBe("unsupported");
    expect(kindLabel("unknown")).toBe("Generic (unsupported)");
    expect(kindLabel("godot")).toBe("Godot");
    expect(kindLabel("tauri")).toBe("Tauri");
    expect(kindLabel("vite")).toBe("vite");
    expect(
      pickInitialTarget(
        [{ kind: "unknown", confidence: 0, evidence: [], inferredStart: [] }],
        false,
      ),
    ).toBe("unknown");
    expect(
      pickInitialTarget(
        [
          {
            kind: "vite",
            confidence: 0.5,
            evidence: [],
            inferredStart: ["npx", "vite"],
          },
          {
            kind: "react",
            confidence: 0.3,
            evidence: [],
            inferredStart: [],
          },
        ],
        true,
      ),
    ).toBeUndefined();
  });

  it("renders evidence and radio semantics without a 96% claim", () => {
    const html = renderToStaticMarkup(
      createElement(DetectionCard, {
        candidate: {
          kind: "vite",
          confidence: 0.5,
          evidence: [
            { kind: "marker", path: "vite.config.ts", detail: "vite config" },
          ],
          inferredStart: ["npx", "vite"],
        },
        selected: false,
        ambiguous: true,
        onSelect: () => undefined,
      }),
    );
    expect(html).toMatch(/type="radio"/);
    expect(html).toMatch(/vite\.config\.ts/);
    expect(html).toMatch(/confidence 0\.50/);
    expect(html).toMatch(/Ambiguous/);
    expect(html).not.toMatch(/96/);
  });

  it("labels unknown as generic unsupported", () => {
    const html = renderToStaticMarkup(
      createElement(DetectionCard, {
        candidate: {
          kind: "unknown",
          confidence: 0,
          evidence: [],
          inferredStart: [],
        },
        selected: true,
        ambiguous: false,
        onSelect: () => undefined,
      }),
    );
    expect(html).toMatch(/Generic \(unsupported\)/);
    expect(html).toMatch(/Override the start argv/);
  });
});
