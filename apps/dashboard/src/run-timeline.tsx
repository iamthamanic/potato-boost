/**
 * RunTimeline — scenario markers and a selected sample range on one axis.
 * Used on /runs/:id Timeline tab. Location: apps/dashboard/src/run-timeline.tsx
 */
import { useEffect, useState } from "react";
import {
  filterByPreset,
  MARKERS,
  peakSample,
  type SampleView,
  type ZoomPreset,
} from "./timeline.js";

type RunTimelineProps = {
  samples: SampleView[];
};

export function RunTimeline(props: RunTimelineProps) {
  const [preset, setPreset] = useState<ZoomPreset>("all");
  const visible = filterByPreset(props.samples, preset);
  const peak = peakSample(visible);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    peak?.sampleId,
  );
  const selected =
    visible.find((sample) => sample.sampleId === selectedId) ?? peak;
  const minNs = visible[0]?.timestampNs ?? 0;
  const maxNs = visible.at(-1)?.timestampNs ?? 0;
  const span = Math.max(1, maxNs - minNs);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "[") {
        setPreset("all");
      }
      if (event.key === "]") {
        setPreset("measure");
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const index = visible.findIndex(
          (sample) => sample.sampleId === selected?.sampleId,
        );
        const next =
          event.key === "ArrowRight"
            ? visible[Math.min(visible.length - 1, index + 1)]
            : visible[Math.max(0, index - 1)];
        if (next !== undefined) {
          setSelectedId(next.sampleId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [selected?.sampleId, visible]);

  if (props.samples.length === 0) {
    return (
      <p className="muted">
        No samples in this artifact. Re-run a Quick Scan to collect a timeline.
      </p>
    );
  }

  return (
    <div className="timeline">
      <div className="actions">
        <button
          type="button"
          aria-pressed={preset === "all"}
          onClick={() => {
            setPreset("all");
          }}
        >
          All
        </button>
        <button
          type="button"
          aria-pressed={preset === "measure"}
          onClick={() => {
            setPreset("measure");
          }}
        >
          Measure
        </button>
        <span className="muted">Keys [ ] zoom · arrows select</span>
      </div>
      <ol className="timeline-markers">
        {MARKERS.filter((marker) => {
          if (preset === "measure") {
            return marker.atNs >= 20;
          }
          return true;
        }).map((marker) => (
          <li key={marker.id}>
            <span aria-hidden="true">▮</span> {marker.label} @ {marker.atNs} ns
          </li>
        ))}
      </ol>
      <div
        className="timeline-track"
        role="img"
        aria-label="Sample values along the run time axis"
      >
        {visible.map((sample) => {
          const left = ((sample.timestampNs - minNs) / span) * 100;
          const selectedNow = sample.sampleId === selected?.sampleId;
          return (
            <button
              key={sample.sampleId}
              type="button"
              className={
                selectedNow ? "timeline-tick is-selected" : "timeline-tick"
              }
              style={{ left: `${String(left)}%` }}
              aria-pressed={selectedNow}
              onClick={() => {
                setSelectedId(sample.sampleId);
              }}
            >
              <span className="visually-hidden">
                {sample.sampleId} {sample.value} {sample.unit}
              </span>
            </button>
          );
        })}
      </div>
      {selected === undefined ? (
        <p className="muted">No sample selected.</p>
      ) : (
        <p>
          Selected range {selected.sampleId} at {selected.timestampNs} ns ·{" "}
          <span className="mono">
            {selected.metric} {selected.value} {selected.unit}
          </span>
          {peak !== undefined && peak.sampleId === selected.sampleId
            ? " (peak)"
            : ""}
        </p>
      )}
      <table className="checks timeline-table">
        <caption className="muted">Samples (narrow layout fallback)</caption>
        <thead>
          <tr>
            <th>Id</th>
            <th>t (ns)</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {visible.slice(0, 8).map((sample) => (
            <tr
              key={`row-${sample.sampleId}`}
              className={
                sample.sampleId === selected?.sampleId ? "is-selected" : ""
              }
            >
              <td className="mono">{sample.sampleId}</td>
              <td className="mono">{sample.timestampNs}</td>
              <td className="mono">
                {sample.value} {sample.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
