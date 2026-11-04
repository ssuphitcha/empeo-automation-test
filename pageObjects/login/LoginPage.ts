import { Locator, Page } from '@playwright/test';

/** login-uat.gofive.co.th sign-in form that opens after "Let's get started!". */
export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly signIn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.locator('input[type=text]').first();
    this.password = page.locator('input[type=password]').first();
    this.signIn = page.locator('#byEmail');
  }

  async waitUntilOpen() {
    await this.page.waitForURL(/login-uat\.gofive\.co\.th\/Account\/Login/, { timeout: 30_000 });
    await this.password.waitFor();
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signIn.click();
  }
}
