import { defineConfig, devices } from "@playwright/test";

const clientUrl = "http://127.0.0.1:3006";
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
    baseURL: clientUrl,
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
      command: "pnpm exec next dev --hostname 127.0.0.1 --port 3006",
      cwd: ".",
      env: {
        API_URL: apiUrl,
        SESSION_SECRET: "client-browser-e2e-session-secret",
      },
      url: clientUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
