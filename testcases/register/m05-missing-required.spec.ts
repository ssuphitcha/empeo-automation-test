import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { DataHelper } from '../../helpers/data.helper';
import PATH from '../../plugins/path';

/**
 * Scenario M5 - Required fields missing or consent not ticked (no registration is submitted).
 * The page is reloaded before each case so that "no error yet" checks start clean.
 */
test('M5 Missing required fields @scenario @safe', async ({ registerPage: reg, page, testData, expected }) => {
  const m = expected.MESSAGES.th;
  const registerCalls = () =>
    NetworkHelper.recordRequests(page, PATH.REGISTER);
  const isRegister = (url: string) => new URL(url).pathname.toLowerCase() === PATH.REGISTER.toLowerCase();

  await test.step('Click Try for free with everything empty; the 8 required errors show and register is not called', async () => {
    const calls = registerCalls();
    await reg.clickSubmit();
    for (const msg of [m.taxId, m.businessType, m.userAmount, m.emailEmpty, m.firstName, m.lastName, m.phoneEmpty, m.consent]) {
      await expect(reg.msg(msg)).toBeVisible(); // the 8 required fields
    }
    expect(calls.list.filter((r) => isRegister(r.url()))).toHaveLength(0);
  });

  await test.step('Type a full company name without selecting it and click Try for free', async () => {
    await reg.goto();
    await reg.search(testData.COMPANY_SEARCH.cpc_company_full);
    await expect(reg.searchItems).toHaveCount(1);
    await reg.clickSubmit();
    await expect(reg.msg(m.taxId)).toBeVisible();
  });

  await test.step('Click Try for free with the search field empty', async () => {
    await reg.goto();
    await reg.clickSubmit();
    await expect(reg.msg(m.taxId)).toBeVisible();
  });

  await test.step('Open the business type dropdown and click away without choosing', async () => {
    await reg.goto();
    await reg.businessTypeDropdown.click();
    await expect(reg.dropdownOptions.first()).toBeVisible();
    await reg.clickOutside();
    await expect(reg.dropdownOptions).toHaveCount(0);
    await expect(reg.businessTypeDropdown).toContainText(expected.PLACEHOLDER.businessType);
    await expect(reg.msg(m.businessType)).toBeVisible();
  });

  await test.step('Open the number of users dropdown, check its options and click away', async () => {
    await reg.goto();
    await reg.userAmountDropdown.click();
    await expect(reg.dropdownOptions).toHaveCount(expected.DROPDOWN.userAmounts.length);
    expect((await reg.dropdownOptions.allInnerTexts()).map((t) => t.trim())).toEqual(expected.DROPDOWN.userAmounts);
    await reg.clickOutside();
    await expect(reg.userAmountDropdown).toContainText(expected.PLACEHOLDER.userAmount);
    await expect(reg.msg(m.userAmount)).toBeVisible();
  });

  await test.step('Click Try for free with the email empty', async () => {
    await reg.goto();
    await reg.clickSubmit();
    await expect(reg.msg(m.emailEmpty)).toBeVisible();
  });

  for (const f of [
    { label: 'first name', ids: ['050', '051', '052'], field: 'firstName', msg: m.firstName },
    { label: 'last name', ids: ['062', '063', '064'], field: 'lastName', msg: m.lastName },
  ] as const) {
    await test.step(`Click Try for free with the ${f.label} empty`, async () => {
      await reg.goto();
      await reg.clickSubmit();
      await expect(reg.msg(f.msg)).toBeVisible();
    });
    await test.step(`Click into the ${f.label} field and click away`, async () => {
      await reg.goto();
      await reg[f.field].click();
      await expect(reg.msg(f.msg)).toBeHidden();
      await reg.clickOutside();
      await expect(reg.msg(f.msg)).toBeVisible();
    });
    await test.step(`Type then clear the ${f.label} and watch the error`, async () => {
      await reg.goto();
      await reg[f.field].click();
      await reg.clickOutside();
      await expect(reg.msg(f.msg)).toBeVisible();
      await reg[f.field].click();
      await reg[f.field].pressSequentially('ก');
      await expect(reg.msg(f.msg)).toBeHidden();
      await reg[f.field].fill('');
      await expect(reg.msg(f.msg)).toBeVisible();
    });
  }

  await test.step('Click Try for free with the phone empty', async () => {
    await reg.goto();
    await reg.clickSubmit();
    await expect(reg.msg(m.phoneEmpty)).toBeVisible();
  });

  await test.step('Click Try for free without the consent, then tick and untick it', async () => {
    await reg.goto();
    await reg.clickSubmit();
    await expect(reg.msg(m.consent)).toBeVisible();
    await reg.tickConsent();
    await expect(reg.msg(m.consent)).toBeHidden();
    await reg.untickConsent();
    await expect(reg.msg(m.consent)).toBeVisible(); // reappears immediately
  });
});
