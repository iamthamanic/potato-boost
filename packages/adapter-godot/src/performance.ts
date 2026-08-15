export const GODOT_PERFORMANCE_SNAPSHOT = "potato.godot-performance.json";
export const GODOT_ADDON_DIR = "addons/potato_boost";
export const GODOT_ADDON_REL = "addons/potato_boost/performance_dump.gd";
export const GODOT_ADDON_PLUGIN_REL = "addons/potato_boost/plugin.cfg";
export const GODOT_ADDON_FILES = [
  GODOT_ADDON_PLUGIN_REL,
  GODOT_ADDON_REL,
] as const;

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
