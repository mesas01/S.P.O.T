import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.resolve(__dirname, ".env.integration"),
  override: true,
});

export default defineConfig({
  test: {
    include: ["test/integration/**/*.integration.test.ts"],
    environment: "node",
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 180_000,
    hookTimeout: 120_000,
    watch: false,
    env: {
      RUN_INTEGRATION_TESTS: process.env.RUN_INTEGRATION_TESTS || "",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      INTEGRATION_CLAIMER_ADDRESS:
        process.env.INTEGRATION_CLAIMER_ADDRESS || "",
      CLAIM_PAYER_SECRET: process.env.CLAIM_PAYER_SECRET || "",
      ADMIN_SECRET: process.env.ADMIN_SECRET || "",
    },
  },
  define: {
    "import.meta.env.VITE_BACKEND_URL": JSON.stringify(
      process.env.VITE_BACKEND_URL || "http://backend:4000",
    ),
    "import.meta.env.VITE_BACKEND_TIMEOUT_MS": JSON.stringify(
      process.env.VITE_BACKEND_TIMEOUT_MS || "180000",
    ),
    "import.meta.env.VITE_BACKEND_MAX_ATTEMPTS": JSON.stringify(
      process.env.VITE_BACKEND_MAX_ATTEMPTS || "1",
    ),
    "import.meta.env.VITE_BACKEND_RETRY_BACKOFF_MS": JSON.stringify(
      process.env.VITE_BACKEND_RETRY_BACKOFF_MS || "1000",
    ),
  },
});
