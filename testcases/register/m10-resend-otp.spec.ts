import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { RegistrationBuilder } from '../../builders/registration.builder';
import { AccountStore } from '../../fixtures/accounts.store';
import PATH from '../../plugins/path';

/**
 * Scenario M10 - Request a new OTP, then finish the registration.
 * Registers a REAL account on UAT and requests a second SMS (tag @flow).
 */
test('M10 Resend OTP @scenario @flow', async ({ registerPage: reg, otpModal: otp, flow, page, env }) => {
  test.setTimeout(240_000);
  const data = new RegistrationBuilder().build();
  await reg.fillRequired(data);

  await test.step('Click Try for free with valid data; register is called and the OTP modal opens', async () => {
    await flow.submit('others', data);
  });
  await test.step('Check the content of the OTP modal', async () => {
    await flow.expectOtpModalContent(data.phone);
  });

  let firstRef = '';
  await test.step('Watch the resend countdown until the resend link appears', async () => {
    firstRef = (await otp.refText().innerText()).trim();
    await expect(page.getByText(/รับ OTP ใหม่อีกครั้งได้ใน/)).toBeVisible();
    const first = await otp.countdownText();
    await page.waitForTimeout(3000);
    const later = await otp.countdownText();
    expect(later).not.toBe(first); // it counts down
    await expect(otp.resendLink).toBeVisible({ timeout: 45_000 }); // the resend link appears when it reaches 0:00
  });

  await test.step('Click resend; a new OTP ref is shown and the countdown restarts', async () => {
    const resend = NetworkHelper.waitForExact(page, PATH.RESEND_OTP);
    await otp.resendLink.click();
    const resp = await resend;
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status.code).toBe(1000);
    expect(body.data.refId).toBeTruthy();
    expect(body.data.token).toBeTruthy();
    expect(NetworkHelper.postBody(resp.request())).toMatchObject({ email: data.email, allowResend: true });
    await expect(otp.refText()).not.toHaveText(firstRef); // a new ref is shown
    await expect(otp.resendLink).toBeHidden(); // the countdown starts again
    expect(await otp.enteredCode()).toBe('');
  });

  await test.step('Type the correct OTP and click Confirm; the create-password page opens', async () => {
    await flow.passOtp(env.otp);
  });
  await test.step('Type the password and the same confirmation and click Create Password; the success page opens', async () => {
    try {
      await flow.createPassword(env.password);
    } catch (e) {
      test.info().annotations.push({
        type: 'bug',
        description: 'After a resent OTP the correct code is accepted (verify-otp 200, validation 200) but create-password returns HTTP 500 "Something is wrong"; same flow without resend (M12) succeeds. Reproduced 2 of 2 runs.',
      });
      throw e;
    }
    AccountStore.add({ mode: 'others', email: data.email, password: env.password, company: data.company ?? '' });
  });
});
