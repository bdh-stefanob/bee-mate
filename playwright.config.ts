// playwright.config.ts
// Playwright is used here as the browser-automation engine behind Cucumber.
// Cucumber owns the test lifecycle (scenarios/steps); Playwright drives the
// browser inside the Page Objects and the World. This config holds the
// browser-level defaults (base URL, trace, headless) shared by all scenarios.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  timeout: 30_000,
});
