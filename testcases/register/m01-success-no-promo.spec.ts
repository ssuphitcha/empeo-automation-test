import { test, expect } from '../../fixtures/test.fixture';
import { RegisterValidation } from '../../pageObjects/register/validateRegisterResponse';
import { FieldSteps } from '../../pageObjects/register/fieldSteps';
import { NetworkHelper } from '../../helpers/network.helper';
import { DataHelper } from '../../helpers/data.helper';
import { CompanyHelper } from '../../helpers/company.helper';
import { FindingHelper } from '../../helpers/finding.helper';
import { RegistrationBuilder } from '../../builders/registration.builder';
import { AccountStore } from '../../fixtures/accounts.store';
import PATH from '../../plugins/path';

/**
 * Scenario M1 - Thai-registered company, no promo code, registration succeeds.
 * Flow: open page -> company search -> business type / users -> email -> names -> phone
 *       -> (empty promo) -> consent -> "Try for free" -> OTP -> create password -> success page.
 * Test cases run in the order of the flow. It registers a REAL account on UAT (tag @flow).
 */
test('M1 Success - Thai company, no promo @scenario @flow', async ({ registerPage: reg, otpModal: otp, createPasswordPage: pw, flow, page, request, testData, expected, env }) => {
  test.setTimeout(30 * 60_000);
  const m = expected.MESSAGES.th;
  const C = testData.COMPANY_SEARCH;
  const company = await CompanyHelper.findUnregisteredThaiCompany(request);
  const data = new RegistrationBuilder().withThaiCompany(company.taxId).build();

  const items = reg.searchItems;
  let additionalInfo: any;

  await test.step('Open the registration page', async () => {
    const calls = NetworkHelper.recordRequests(page, PATH.ADDITIONAL_INFORMATION);
    const apiResp = NetworkHelper.waitForResponse(page, PATH.ADDITIONAL_INFORMATION);
    await reg.goto();
    const resp = await apiResp;
    await RegisterValidation.verifyAdditionalInformation(resp, expected);
    additionalInfo = (await resp.json()).data;

    await test.step('Check the default company type is Thai-registered company and the search placeholder', async () => {
      await expect(reg.thaiRadio.locator('input')).toBeChecked();
      await expect(reg.othersRadio.locator('input')).not.toBeChecked();
      await expect(reg.taxId).toHaveAttribute('placeholder', expected.PLACEHOLDER.taxId);
    });

    await test.step('Select the Others radio, check the company name field, then switch back to Thai company', async () => {
      await reg.chooseOthers();
      await expect(reg.othersRadio.locator('input')).toBeChecked();
      await expect(reg.thaiRadio.locator('input')).not.toBeChecked();
      await expect(reg.companyName).toHaveAttribute('placeholder', expected.PLACEHOLDER.companyOthers);
      await reg.thaiRadio.click({ force: true }); // back to the Thai company mode
      await reg.taxId.waitFor();
    });

    await test.step('Open both dropdowns and switch the language TH, EN, TH; additional-information is called only once', async () => {
      expect(calls.list).toHaveLength(1);
      expect(calls.list[0].method()).toBe('GET');
      expect(calls.list[0].url()).not.toContain('?');
      await reg.businessTypeDropdown.click();
      await reg.clickOutside();
      await reg.userAmountDropdown.click();
      await reg.clickOutside();
      await reg.switchLanguage('English');
      await reg.switchLanguage('ไทย');
      expect(calls.list).toHaveLength(1); // never requested again
    });
  });

  await test.step('Company search', async () => {
    await test.step('Search for the Thai name ซีพี and check the result list', async () => {
      await RegisterValidation.verifyTaxSearchHasResults(await reg.search(C.thai_name));
      await expect(items.first()).toBeVisible();
      await expect(items.first().locator('p.go5-text-body-small')).toHaveText(/^\d{13}$/);
      test.info().annotations.push({ type: 'known-finding', description: 'BUS-004: page lists head offices only, max 30 items; spec needs confirmation' });
    });
    await test.step('Search for the English name TURKMENISTAN and check the result list', async () => {
      await RegisterValidation.verifyTaxSearchHasResults(await reg.search(C.english_name));
      await expect(items.filter({ hasText: C.english_company_full }).first()).toBeVisible();
    });
    await test.step('Search with 2 characters (กา, TU); no list is shown', async () => {
      for (const text of [C.thai_2_chars, C.english_2_chars]) {
        await RegisterValidation.verifyTaxSearchEmpty(await reg.search(text));
        await expect(items).toHaveCount(0);
      }
    });
    await test.step('Search with 3 characters (การ, TUR); a list is shown', async () => {
      for (const text of [C.thai_3_chars, C.english_3_chars]) {
        await RegisterValidation.verifyTaxSearchHasResults(await reg.search(text));
        await expect(items.first()).toBeVisible();
      }
    });
    await test.step('Search with longer text (การบิน, TURK); the list narrows', async () => {
      const wide = await RegisterValidation.verifyTaxSearchHasResults(await reg.search(C.thai_3_chars));
      const narrow = await RegisterValidation.verifyTaxSearchHasResults(await reg.search(C.thai_long));
      expect(narrow).toBeLessThanOrEqual(wide);
      await RegisterValidation.verifyTaxSearchHasResults(await reg.search(C.english_long));
    });
    await test.step('Search with a 7 digit and a 12 digit tax ID; no list is shown', async () => {
      for (const text of [C.tax_id_7, C.tax_id_12]) {
        await RegisterValidation.verifyTaxSearchEmpty(await reg.search(text));
        await expect(items).toHaveCount(0);
      }
    });
    await test.step('Search with a 13 digit tax ID; one company is listed', async () => {
      expect(await RegisterValidation.verifyTaxSearchHasResults(await reg.search(C.tax_id_13))).toBe(1);
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText(C.cpc_company_part);
    });
    await test.step('Search with a 14 digit tax ID; no list is shown', async () => {
      await RegisterValidation.verifyTaxSearchEmpty(await reg.search(C.tax_id_14));
      await expect(items).toHaveCount(0);
    });
    await test.step('Search with Japanese text, then mock the API with a Japanese company and select it', async () => {
      expect((await reg.search(C.japanese)).status()).toBe(200);
      await expect(reg.taxId).toHaveValue(C.japanese);
      await expect(items).toHaveCount(0); // no such company in the system
      const mockPattern = `**${PATH.TAX_SEARCH}*`;
      await page.route(mockPattern, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: { code: 1000, customMessage: '', description: 'Success.' },
            data: { taxInfo: [{ taxId: C.japanese_tax_id, companyName: C.japanese_company, branchName: null, branchCode: '00000', address: '' }] },
          }),
        }),
      );
      await reg.search(C.japanese);
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText(C.japanese_company);
      const dupReq = NetworkHelper.waitForRequest(page, PATH.DUPLICATE_INFO);
      await items.first().click();
      expect(NetworkHelper.postBody(await dupReq).text).toBe(C.japanese_company);
      await expect(reg.taxId).toHaveValue(C.japanese_tax_id);
      await page.unroute(mockPattern);
    });
    await test.step('Search with special characters; no list and the page does not break', async () => {
      for (const text of [C.special, C.special_short]) {
        await RegisterValidation.verifyTaxSearchEmpty(await reg.search(text));
        await expect(reg.taxId).toHaveValue(text);
        await expect(items).toHaveCount(0);
      }
    });
    await test.step('Search with mixed Thai and English text; no list', async () => {
      expect((await reg.search(C.mixed)).status()).toBe(200);
      await expect(items).toHaveCount(0);
    });
    await test.step('Type 255 characters in the search field', async () => {
      await reg.taxId.fill(DataHelper.repeat('ก', testData.LENGTH.text_max));
      await page.waitForTimeout(1200);
      expect(await reg.taxId.inputValue()).toHaveLength(255);
    });
    await test.step('Type 256 characters in the search field; only 255 are kept', async () => {
      await FieldSteps.truncatesAt(reg, reg.taxId, testData.LENGTH.text_max);
    });
    await test.step('Type only spaces in the search field; the API is not called', async () => {
      await reg.taxId.fill('');
      const calls = NetworkHelper.recordRequests(page, PATH.TAX_SEARCH);
      await reg.taxId.pressSequentially(testData.TEXT.spaces_5);
      await page.waitForTimeout(1200);
      expect(await reg.taxId.inputValue()).toBe(testData.TEXT.spaces_5);
      expect(calls.list).toHaveLength(0); // the API is not called
    });
    await test.step('Search an unregistered company by tax ID and select it; duplicateInfo says it is not duplicate', async () => {
      await reg.search(company.taxId); // a company that has never been registered
      await expect(items).toHaveCount(1);
      const dup = NetworkHelper.waitForResponse(page, PATH.DUPLICATE_INFO);
      await items.first().click();
      await RegisterValidation.verifyDuplicateInfoCompany(await dup, company.name, expected);
      await expect(reg.taxId).toHaveValue(company.taxId);
      await expect(reg.msg(m.taxId)).toBeHidden();
    });
  });

  await test.step('Open the business type dropdown and compare the options with the API', async () => {
    const companyType = additionalInfo.companyType;
    expect(companyType).toHaveLength(expected.DROPDOWN.businessTypeCount);
    await reg.businessTypeDropdown.click();
    const options = (await reg.dropdownOptions.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    expect(options).toEqual(expected.DROPDOWN.businessTypesTh); // same order as the API array
    await reg.clickOutside();
    await page.getByTestId('dropdown_selection_registration_company_type'); // (dropdown stays unselected here)
  });

  await test.step('Select eCommerce, then เทคโนโลยี, then the same option again, then eCommerce', async () => {
    const d = testData.DROPDOWN;
    await reg.selectDropdown(reg.businessTypeDropdown, d.business_type);
    await expect(reg.businessTypeDropdown).toContainText(d.business_type);
    await expect(reg.msg(m.businessType)).toBeHidden();
    await reg.selectDropdown(reg.businessTypeDropdown, d.business_type_other);
    await expect(reg.businessTypeDropdown).toContainText(d.business_type_other);
    await reg.selectDropdown(reg.businessTypeDropdown, d.business_type_other); // same option again
    await expect(reg.businessTypeDropdown).toContainText(d.business_type_other); // not cleared
    await reg.selectDropdown(reg.businessTypeDropdown, data.businessType); // keep eCommerce for the registration
  });

  await test.step('Select 21-50, then 51-100, then 1-20 in the number of users dropdown', async () => {
    const d = testData.DROPDOWN;
    await reg.selectDropdown(reg.userAmountDropdown, d.user_amount);
    await expect(reg.userAmountDropdown).toContainText(d.user_amount);
    await reg.selectDropdown(reg.userAmountDropdown, d.user_amount_other);
    await expect(reg.userAmountDropdown).toContainText(d.user_amount_other);
    await reg.selectDropdown(reg.userAmountDropdown, data.userAmount);
  });

  await test.step('Type a valid email and click Try for free; DuplicateEmail answers false and no email error shows', async () => {
    await reg.email.pressSequentially(data.email);
    await reg.expectNoMessage(m.emailInvalid, m.emailEmpty); // while typing
    const dup = NetworkHelper.waitForResponse(page, PATH.DUPLICATE_EMAIL);
    await reg.clickSubmit(); // the other fields are still empty, nothing is submitted
    const resp = await dup;
    expect(resp.status()).toBe(200);
    expect((await resp.json()).data).toBe(false);
    expect(NetworkHelper.postBody(resp.request())).toMatchObject({ email: data.email, currentEmail: null, productId: 102 });
    await reg.expectNoMessage(m.emailInvalid, m.emailDomainUsed);
  });

  await test.step('Enter a 150 character email, then put the registration email back', async () => {
    const long = DataHelper.emailWithLength(testData.LENGTH.email_max);
    await reg.email.fill(long);
    await reg.clickOutside();
    expect(await reg.email.inputValue()).toHaveLength(150);
    await reg.expectNoMessage(m.emailInvalid, m.emailEmpty);
    await reg.email.fill(data.email); // back to the registration email
  });

  for (const [first, label, field, errorText, finalValue] of [
    [41, 'first name', reg.firstName, m.firstName, data.firstName],
    [53, 'last name', reg.lastName, m.lastName, data.lastName],
  ] as const) {
    await test.step(`Enter a Thai ${label} and click away`, () => FieldSteps.acceptsValue(reg, field, testData.TEXT.thai, errorText));
    await test.step(`Enter an English ${label} and click away`, () => FieldSteps.acceptsValue(reg, field, testData.TEXT.english, errorText));
    await test.step(`Enter a Japanese ${label} and click away`, () => FieldSteps.acceptsValue(reg, field, testData.TEXT.japanese, errorText));
    await test.step(`Enter special characters as the ${label}`, async () => {
      await FieldSteps.acceptsValue(reg, field, testData.TEXT.special, errorText);
      test.info().annotations.push({ type: 'known-finding', description: `accepted; spec needs confirmation` });
    });
    await test.step(`Enter a mixed-language ${label}`, () => FieldSteps.acceptsValue(reg, field, testData.TEXT.mixed, errorText));
    await test.step(`Enter digits as the ${label}`, async () => {
      await FieldSteps.acceptsValue(reg, field, testData.TEXT.digits, errorText);
      test.info().annotations.push({ type: 'known-finding', description: `accepted; spec needs confirmation` });
    });
    await test.step(`Enter exactly 255 characters as the ${label}`, () => FieldSteps.acceptsMaxLength(reg, field, testData.LENGTH.text_max, errorText));
    await test.step(`Type 256 characters as the ${label}; only 255 are kept`, () => FieldSteps.truncatesAt(reg, field, testData.LENGTH.text_max));
    await test.step(`Enter spaces only as the ${label}`, async () => {
      await field.fill(testData.TEXT.spaces_3);
      await reg.clickOutside();
      await FindingHelper.knownFinding(test.info(), `spaces-only is accepted (error expected; likely a bug)`, async () => {
        await expect(reg.msg(errorText)).toBeVisible({ timeout: 3000 });
      });
    });
    await field.fill(finalValue); // the value used for the registration
    await reg.clickOutside();
  }

  await test.step('Type a Thai phone number with leading 0 (0812345678) and click away', async () => {
    await reg.phone.pressSequentially(testData.PHONE.thai_leading_0);
    await reg.clickOutside();
    await expect(reg.phone).toHaveValue(testData.PHONE.thai_leading_0);
    await reg.expectNoMessage(m.phoneInvalid, m.phoneEmpty);
  });
  await test.step('Type a Thai phone number without leading 0 (812345678) and click away', async () => {
    await reg.phone.fill(testData.PHONE.thai_no_leading_0);
    await reg.clickOutside();
    await reg.expectNoMessage(m.phoneInvalid, m.phoneEmpty);
  });
  await test.step('Select Japan (+81), type a Japanese number, then switch back to Thailand (+66)', async () => {
    await reg.selectCountry('81');
    await expect(reg.countryFlag).toContainText('+81');
    await reg.phone.fill(testData.PHONE.japan);
    await reg.clickOutside();
    await reg.expectNoMessage(m.phoneInvalid, m.phoneEmpty);
    await reg.selectCountry('66'); // back to Thailand for the registration
    await expect(reg.countryFlag).toContainText('+66');
  });

  await test.step('Enter the test phone number again; duplicateInfo says it is not duplicate', async () => {
    const phoneCheck = NetworkHelper.waitForResponse(page, PATH.DUPLICATE_INFO, (r) => (r.request().postData() ?? '').includes('phone'));
    await reg.phone.fill(data.phone);
    await reg.clickOutside();
    expect((await (await phoneCheck).json()).data.isDuplicate).toBe(false); // the same phone can be used again
    test.info().annotations.push({ type: 'known-finding', description: 'BUS-117: a phone number already used by an earlier registration is accepted; confirm with the team' });
  });

  await test.step('Open the promo code field and click Apply with it empty; nothing happens', async () => {
    const calls = NetworkHelper.recordRequests(page, PATH.COUPON_VALIDATION);
    await reg.promoLink.click();
    await reg.promoApply.click();
    await page.waitForTimeout(1000);
    expect(calls.list).toHaveLength(0);
    await expect(reg.msg(m.promoInvalid)).toBeHidden();
  });

  await test.step('Check the consent checkbox is unticked, then tick it', async () => {
    await expect(reg.consent).not.toBeChecked();
    await reg.tickConsent(); // an error from an earlier submit may still be shown here; it must go away once ticked
    await expect(reg.msg(m.consent)).toBeHidden();
  });

  await test.step('Check the Privacy Policy link (href and opens in a new tab)', async () => {
    await expect(reg.privacyLink).toHaveAttribute('href', expected.LINKS.privacy);
    await expect(reg.privacyLink).toHaveAttribute('target', '_blank');
    await expect(reg.privacyLink).toHaveAttribute('rel', 'noopener');
  });
  await test.step('Check the Terms and Conditions link (href and opens in a new tab)', async () => {
    await expect(reg.termsLink).toHaveAttribute('href', expected.LINKS.terms);
    await expect(reg.termsLink).toHaveAttribute('target', '_blank');
  });

  await test.step('Click Try for free with valid data; register is called and the OTP modal opens', async () => {
    await flow.submit('thai', data);
  });

  await test.step('Check the content of the OTP modal', async () => {
    await flow.expectOtpModalContent(data.phone);
  });
  await test.step('Type 5 OTP digits; Confirm stays disabled', async () => {
    await otp.enter(testData.OTP.five_digits);
    expect(await otp.enteredCode()).toBe(testData.OTP.five_digits);
    await expect(otp.confirm).toBeDisabled();
  });
  await test.step('Type the 6th digit; Confirm is enabled; then clear the digits', async () => {
    await page.keyboard.type('1');
    await expect(otp.confirm).toBeEnabled();
    await otp.clear();
    expect(await otp.enteredCode()).toBe('');
  });
  await test.step('Type the correct OTP and click Confirm; the create-password page opens', async () => {
    try {
      await flow.passOtp(env.otp);
    } catch (e) {
      // BUG B1: for a Thai company the verify-otp API rejects the correct OTP (status.code 4001), so no account is created
      test.info().annotations.push({
        type: 'bug',
        description: `Thai company ${company.taxId}: verify-otp rejects the correct OTP ${env.otp} (status.code 4001), the account cannot be created`,
      });
      throw e;
    }
  });

  await test.step('Close the OTP modal with the X button (not automated yet)', async () => {
    FindingHelper.observe(test.info(), 'BUS-129', 'not automated yet: closing the modal would need a second registration / SMS');
  });

  await test.step('Type the password and the same confirmation and click Create Password; the success page opens', async () => {
    await flow.createPassword(env.password);
    AccountStore.add({ mode: 'thai', email: data.email, password: env.password, company: company.name });
  });
});
