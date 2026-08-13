import type { Detector } from "@potato-boost/core";
import { webDetectors as coreWebDetectors } from "@potato-boost/core";

/** Re-export for CLI composition. */
export const webDetectors: readonly Detector[] = coreWebDetectors;
