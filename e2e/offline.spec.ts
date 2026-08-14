import { expect, test } from "@playwright/test";

function isLoopback(url: string): boolean {
  const host = new URL(url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}

test("blocked network: fixture loads with zero non-loopback requests", async ({
  page,
}) => {
  const blocked: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (isLoopback(url)) {
      await route.continue();
      return;
    }
    blocked.push(url);
    await route.abort("internetdisconnected");
  });
  await page.goto("/");
  await expect(page.getByTestId("problem-overlay")).toHaveText("problem: none");
  await expect(page.locator("canvas")).toBeVisible();
  expect(blocked).toEqual([]);
});
