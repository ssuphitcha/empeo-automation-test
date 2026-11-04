import { Locator, Page } from '@playwright/test';

/** /Register/empeo/create-password and the "ready for you" page after it. */
export class CreatePasswordPage {
  readonly page: Page;
  readonly password: Locator;
  readonly confirm: Locator;
  readonly submit: Locator;
  readonly rules: Locator;
  readonly letsGetStarted: Locator;
  readonly language: Locator;
  readonly errorPopup: Locator;

  constructor(page: Page) {
    this.page = page;
    this.password = page.getByTestId('input_textfield_input_input_password_crate_password_password');
    this.confirm = page.getByTestId('input_textfield_input_input_password_crate_password_confirm_password');
    this.submit = page.getByTestId('button_button_create_password_btn_next');
    this.rules = page.locator('.condition-item');
    this.letsGetStarted = page.getByTestId('button_button_create_password_btn_lets_get_started');
    this.language = page.getByTestId('setting_language');
    this.errorPopup = page.locator('.swal2-popup');
  }

  async waitUntilOpen() {
    await this.page.waitForURL(/create-password/, { timeout: 20_000 });
    await this.password.waitFor();
  }

  /** Types (not fills) so the inline validation reacts on every character. */
  async type(field: Locator, value: string) {
    await field.click();
    await field.fill('');
    if (value) await field.pressSequentially(value, { delay: 20 });
  }

  /** Rules that currently show the tick icon, as a string like "✓✓-". */
  async ruleStates(): Promise<string> {
    return (
      await this.rules.evaluateAll((els) => els.map((e) => (e.querySelector('i') ? '✓' : '-')))
    ).join('');
  }

  async switchLanguage(lang: 'English' | 'ไทย') {
    await this.language.click();
    await this.page.getByText(lang, { exact: true }).first().click();
    await this.page.waitForTimeout(500);
  }
}
