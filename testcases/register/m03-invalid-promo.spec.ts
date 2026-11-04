import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { DataHelper } from '../../helpers/data.helper';
import PATH from '../../plugins/path';

/**
 * Scenario M3 - Invalid promo code (no registration is submitted).
 * Flow: open page -> "Redeem a promo code" -> enter a code -> Apply.
 * Cases run in the order of the flow; the page is reloaded between cases so each starts clean.
 */
test('M3 Invalid promo code @scenario @safe', async ({ registerPage: reg, page, testData, expected }) => {
  const calls = NetworkHelper.recordRequests(page, PATH.COUPON_VALIDATION);
  const m = expected.MESSAGES.th;

  const freshPromoField = async () => {
    await reg.goto();
    await reg.promoLink.click();
    await expect(reg.promoInput).toBeVisible();
  };
  /** Apply a code the page rejects without calling the API (BUS-080/081/082/087). */
  const applySilently = async (code: string) => {
    await freshPromoField();
    const before = calls.list.length;
    await reg.promoInput.fill(code);
    await reg.promoApply.click();
    await page.waitForTimeout(1200);
    expect(calls.list.length).toBe(before); // coupon-validation is not called
    await expect(reg.msg(m.promoInvalid)).toBeHidden();
    await expect(reg.promoInput).toBeVisible();
  };
  /** Apply a code the server rejects (400 / E1104) and the page shows the error. */
  const applyInvalid = async (code: string) => {
    await freshPromoField();
    const resp = NetworkHelper.waitForResponse(page, PATH.COUPON_VALIDATION);
    await reg.promoInput.fill(code);
    await reg.promoApply.click();
    const r = await resp;
    expect(r.status()).toBe(400);
    const body = await r.json();
    expect(body.status.code).toBe(4001);
    expect(body.data.subCode).toBe('E1104');
    await expect(reg.msg(m.promoInvalid)).toBeVisible();
    await expect(reg.promoInput).toBeVisible();
    return NetworkHelper.postBody(r.request());
  };

  await test.step('Click into the promo field and click away; no error', async () => {
    await freshPromoField();
    await reg.promoInput.click();
    await reg.clickOutside();
    await expect(reg.msg(m.promoInvalid)).toBeHidden(); // the code is optional
  });

  await test.step('Apply INVALIDCODE123; the invalid promo error shows', async () => {
    await applyInvalid(testData.PROMO.invalid);
  });

  for (const [id, key] of [['080', 'thai'], ['081', 'japanese'], ['082', 'special']] as const) {
    await test.step(`Apply a ${key} promo code; Apply does nothing and the API is not called`, async () => {
      await applySilently(testData.PROMO[key]);
      test.info().annotations.push({ type: 'known-finding', description: `BUS-${id}: Apply is silent for ${key} input; spec needs confirmation` });
    });
  }

  await test.step('Apply a mixed-language promo code; the invalid promo error shows', async () => {
    await applyInvalid(testData.PROMO.mixed);
  });

  await test.step('Apply 12345; the invalid promo error shows', async () => {
    await applyInvalid(testData.PROMO.digits);
  });

  await test.step('Type 50 characters and click Apply; the invalid promo error shows', async () => {
    const code = DataHelper.repeat('A', testData.LENGTH.promo_max);
    await freshPromoField();
    await reg.promoInput.fill(code);
    expect(await reg.promoInput.inputValue()).toHaveLength(50);
    await expect(reg.msg(m.promoInvalid)).toBeHidden(); // nothing before Apply
    const sent = await applyInvalid(code);
    expect(sent.couponCode).toHaveLength(50);
  });

  await test.step('Type 51 characters; only 50 are kept', async () => {
    await freshPromoField();
    await reg.promoInput.click();
    await reg.promoInput.pressSequentially(DataHelper.repeat('A', testData.LENGTH.promo_max + 1), { delay: 5 });
    expect(await reg.promoInput.inputValue()).toHaveLength(50);
    await expect(reg.msg(m.promoInvalid)).toBeHidden(); // silently truncated, no length warning
  });

  await test.step('Apply spaces only; nothing happens', async () => {
    await applySilently(testData.TEXT.spaces_3);
  });

  await test.step('Apply FREE15DAY with surrounding spaces; the invalid promo error shows', async () => {
    const sent = await applyInvalid(testData.PROMO.with_spaces);
    expect(sent.couponCode).toBe(testData.PROMO.with_spaces); // not trimmed
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-088: spaces are not trimmed; spec needs confirmation' });
  });

  await test.step('Apply an invalid code, type one more character, then clear the field', async () => {
    await applyInvalid(testData.PROMO.invalid);
    await reg.promoInput.click();
    await reg.promoInput.pressSequentially('X');
    await expect(reg.msg(m.promoInvalid)).toBeHidden();
    await reg.promoInput.fill('');
    await expect(reg.msg(m.promoInvalid)).toBeHidden();
  });
});
