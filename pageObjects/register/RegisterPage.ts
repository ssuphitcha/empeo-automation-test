import { expect, Locator, Page, Response } from '@playwright/test';
import PATH from '../../plugins/path';
import { RegistrationData } from '../../models/registration.model';

/**
 * Page object for https://portal.uat.gofive.co.th/Register/empeo
 * Locators use the data-testid values recorded in EXPLORATION.md.
 */
export class RegisterPage {
  readonly page: Page;
  readonly thaiRadio: Locator;
  readonly othersRadio: Locator;
  readonly taxId: Locator;
  readonly companyName: Locator;
  readonly businessTypeDropdown: Locator;
  readonly userAmountDropdown: Locator;
  readonly dropdownOptions: Locator;
  readonly searchItems: Locator;
  readonly email: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly phone: Locator;
  readonly countryFlag: Locator;
  readonly promoLink: Locator;
  readonly promoInput: Locator;
  readonly promoApply: Locator;
  readonly promoChip: Locator;
  readonly consent: Locator;
  readonly privacyLink: Locator;
  readonly termsLink: Locator;
  readonly submit: Locator;
  readonly language: Locator;

  constructor(page: Page) {
    this.page = page;
    this.thaiRadio = page.getByTestId('input_radio_registration_company_thai');
    this.othersRadio = page.getByTestId('input_radio_registration_company_others');
    this.taxId = page.getByTestId('input_textfield_input_registration_tax_id');
    this.companyName = page.getByTestId('input_textfield_input_register_company_name');
    this.businessTypeDropdown = page.getByTestId('dropdown_selection_registration_company_type');
    this.userAmountDropdown = page.getByTestId('dropdown_selection_registration_user_amount');
    this.dropdownOptions = page.locator('go5-dropdown-item');
    this.searchItems = page.locator('go5-dropdown-item').filter({ has: page.locator('p.go5-text-body-small') });
    this.email = page.getByTestId('input_textfield_input_registration_email');
    this.firstName = page.getByTestId('input_textfield_input_register_first_name');
    this.lastName = page.getByTestId('input_textfield_input_register_last_name');
    this.phone = page.locator('#phone');
    this.countryFlag = page.locator('.iti__selected-flag');
    this.promoLink = page.getByTestId('input_button_registration_register_ticket_got_coupon');
    this.promoInput = page.getByTestId('input_text_registration_coupon_code');
    this.promoApply = page.getByTestId('input_button_registration_btn_apply');
    this.promoChip = page.locator('.form-coupon-code');
    this.consent = page.getByTestId('input_checkbox_registration_checkbox');
    this.privacyLink = page.getByTestId('button_button_registration_privacy_policy');
    this.termsLink = page.getByTestId('button_button_registration_terms_and_conditions');
    this.submit = page.getByTestId('button_submit_registration_try_for_free');
    this.language = page.getByTestId('setting_language');
  }

  async goto() {
    await this.page.goto(PATH.REGISTER_PAGE);
    await this.submit.waitFor();
    await this.page.waitForTimeout(1500); // let the dropdown / translation requests settle
  }

  async switchLanguage(lang: 'English' | 'ไทย') {
    await this.language.click();
    await this.page.getByText(lang, { exact: true }).first().click();
    await this.page.waitForTimeout(500);
  }

  async chooseOthers() {
    await this.othersRadio.click({ force: true });
    await this.companyName.waitFor();
  }

  /** The checkbox ignores force-check; a click at its top-left corner works. */
  async tickConsent() {
    if (!(await this.consent.isChecked())) await this.consent.click({ position: { x: 5, y: 5 } });
    await expect(this.consent).toBeChecked();
  }

  async untickConsent() {
    if (await this.consent.isChecked()) await this.consent.click({ position: { x: 5, y: 5 } });
    await expect(this.consent).not.toBeChecked();
  }

  async clickSubmit() {
    await this.submit.click();
    await this.page.waitForTimeout(500);
  }

  /** Clicks an empty area so the focused field loses focus. */
  async clickOutside() {
    await this.page.mouse.click(5, 450);
    await this.page.waitForTimeout(400);
  }

  async selectDropdown(dropdown: Locator, option: string) {
    await dropdown.click();
    await this.page.getByText(option, { exact: true }).first().click();
  }

  async selectCountry(dialCode: string) {
    await this.countryFlag.click();
    await this.page
      .locator('.iti__country-list li')
      .filter({ has: this.page.locator('.iti__dial-code', { hasText: new RegExp(`^\\+${dialCode}$`) }) })
      .first()
      .click();
  }

  /** Types in the Thai-mode search box and waits for the tax-search response. */
  async search(text: string): Promise<Response> {
    const respPromise = this.page.waitForResponse(
      (r) => r.url().includes(PATH.TAX_SEARCH) && RegisterPage.urlHasText(r.url(), text.split('#')[0] || text),
      { timeout: 30_000 }, // '#' starts a URL fragment, so the request only carries the text before it
    );
    await this.taxId.fill('');
    // long text (255/256 characters) is filled in one go, typing it key by key is very slow
    if (text.length > 20) await this.taxId.fill(text);
    else await this.taxId.pressSequentially(text, { delay: 15 });
    return respPromise;
  }

  /** The app does not always encode the query, so decoding can throw: fall back to the raw URL. */
  private static urlHasText(url: string, text: string): boolean {
    try {
      return decodeURIComponent(url).includes(text);
    } catch {
      return url.includes(text);
    }
  }

  async applyPromo(code: string) {
    await this.promoLink.click();
    await this.promoInput.fill(code);
    await this.promoApply.click();
  }

  /** Fills every required field. Thai mode picks the first search hit; Others mode types the name. */
  async fillRequired(d: RegistrationData) {
    if (d.company !== undefined) {
      await this.chooseOthers();
      await this.companyName.fill(d.company);
    } else if (d.taxIdSearch) {
      await this.search(d.taxIdSearch);
      await this.searchItems.first().click();
    }
    await this.selectDropdown(this.businessTypeDropdown, d.businessType);
    await this.selectDropdown(this.userAmountDropdown, d.userAmount);
    await this.email.fill(d.email);
    await this.firstName.fill(d.firstName);
    await this.lastName.fill(d.lastName);
    await this.phone.fill(d.phone);
    if (d.promo) await this.applyPromo(d.promo);
    await this.tickConsent();
  }

  /** None of the given messages is shown. */
  async expectNoMessage(...texts: string[]) {
    for (const t of texts) await expect(this.msg(t)).toBeHidden();
  }

  /** A message (error text, toast ...) anywhere on the page. */
  msg(text: string): Locator {
    return this.page.getByText(text, { exact: false });
  }
}
