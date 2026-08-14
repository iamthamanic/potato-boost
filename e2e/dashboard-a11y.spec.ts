import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const TOKEN = "e2e-a11y-token";
const API = "http://127.0.0.1:8787";
const DASH = "http://127.0.0.1:5173";
const GOLDEN = "01J9GOLDENV100000000000000";

function dash(path: string): string {
  const url = new URL(path, DASH);
  url.searchParams.set("token", TOKEN);
  url.searchParams.set("api", API);
  return url.toString();
}

async function axeCriticalSerious(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter(
    (item) => item.impact === "critical" || item.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test("core routes have no critical or serious Axe violations", async ({
  page,
}) => {
  await page.goto(dash("/setup/detect"));
  await expect(
    page.getByRole("heading", { name: "Setup detect" }),
  ).toBeVisible();
  await expect(page.getByText("Generic (unsupported)")).toBeVisible();
  await expect(
    page.getByText("A manual start is an override, not detect evidence."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled();
  await axeCriticalSerious(page);

  await page.goto(dash("/runs/new"));
  await expect(page.getByRole("heading", { name: "New run" })).toBeVisible();
  await axeCriticalSerious(page);

  const created = await page.request.post(`${API}/api/v1/runs`, {
    headers: {
      authorization: `Bearer ${TOKEN}`,
      origin: DASH,
      "content-type": "application/json",
      "idempotency-key": `e2e-a11y-${String(Date.now())}`,
    },
    data: {
      targetId: "web-threejs",
      scenarioId: "quick-scan",
      profileId: "budget-local",
    },
  });
  expect(created.status()).toBe(202);
  const body = (await created.json()) as { runId: string };

  await page.goto(dash(`/runs/${body.runId}/live`));
  await expect(page.getByRole("heading", { name: "Live run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abort run" })).toBeEnabled();
  await axeCriticalSerious(page);

  await page.goto(dash(`/runs/${GOLDEN}?tab=findings`));
  await expect(page.getByRole("heading", { name: "Run detail" })).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "finding:web.frame_time.p95" }),
  ).toBeVisible();
  await axeCriticalSerious(page);
});

test("keyboard path: skip link, start, abort, finding", async ({ page }) => {
  await page.goto(dash("/setup/detect"));
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.goto(dash("/runs/new"));
  await expect(page.getByRole("heading", { name: "New run" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Start Quick Scan" }),
  ).toBeVisible();

  const created = await page.request.post(`${API}/api/v1/runs`, {
    headers: {
      authorization: `Bearer ${TOKEN}`,
      origin: DASH,
      "content-type": "application/json",
      "idempotency-key": `e2e-abort-${String(Date.now())}`,
    },
    data: {
      targetId: "web-threejs",
      scenarioId: "quick-scan",
      profileId: "budget-local",
    },
  });
  const body = (await created.json()) as { runId: string };
  await page.goto(dash(`/runs/${body.runId}/live`));
  const abort = page.getByRole("button", { name: "Abort run" });
  await expect(abort).toBeEnabled();
  await abort.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Status cancelled")).toBeVisible();

  await page.goto(dash(`/runs/${GOLDEN}?tab=findings`));
  const finding = page.getByRole("radio", {
    name: "finding:web.frame_time.p95",
  });
  await finding.focus();
  await expect(finding).toBeFocused();
});

test("200% zoom keeps primary actions and reduced motion is off", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 720 });
  await page.goto(dash("/setup/detect"));
  await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
  await page.goto(dash("/runs/new"));
  await expect(
    page.getByRole("button", { name: "Start Quick Scan" }),
  ).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(dash("/runs/new"));
  const duration = await page
    .getByRole("button", { name: "Start Quick Scan" })
    .evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(duration === "0s" || duration.startsWith("0s")).toBe(true);
});
