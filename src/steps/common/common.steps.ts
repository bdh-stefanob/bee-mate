// src/steps/common/common.steps.ts
// Shared steps reused across domains (auth, orders, ...). A declarative login
// step lives here so every feature reuses ONE canonical login instead of
// re-implementing it. This is the anti-noise principle in code form.

import { Given } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { AuthActions } from "../../actions/auth.actions";

/**
 * @intent  Logs in as a user of the given role in one declarative step.
 * @param   role  The role to log in as: "admin" | "standard".
 * @post    An authenticated session is active for that role.
 */
Given(
  "I am logged in as a {string} user",
  async function (this: CustomWorld, role: string) {
    const auth = new AuthActions(this.page);
    await auth.ensureRegisteredUser(role);
    await auth.loginWithValidCredentials();
  }
);
