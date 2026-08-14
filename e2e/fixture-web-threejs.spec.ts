import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const EVIDENCE = ".qa/evidence/fixture-e2e";

test.beforeAll(async () => {
  await mkdir(EVIDENCE, { recursive: true });
});

test("baseline overlay and canvas are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("web-threejs fixture");
  await expect(page.getByTestId("problem-overlay")).toHaveText("problem: none");
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/01-baseline.png` });
});

test("drawcalls problem is activatable", async ({ page }) => {
  await page.goto("/?problem=drawcalls");
  await expect(page.getByTestId("problem-overlay")).toHaveText(
    "problem: drawcalls",
  );
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: `${EVIDENCE}/02-drawcalls.png` });
});

test("longtask and alloc overlays activate", async ({ page }) => {
  await page.goto("/?problem=longtask");
  await expect(page.getByTestId("problem-overlay")).toHaveText(
    "problem: longtask",
  );
  await page.goto("/?problem=alloc");
  await expect(page.getByTestId("problem-overlay")).toHaveText(
    "problem: alloc",
  );
});

test("unknown problem falls back to baseline", async ({ page }) => {
  await page.goto("/?problem=not-a-real-problem");
  await expect(page.getByTestId("problem-overlay")).toHaveText("problem: none");
});

test("fixture makes no external network requests", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (req) => {
    const host = new URL(req.url()).hostname;
    if (host !== "127.0.0.1" && host !== "localhost") {
      external.push(req.url());
    }
  });
  await page.goto("/");
  await expect(page.getByTestId("problem-overlay")).toHaveText("problem: none");
  expect(external).toEqual([]);
});
