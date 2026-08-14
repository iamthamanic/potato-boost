export const GOLDEN_RUN_ID = "01J9GOLDENV100000000000000";

export const BUDGET_CATEGORIES = [
  "Runtime",
  "Memory",
  "Rendering",
  "Startup",
  "Network",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export type ConfidenceBand = "high" | "medium" | "low";

export type QualityKind = "valid" | "failed" | "incomplete";

export type StatusKind = QualityKind | "inconclusive" | "pass";

export type MetricView = {
  name: string;
  value: number;
  unit: string;
};

export type EvidenceView = {
  evidenceId: string;
  calculation: string;
};

export type SourceCandidateView = {
  uri: string;
  line: number | null;
  column: number | null;
};

export type FindingView = {
  findingId: string;
  ruleId: string;
  severity: string;
  confidence: ConfidenceBand;
  evidenceIds: string[];
  sourceCandidates: SourceCandidateView[];
};

export type RunArtifactView = {
  runId: string;
  status: string;
  startedAt: string;
  scenarioId: string;
  profileId: string;
  rulePackIds: string[];
  hostArch: string;
  osName: string;
  metrics: MetricView[];
  evidence: EvidenceView[];
  findings: FindingView[];
};

export type BudgetCardView = {
  category: BudgetCategory;
  status: "inconclusive";
  metrics: MetricView[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const text = readString(item);
    return text === undefined ? [] : [text];
  });
}

function parseMetric(value: unknown): MetricView | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const name = readString(value.name);
  const unit = readString(value.unit);
  const metricValue = readNumber(value.value);
  if (name === undefined || unit === undefined || metricValue === undefined) {
    return undefined;
  }
  return { name, value: metricValue, unit };
}

function parseEvidence(value: unknown): EvidenceView | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const evidenceId = readString(value.evidenceId);
  const calculation = readString(value.calculation);
  if (evidenceId === undefined || calculation === undefined) {
    return undefined;
  }
  return { evidenceId, calculation };
}

function parseSource(value: unknown): SourceCandidateView | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const uri = readString(value.uri);
  if (uri === undefined) {
    return undefined;
  }
  const line = value.line === null ? null : (readNumber(value.line) ?? null);
  const column =
    value.column === null ? null : (readNumber(value.column) ?? null);
  return { uri, line, column };
}

function parseConfidence(value: unknown): ConfidenceBand | undefined {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : undefined;
}

function parseFinding(value: unknown): FindingView | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const findingId = readString(value.findingId);
  const ruleId = readString(value.ruleId);
  const severity = readString(value.severity);
  const confidence = parseConfidence(value.confidence);
  if (
    findingId === undefined ||
    ruleId === undefined ||
    severity === undefined ||
    confidence === undefined
  ) {
    return undefined;
  }
  const sourceCandidates = Array.isArray(value.sourceCandidates)
    ? value.sourceCandidates.flatMap((item) => {
        const source = parseSource(item);
        return source === undefined ? [] : [source];
      })
    : [];
  return {
    findingId,
    ruleId,
    severity,
    confidence,
    evidenceIds: readStringArray(value.evidenceIds),
    sourceCandidates,
  };
}

export function parseRunArtifactView(
  raw: unknown,
): RunArtifactView | undefined {
  if (!isRecord(raw) || !isRecord(raw.run) || !isRecord(raw.lockedInputs)) {
    return undefined;
  }
  const runId = readString(raw.run.runId);
  const status = readString(raw.run.status);
  const startedAt = readString(raw.run.startedAt);
  if (runId === undefined || status === undefined || startedAt === undefined) {
    return undefined;
  }
  const scenario = isRecord(raw.lockedInputs.scenario)
    ? readString(raw.lockedInputs.scenario.id)
    : undefined;
  const profile = isRecord(raw.lockedInputs.profile)
    ? readString(raw.lockedInputs.profile.id)
    : undefined;
  if (scenario === undefined || profile === undefined) {
    return undefined;
  }
  const rulePackIds = Array.isArray(raw.lockedInputs.rulePacks)
    ? raw.lockedInputs.rulePacks.flatMap((pack) => {
        if (!isRecord(pack)) {
          return [];
        }
        const id = readString(pack.id);
        return id === undefined ? [] : [id];
      })
    : [];
  const fingerprints = isRecord(raw.fingerprints) ? raw.fingerprints : {};
  const host = isRecord(fingerprints.host) ? fingerprints.host : {};
  const os = isRecord(fingerprints.os) ? fingerprints.os : {};
  return {
    runId,
    status,
    startedAt,
    scenarioId: scenario,
    profileId: profile,
    rulePackIds,
    hostArch: readString(host.arch) ?? "unknown",
    osName: readString(os.name) ?? "unknown",
    metrics: Array.isArray(raw.metrics)
      ? raw.metrics.flatMap((item) => {
          const metric = parseMetric(item);
          return metric === undefined ? [] : [metric];
        })
      : [],
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.flatMap((item) => {
          const row = parseEvidence(item);
          return row === undefined ? [] : [row];
        })
      : [],
    findings: Array.isArray(raw.findings)
      ? raw.findings.flatMap((item) => {
          const finding = parseFinding(item);
          return finding === undefined ? [] : [finding];
        })
      : [],
  };
}

export function qualityFromStatus(status: string): QualityKind {
  if (status === "completed") {
    return "valid";
  }
  if (status === "failed" || status === "cancelled") {
    return "failed";
  }
  return "incomplete";
}

export function categoryForMetric(name: string): BudgetCategory | undefined {
  if (name.startsWith("frame_time")) {
    return "Rendering";
  }
  return undefined;
}

export function budgetCardsFromMetrics(
  metrics: MetricView[],
): BudgetCardView[] {
  return BUDGET_CATEGORIES.map((category) => ({
    category,
    status: "inconclusive",
    metrics: metrics.filter(
      (metric) => categoryForMetric(metric.name) === category,
    ),
  }));
}

export function isAllowedSourceUri(uri: string): boolean {
  if (uri.includes("..") || uri.startsWith("/") || uri.startsWith("\\")) {
    return false;
  }
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(uri);
}

export function relatedMetrics(
  finding: FindingView,
  metrics: MetricView[],
): MetricView[] {
  const token = finding.ruleId.split(".").at(-1);
  if (token === undefined) {
    return metrics;
  }
  const matched = metrics.filter((metric) => metric.name.includes(token));
  return matched.length > 0 ? matched : metrics;
}
