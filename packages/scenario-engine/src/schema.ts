import { z } from "zod";

export const PHASES = ["setup", "warmup", "measure", "cleanup"] as const;
export type Phase = (typeof PHASES)[number];

export const phaseEventSchema = z.object({
  phase: z.enum(PHASES),
  at: z.string().datetime(),
  detail: z.string().optional(),
});
export type PhaseEvent = z.infer<typeof phaseEventSchema>;

export const scenarioStepSchema = z.object({
  action: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional(),
  secretRef: z.string().optional(),
});
export type ScenarioStep = z.infer<typeof scenarioStepSchema>;

export const scenarioSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    setup: z.array(scenarioStepSchema).default([]),
    warmup: z.array(scenarioStepSchema).default([]),
    measure: z.array(scenarioStepSchema).min(1, "measure must not be empty"),
    cleanup: z.array(scenarioStepSchema).default([]),
    repetitions: z.number().int().min(1).default(1),
    timeoutMs: z.number().int().positive().default(30_000),
    markers: z.array(z.string()).default([]),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;

export const scenarioRunResultSchema = z.object({
  scenarioId: z.string(),
  scenarioVersion: z.string(),
  events: z.array(phaseEventSchema),
  baselineEligible: z.boolean(),
  error: z.string().optional(),
});
export type ScenarioRunResult = z.infer<typeof scenarioRunResultSchema>;
