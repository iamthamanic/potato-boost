import { startLocalApi } from "../packages/local-api/dist/index.js";

const TOKEN = process.env.POTATO_E2E_TOKEN ?? "e2e-a11y-token";

const api = await startLocalApi({
  preferredPort: 8787,
  token: TOKEN,
  runHoldMs: 60_000,
});

if (api.port !== 8787) {
  await api.close();
  throw new Error(`e2e local API bound ${String(api.port)}, expected 8787`);
}

console.log(`API_READY ${api.url}`);
await new Promise(() => undefined);
