import type { Detector, EvidenceEntry } from "./types.js";

/** Marker-based web stack detectors. */
export const webDetectors: readonly Detector[] = [
  {
    id: "web",
    kind: "web",
    weight: 0.4,
    detect: async (fs, root) => {
      const evidence: EvidenceEntry[] = [];
      if (await fs.exists(`${root}/package.json`)) {
        evidence.push({
          kind: "manifest",
          path: "package.json",
          detail: "manifest present",
        });
      }
      if (await fs.exists(`${root}/index.html`)) {
        evidence.push({
          kind: "marker",
          path: "index.html",
          detail: "vite entry",
        });
      }
      return evidence;
    },
  },
  {
    id: "vite",
    kind: "vite",
    weight: 0.5,
    detect: async (fs, root) => {
      const evidence: EvidenceEntry[] = [];
      const pkgPath = `${root}/package.json`;
      if (await fs.exists(pkgPath)) {
        const raw = await fs.readFile(pkgPath);
        if (raw.includes('"vite"')) {
          evidence.push({
            kind: "dependency",
            path: "package.json",
            detail: "vite dependency",
          });
        }
      }
      for (const name of [
        "vite.config.ts",
        "vite.config.js",
        "vite.config.mjs",
      ]) {
        if (await fs.exists(`${root}/${name}`)) {
          evidence.push({ kind: "marker", path: name, detail: "vite config" });
        }
      }
      return evidence;
    },
  },
  {
    id: "react",
    kind: "react",
    weight: 0.3,
    detect: async (fs, root) => {
      const evidence: EvidenceEntry[] = [];
      const pkgPath = `${root}/package.json`;
      if (await fs.exists(pkgPath)) {
        const raw = await fs.readFile(pkgPath);
        if (raw.includes('"react"')) {
          evidence.push({
            kind: "dependency",
            path: "package.json",
            detail: "react dependency",
          });
        }
      }
      if (await fs.exists(`${root}/src/main.tsx`)) {
        evidence.push({
          kind: "marker",
          path: "src/main.tsx",
          detail: "react entry",
        });
      }
      return evidence;
    },
  },
  {
    id: "threejs",
    kind: "threejs",
    weight: 0.3,
    detect: async (fs, root) => {
      const evidence: EvidenceEntry[] = [];
      const pkgPath = `${root}/package.json`;
      if (await fs.exists(pkgPath)) {
        const raw = await fs.readFile(pkgPath);
        if (raw.includes('"three"')) {
          evidence.push({
            kind: "dependency",
            path: "package.json",
            detail: "three dependency",
          });
        }
      }
      return evidence;
    },
  },
];
