import { test, expect } from '../../fixtures/test.fixture';
import { RegistrationBuilder } from '../../builders/registration.builder';
import { FindingHelper } from '../../helpers/finding.helper';

/**
 * Scenario M8 - OTP expired (tbc: the real expiry time is not known).
 * 30 s is not the expiry: the correct OTP is still accepted 35 s after it was requested (observed on UAT).
 * The test waits OTP_WAIT_SECONDS, types the correct OTP and records what the system answers.
 * It does not assert, because the expected expiry time is unconfirmed. Real SMS is requested (tag @flow).
 */
test('M8 OTP expired @scenario @flow', async ({ registerPage: reg, flow, page, env }) => {
  const data = new RegistrationBuilder().build();
  await reg.fillRequired(data);
  await flow.submit('others', data);
  await flow.expectOtpModalContent(data.phone);

  await test.step(`Wait ${env.otpWaitSeconds} seconds after the OTP is sent`, async () => {
    await page.waitForTimeout(env.otpWaitSeconds * 1000);
  });

  await test.step('Type the correct OTP and click Confirm; record the answer', async () => {
    const resp = await flow.submitOtp(env.otp);
    const body = await resp.json();
    const accepted = body?.status?.code === 1000;
    FindingHelper.observe(test.info(), `Correct OTP ${env.otpWaitSeconds}s after it was sent`, `${accepted ? 'accepted' : 'rejected'} (HTTP ${resp.status()}, status.code ${body?.status?.code})`);
    expect(resp.status()).toBe(200);
  });
});
