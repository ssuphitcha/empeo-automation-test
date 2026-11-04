import { test, expect } from '../../fixtures/test.fixture';
import { FieldSteps } from '../../pageObjects/register/fieldSteps';
import { NetworkHelper } from '../../helpers/network.helper';
import { FindingHelper } from '../../helpers/finding.helper';
import { DataHelper } from '../../helpers/data.helper';
import { RegistrationBuilder } from '../../builders/registration.builder';
import { AccountStore } from '../../fixtures/accounts.store';
import PATH from '../../plugins/path';

/**
 * Scenario M11 - "Others" company type: the company name is typed by hand.
 * Flow: choose "Others" -> company name cases -> fill the rest -> "Try for free" -> OTP -> password -> login.
 * Registers a REAL account on UAT (tag @flow).
 */
test('M11 Others mode - registration succeeds @scenario @flow', async ({ registerPage: reg, otpModal: otp, flow, page, testData, expected, env }) => {
  test.setTimeout(300_000);
  const m = expected.MESSAGES.th;
  const T = testData.TEXT;
  const data = new RegistrationBuilder().build();
  const name = reg.companyName;
  const openOthers = async () => {
    await reg.goto();
    await reg.chooseOthers();
  };

  await openOthers();

  await test.step('Enter a Thai company name and click away', () => FieldSteps.acceptsValue(reg, name, T.company_thai, m.companyOthers));
  await test.step('Enter an English company name and click away', () => FieldSteps.acceptsValue(reg, name, T.company_english, m.companyOthers));
  await test.step('Enter a Japanese company name and click away', () => FieldSteps.acceptsValue(reg, name, T.company_japanese, m.companyOthers));
  await test.step('Enter company names with special characters (and Co., Ltd.)', async () => {
    await FieldSteps.acceptsValue(reg, name, T.company_special, m.companyOthers);
    await FieldSteps.acceptsValue(reg, name, T.company_special_dot_comma, m.companyOthers);
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-102: accepted; spec needs confirmation' });
  });
  await test.step('Enter a mixed-language company name', () => FieldSteps.acceptsValue(reg, name, T.company_mixed, m.companyOthers));
  await test.step('Enter a company name made of digits', async () => {
    await FieldSteps.acceptsValue(reg, name, T.company_digits, m.companyOthers);
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-104: accepted; spec needs confirmation' });
  });
  await test.step('Enter exactly 255 characters as the company name', () => FieldSteps.acceptsMaxLength(reg, name, testData.LENGTH.text_max, m.companyOthers));
  await test.step('Type 256 characters as the company name; only 255 are kept', () => FieldSteps.truncatesAt(reg, name, testData.LENGTH.text_max));
  await test.step('Enter spaces only as the company name', async () => {
    await name.fill(T.spaces_5);
    await reg.clickOutside();
    await FindingHelper.knownFinding(test.info(), 'BUS-107: spaces-only is accepted (error expected; likely a bug)', async () => {
      await expect(reg.msg(m.companyOthers)).toBeVisible({ timeout: 3000 });
    });
  });

  await test.step('Click Try for free with the company name empty', async () => {
    await openOthers();
    await reg.clickSubmit();
    await expect(reg.msg(m.companyOthers)).toBeVisible();
  });
  await test.step('Click into the company name field and click away', async () => {
    await openOthers();
    await name.click();
    await expect(reg.msg(m.companyOthers)).toBeHidden();
    await reg.clickOutside();
    await expect(reg.msg(m.companyOthers)).toBeVisible();
  });
  await test.step('Type then clear the company name and watch the error', async () => {
    await name.click();
    await name.pressSequentially('a');
    await expect(reg.msg(m.companyOthers)).toBeHidden();
    await name.fill('');
    await expect(reg.msg(m.companyOthers)).toBeVisible();
  });
  await test.step('Enter a company name with an emoji', async () => {
    await FieldSteps.acceptsValue(reg, name, T.emoji_company, m.companyOthers);
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-111: accepted; confirm with the team' });
  });
  await test.step('Enter a single character as the company name (a, ก)', async () => {
    for (const value of [T.company_single_char_en, T.company_single_char_th]) {
      await FieldSteps.acceptsValue(reg, name, value, m.companyOthers);
      await expect(reg.msg(m.companyUsed)).toBeHidden();
    }
  });
  await test.step('Enter a company name with leading and trailing spaces; the spaces are kept', async () => {
    await FieldSteps.acceptsValue(reg, name, T.padded_company, m.companyOthers);
    expect(await name.inputValue()).toBe(T.padded_company); // the page does not trim
  });

  await test.step('Enter an email and the company name บริษัท; the company-already-registered error shows', async () => {
    await openOthers();
    await reg.email.fill(data.email);
    const dup = NetworkHelper.waitForResponse(page, PATH.DUPLICATE_INFO, (r) => (r.request().postData() ?? '').includes('CompanyName'));
    await name.fill(T.existing_company_name);
    await reg.clickOutside();
    const body = await (await dup).json();
    expect(body.data.isDuplicate).toBe(true);
    await expect(reg.msg(m.companyUsed)).toBeVisible();
  });

  await test.step('Fill the registration data (fresh company name)', async () => {
    await openOthers();
    await name.fill(data.company ?? DataHelper.newCompany());
    await reg.selectDropdown(reg.businessTypeDropdown, data.businessType);
    await reg.selectDropdown(reg.userAmountDropdown, data.userAmount);
    await reg.email.fill(data.email);
    await reg.firstName.fill(data.firstName);
    await reg.lastName.fill(data.lastName);
    await reg.phone.fill(data.phone);
    await reg.tickConsent();
  });

  await test.step('Click Try for free with valid data (Others); register is called and the OTP modal opens', async () => {
    await flow.submit('others', data);
  });
  await test.step('Check the content of the OTP modal', async () => {
    await flow.expectOtpModalContent(data.phone);
  });
  await test.step('Type the correct OTP and click Confirm; the create-password page opens', async () => {
    await flow.passOtp(env.otp);
  });
  await test.step('Type the password and the same confirmation and click Create Password; the success page opens', async () => {
    await flow.createPassword(env.password);
    AccountStore.add({ mode: 'others', email: data.email, password: env.password, company: data.company ?? '' });
  });
  await test.step(`Click Let's get started and sign in with the new account; preboarding opens`, async () => {
    await flow.goToLogin();
    await flow.loginAndExpectPreboarding(data.email, env.password);
  });
});
