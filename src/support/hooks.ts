// src/support/hooks.ts
// Lifecycle hooks: spin up a browser before each scenario, tear it down after.
// On failure, attach a screenshot to the report for debugging.

import { Before, After, Status, ITestCaseHookParameter } from "@cucumber/cucumber";
import { CustomWorld } from "./world";

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const image = await this.page.screenshot();
    this.attach(image, "image/png");
  }
  await this.destroy();
});
