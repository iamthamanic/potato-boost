export const RUN_PHASES = [
  "setup",
  "warmup",
  "measure",
  "analyze",
  "report",
] as const;

export type RunPhase = (typeof RUN_PHASES)[number];

export type PhaseEvent = {
  id: number;
  phase: string;
  detail: string;
};

export function parseSseChunk(buffer: string): {
  events: PhaseEvent[];
  rest: string;
  lastId: number;
} {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: PhaseEvent[] = [];
  let lastId = 0;
  for (const block of parts) {
    let id = 0;
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("id:")) {
        id = Number(line.slice(3).trim());
      } else if (line.startsWith("data:")) {
        data = line.slice(5).trim();
      }
    }
    if (data.length === 0) {
      continue;
    }
    let parsed: { phase?: string; detail?: string };
    try {
      parsed = JSON.parse(data) as { phase?: string; detail?: string };
    } catch {
      continue;
    }
    const event: PhaseEvent = {
      id,
      phase: parsed.phase ?? "setup",
      detail: parsed.detail ?? "",
    };
    events.push(event);
    if (id > lastId) {
      lastId = id;
    }
  }
  return { events, rest, lastId };
}

export function isKnownPhase(phase: string): phase is RunPhase {
  return (RUN_PHASES as readonly string[]).includes(phase);
}
