import { expect, test } from "@playwright/test";

/**
 * Hybrid Edition in the browser. AI Mode talks to tests/e2e/mock-ollama.mjs — a MOCK of the
 * Ollama API with canned responses, not a real model. Real-model coverage lives in tests/live.
 */
test.describe.configure({ mode: "serial" });

const MOCK_URL = "http://127.0.0.1:11500";

test.afterAll(async ({ browser }) => {
  // Leave the app in its default (no provider) state for the other specs.
  const page = await browser.newPage();
  await page.goto("/settings");
  await page.getByLabel("AI provider").selectOption("none");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("AI settings saved").first()).toBeVisible();
  await page.close();
});

test("Hybrid: configure Ollama, write in Human Mode, switch to AI Mode, compare/accept/reject, approval lock, restore", async ({ page }) => {
  // Settings: unreachable Ollama gives an informative error
  await page.goto("/settings");
  await page.getByLabel("AI provider").selectOption("ollama");
  await page.getByLabel("AI model").fill("qwen3:1.7b");
  await page.getByLabel("AI base URL").fill("http://127.0.0.1:11599");
  await page.getByTestId("ai-test-connection").click();
  await expect(page.getByTestId("ai-test-result")).toContainText(/not reachable at http:\/\/127\.0\.0\.1:11599.*ollama\.com\/download/);

  // Point at the mock server: connection test lists models (no generation)
  await page.getByLabel("AI base URL").fill(MOCK_URL);
  await page.getByLabel("Default length").selectOption("short");
  await page.getByTestId("ai-test-connection").click();
  await expect(page.getByTestId("ai-test-result")).toContainText('model "qwen3:1.7b" is installed');
  await expect(page.getByTestId("ai-status")).toContainText("Ollama (local)");

  // Demo brand + campaign; open email 2 (empty)
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Lunora/ })).toBeVisible();
  await page.goto("/campaigns");
  await page.getByRole("link", { name: /Welcome Series — Darker Nights/ }).first().click();
  await page.getByTestId("sequence-email").nth(1).getByRole("link", { name: "Write with guidance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Email 2");

  // Human Mode: a manual objective, with the writing coach visible
  await page.getByTestId("mode-human").click();
  await expect(page.getByTestId("writing-coach")).toContainText("why it matters");
  await page.getByTestId("guided-step-objective").click();
  await page.getByLabel("Email objective").fill("Answer the comfort objection with verified facts");
  await expect(page.getByTestId("save-status")).toContainText(/Saved|All changes saved/, { timeout: 10_000 });

  // Switch to AI Mode: work is kept; generate a full draft from research
  await page.getByTestId("mode-ai").click();
  await expect(page.getByTestId("ai-workbench")).toContainText("qwen3:1.7b");
  await expect(page.getByLabel("Objective summary")).toHaveValue("Answer the comfort objection with verified facts");
  await page.getByTestId("ai-generate-draft").click();
  await expect(page.getByText(/AI-assisted draft created/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Mock: no verified reviews/).first()).toBeVisible();
  await expect(page.getByLabel("Opening hook")).toHaveValue("Mock AI hook: early light waking you up?");
  await expect(page.getByText("AI-assisted draft").first()).toBeVisible();

  // Generate hooks → compare before/after → pick option B → accept
  await page.getByTestId("ai-part-hook_options").click();
  const compare = page.getByTestId("ai-compare");
  await expect(compare).toContainText("Mock AI hook: early light waking you up?");
  await compare.getByRole("radio", { name: /Mock hook option B/ }).click();
  await page.getByTestId("ai-accept").click();
  await expect(page.getByText(/AI suggestion accepted/)).toBeVisible();
  await expect(page.getByLabel("Opening hook")).toHaveValue("Mock hook option B");
  await expect(page.getByText("AI-assisted · human-edited").first()).toBeVisible();

  // Reject leaves the draft untouched
  await page.getByTestId("ai-part-cta_options").click();
  await expect(page.getByTestId("ai-compare")).toContainText("Mock CTA A");
  await page.getByTestId("ai-reject").click();
  await expect(page.getByLabel("Primary CTA")).toHaveValue("Mock AI CTA");

  // Back to Human Mode — nothing lost
  await page.getByTestId("mode-human").click();
  await page.getByTestId("guided-step-hook").click();
  await expect(page.getByLabel("Opening hook")).toHaveValue("Mock hook option B");

  // Approve, then AI regeneration requires explicit confirmation
  await page.getByLabel("Email status").selectOption("approved");
  await expect(page.getByText(/Approved — this version/).first()).toBeVisible();
  await page.getByTestId("mode-ai").click();
  await page.getByTestId("ai-generate-draft").click();
  await expect(page.getByRole("heading", { name: "Replace an approved email's draft?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Opening hook")).toHaveValue("Mock hook option B");

  // Restore the first AI draft from version history (confirmation mentions approval)
  const versions = page.getByTestId("version-list").locator("li");
  await versions.filter({ hasText: /AI-assisted draft/ }).last().getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("dialog")).toContainText("This email is approved");
  await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText(/Restored v\d+\. Your previous draft/)).toBeVisible();
  await expect(page.getByLabel("Opening hook")).toHaveValue("Mock AI hook: early light waking you up?");

  // Optional AI editorial review in the Analyzer
  await page.getByRole("link", { name: "Full analysis →" }).click();
  await expect(page.getByTestId("analysis-report")).toContainText("Factual Accuracy");
  await page.getByTestId("ai-review-run").click();
  await expect(page.getByTestId("ai-review")).toContainText("Mock review.");
  await expect(page.getByTestId("ai-review")).toContainText("cannot predict sales");
});
