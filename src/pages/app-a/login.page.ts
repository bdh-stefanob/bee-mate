// src/pages/app-a/login.page.ts
// PAGE OBJECT. The ONLY layer that knows about selectors and UI mechanics.
// If the UI changes, you fix it here — nowhere else. Steps and actions never
// touch selectors.

import { Page } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  // Selectors live here, isolated from everything above.
  private readonly emailInput = '[data-testid="email"]';
  private readonly passwordInput = '[data-testid="password"]';
  private readonly submitButton = '[data-testid="login-submit"]';
  private readonly dashboard = '[data-testid="dashboard"]';

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async submitCredentials(email: string, password: string): Promise<void> {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
  }

  async isDashboardVisible(): Promise<boolean> {
    return this.page.isVisible(this.dashboard);
  }
}
