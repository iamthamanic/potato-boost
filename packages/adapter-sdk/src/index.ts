export {
  collectFake,
  detectFake,
  doctorFake,
  FAKE_MANIFEST,
  FAKE_MARKER,
  type FakeCollectResult,
  type FakeDetectResult,
  type FakeDoctorResult,
  type FakeLaunched,
  type FakeSample,
  launchFake,
} from "./fake.js";
export type { HarnessResult } from "./harness.js";
export { hasCapability, runContractHarness } from "./harness.js";
export type { AdapterManifest, Capability } from "./manifest.js";
export {
  adapterManifestSchema,
  CAPABILITIES,
  isCompatibleSchema,
} from "./manifest.js";
