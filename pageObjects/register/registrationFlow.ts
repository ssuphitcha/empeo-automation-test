import { expect, Page, Response } from '@playwright/test';
import PATH from '../../plugins/path';
import { RegistrationData } from '../../models/registration.model';
import { NetworkHelper } from '../../helpers/network.helper';
import { RegisterPage } from './RegisterPage';
import { OtpModal } from './OtpModal';
import { CreatePasswordPage } from '../password/CreatePasswordPage';
import { LoginPage } from '../login/LoginPage';
import { AccountStore } from '../../fixtures/accounts.store';

/**
 * The registration journey as reusable steps: submit -> OTP -> password -> login.
 * Each method also asserts what the matching test cases expect, so scenarios can
 * call them inside a test.step and stay short.
 */
export class RegistrationFlow {
  constructor(
    readonly page: Page,
    readonly reg: RegisterPage,
    readonly otp: OtpModal,
    readonly pw: CreatePasswordPage,
    readonly login: LoginPage,
  ) {}

  /** BUS-098 / BUS-115: click "Try for free" and verify POST /api/v2/register. */
  async submit(mode: 'thai' | 'others', data: RegistrationData, couponCode: string | null = null) {
    const registerResp = NetworkHelper.waitForExact(this.page, PATH.REGISTER);
    await this.reg.submit.click();
    const resp = await registerResp;
    expect(resp.status()).toBe(200);
    const sent = JSON.parse(resp.request().postData() ?? '{}');
    expect(sent.isThaiCompany).toBe(mode === 'thai');
    expect(sent.email).toBe(data.email);
    expect(sent.phone).toBe(`+66${data.phone.replace(/^0/, '')}`);
    expect(sent.productId).toBe(102);
    if (mode === 'others') {
      expect(sent.taxId).toBeNull();
      expect(sent.companyName).toBe(data.company);
    } else {
      expect(sent.taxId).toMatch(/^\d{13}$/);
    }
    const body = await resp.json();
    expect(body.status.code).toBe(1000);
    expect(body.data.refId).toBeTruthy();
    expect(body.data.token).toBeTruthy();
    expect(body.data.couponCode).toBe(couponCode);
    await this.otp.waitUntilOpen();
    return { sent, body };
  }

  /** BUS-120: content of the OTP modal. */
  async expectOtpModalContent(phone: string) {
    const otp = this.otp;
    await expect(otp.title).toBeVisible();
    await expect(this.page.getByText(`โปรดกรอกรหัส OTP ที่ถูกส่งไปยัง ${OtpModal.maskedPhone(phone)}`)).toBeVisible();
    await expect(otp.refText()).toHaveText(/ref:\s*\d{4}/);
    await expect(otp.digits).toHaveCount(6);
    expect(await otp.enteredCode()).toBe('');
    await expect(otp.confirm).toBeDisabled();
    await expect(this.page.getByText(/รับ OTP ใหม่อีกครั้งได้ใน/)).toBeVisible();
  }

  /** Types the OTP and clicks "ยืนยัน"; returns the verify-otp response. */
  async submitOtp(code: string): Promise<Response> {
    await this.otp.enter(code);
    const verify = NetworkHelper.waitForExact(this.page, PATH.VERIFY_OTP);
    await this.otp.confirm.click();
    return verify;
  }

  /** BUS-124: the correct OTP opens the create-password page. */
  async passOtp(code: string) {
    const validation = NetworkHelper.waitForExact(this.page, PATH.CREATE_PASSWORD_VALIDATION);
    const resp = await this.submitOtp(code);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status.code).toBe(1000);
    expect(body.data.isValid).toBe(true);
    expect(body.data.message).toBe('Verify OTP is correct.');
    expect((await validation).status()).toBe(200);
    await this.pw.waitUntilOpen();
  }

  /** BUS-141: set the password and reach the success page. */
  async createPassword(password: string) {
    await this.pw.type(this.pw.password, password);
    await this.pw.type(this.pw.confirm, password);
    await expect(this.pw.submit).toBeEnabled();
    const created = NetworkHelper.waitForExact(this.page, PATH.CREATE_PASSWORD);
    await this.pw.submit.click();
    const resp = await created;
    expect(resp.status()).toBe(200);
    expect(await resp.json()).toHaveProperty('url');
    await expect(this.pw.letsGetStarted).toBeVisible();
  }

  /** Registers a complete account (all steps, no case-level assertions beyond the calls). */
  async registerAccount(mode: 'thai' | 'others', data: RegistrationData, password: string, otpCode: string) {
    await this.reg.goto();
    await this.reg.fillRequired(data);
    await this.submit(mode, data, data.promo ? data.promo.toUpperCase() : null);
    await this.passOtp(otpCode);
    await this.createPassword(password);
    AccountStore.add({ mode, email: data.email, password, company: data.company ?? data.taxIdSearch ?? '' });
  }

  /** BUS-143: "Let's get started!" opens the sign-in page. */
  async goToLogin() {
    await this.page.context().clearCookies(); // otherwise an earlier session skips the form
    await this.pw.letsGetStarted.click();
    await this.login.waitUntilOpen();
  }

  /** BUS-144 / BUS-145: sign in and land on preboarding. */
  async loginAndExpectPreboarding(email: string, password: string) {
    await this.login.login(email, password);
    await this.page.waitForURL(/portal\.uat\.empeo\.com\/preboarding/, { timeout: 45_000 });
    await expect(this.page.getByText(/Step 1 of 5/)).toBeVisible({ timeout: 30_000 });
  }
}
