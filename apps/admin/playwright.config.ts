import { defineConfig, devices } from "@playwright/test";

const adminUrl = "http://127.0.0.1:5174";
const apiUrl = "http://127.0.0.1:3101";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: adminUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter=server start:e2e",
      cwd: "../..",
      url: `${apiUrl}/health/live`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm dev --host 127.0.0.1 --port 5174",
      cwd: ".",
      env: {
        VITE_API_URL: apiUrl,
      },
      url: adminUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
