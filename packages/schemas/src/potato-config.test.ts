import { describe, expect, it } from "vitest";
import { potatoConfigSchema } from "./potato-config.js";

describe("potatoConfigSchema", () => {
  it("accepts adapterId, root, and argv start commands", () => {
    const parsed = potatoConfigSchema.parse({
      schemaVersion: "1.0.0",
      adapterId: "web",
      root: ".",
      commands: { start: ["npx", "vite"] },
    });
    expect(parsed.commands.start).toEqual(["npx", "vite"]);
    expect(parsed.commands.startSource).toBe("inferred");
  });

  it("rejects unknown keys and shell-shaped extra fields", () => {
    const result = potatoConfigSchema.safeParse({
      schemaVersion: "1.0.0",
      adapterId: "web",
      root: ".",
      commands: { start: ["npx", "vite"] },
      secret: "nope",
    });
    expect(result.success).toBe(false);
  });
});
