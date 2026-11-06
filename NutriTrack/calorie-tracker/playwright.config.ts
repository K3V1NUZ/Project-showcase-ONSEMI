import { defineConfig, devices } from "@playwright/test";

// Where to point the browser. Set BASE_URL in CI to the Vercel preview URL;
// locally, defaults to the deployed production site so you can run smoke
// tests without spinning up `next dev`.
const baseURL = process.env.BASE_URL || "https://nutritrack.vercel.app";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // CI-specific defaults: fail on `.only`, retry once, single worker for
  // deterministic ordering. Locally we want fast, no retries.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
