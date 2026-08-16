import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const TOKEN = "e2e-a11y-token";
const API = "http://127.0.0.1:8787";
const DASH = "http://127.0.0.1:5173";
const GOLDEN = "01J9GOLDENV100000000000000";

type Project = {
  id: string;
  name: string;
  root: string;
};

function dash(path: string): string {
  const url = new URL(path, DASH);
  url.searchParams.set("token", TOKEN);
  url.searchParams.set("api", API);
  return url.toString();
}

function apiHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${TOKEN}`,
    origin: DASH,
    "content-type": "application/json",
  };
}

async function projectRoot(page: Page): Promise<string> {
  const response = await page.request.get(`${API}/api/v1/detect`, {
    headers: apiHeaders(),
  });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { root: string }).root;
}

async function ensureProject(page: Page): Promise<Project> {
  const listed = await page.request.get(`${API}/api/v1/projects`, {
    headers: apiHeaders(),
  });
  expect(listed.status()).toBe(200);
  const existing = (await listed.json()) as { projects: Project[] };
  const root = await projectRoot(page);
  const rootProject = existing.projects.find((project) => project.root === root);
  if (rootProject !== undefined) {
    return rootProject;
  }

  const created = await page.request.post(`${API}/api/v1/projects`, {
    headers: apiHeaders(),
    data: {
      name: "E2E Fixture",
      root,
      adapterId: "vite",
      start: ["pnpm", "dev"],
      rulePackIds: ["web-performance"],
      targetProfileId: "local-machine",
    },
  });
  if (created.status() === 201) {
    return (await created.json()) as Project;
  }
  expect(created.status()).toBe(409);
  const retry = await page.request.get(`${API}/api/v1/projects`, {
    headers: apiHeaders(),
  });
  const body = (await retry.json()) as { projects: Project[] };
  const project = body.projects.find((candidate) => candidate.root === root);
  expect(project).toBeDefined();
  if (project === undefined) {
    throw new Error("project registry did not return the root project");
  }
  return project;
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

test("projects hub and creation wizard establish project context", async ({
  page,
}) => {
  const root = await projectRoot(page);
  await page.goto(dash("/projects"));
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create project" })).toBeVisible();
  await axeCriticalSerious(page);

  await page.getByRole("link", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: "Create project" })).toBeVisible();
  await page.getByLabel("Project name").fill("Dashboard fixture");
  await page.getByLabel("Project path").fill(`${root}/apps/dashboard`);
  await page.getByLabel("Project type").selectOption("vite");
  await page.getByLabel("Start argv").fill("pnpm dev");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Choose the rule packs")).toBeVisible();
  await page.getByLabel("JavaScript performance").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Define the performance environment")).toBeVisible();
  await page.getByLabel("Low-end mobile").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Ready to create this project")).toBeVisible();
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText("Dashboard fixture").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: "Test Setup" })).toBeVisible();
  await axeCriticalSerious(page);

  const listed = await page.request.get(`${API}/api/v1/projects`, {
    headers: apiHeaders(),
  });
  const projects = ((await listed.json()) as { projects: Project[] }).projects;
  expect(
    projects.filter((project) => project.root.endsWith("/apps/dashboard")),
  ).toHaveLength(1);
});

test("project workflow routes keep one project navigation model", async ({
  page,
}) => {
  const project = await ensureProject(page);
  const base = `/projects/${project.id}`;

  await page.goto(dash(`${base}/overview`));
  await expect(
    page.getByRole("heading", { name: "Performance workbench" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Runs" })).toBeVisible();
  await axeCriticalSerious(page);

  await page.goto(dash(`${base}/runs`));
  await expect(page.getByRole("heading", { name: "Quick Scan" })).toBeVisible();
  await expect(page.getByText("Local performance budget")).toBeVisible();
  await axeCriticalSerious(page);

  await page.goto(dash(`${base}/compare`));
  await expect(
    page.getByRole("heading", { name: "Verify before vs after" }),
  ).toBeVisible();
  await axeCriticalSerious(page);

  await page.goto(dash(`${base}/scenarios`));
  await expect(page.getByRole("heading", { name: "Scenarios" })).toBeVisible();
  await axeCriticalSerious(page);

  await page.goto(dash(`${base}/test-setup`));
  await expect(page.getByRole("heading", { name: "Test Setup" })).toBeVisible();
  await page.getByLabel("Mid-tier mobile").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Test setup saved.")).toBeVisible();
  await axeCriticalSerious(page);

  const created = await page.request.post(`${API}/api/v1/runs`, {
    headers: {
      ...apiHeaders(),
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

  await page.goto(dash(`${base}/runs/${body.runId}/live`));
  await expect(page.getByRole("heading", { name: "Live run" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Runs" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("button", { name: "Abort run" })).toBeEnabled();
  await axeCriticalSerious(page);

  await page.goto(dash(`${base}/runs/${GOLDEN}?tab=findings`));
  await expect(page.getByRole("heading", { name: "Quick Scan" })).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "finding:web.frame_time.p95" }),
  ).toBeVisible();
  await axeCriticalSerious(page);
});

test("keyboard path reaches project work and run controls", async ({ page }) => {
  const project = await ensureProject(page);
  const base = `/projects/${project.id}`;
  await page.goto(dash(`${base}/runs`));
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
      ...apiHeaders(),
      "idempotency-key": `e2e-abort-${String(Date.now())}`,
    },
    data: {
      targetId: "web-threejs",
      scenarioId: "quick-scan",
      profileId: "budget-local",
    },
  });
  const body = (await created.json()) as { runId: string };
  await page.goto(dash(`${base}/runs/${body.runId}/live`));
  const abort = page.getByRole("button", { name: "Abort run" });
  await expect(abort).toBeEnabled();
  await abort.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Status cancelled")).toBeVisible();

  await page.goto(dash(`${base}/runs/${GOLDEN}?tab=findings`));
  const finding = page.getByRole("radio", {
    name: "finding:web.frame_time.p95",
  });
  await finding.focus();
  await expect(finding).toBeFocused();
});

test("mobile tablet and reduced motion keep project actions usable", async ({
  page,
}) => {
  const project = await ensureProject(page);
  const base = `/projects/${project.id}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(dash("/projects"));
  await expect(page.getByRole("link", { name: "Create project" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveJSProperty(
    "scrollWidth",
    Number.POSITIVE_INFINITY,
  );
  await axeCriticalSerious(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(dash(`${base}/test-setup`));
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare" })).toBeVisible();
  await axeCriticalSerious(page);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(dash(`${base}/runs`));
  const duration = await page
    .getByRole("button", { name: "Start Quick Scan" })
    .evaluate((node) => getComputedStyle(node).transitionDuration);
  expect(duration === "0s" || duration.startsWith("0s")).toBe(true);
});
