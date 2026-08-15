export const GODOT_PERFORMANCE_SNAPSHOT = "potato.godot-performance.json";
export const GODOT_ADDON_REL = "addons/potato-boost/performance_dump.gd";

export type GodotPerformanceRow = {
  timestampNs: number;
  timeProcessS?: number;
  fps?: number;
  drawCalls?: number;
  memoryStatic?: number;
};

export type GodotPerformanceSnapshot = {
  schemaVersion: "1.0.0";
  source: "godot.performance";
  samples: GodotPerformanceRow[];
};
