export type CapabilityStatus = "ok" | "missing" | "unsupported";

export type DoctorCheck = {
  id: string;
  status: CapabilityStatus;
  required: boolean;
  path: string;
  detail: string;
};

export type DoctorReport = {
  root: string;
  checks: readonly DoctorCheck[];
  ok: boolean;
};

export type DoctorEnv = {
  nodePath: string;
  nodeVersion: string;
  wantedNodeRange: string;
  locateBrowser: () => Promise<string | null>;
  isPortInUse: (port: number) => Promise<boolean>;
  appPort: number;
};
