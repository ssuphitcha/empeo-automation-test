import { test, expect } from '../../fixtures/test.fixture';
import PATH from '../../plugins/path';

/**
 * Scenario M13 - create-password answers 500.
 * The failing company from UAT is not usable any more (it became a duplicate), so the backend
 * answers are mocked: no real account and no SMS are created.
 */
test('M13 Create password API failure @scenario @safe', async ({ registerPage: reg, otpModal: otp, createPasswordPage: pw, page, validRegistration: data, env }) => {
  const ok = { code: 1000, customMessage: '', description: 'Success.' };
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  let createCalls = 0;

  // answer /register with the same shape as the real response, echoing what the page sent
  await page.route(`**${PATH.REGISTER}`, (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    const sent = JSON.parse(route.request().postData() ?? '{}');
    return route.fulfill(
      json({
        status: ok,
        data: {
          companyName: sent.companyName, firstName: sent.firstName, fullName: `${sent.firstName} ${sent.lastName}`,
          lastName: sent.lastName, email: sent.email, phone: sent.phone, companyType: sent.companyType,
          userAmount: sent.userAmount, transactionAmount: sent.transactionAmount, couponCode: null,
          dateRegistered: new Date().toISOString(), token: 'mock-register-token', packageId: null, hasClient: false,
          isFromApplication: false, url: null, isThaiCompany: false, taxId: null, countryPhoneCode: '+66',
          refId: '1234', allowResendOtp: true, productId: 102, isTest: false, registrationType: 2, source: null,
        },
      }),
    );
  });
  await page.route(`**${PATH.VERIFY_OTP}`, (route) =>
    route.fulfill(json({ status: ok, data: { isValid: true, message: 'Verify OTP is correct.', token: 'mock-password-token' } })),
  );
  await page.route(`**${PATH.CREATE_PASSWORD_VALIDATION}`, (route) => route.fulfill(json({ status: ok, data: { session: 'mock-session' } })));
  await page.route(`**${PATH.CREATE_PASSWORD}`, (route) => {
    createCalls++;
    return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Something is wrong' });
  });

  await test.step('Reach the create-password page (backend mocked)', async () => {
    await reg.fillRequired(data);
    await reg.submit.click();
    await otp.waitUntilOpen();
    await otp.enter(env.otp);
    await otp.confirm.click();
    await pw.waitUntilOpen();
  });

  await test.step('Type the password and confirmation and click Create Password; the server answers 500 and an error popup shows', async () => {
    await pw.type(pw.password, env.password);
    await pw.type(pw.confirm, env.password);
    await pw.submit.click();
    await expect(pw.errorPopup).toBeVisible();
    await expect(page.locator('#swal2-title')).toHaveText('Error!');
    await expect(page.locator('#swal2-html-container')).toHaveText('Oops...');
    expect(createCalls).toBeGreaterThanOrEqual(1);

    await page.locator('.swal2-confirm').click();
    await expect(pw.errorPopup).toBeHidden();
    await expect(pw.password).toHaveValue(env.password); // values are kept
    await expect(pw.confirm).toHaveValue(env.password);
  });
});
