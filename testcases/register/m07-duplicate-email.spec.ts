import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { FindingHelper } from '../../helpers/finding.helper';
import { AccountStore } from '../../fixtures/accounts.store';
import PATH from '../../plugins/path';

/** Scenario M7 - Email whose domain already has an account (no registration is submitted). */
test('M7 Duplicate email @scenario @safe', async ({ registerPage: reg, page, testData, expected }) => {
  await test.step('Enter an email on a domain already in use and click Try for free', async () => {
    for (const email of [testData.EMAIL.domain_in_use_1, testData.EMAIL.domain_in_use_2]) {
      await reg.goto();
      await reg.email.fill(email);
      await reg.clickSubmit();
      await expect(reg.email).toHaveValue(email);
      await expect(reg.msg(expected.MESSAGES.th.emailDomainUsed)).toBeVisible();
    }
  });

  await test.step('Enter the email of an account registered earlier and record the answer (not decided yet)', async () => {
    const earlier = AccountStore.last('others') ?? AccountStore.last('thai');
    if (!earlier) {
      FindingHelper.observe(test.info(), 'BUS-118', 'no account registered earlier in this run; run the registration scenarios first');
      return;
    }
    await reg.goto();
    const dup = NetworkHelper.waitForResponse(page, PATH.DUPLICATE_EMAIL);
    await reg.email.fill(earlier.email);
    await reg.clickSubmit();
    const body = await (await dup).json();
    FindingHelper.observe(test.info(), 'BUS-118', `DuplicateEmail data=${body.data} for ${earlier.email}`);
  });
});
