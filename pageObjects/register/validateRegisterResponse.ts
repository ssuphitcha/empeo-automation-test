import { expect, Response } from '@playwright/test';
import { ExpectedData } from '../../fixtures/types/expectedDataType-Registration';

/** Reusable assertions on the API responses of the registration page. */
export class RegisterValidation {
  /** tax-search answered 200 with `data = null` (no list). */
  static async verifyTaxSearchEmpty(resp: Response): Promise<void> {
    expect(resp.status()).toBe(200);
    expect((await resp.json()).data).toBeNull();
  }

  /** tax-search answered 200 with at least one company. */
  static async verifyTaxSearchHasResults(resp: Response): Promise<number> {
    expect(resp.status()).toBe(200);
    const items = (await resp.json()).data.taxInfo;
    expect(items.length).toBeGreaterThan(0);
    return items.length;
  }

  static async verifyAdditionalInformation(resp: Response, expected: ExpectedData): Promise<void> {
    const e = expected.API.additionalInformation;
    expect(resp.status()).toBe(e.status);
    const body = await resp.json();
    expect(body.status.code).toBe(e.code);
    expect(Object.keys(body.data)).toEqual(expect.arrayContaining(e.dataKeys));
  }

  /** duplicateInfo called for a company name and answered "not duplicate". */
  static async verifyDuplicateInfoCompany(resp: Response, companyNamePart: string, expected: ExpectedData): Promise<void> {
    const body = JSON.parse(resp.request().postData() ?? '{}');
    expect(body.text).toContain(companyNamePart);
    expect(body.infoTypeName).toBe(expected.API.duplicateInfo.infoTypeName);
    expect(body.productId).toBe(expected.API.duplicateInfo.productId);
    expect(resp.status()).toBe(200);
    expect((await resp.json()).data.isDuplicate).toBe(false);
  }
}
