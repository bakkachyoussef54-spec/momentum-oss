import { expect, test } from "@playwright/test";

test("mobile layout: navigation drawer and pages render without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Templates" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Templates" })).toBeVisible();
  for (const path of ["/", "/templates", "/campaigns/new", "/settings", "/analyzer?mode=paste"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
});
