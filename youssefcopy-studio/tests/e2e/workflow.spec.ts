import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test.describe.configure({ mode: "serial" });

const BRAND = "Somna Sleep Studio";

test("every navigation item leads to a working page", async ({ page }) => {
  const nav = ["Dashboard", "Brands", "Brand Research", "Campaign Builder", "AI Email Generator", "Email Editor", "Copywriting Analyzer", "Templates", "Client Delivery", "Settings"];
  await page.goto("/");
  for (const label of nav) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page.getByTestId("stat-total-brands")).toHaveText(/^\d+$/);
});

test("complete sleep-mask welcome-series workflow persists and exports", async ({ page }) => {
  // Brand profile via paste-from-document + manual fields
  await page.goto("/brands/new");
  await page.getByRole("button", { name: "Paste from document" }).click();
  await page.getByLabel("Pasted brief").fill(
    [
      `Brand: ${BRAND}`,
      "Product: Somna Contour Mask",
      "Target Audience: Light-sensitive sleepers and shift workers",
      "Pain Points:",
      "- Early sunrise wakes them up",
      "- Flat masks press on the eyes",
      "Benefits:",
      "- Blocks light without pressure on the eyes",
      "Objections: Masks feel uncomfortable",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Fill fields" }).click();
  await expect(page.getByLabel("Brand name *")).toHaveValue(BRAND);
  await page.getByLabel("Product description").fill("A contoured sleep mask with molded eye cups that block light without touching the eyes.");
  await page.getByLabel("Brand tone of voice").fill("Calm, reassuring and premium.");
  await page.getByRole("button", { name: "Create brand" }).click();
  await expect(page).toHaveURL(/\/brands\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: BRAND })).toBeVisible();

  // Edits persist after reload
  await page.getByLabel("Unique selling proposition").fill("Contoured cups leave space for the eyes");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Brand saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Unique selling proposition")).toHaveValue("Contoured cups leave space for the eyes");
  const brandUrl = page.url();

  // Research source
  await page.getByRole("link", { name: /Research \(0\)/ }).click();
  await page.getByLabel("Title *").fill("Product spec sheet");
  await page.getByLabel("Source URL").fill("https://example.com/spec");
  await page.getByLabel("Category").selectOption("benefit");
  await page.getByLabel("Evidence status").selectOption("verified");
  await page.getByLabel("Content").fill("Molded eye cups leave space for eyelashes.");
  await page.getByRole("button", { name: "Save research" }).click();
  await expect(page.getByTestId("research-item")).toHaveCount(1);
  await expect(page.getByTestId("readiness-panel")).toContainText("1 verified");

  // Campaign builder: 7 steps, default 3 emails
  await page.goto(`/campaigns/new?brand=${brandUrl.split("/").pop()}`);
  await page.getByRole("radio", { name: /Welcome Series/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByLabel("Who receives this campaign?")).toHaveValue(/Light-sensitive/);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("What should this campaign achieve?").fill("Convert new subscribers into first-time buyers");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: "Calm & premium" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Campaign name").fill("Somna Welcome Series");
  await page.getByRole("button", { name: "Generate Campaign Brief" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Somna Welcome Series" })).toBeVisible();
  await expect(page.getByTestId("sequence-email")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Address the most important customer objection" })).toBeVisible();
  const campaignId = page.url().split("/").pop()!;

  // AI-unconfigured generator offers manual scaffolds
  await page.goto(`/generate?campaign=${campaignId}`);
  await expect(page.getByTestId("ai-disabled-notice")).toBeVisible();
  await expect(page.getByRole("button", { name: /Generate draft/ })).toHaveCount(0);
  await page.getByTestId("generator-row").nth(1).getByRole("button", { name: /Use template/ }).click();
  await expect(page.getByTestId("generator-row").nth(1)).toContainText("From template");

  // Editor: template, edit, autosave, version, reload
  await page.goto(`/campaigns/${campaignId}`);
  await page.getByTestId("sequence-email").first().getByRole("link", { name: "Write with guidance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Email 1");
  await page.getByLabel("Apply template").selectOption({ label: "Welcome · The one thing we fix" });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("button", { name: "Apply template" }).click();
  await page.getByRole("tab", { name: "Freeform" }).click();
  await expect(page.getByLabel("Body copy")).toHaveValue(/Somna Contour Mask/);

  await page.getByLabel("Subject line 1", { exact: true }).fill("Darker mornings, starting tonight");
  await page.getByLabel("Body copy").fill(
    "Most light-sensitive sleepers have tried a mask. The problem is pressure, not darkness.\n\nThe Somna Contour Mask uses molded eye cups that leave space for your eyes, so you can fall asleep in a dark room without feeling it.",
  );
  await page.getByLabel("Primary CTA").fill("See how the contour works");
  await expect(page.getByTestId("save-status")).toContainText(/Saved|All changes saved/, { timeout: 10_000 });
  await expect(page.getByTestId("quality-panel")).toContainText("Quality score");
  await page.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByText(/Saved as version/)).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Freeform" }).click();
  await expect(page.getByLabel("Subject line 1", { exact: true })).toHaveValue("Darker mornings, starting tonight");
  await expect(page.getByLabel("Body copy")).toHaveValue(/molded eye cups/);
  await expect(page.getByTestId("version-list").locator("li")).toHaveCount(2); // template snapshot + manual save

  // Preview mode and AI actions disabled
  await page.getByRole("tab", { name: "Inbox preview" }).click();
  await expect(page.getByTestId("email-preview")).toContainText("See how the contour works");
  // AI Mode without a provider explains how to connect; Human Mode keeps working.
  await page.getByTestId("mode-ai").click();
  await expect(page.getByTestId("ai-workbench-disabled")).toBeVisible();
  await page.getByTestId("mode-human").click();
  await expect(page.getByTestId("guided-writer")).toBeVisible();

  // Approve
  await page.getByLabel("Email status").selectOption("approved");
  await expect(page.getByText(/Approved — this version/)).toBeVisible();

  // Analyzer
  await page.getByRole("link", { name: "Full analysis →" }).click();
  await expect(page.getByTestId("analysis-report")).toContainText("Top 3 highest-priority weaknesses");
  await expect(page.getByTestId("analysis-report")).toContainText("not a scientifically validated predictor");

  // Delivery export
  await page.goto(`/delivery?campaign=${campaignId}`);
  await expect(page.getByTestId("package-preview")).toContainText("Darker mornings, starting tonight");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-md").click();
  const download = await downloadPromise;
  const md = readFileSync((await download.path())!, "utf8");
  expect(md).toContain(BRAND);
  expect(md).toContain("Convert new subscribers into first-time buyers");
  expect(md).toContain("Darker mornings, starting tonight");
  expect(md).toContain("Recommendations for human review");
  expect(md).toMatch(/Email 2 .*not yet approved/);

  const docx = page.waitForEvent("download");
  await page.getByTestId("export-docx").click();
  expect((await docx).suggestedFilename()).toMatch(/\.docx$/);

  // Dashboard reflects stored records
  await page.goto("/");
  await expect(page.getByTestId("stat-total-brands")).toHaveText(/^[1-9]\d*$/);
  await expect(page.getByTestId("stat-completed-emails")).toHaveText(/^[1-9]\d*$/);
});

test("missing inputs are handled gracefully", async ({ page }) => {
  await page.goto("/brands/new");
  await page.getByRole("button", { name: "Create brand" }).click();
  await expect(page.locator("form p[role=alert]")).toContainText(/Brand name is required/);
  await page.goto("/campaigns/new");
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.goto("/editor/does-not-exist");
  await expect(page.getByText("Not found")).toBeVisible();
});
