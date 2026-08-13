import { type Finding, findingSchema } from "@potato-boost/schemas";
import { parseRulePack, type RuleDefinition, type RulePack } from "./pack.js";

export type RuleVerdict =
  | "pass"
  | "fail"
  | "skip"
  | "inconclusive"
  | "observation";

export type EvaluationContext = {
  metrics: readonly { name: string; value: number; unit: string }[];
  evidenceIds: readonly string[];
  capabilities: readonly string[];
};

export type RuleEvaluation = {
  ruleId: string;
  verdict: RuleVerdict;
  finding: Finding | null;
};

export type EvaluateResult = {
  packId: string;
  packVersion: string;
  evaluations: RuleEvaluation[];
};

function metricValue(
  context: EvaluationContext,
  name: string,
): number | undefined {
  const match = context.metrics.find((metric) => metric.name === name);
  return match?.value;
}

function budgetExceeded(rule: RuleDefinition, value: number): boolean {
  const budget = rule.budget;
  if (budget === undefined) {
    return false;
  }
  if (budget.op === "gt") {
    return value > budget.value;
  }
  return value >= budget.value;
}

function findingFor(
  rule: RuleDefinition,
  evidenceIds: readonly string[],
): Finding {
  return findingSchema.parse({
    findingId: `finding:${rule.id}`,
    ruleId: rule.id,
    severity: rule.severity,
    evidenceIds: [...evidenceIds],
    sourceCandidates: [
      {
        uri: `metric:${rule.budget?.metric ?? rule.preconditions.metric ?? rule.id}`,
        line: null,
        column: null,
        method: "metric-budget",
        confidenceFactors: ["rule-pack"],
      },
    ],
    confidence: evidenceIds.length > 0 ? "high" : "low",
    confidenceFactors:
      evidenceIds.length > 0 ? ["evidence-present"] : ["evidence-missing"],
  });
}

function evaluateRule(
  rule: RuleDefinition,
  context: EvaluationContext,
): RuleEvaluation {
  const requiredMetric = rule.preconditions.metric;
  if (
    requiredMetric !== undefined &&
    metricValue(context, requiredMetric) === undefined
  ) {
    return { ruleId: rule.id, verdict: "skip", finding: null };
  }

  const requiredCapability = rule.preconditions.capability;
  if (
    requiredCapability !== undefined &&
    !context.capabilities.includes(requiredCapability)
  ) {
    return { ruleId: rule.id, verdict: "skip", finding: null };
  }

  const needsEvidence = rule.preconditions.requireEvidence === true;
  const hasEvidence = context.evidenceIds.length > 0;
  if (needsEvidence && !hasEvidence) {
    return {
      ruleId: rule.id,
      verdict: "observation",
      finding: findingFor(rule, []),
    };
  }

  if (rule.budget === undefined) {
    return { ruleId: rule.id, verdict: "pass", finding: null };
  }

  const value = metricValue(context, rule.budget.metric);
  if (value === undefined) {
    return { ruleId: rule.id, verdict: "skip", finding: null };
  }

  if (budgetExceeded(rule, value)) {
    return {
      ruleId: rule.id,
      verdict: "fail",
      finding: findingFor(rule, context.evidenceIds),
    };
  }

  return { ruleId: rule.id, verdict: "pass", finding: null };
}

export function evaluate(
  packInput: unknown,
  context: EvaluationContext,
): EvaluateResult {
  const pack: RulePack = parseRulePack(packInput);
  return {
    packId: pack.id,
    packVersion: pack.version,
    evaluations: pack.rules.map((rule) => evaluateRule(rule, context)),
  };
}
