import type { Collector, CollectorResult } from "@potato-boost/collector-hub";

export type CdpMetric = {
  name: string;
  value: number;
  unit: string;
};

export type CdpHandle = {
  getMetrics: () => Promise<readonly CdpMetric[]>;
  close: () => Promise<void>;
};

export type CdpCollectorEnv = {
  connectTimeoutMs: number;
  nowNs: () => number;
  connect: () => Promise<CdpHandle | null>;
};

const TIMEOUT = Symbol("timeout");

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof TIMEOUT> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(TIMEOUT);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function collectWebCdp(
  env: CdpCollectorEnv,
): Promise<CollectorResult> {
  let handle: CdpHandle | null | typeof TIMEOUT;
  try {
    handle = await withTimeout(env.connect(), env.connectTimeoutMs);
  } catch {
    return {
      capability: {
        id: "cdp",
        status: "unsupported",
        required: true,
        detail: "CDP connect failed",
      },
      samples: [],
    };
  }
  if (handle === TIMEOUT) {
    return {
      capability: {
        id: "cdp",
        status: "incomplete",
        required: true,
        detail: "CDP connect timeout",
      },
      samples: [],
    };
  }
  if (handle === null) {
    return {
      capability: {
        id: "cdp",
        status: "unsupported",
        required: true,
        detail: "CDP not available",
      },
      samples: [],
    };
  }
  try {
    const metrics = await handle.getMetrics();
    const samples = metrics.map((metric, index) => ({
      source: "cdp",
      metric: metric.name,
      timestampNs: env.nowNs() + index,
      value: metric.value,
      unit: metric.unit,
    }));
    return {
      capability: {
        id: "cdp",
        status: "ok",
        required: true,
        detail: `collected ${samples.length} metric(s)`,
      },
      samples,
    };
  } finally {
    await handle.close();
  }
}

export function cdpCollector(env: CdpCollectorEnv): Collector {
  return {
    id: "cdp",
    collect: () => collectWebCdp(env),
  };
}

export function createUnavailableCdpEnv(): CdpCollectorEnv {
  return {
    connectTimeoutMs: 50,
    nowNs: () => 1,
    connect: async () => null,
  };
}
