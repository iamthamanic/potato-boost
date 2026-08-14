/**
 * Setup detect — choose a target, override start argv, confirm or cancel.
 * Route: /setup/detect. Location: apps/dashboard/src/setup-detect.tsx
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";
import {
  type DetectedCandidate,
  formatArgv,
  isAmbiguous,
  parseArgv,
} from "./detect.js";
import { DetectionCard } from "./detection-card.js";

type DetectResponse = {
  wrote: boolean;
  ambiguous: boolean;
  candidates: DetectedCandidate[];
};

type ConfigResponse = {
  wrote: boolean;
  plannedPaths?: string[];
  writtenPaths?: string[];
  configYaml?: string;
  adapterId?: string;
};

type PageState =
  | { kind: "loading"; operation: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; detect: DetectResponse };

export function SetupDetect() {
  const [page, setPage] = useState<PageState>({
    kind: "loading",
    operation: "Detecting project candidates",
  });
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [startText, setStartText] = useState("");
  const [preview, setPreview] = useState<ConfigResponse | undefined>(undefined);
  const [busy, setBusy] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    setPage({ kind: "loading", operation: "Detecting project candidates" });
    setPreview(undefined);
    try {
      const detect = await readJson<DetectResponse>(
        await apiRequest("/api/v1/detect"),
      );
      const ambiguous = detect.ambiguous || isAmbiguous(detect.candidates);
      const only = detect.candidates.filter(
        (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
      );
      const nextSelected = ambiguous ? undefined : only[0]?.kind;
      const chosen = detect.candidates.find(
        (candidate) => candidate.kind === nextSelected,
      );
      setSelected(nextSelected);
      setStartText(formatArgv(chosen?.inferredStart ?? []));
      setPage({
        kind: "ready",
        detect: { ...detect, ambiguous },
      });
    } catch (error) {
      setPage({
        kind: "error",
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Local API is unreachable. Start the loopback server, then retry.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelect = (kind: string): void => {
    if (page.kind !== "ready") {
      return;
    }
    const chosen = page.detect.candidates.find(
      (candidate) => candidate.kind === kind,
    );
    setSelected(kind);
    setStartText(formatArgv(chosen?.inferredStart ?? []));
    setPreview(undefined);
  };

  const postConfig = async (
    path:
      | "/api/v1/config/preview"
      | "/api/v1/config/confirm"
      | "/api/v1/config/cancel",
  ): Promise<void> => {
    setBusy(path);
    try {
      if (path === "/api/v1/config/cancel") {
        const result = await readJson<ConfigResponse>(
          await apiRequest(path, { method: "POST", body: "{}" }),
        );
        setPreview(result);
        setSelected(undefined);
        setStartText("");
        return;
      }
      if (selected === undefined) {
        return;
      }
      const result = await readJson<ConfigResponse>(
        await apiRequest(path, {
          method: "POST",
          body: JSON.stringify({
            adapterId: selected,
            start: parseArgv(startText),
          }),
        }),
      );
      setPreview(result);
    } catch (error) {
      setPage({
        kind: "error",
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Local API is unreachable. Start the loopback server, then retry.",
      });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <section>
      <h2>Setup detect</h2>
      <div className="panel" aria-busy={page.kind === "loading"}>
        {page.kind === "loading" ? (
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {page.operation}…</span>
          </p>
        ) : null}
        {page.kind === "error" ? (
          <>
            <p className="status">
              <span aria-hidden="true">!</span>
              <span>Error</span>
            </p>
            <p>{page.message}</p>
            <button type="button" onClick={() => void load()}>
              Retry
            </button>
          </>
        ) : null}
        {page.kind === "ready" && page.detect.candidates.length === 0 ? (
          <>
            <p className="status">
              <span aria-hidden="true">○</span>
              <span>Empty</span>
            </p>
            <p>
              No target confirmed yet. Run detect, then choose a target here.
            </p>
          </>
        ) : null}
        {page.kind === "ready" && page.detect.candidates.length > 0 ? (
          <>
            {page.detect.ambiguous ? (
              <p className="banner" role="status">
                Multiple targets — pick one. Detection is not unique.
              </p>
            ) : null}
            <fieldset className="detect-grid">
              <legend className="muted">Detected targets</legend>
              {page.detect.candidates.map((candidate) => (
                <DetectionCard
                  key={candidate.kind}
                  candidate={candidate}
                  selected={selected === candidate.kind}
                  ambiguous={page.detect.ambiguous}
                  onSelect={onSelect}
                />
              ))}
            </fieldset>
            <div className="field">
              <label htmlFor="start-argv">Start argv</label>
              <input
                id="start-argv"
                name="start"
                className="mono"
                value={startText}
                onChange={(event) => {
                  setStartText(event.target.value);
                }}
                placeholder="npx vite…"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="muted">
                Whitespace-separated argv, not a shell string. Preview:{" "}
                <code>{JSON.stringify(parseArgv(startText))}</code>
              </p>
            </div>
            <div className="actions">
              <button
                type="button"
                onClick={() => void postConfig("/api/v1/config/cancel")}
                disabled={busy !== undefined}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void postConfig("/api/v1/config/preview")}
                disabled={busy !== undefined || selected === undefined}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => void postConfig("/api/v1/config/confirm")}
                disabled={busy !== undefined || selected === undefined}
              >
                Confirm
              </button>
            </div>
            {selected === undefined ? (
              <p className="muted">
                Select a target first. Confirm writes config.
              </p>
            ) : null}
            {preview !== undefined ? (
              <div className="preview">
                <p className="status">
                  <span aria-hidden="true">{preview.wrote ? "●" : "○"}</span>
                  <span>
                    {preview.wrote
                      ? `Wrote ${preview.writtenPaths?.join(", ") ?? "config"}`
                      : "No files written"}
                  </span>
                </p>
                {preview.wrote ? (
                  <p>
                    Next: run <Link to="/setup/doctor">doctor</Link>. Adapter{" "}
                    <code>{preview.adapterId}</code>. Suggested profile
                    budget-local.
                  </p>
                ) : null}
                {preview.configYaml !== undefined ? (
                  <pre className="mono">{preview.configYaml}</pre>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
