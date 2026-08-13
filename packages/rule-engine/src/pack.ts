import { z } from "zod";

const nonEmptyString = z.string().min(1);

export const ruleBudgetSchema = z
  .object({
    metric: nonEmptyString,
    op: z.enum(["gt", "gte"]),
    value: z.number().finite(),
  })
  .passthrough();

export const rulePreconditionsSchema = z
  .object({
    metric: nonEmptyString.optional(),
    capability: nonEmptyString.optional(),
    requireEvidence: z.boolean().optional(),
  })
  .passthrough();

export const ruleDefinitionSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString,
    severity: z.enum(["info", "warning", "error"]),
    preconditions: rulePreconditionsSchema,
    budget: ruleBudgetSchema.optional(),
  })
  .passthrough();

export const rulePackSchema = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString,
    rules: z.array(ruleDefinitionSchema).min(1),
  })
  .passthrough();

export type RulePack = z.infer<typeof rulePackSchema>;
export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

export function parseRulePack(input: unknown): RulePack {
  return rulePackSchema.parse(input);
}
