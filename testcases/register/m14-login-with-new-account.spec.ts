import { test, expect } from '../../fixtures/test.fixture';
import { CompanyHelper } from '../../helpers/company.helper';
import { RegistrationBuilder } from '../../builders/registration.builder';

/**
 * Scenario M14 - After the success page: "Let's get started!" -> sign in -> preboarding.
 * Registers a REAL Thai-company account on UAT first (tag @flow).
 */
test('M14 Login with the new account @scenario @flow', async ({ registerPage: reg, flow, loginPage: login, page, request, env }) => {
  test.setTimeout(300_000);
  const company = await CompanyHelper.findUnregisteredThaiCompany(request);
  const data = new RegistrationBuilder().withThaiCompany(company.taxId).build();

  await test.step('Register a Thai-company account (success page reached)', async () => {
    try {
      await flow.registerAccount('thai', data, env.password, env.otp);
    } catch (e) {
      // BUG: for a Thai company the verify-otp API rejects the correct OTP (status.code 4001), so no account is created
      test.info().annotations.push({
        type: 'bug',
        description: `Thai company ${company.taxId}: verify-otp rejects the correct OTP ${env.otp} (status.code 4001), the account cannot be created`,
      });
      throw e;
    }
  });

  await test.step(`Click Let's get started; the sign-in page opens`, async () => {
    await flow.goToLogin();
    expect(page.url()).toContain('client_id=IMC');
    await expect(login.email).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.signIn).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
  });

  await test.step('Sign in with the new account; preboarding opens for the same user', async () => {
    const info = page.waitForResponse((r) => r.url().includes('/api/UserInfo/GetCurrentUserInfo'));
    await flow.loginAndExpectPreboarding(data.email, env.password);
    const resp = await info;
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.emailAddress).toBe(data.email); // the account that was just registered
    expect(body.fullName).toContain(data.firstName);
  });

  await test.step('Check the preboarding page (Step 1 of 5 and the role options)', async () => {
    await expect(page.getByText(/Step 1 of 5/)).toBeVisible();
    for (const role of ['ผู้บริหารหรือเจ้าของธุรกิจ', 'HR', 'IT', 'อื่นๆ']) {
      await expect(page.getByText(role, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /ถัดไป/ })).toBeDisabled(); // until a role is chosen
  });
});
