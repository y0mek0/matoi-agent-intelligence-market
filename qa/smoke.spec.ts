import { expect, test } from "@playwright/test";

test("control room renders core sections", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Agents that buy intelligence/i })).toBeVisible();
  await expect(page.getByText("BUY_SMALL", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("RedditPulse")).toBeVisible();
  await expect(page.getByText("Disabled by policy")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: /Run cycle/i })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("status API redacts secrets", async ({ request }) => {
  const response = await request.get("/api/system/status");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.arc.circleApiKey).toBe(true);
  expect(JSON.stringify(body)).not.toContain("TEST_API_KEY");
  expect(JSON.stringify(body)).not.toContain("sk-or");
});
