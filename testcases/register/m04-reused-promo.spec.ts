import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { FindingHelper } from '../../helpers/finding.helper';
import PATH from '../../plugins/path';

/**
 * Scenario M4 - Promo code that another account has already used (no registration is submitted).
 * BUS-119 is still "tbc": the expected message is unknown, so the test records what UAT answers.
 */
test('M4 Reused promo code @scenario @safe', async ({ registerPage: reg, page, env }) => {
  await test.step('Apply FREE15DAY again and record the answer (not decided yet)', async () => {
    const resp = NetworkHelper.waitForResponse(page, PATH.COUPON_VALIDATION);
    await reg.applyPromo(env.promo);
    const r = await resp;
    const body = await r.json().catch(() => ({}));
    expect([200, 400]).toContain(r.status());
    FindingHelper.observe(test.info(), 'BUS-119', `coupon-validation ${r.status()} isValid=${body?.data?.isValid} usageCount=${body?.data?.usageCount}`);
  });
});
