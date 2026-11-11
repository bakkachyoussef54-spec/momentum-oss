import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      // Runs the production build against an isolated database. Run `npm run build` first.
      command: `node -e "require('fs').rmSync('e2e.db',{force:true})" && npx prisma migrate deploy && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { DATABASE_URL: "file:./e2e.db", AI_PROVIDER: "none" },
    },
    {
      // Mock Ollama API for AI Mode browser tests (canned responses, not a real model).
      command: "node tests/e2e/mock-ollama.mjs",
      url: "http://127.0.0.1:11500/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
