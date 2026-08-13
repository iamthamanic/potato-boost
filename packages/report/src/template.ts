import type { RunArtifact } from "@potato-boost/schemas";

/** Escape HTML entities for safe embedding. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHtmlReport(artifact: RunArtifact): string {
  const findings = artifact.findings
    .map(
      (f) => `
    <tr>
      <td>${escapeHtml(f.findingId)}</td>
      <td>${escapeHtml(f.ruleId)}</td>
      <td>${escapeHtml(f.severity)}</td>
      <td>${escapeHtml(f.confidence)}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Potato Boost Report — ${escapeHtml(artifact.run.runId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
  <h1>Potato Boost Report</h1>
  <p>Run: <code>${escapeHtml(artifact.run.runId)}</code></p>
  <p>Status: <code>${escapeHtml(artifact.run.status)}</code></p>
  <p>Started: <code>${escapeHtml(artifact.run.startedAt)}</code></p>
  <h2>Findings</h2>
  <table>
    <thead><tr><th>Finding</th><th>Rule</th><th>Severity</th><th>Confidence</th></tr></thead>
    <tbody>${findings}</tbody>
  </table>
</body>
</html>`;
}
