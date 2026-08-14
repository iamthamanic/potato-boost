/**
 * Live run — SSE/poll phases and abort. Route: /runs/:id/live
 * Location: apps/dashboard/src/live-run.tsx
 */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";
import { RunPhaseStepper } from "./run-phase-stepper.js";
import { type PhaseEvent, parseSseChunk } from "./run-phases.js";
import { getApiBase, getRunToken } from "./session.js";

type RunSnapshot = {
  runId: string;
  status: string;
  baselineEligible: boolean;
};

type PageState =
  | { kind: "loading"; operation: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; run: RunSnapshot; events: PhaseEvent[] };

export function LiveRun() {
  const params = useParams();
  const runId = params.id;
  const [page, setPage] = useState<PageState>({
    kind: "loading",
    operation: "Opening live run",
  });
  const [busy, setBusy] = useState(false);

  const loadSnapshot = useCallback(async (): Promise<RunSnapshot> => {
    if (runId === undefined) {
      throw new ApiRequestError("Run id is missing.", 400);
    }
    return readJson<RunSnapshot>(await apiRequest(`/api/v1/runs/${runId}`));
  }, [runId]);

  useEffect(() => {
    if (runId === undefined) {
      setPage({ kind: "error", message: "Run id is missing." });
      return;
    }
    const controller = new AbortController();
    let lastId = 0;
    const collected: PhaseEvent[] = [];

    const pump = async (): Promise<void> => {
      setPage({ kind: "loading", operation: "Connecting to run events" });
      try {
        const run = await loadSnapshot();
        setPage({ kind: "ready", run, events: collected });
        await streamEvents(
          runId,
          lastId,
          controller.signal,
          (batch, nextId) => {
            lastId = Math.max(lastId, nextId);
            collected.push(...batch);
            setPage({
              kind: "ready",
              run,
              events: [...collected],
            });
          },
        );
        const finalRun = await loadSnapshot();
        setPage({ kind: "ready", run: finalRun, events: [...collected] });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setPage({
          kind: "error",
          message:
            error instanceof ApiRequestError
              ? error.message
              : "Local API is unreachable. Start the loopback server, then retry.",
        });
      }
    };
    void pump();
    return () => {
      controller.abort();
    };
  }, [loadSnapshot, runId]);

  const abort = async (): Promise<void> => {
    if (runId === undefined) {
      return;
    }
    setBusy(true);
    try {
      const run = await readJson<RunSnapshot>(
        await apiRequest(`/api/v1/runs/${runId}/abort`, { method: "POST" }),
      );
      setPage((current) =>
        current.kind === "ready"
          ? { ...current, run }
          : { kind: "ready", run, events: [] },
      );
    } catch (error) {
      setPage({
        kind: "error",
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Abort failed. Retry when the loopback server is up.",
      });
    } finally {
      setBusy(false);
    }
  };

  const latest = page.kind === "ready" ? page.events.at(-1) : undefined;

  return (
    <section>
      <h2>Live run</h2>
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
          </>
        ) : null}
        {page.kind === "ready" ? (
          <>
            <p className="status">
              <span aria-hidden="true">
                {page.run.status === "cancelled" ? "!" : "●"}
              </span>
              <span>Status {page.run.status}</span>
            </p>
            {page.run.status === "cancelled" || !page.run.baselineEligible ? (
              <p className="muted">This run is not eligible as a baseline.</p>
            ) : null}
            <RunPhaseStepper
              current={latest?.phase ?? "setup"}
              detail={latest?.detail ?? "waiting"}
            />
            <button
              type="button"
              onClick={() => void abort()}
              disabled={busy || page.run.status !== "running"}
            >
              Abort run
            </button>
            {page.run.status !== "running" ? (
              <p className="muted">
                Abort is available while the run is running.
              </p>
            ) : null}
            <details>
              <summary>Logs</summary>
              <ul className="log">
                {page.events.map((event) => (
                  <li key={event.id} className="mono">
                    {event.phase} — {event.detail}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : null}
      </div>
    </section>
  );
}

async function streamEvents(
  runId: string,
  lastEventId: number,
  signal: AbortSignal,
  onBatch: (events: PhaseEvent[], lastId: number) => void,
): Promise<void> {
  const token = getRunToken();
  const headers = new Headers();
  if (token !== undefined) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (lastEventId > 0) {
    headers.set("last-event-id", String(lastEventId));
  }
  const response = await fetch(`${getApiBase()}/api/v1/runs/${runId}/events`, {
    headers,
    signal,
  });
  if (response.status === 410) {
    return;
  }
  if (!response.ok || response.body === null) {
    throw new ApiRequestError(
      `Local API returned ${response.status}. Retry when the loopback server is up.`,
      response.status,
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastId = lastEventId;
  while (!signal.aborted) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    buffer += decoder.decode(chunk.value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;
    if (parsed.events.length > 0) {
      lastId = Math.max(lastId, parsed.lastId);
      onBatch(parsed.events, lastId);
    }
  }
}
