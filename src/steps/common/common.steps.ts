// src/steps/common/common.steps.ts
// Shared steps reused across domains (auth, orders, ...). A declarative login
// step lives here so every feature reuses ONE canonical login instead of
// re-implementing it. This is the anti-noise principle in code form.

import { Given, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { AuthActions } from "../../actions/auth.actions";

/**
 * @intent  Logs in as a user of the given role in one declarative step.
 * @param   role  The role to log in as: "admin" | "standard".
 * @post    An authenticated session is active for that role.
 * @page    LoginPage
 */
/**
 * @intent  Asserts or navigates to any named page. Shared across all domains.
 * @param   page  The page title or URL segment (e.g. "My Account", "Summary").
 * @area    common
 * @wanted
 */
Then(
  "the user is on the {string} page",
  async function (this: CustomWorld, _page: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

Given(
  "I am logged in as a {string} user",
  async function (this: CustomWorld, role: string) {
    const auth = new AuthActions(this.page);
    await auth.ensureRegisteredUser(role);
    await auth.loginWithValidCredentials();
  }
);
