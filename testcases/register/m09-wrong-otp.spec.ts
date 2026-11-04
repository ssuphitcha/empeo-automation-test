import { test, expect } from '../../fixtures/test.fixture';
import { RegistrationBuilder } from '../../builders/registration.builder';
import PATH from '../../plugins/path';

/**
 * Scenario M9 - Wrong OTP, then the correct OTP.
 * Registers (sends an OTP to the test phone) but stops at the create-password page, so no account is created.
 * Real SMS is requested (tag @flow).
 */
test('M9 Wrong OTP @scenario @flow', async ({ registerPage: reg, otpModal: otp, flow, page, testData, expected, env }) => {
  test.setTimeout(180_000);
  const data = new RegistrationBuilder().build();
  await reg.fillRequired(data);
  await flow.submit('others', data);
  await flow.expectOtpModalContent(data.phone);

  await test.step('Type a wrong OTP and click Confirm; the error toast shows and the digits are cleared', async () => {
    const resp = await flow.submitOtp(testData.OTP.wrong);
    expect(resp.status()).toBe(expected.API.verifyOtp.status); // HTTP 200, the failure is in the body
    const body = await resp.json();
    expect(body.status.code).toBe(expected.API.verifyOtp.wrongCode);
    expect(body.data.subCode).toBe(expected.API.verifyOtp.wrongSubCode);
    await expect(otp.toastTitle.first()).toHaveText(expected.MESSAGES.th.otpWrongTitle);
    await expect(otp.toastDescription.first()).toHaveText(expected.MESSAGES.th.otpWrongDescription);
    expect(await otp.enteredCode()).toBe(''); // the six boxes are cleared
    await expect(otp.title).toBeVisible(); // the modal stays open
    expect(page.url()).not.toContain('create-password');
    await expect(otp.toastTitle).toHaveCount(0, { timeout: 10_000 }); // the toast goes away by itself
  });

  await test.step('Type the correct OTP after the wrong one; the create-password page opens', async () => {
    await flow.passOtp(env.otp);
    expect(page.url()).toContain(PATH.REGISTER_PAGE + '/create-password');
  });
});
