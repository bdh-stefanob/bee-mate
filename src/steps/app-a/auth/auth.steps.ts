// src/steps/app-a/auth/auth.steps.ts
// Thin glue: maps Gherkin phrases to action-layer calls. No business logic,
// no selectors here. Each step carries an @intent comment (project convention)
// so the step catalog can document it automatically.

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { CustomWorld } from "../../../support/world";
import { AuthActions } from "../../../actions/app-a/auth.actions";

/**
 * @intent  Registers the test user so they can authenticate.
 * @post    A user account exists, with the default role.
 * @page    LoginPage
 */
Given("I am a registered user", async function (this: CustomWorld) {
  await new AuthActions(this.page).ensureRegisteredUser();
});

/**
 * @intent  Registers the test user with a specific role.
 * @param   role  The role to assign: "admin" | "standard".
 * @post    A user account exists with the given role.
 * @page    LoginPage
 */
Given(
  "I am a registered user with role {string}",
  async function (this: CustomWorld, role: string) {
    await new AuthActions(this.page).ensureRegisteredUser(role);
  }
);

/**
 * @intent  Authenticates the current user with valid credentials.
 * @pre     A registered user exists.
 * @post    An authenticated session is active.
 * @page    LoginPage
 */
When("I log in with valid credentials", async function (this: CustomWorld) {
  await new AuthActions(this.page).loginWithValidCredentials();
});

/**
 * @intent  Verifies the user reached their dashboard after login.
 * @page    LoginPage
 */
Then("I land on my dashboard", async function (this: CustomWorld) {
  const onDashboard = await new AuthActions(this.page).isOnDashboard();
  assert.equal(onDashboard, true, "Expected to be on the dashboard");
});
