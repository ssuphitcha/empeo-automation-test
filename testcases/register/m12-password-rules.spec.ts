import { test, expect } from '../../fixtures/test.fixture';
import { NetworkHelper } from '../../helpers/network.helper';
import { RegistrationBuilder } from '../../builders/registration.builder';
import { AccountStore } from '../../fixtures/accounts.store';
import PATH from '../../plugins/path';

/**
 * Scenario M12 - Create-password page: rules and confirmation.
 * Registers a REAL account on UAT, checks every password rule, then sets a valid password (tag @flow).
 */
test('M12 Password rules @scenario @flow', async ({ registerPage: reg, createPasswordPage: pw, flow, page, testData, expected, env }) => {
  test.setTimeout(300_000);
  const m = expected.MESSAGES.th;
  const P = testData.PASSWORD;
  const data = new RegistrationBuilder().build();

  await test.step('Reach the create-password page (register + correct OTP)', async () => {
    await reg.fillRequired(data);
    await flow.submit('others', data);
    await flow.passOtp(env.otp);
  });

  await test.step('Check the content of the create-password page (Thai)', async () => {
    await expect(page.getByText('กรุณาตั้งรหัสผ่าน', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('กรุณาตั้งรหัสผ่านตามเงื่อนไขด้านล่าง เพื่อความปลอดภัยของบัญชี')).toBeVisible();
    await expect(pw.password).toHaveAttribute('placeholder', 'รหัสผ่าน');
    await expect(pw.confirm).toHaveAttribute('placeholder', 'ยืนยันรหัสผ่าน');
    await expect(pw.password).toHaveAttribute('maxlength', '255');
    expect((await pw.rules.allInnerTexts()).map((t) => t.trim())).toEqual(['Aa', '123', '8 ตัวอักษรขึ้นไป']);
    expect(await pw.ruleStates()).toBe('---');
    await expect(pw.submit).toBeDisabled();
  });

  await test.step('Check the errors shown for the empty password and confirmation', async () => {
    await expect(page.getByText(m.passwordEmpty)).toBeHidden(); // nothing is shown before the user leaves a field
    await pw.password.click();
    await reg.clickOutside();
    await expect(page.getByText(m.passwordEmpty)).toBeVisible();
    await pw.confirm.click();
    await reg.clickOutside();
    await expect(page.getByText(m.confirmEmpty)).toBeVisible();
    await expect(pw.submit).toBeDisabled();
  });

  await test.step('Type a password with only lowercase, then only uppercase letters', async () => {
    for (const value of [P.only_lowercase, P.only_uppercase]) {
      await pw.type(pw.password, value);
      expect(await pw.ruleStates()).toBe('-✓✓'); // Aa needs both an upper and a lower case letter
      await expect(pw.submit).toBeDisabled();
    }
  });
  await test.step('Type a password without a digit', async () => {
    await pw.type(pw.password, P.no_digit);
    expect(await pw.ruleStates()).toBe('✓-✓');
    await expect(pw.submit).toBeDisabled();
  });
  await test.step('Type a 7 character password', async () => {
    await pw.type(pw.password, P.too_short);
    expect(await pw.ruleStates()).toBe('✓✓-');
    await expect(pw.submit).toBeDisabled();
  });
  await test.step('Type a password that meets all rules, then the same confirmation', async () => {
    await pw.type(pw.password, P.valid_alt);
    expect(await pw.ruleStates()).toBe('✓✓✓');
    await expect(page.getByText(m.confirmEmpty)).toBeVisible();
    await expect(pw.submit).toBeDisabled(); // confirmation still empty
    await pw.type(pw.confirm, P.valid_alt);
    await expect(page.getByText(m.confirmEmpty)).toBeHidden();
    await expect(page.getByText(m.passwordMismatch)).toBeHidden();
    await expect(pw.submit).toBeEnabled();
  });
  await test.step('Type a weak password and the same confirmation', async () => {
    await pw.type(pw.password, P.weak);
    await pw.type(pw.confirm, P.weak);
    expect(await pw.ruleStates()).toBe('---');
    await expect(pw.submit).toBeDisabled();
  });
  await test.step('Type a valid password and a different confirmation', async () => {
    await pw.type(pw.password, P.valid_alt);
    await pw.type(pw.confirm, P.mismatch_partial);
    expect(await pw.ruleStates()).toBe('✓✓✓');
    await expect(page.getByText(m.passwordMismatch)).toBeVisible();
  });
  await test.step('Type the confirmation character by character and watch the error', async () => {
    await pw.type(pw.confirm, '');
    await expect(page.getByText(m.confirmEmpty)).toBeVisible();
    await pw.confirm.pressSequentially(P.mismatch_partial, { delay: 20 });
    await expect(page.getByText(m.passwordMismatch)).toBeVisible();
    await pw.confirm.pressSequentially('1', { delay: 20 });
    await expect(page.getByText(m.passwordMismatch)).toBeHidden(); // matches now
    await pw.password.pressSequentially('x', { delay: 20 });
    await expect(page.getByText(m.passwordMismatch)).toBeVisible(); // changing the password breaks the match
    await pw.password.press('Backspace');
    await expect(page.getByText(m.passwordMismatch)).toBeHidden();
    await pw.type(pw.confirm, '');
    await expect(page.getByText(m.confirmEmpty)).toBeVisible();
  });
  await test.step('Click Create Password with a mismatching confirmation', async () => {
    await pw.type(pw.password, P.valid_alt);
    await pw.type(pw.confirm, P.mismatch_other);
    await expect(pw.submit).toBeEnabled(); // finding: the button is not disabled
    const calls = NetworkHelper.recordRequests(page, PATH.CREATE_PASSWORD);
    const urlBefore = page.url();
    await pw.submit.click();
    await page.waitForTimeout(2000);
    expect(calls.list.filter((r) => new URL(r.url()).pathname.toLowerCase() === PATH.CREATE_PASSWORD.toLowerCase())).toHaveLength(0);
    await expect(pw.errorPopup).toBeHidden();
    expect(page.url()).toBe(urlBefore);
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-139: the button stays enabled when the confirmation does not match' });
  });
  await test.step('Switch to English and check the texts and errors', async () => {
    await pw.switchLanguage('English');
    await expect(page.getByText('Create your password')).toBeVisible();
    await expect(pw.password).toHaveAttribute('placeholder', 'Password');
    await expect(pw.confirm).toHaveAttribute('placeholder', 'Confirm Password');
    await expect(pw.rules.nth(2)).toContainText('at least 8 characters');
    await expect(pw.submit).toContainText('Create Password');
    await pw.type(pw.password, '');
    await reg.clickOutside();
    await expect(page.getByText(expected.MESSAGES.en.passwordEmpty)).toBeVisible();
    await pw.type(pw.password, P.valid_alt);
    await pw.type(pw.confirm, P.mismatch_partial);
    await expect(page.getByText(/password confirmation doesn.t match/)).toBeVisible();
  });

  await test.step('Set a valid password and finish', async () => {
    await flow.createPassword(env.password);
    AccountStore.add({ mode: 'others', email: data.email, password: env.password, company: data.company ?? '' });
  });
});
