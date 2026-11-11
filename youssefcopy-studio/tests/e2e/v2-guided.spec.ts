import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

test.describe.configure({ mode: "serial" });

const BRAND = "Velvet Night Co.";

async function writeEmailWithGuidance(page: Page) {
  await expect(page.getByTestId("guided-writer")).toBeVisible();
  const use = () => page.getByTestId("guided-suggestions").getByRole("button", { name: "Use" }).first().click();
  // 1–2: objective and audience from rule-based suggestions
  await page.getByTestId("guided-step-objective").click();
  await use();
  await page.getByTestId("guided-step-audience").click();
  await use();
  // 3–5: pick one pain point, one verified benefit and a framework
  await page.getByTestId("guided-step-pain").click();
  await page.getByRole("radiogroup", { name: "Primary pain point" }).getByRole("radio").first().click();
  await page.getByTestId("guided-step-verified_benefit").click();
  await page.getByRole("radiogroup", { name: "Verified benefit" }).getByRole("radio").first().click();
  await page.getByTestId("guided-step-framework").click();
  await page.getByRole("radiogroup", { name: "Framework" }).getByRole("radio", { name: /^PAS/ }).click();
  // 6: three subject lines
  await page.getByTestId("guided-step-subject").click();
  const subjects = page.getByTestId("guided-suggestions").getByRole("button", { name: "Use" });
  const count = await subjects.count();
  for (let i = 0; i < count; i++) await subjects.nth(i).click();
  for (let i = count; i < 3; i++) await page.getByLabel(`Guided subject line ${i + 1}`).fill(`Subject option ${i + 1}`);
  // 7–8: preview and hook
  for (const step of ["preview", "hook"]) {
    await page.getByTestId(`guided-step-${step}`).click();
    await use();
  }
  // 9: body from its three framework parts
  await page.getByTestId("guided-step-body").click();
  for (const part of ["problem", "benefit", "transition"]) await page.getByTestId(`use-part-${part}`).click();
  // 10–11: CTA and rationale
  for (const step of ["cta", "rationale"]) {
    await page.getByTestId(`guided-step-${step}`).click();
    await use();
  }
  await expect(page.getByText("11/12 steps")).toBeVisible();
  await expect(page.getByTestId("save-status")).toContainText(/Saved|All changes saved/, { timeout: 10_000 });
  // 12: review & approve
  await page.getByTestId("guided-step-review").click();
  await page.getByTestId("guided-approve").click();
  await expect(page.getByText(/Approved — this version/).first()).toBeVisible();
}

test("V2: brand → research → one-click plan → guided writing ×3 → review → export, without an API key", async ({ page }) => {
  // Guided intake
  await page.goto("/brands/new");
  await expect(page.getByTestId("intake-checklist")).toContainText("0/9 sections");
  await page.getByLabel("Brand name *").fill(BRAND);
  await page.getByLabel("Brand website").fill("https://example.com/velvet");
  await page.getByLabel("Product name").fill("Velvet Contour Mask");
  await page.getByLabel("Product description").fill("A contoured sleep mask with molded eye cups.");
  await page.getByLabel("Target audience").fill("Light-sensitive sleepers and shift workers");
  await page.getByLabel("Customer pain points").fill("Early sunrise wakes them up\nFlat masks press on the eyes");
  await page.getByLabel("Customer desires").fill("Sleep through until the alarm");
  await page.getByLabel("Product features").fill("Molded eye cups\nAdjustable strap");
  await page.getByLabel("Product benefits (verified)").fill("Blocks light without pressure on the eyes\nStays in place for side sleepers");
  await page.getByLabel("Purchase objections").fill("Sleep masks feel hot or uncomfortable\nIt will slip off");
  await page.getByLabel("Brand tone of voice").fill("Calm and reassuring. No hype.");
  await expect(page.getByTestId("intake-checklist")).toContainText("9/9 sections");
  await page.getByRole("button", { name: "Create brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: BRAND })).toBeVisible();
  const brandId = page.url().split("/").pop()!;
  await expect(page.getByTestId("workflow-step-brand")).toHaveAttribute("data-status", "complete");

  // Research evidence
  await page.goto(`/research?brand=${brandId}`);
  await page.getByLabel("Title *").fill("Spec sheet");
  await page.getByLabel("Source URL").fill("https://example.com/velvet/spec");
  await page.getByLabel("Category").selectOption("benefit");
  await page.getByLabel("Evidence status").selectOption("verified");
  await page.getByLabel("Content").fill("Molded eye cups leave space for eyelashes.");
  await page.getByRole("button", { name: "Save research" }).click();
  await expect(page.getByTestId("research-item")).toHaveCount(1);

  // Structured brief + one-click planning
  await page.goto(`/brands/${brandId}/brief`);
  await expect(page.getByTestId("structured-brief")).toContainText("Blocks light without pressure on the eyes");
  await expect(page.getByTestId("brief-completeness")).toBeVisible();
  await page.getByRole("button", { name: "Plan 3-email campaign" }).click();
  await expect(page).toHaveURL(/\/campaigns\/(?!new)[a-z0-9]+$/);
  await expect(page.getByTestId("sequence-email").first()).toBeVisible();
  const campaignId = page.url().split("/").pop()!;
  await expect(page.getByTestId("sequence-email")).toHaveCount(3);
  for (const role of ["Introduce the product and its primary benefit", "Address the most important customer objection", "Reinforce the value and guide the purchase decision"]) {
    await expect(page.getByRole("heading", { name: role })).toBeVisible();
  }
  await expect(page.getByText("Main message:").first()).toBeVisible();
  await expect(page.getByText("CTA strategy:").first()).toBeVisible();
  await expect(page.getByText(/Supporting research:.*Spec sheet/).first()).toBeVisible();

  // Write all three emails with the guided writer
  for (const n of [1, 2, 3]) {
    await page.goto(`/campaigns/${campaignId}`);
    await page.getByTestId("sequence-email").nth(n - 1).getByRole("link", { name: "Write with guidance" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(`Email ${n}`);
    await writeEmailWithGuidance(page);
  }
  // Email 2 addresses the first-listed (most important) objection
  await page.getByTestId("workflow-step-email-2").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Email 2");
  await page.getByRole("tab", { name: "Freeform" }).click();
  await expect(page.getByLabel("Opening hook")).toHaveValue(/hot or uncomfortable/);
  await expect(page.getByText("Guided · rule-based assist").first()).toBeVisible();

  // Persistence after reload
  await page.reload();
  await expect(page.getByTestId("guided-writer").or(page.getByLabel("Opening hook"))).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Address the most important customer objection");

  // Review + export
  await page.goto(`/delivery?campaign=${campaignId}`);
  const review = page.getByTestId("review-checklist");
  await expect(review).not.toContainText("○");
  const dl = page.waitForEvent("download");
  await page.getByTestId("export-md").click();
  const md = readFileSync((await (await dl).path())!, "utf8");
  expect(md).toContain(BRAND);
  expect(md.match(/^## Email \d/gm)).toHaveLength(3);
  expect(md).not.toMatch(/not yet approved/);
  expect(md.match(/\*\*Alternatives:\*\*/g)).toHaveLength(3);

  // Guided dashboard shows every step complete
  await page.goto(`/?campaign=${campaignId}`);
  await expect(page.getByTestId("workflow-bar")).toContainText("8/8 steps complete");
});
