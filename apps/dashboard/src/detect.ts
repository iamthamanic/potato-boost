export type EvidenceEntry = {
  kind: "marker" | "manifest" | "dependency";
  path: string;
  detail: string;
};

export type DetectedCandidate = {
  kind: string;
  confidence: number;
  evidence: EvidenceEntry[];
  inferredStart: string[];
};

export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

export function isAmbiguous(candidates: readonly DetectedCandidate[]): boolean {
  return (
    candidates.filter(
      (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
    ).length >= 2
  );
}

export function parseArgv(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
}

export function formatArgv(argv: readonly string[]): string {
  return argv.join(" ");
}

export function kindLabel(kind: string): string {
  return kind === "unknown" ? "Generic (unsupported)" : kind;
}

export function pickInitialTarget(
  candidates: readonly DetectedCandidate[],
  ambiguous: boolean,
): string | undefined {
  if (ambiguous) {
    return undefined;
  }
  const supported = candidates.find(
    (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
  );
  if (supported !== undefined) {
    return supported.kind;
  }
  if (candidates.length === 1) {
    return candidates[0]?.kind;
  }
  return undefined;
}

export function cardTone(
  candidate: DetectedCandidate,
  ambiguous: boolean,
): "unsupported" | "ambiguous" | "supported" {
  if (candidate.kind === "unknown" || candidate.confidence === 0) {
    return "unsupported";
  }
  return ambiguous ? "ambiguous" : "supported";
}
