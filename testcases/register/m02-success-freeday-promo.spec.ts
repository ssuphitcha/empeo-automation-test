import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { CompanyHelper } from '../../helpers/company.helper';
import { RegistrationBuilder } from '../../builders/registration.builder';
import { AccountStore } from '../../fixtures/accounts.store';
import PATH from '../../plugins/path';

/**
 * Scenario M2 - Thai company with the promo code FREE15DAY, registration succeeds.
 * Registers a REAL account on UAT (tag @flow).
 */
test('M2 Success - promo FREE15DAY @scenario @flow', async ({ registerPage: reg, flow, page, request, env }) => {
  test.setTimeout(240_000);
  const company = await CompanyHelper.findUnregisteredThaiCompany(request);
  const data = new RegistrationBuilder().withThaiCompany(company.taxId).build();
  const chipText = (code: string) => expect(reg.promoChip).toContainText(code);

  await test.step('Fill the required fields (Thai company)', async () => {
    await reg.fillRequired(data);
  });

  await test.step('Open the promo field and apply FREE15DAY; the code chip is shown', async () => {
    const resp = NetworkHelper.waitForResponse(page, PATH.COUPON_VALIDATION);
    await reg.promoLink.click();
    await reg.promoInput.fill(env.promo);
    await reg.promoApply.click();
    const r = await resp;
    expect(r.status()).toBe(200);
    expect((await r.json()).data.isValid).toBe(true);
    await expect(reg.promoInput).toBeHidden(); // the field disappears
    await chipText(env.promo);
  });

  await test.step('Close the chip with X; the code field and Apply come back', async () => {
    await reg.promoChip.locator('.gf-icon-close').click();
    await expect(reg.promoInput).toBeVisible(); // field and Apply are back, no need to click the link again
    await expect(reg.promoApply).toBeVisible();
  });

  await test.step('Apply free15day in lowercase; the server answers FREE15DAY', async () => {
    const lower = env.promo.toLowerCase();
    const resp = NetworkHelper.waitForResponse(page, PATH.COUPON_VALIDATION);
    await reg.promoInput.fill(lower);
    await reg.promoApply.click();
    const r = await resp;
    expect(r.status()).toBe(200);
    expect((await r.json()).data.couponCode).toBe(env.promo); // the server upper-cases it
    await chipText(lower); // the chip shows the text as typed
    await reg.promoChip.locator('.gf-icon-close').click();
    await reg.promoInput.fill(env.promo);
    await reg.promoApply.click();
    await chipText(env.promo);
  });

  await test.step('Click Try for free with the promo applied; register is sent with couponCode FREE15DAY', async () => {
    await flow.submit('thai', data, env.promo);
  });

  await test.step('Pass the OTP and create the password', async () => {
    await flow.passOtp(env.otp);
    await flow.createPassword(env.password);
    AccountStore.add({ mode: 'thai', email: data.email, password: env.password, company: company.name });
  });
});
