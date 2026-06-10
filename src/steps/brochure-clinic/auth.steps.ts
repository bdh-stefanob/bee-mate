// src/steps/brochure-clinic/auth.steps.ts
// Cross-domain login journey: user starts on Boots Brochure and authenticates
// into Clinic. Steps are intentionally abstract — SMS detail is hidden inside
// "completes SMS verification" so UI changes don't break every login scenario.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";

/**
 * @intent  Navigates to the Boots Brochure home page as the test entry point.
 * @post    Browser is on the Brochure home page.
 * @page    BrochureHomePage
 * @area    brochure-clinic
 * @wanted
 */
Given("the user is on the Brochure home page", async function (this: CustomWorld) {
  throw new Error("NOT IMPLEMENTED");
});

/**
 * @intent  Clicks the primary Login button visible on the current page.
 * @page    BrochureHomePage
 * @area    brochure-clinic
 * @wanted
 */
When("the user clicks the Login button", async function (this: CustomWorld) {
  throw new Error("NOT IMPLEMENTED");
});

/**
 * @intent  Enters valid email and password credentials on the named login page.
 * @param   page  The page where credentials are entered (e.g. "Clinic login").
 * @page    ClinicLoginPage
 * @area    brochure-clinic
 * @wanted
 */
When(
  "the user enters valid login credentials on the {string} page",
  async function (this: CustomWorld, _page: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Completes the entire SMS two-factor verification flow in one step.
 *          Abstracts: channel selection → Send code → enter code → Verify.
 * @post    SMS code verified, session active.
 * @page    ClinicSmsVerificationPage
 * @area    brochure-clinic
 * @wanted
 */
When("the user completes SMS verification", async function (this: CustomWorld) {
  throw new Error("NOT IMPLEMENTED");
});

/**
 * @intent  Asserts the user has an authenticated session after login.
 * @area    brochure-clinic
 * @wanted
 */
Then("the user is successfully logged in", async function (this: CustomWorld) {
  throw new Error("NOT IMPLEMENTED");
});

// "the user is on the {string} page" lives in common/common.steps.ts
