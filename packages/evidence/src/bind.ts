import {
  type Evidence,
  evidenceSchema,
  type Finding,
  findingSchema,
} from "@potato-boost/schemas";
import { EvidenceError } from "./error.js";
import { sanitizeCandidateUri } from "./paths.js";

type SourceCandidate = Finding["sourceCandidates"][number];

export type EvidenceInputRef = {
  kind: string;
  id: string;
  rawHash: string;
};

export type MappingAttempt =
  | {
      available: true;
      uri: string;
      line: number | null;
      column: number | null;
      method: string;
    }
  | {
      available: false;
      runtimeUri: string;
      runtimeLine: number | null;
      runtimeColumn: number | null;
    };

export type BindFindingInput = {
  findingId: string;
  ruleId: string;
  severity: Finding["severity"];
  projectRoot: string;
  evidence: readonly Evidence[];
  mapping: MappingAttempt;
};

function orderedCandidates(
  projectRoot: string,
  mapping: MappingAttempt,
): {
  candidates: SourceCandidate[];
  sourceConfidence: Finding["confidence"];
  factors: string[];
} {
  if (mapping.available) {
    return {
      candidates: [
        {
          uri: sanitizeCandidateUri(projectRoot, mapping.uri),
          line: mapping.line,
          column: mapping.column,
          method: mapping.method,
          confidenceFactors: ["map-present"],
        },
      ],
      sourceConfidence: "medium",
      factors: ["source-map", "ordered-candidate"],
    };
  }
  return {
    candidates: [
      {
        uri: sanitizeCandidateUri(projectRoot, mapping.runtimeUri),
        line: mapping.runtimeLine,
        column: mapping.runtimeColumn,
        method: "runtime",
        confidenceFactors: ["source-map-missing", "runtime-only"],
      },
    ],
    sourceConfidence: "low",
    factors: ["source-map-missing", "runtime-evidence-retained"],
  };
}

export function buildEvidence(input: {
  evidenceId: string;
  inputs: readonly EvidenceInputRef[];
  calculation: string;
  confidence: Evidence["confidence"];
}): Evidence {
  if (input.inputs.length === 0) {
    throw new EvidenceError(
      "EMPTY_INPUTS",
      "evidence requires at least one raw input",
    );
  }
  return evidenceSchema.parse({
    evidenceId: input.evidenceId,
    inputs: input.inputs.map((ref) => ({
      kind: ref.kind,
      id: ref.id,
      rawHash: ref.rawHash,
    })),
    calculation: input.calculation,
    confidence: input.confidence,
  });
}

export function bindFindingEvidence(input: BindFindingInput): Finding {
  if (input.evidence.length === 0) {
    throw new EvidenceError(
      "EMPTY_EVIDENCE",
      "a finding must retain at least one evidence record",
    );
  }
  const { candidates, sourceConfidence, factors } = orderedCandidates(
    input.projectRoot,
    input.mapping,
  );
  return findingSchema.parse({
    findingId: input.findingId,
    ruleId: input.ruleId,
    severity: input.severity,
    evidenceIds: input.evidence.map((item) => item.evidenceId),
    sourceCandidates: candidates,
    confidence: sourceConfidence,
    confidenceFactors: factors,
  });
}

/** Candidates are hypotheses, never a confirmed cause statement. */
export function candidateCaption(candidate: SourceCandidate): string {
  const loc =
    candidate.line === null
      ? candidate.uri
      : `${candidate.uri}:${String(candidate.line)}`;
  return `candidate (${candidate.method}): ${loc}`;
}
