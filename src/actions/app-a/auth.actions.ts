// src/actions/app-a/auth.actions.ts
// DOMAIN / ACTION LAYER. Business intentions, framework-agnostic in spirit.
// Steps call these; these call Page Objects. Selectors never appear here.
// This is where "what the business does" lives, decoupled from the UI.

import { Page } from "@playwright/test";
import { LoginPage } from "../../pages/app-a/login.page";

export class AuthActions {
  constructor(private page: Page) {}

  /**
   * Ensures a registered user exists for the test (seed via API/fixture in a
   * real project). Placeholder here — wire to your test-data strategy.
   */
  async ensureRegisteredUser(role: string = "standard"): Promise<void> {
    // TODO: seed user via API client or fixture factory.
    void role;
  }

  async loginWithValidCredentials(): Promise<void> {
    const login = new LoginPage(this.page);
    await login.goto();
    await login.submitCredentials("test.user@example.com", "valid-password");
  }

  async isOnDashboard(): Promise<boolean> {
    return new LoginPage(this.page).isDashboardVisible();
  }
}
