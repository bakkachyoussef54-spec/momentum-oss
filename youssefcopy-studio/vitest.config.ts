import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Live tests need a running Ollama server and only run with OLLAMA_LIVE=1.
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", ...(process.env.OLLAMA_LIVE ? ["tests/live/**/*.test.ts"] : [])],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", AI_PROVIDER: "none" },
    fileParallelism: false,
  },
});
