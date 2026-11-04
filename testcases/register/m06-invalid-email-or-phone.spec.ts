import { test, expect } from '../../fixtures/test.fixture';
import { DataHelper } from '../../helpers/data.helper';
import { FindingHelper } from '../../helpers/finding.helper';

/**
 * Scenario M6 - Email or phone in a wrong format (no registration is submitted).
 * Only the field under test is filled; "Try for free" / click-out triggers the inline error.
 */
test('M6 Invalid email or phone @scenario @safe', async ({ registerPage: reg, testData, expected }) => {
  const m = expected.MESSAGES.th;
  const E = testData.EMAIL;
  const P = testData.PHONE;

  const submitWithEmail = async (email: string) => {
    await reg.email.fill(email);
    await reg.clickSubmit();
    await expect(reg.email).toHaveValue(email);
  };

  await test.step('Enter an email with Thai characters and click Try for free', async () => {
    await submitWithEmail(E.thai);
    await expect(reg.msg(m.emailInvalid)).toBeVisible();
  });

  await test.step('Enter an email with English characters and click Try for free', async () => {
    await submitWithEmail(E.english);
    await reg.expectNoMessage(m.emailInvalid, m.emailEmpty);
  });

  await test.step('Enter an email with Japanese characters and click Try for free', async () => {
    await submitWithEmail(E.japanese);
    await expect(reg.msg(m.emailInvalid)).toBeVisible();
  });

  await test.step('Enter an email with special characters and click Try for free', async () => {
    await submitWithEmail(E.special);
    await expect(reg.msg(m.emailInvalid)).toBeVisible();
  });

  await test.step('Enter an email with a digits-only name and click Try for free (known finding)', async () => {
    await submitWithEmail(E.digits);
    await FindingHelper.knownFinding(test.info(), 'BUS-033: digits-only email is accepted (error expected; spec needs confirmation)', async () => {
      await expect(reg.msg(m.emailInvalid)).toBeVisible({ timeout: 3000 });
    });
  });

  await test.step('Enter each invalid email format and click Try for free', async () => {
    for (const email of E.invalid_formats) {
      await test.step(`invalid format: ${email}`, async () => {
        await submitWithEmail(email);
        await expect(reg.msg(m.emailInvalid)).toBeVisible();
      });
    }
  });

  await test.step('Type 151 characters in the email; only 150 are kept', async () => {
    await reg.email.fill('');
    await reg.email.click();
    await reg.email.pressSequentially(DataHelper.emailWithLength(testData.LENGTH.email_max + 1), { delay: 5 });
    expect(await reg.email.inputValue()).toHaveLength(150);
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-036: the end is truncated so the domain becomes @gmail.co' });
  });

  await test.step('Type only spaces in the email and click Try for free', async () => {
    await reg.email.fill('');
    await reg.email.pressSequentially(testData.TEXT.spaces_5);
    await reg.clickSubmit();
    expect(await reg.email.inputValue()).toBe(testData.TEXT.spaces_5);
    await expect(reg.msg(m.emailInvalid)).toBeVisible();
  });

  await test.step('Click into the email field and click away', async () => {
    await reg.goto();
    await reg.email.click();
    await expect(reg.msg(m.emailEmpty)).toBeHidden();
    await reg.clickOutside();
    await expect(reg.msg(m.emailEmpty)).toBeVisible();
  });

  await test.step('Type an invalid then a valid email, then clear it, and watch the error', async () => {
    await reg.goto();
    await reg.email.click();
    await reg.clickOutside();
    await expect(reg.msg(m.emailEmpty)).toBeVisible();
    await reg.email.click();
    await reg.email.pressSequentially(E.short_invalid);
    await expect(reg.msg(m.emailInvalid)).toBeVisible();
    await expect(reg.msg(m.emailEmpty)).toBeHidden();
    await reg.email.fill('');
    await reg.email.pressSequentially(E.short_valid, { delay: 40 });
    await expect(reg.msg(m.emailInvalid)).toBeHidden(); // gone once the format is valid
    await reg.email.fill('');
    await expect(reg.msg(m.emailEmpty)).toBeVisible();
  });

  await test.step('Keep +66 and type a Japanese-format number', async () => {
    await reg.goto();
    await expect(reg.countryFlag).toContainText('+66');
    await reg.phone.pressSequentially(P.japan);
    await reg.clickOutside();
    await expect(reg.phone).toHaveValue(P.japan);
    await expect(reg.msg(m.phoneInvalid)).toBeVisible();
  });

  await test.step('Select +81 and type a Thai-format number', async () => {
    await reg.goto();
    await reg.selectCountry('81');
    await expect(reg.countryFlag).toContainText('+81');
    await reg.phone.pressSequentially(P.thai_leading_0);
    await reg.clickOutside();
    await expect(reg.phone).toHaveValue(P.thai_leading_0);
    await expect(reg.msg(m.phoneInvalid)).toBeVisible();
  });

  await test.step('Keep +66 and type 11 digits', async () => {
    await reg.goto();
    await reg.phone.pressSequentially(P.thai_11_digits);
    await reg.clickOutside();
    await expect(reg.phone).toHaveValue(P.thai_11_digits);
    await expect(reg.msg(m.phoneInvalid)).toBeVisible();
  });

  await test.step('Type 20 digits in the phone field; only 15 are kept', async () => {
    await reg.goto();
    await reg.phone.pressSequentially(P.too_long);
    expect(await reg.phone.inputValue()).toHaveLength(testData.LENGTH.phone_max);
    await reg.clickOutside();
    await expect(reg.msg(m.phoneInvalid)).toBeVisible();
  });

  await test.step('Type a 9 digit and a 5 digit phone number', async () => {
    for (const value of [P.thai_9_digits, P.five_digits]) {
      await reg.goto();
      await reg.phone.pressSequentially(value);
      await reg.clickOutside();
      await expect(reg.phone).toHaveValue(value);
      await expect(reg.msg(m.phoneInvalid)).toBeVisible();
    }
  });

  await test.step('Type letters in the phone field', async () => {
    await reg.goto();
    await reg.phone.click();
    await reg.phone.pressSequentially(P.letters);
    await expect(reg.phone).toHaveValue(''); // letters are not accepted
    await reg.clickOutside();
    await expect(reg.msg(m.phoneEmpty)).toBeVisible();
  });

  await test.step('Click into the phone field and click away', async () => {
    await reg.goto();
    await reg.phone.click();
    await expect(reg.msg(m.phoneEmpty)).toBeHidden();
    await reg.clickOutside();
    await expect(reg.msg(m.phoneEmpty)).toBeVisible();
  });

  await test.step('Type the phone number one digit at a time and watch the error', async () => {
    await reg.goto();
    await reg.phone.click();
    await reg.clickOutside();
    await expect(reg.msg(m.phoneEmpty)).toBeVisible();
    await reg.phone.click();
    const full = P.thai_leading_0;
    for (let i = 1; i <= full.length; i++) {
      await reg.phone.pressSequentially(full[i - 1], { delay: 30 });
      if (i < 10) await expect(reg.msg(m.phoneInvalid)).toBeVisible(); // digits 1..9: invalid
      else await expect(reg.msg(m.phoneInvalid)).toBeHidden(); // 10 digits: valid
    }
    await reg.phone.fill('');
    await expect(reg.msg(m.phoneEmpty)).toBeVisible();
  });
});
