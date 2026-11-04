import { Locator, Page } from '@playwright/test';

/** The OTP modal that opens after "Try for free". */
export class OtpModal {
  readonly page: Page;
  readonly title: Locator;
  readonly digits: Locator;
  readonly confirm: Locator;
  readonly resendLink: Locator;
  readonly toastTitle: Locator;
  readonly toastDescription: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByText('กรุณาตรวจสอบข้อความ').first();
    this.digits = page.locator('input[id^="otp_"]');
    this.confirm = page.getByTestId('button_button_registration_verify');
    this.resendLink = page.getByTestId('button_button_registration_otp_resend');
    this.toastTitle = page.locator('.go5-toast-title');
    this.toastDescription = page.locator('.go5-toast-description');
  }

  async waitUntilOpen() {
    await this.title.waitFor({ timeout: 20_000 });
    await this.page.waitForTimeout(800);
  }

  /** Types the code digit by digit starting in the first box. */
  async enter(code: string) {
    await this.digits.first().click();
    await this.page.keyboard.type(code, { delay: 60 });
  }

  async enteredCode(): Promise<string> {
    return (await this.digits.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).join('');
  }

  /** Empties the six boxes (Backspace walks back from the last box). */
  async clear() {
    await this.digits.last().click();
    for (let i = 0; i < 8; i++) await this.page.keyboard.press('Backspace');
  }

  /** "096-XXX-0708" for phone 0967690708 */
  static maskedPhone(phone: string): string {
    return `${phone.slice(0, 3)}-XXX-${phone.slice(6)}`;
  }

  /** "รับ OTP ใหม่อีกครั้งได้ใน 0:27": the seconds sit in a sibling node, so read the parent text. */
  async countdownText(): Promise<string> {
    return (await this.page.getByText(/รับ OTP ใหม่อีกครั้งได้ใน/).locator('..').innerText()).trim();
  }

  refText(): Locator {
    return this.page.getByText(/ref:/).first();
  }
}
