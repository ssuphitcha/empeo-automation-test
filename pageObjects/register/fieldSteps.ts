import { expect, Locator } from '@playwright/test';
import { RegisterPage } from './RegisterPage';
import { DataHelper } from '../../helpers/data.helper';

/** Small reusable checks for the text fields (first name, last name, company name). */
export class FieldSteps {
  /** The field takes `value` as typed and its error message stays hidden. */
  static async acceptsValue(reg: RegisterPage, field: Locator, value: string, errorText: string) {
    await field.fill(value);
    await reg.clickOutside();
    await expect(field).toHaveValue(value);
    await expect(reg.msg(errorText)).toBeHidden();
  }

  /** Typing `max + 1` characters keeps only `max` (maxlength). */
  static async truncatesAt(reg: RegisterPage, field: Locator, max: number, char = 'ก') {
    await field.fill('');
    await field.click();
    await field.pressSequentially(DataHelper.repeat(char, max + 1), { delay: 2 });
    expect(await field.inputValue()).toHaveLength(max);
  }

  /** The field takes exactly `max` characters without an error. */
  static async acceptsMaxLength(reg: RegisterPage, field: Locator, max: number, errorText: string, char = 'ก') {
    await FieldSteps.acceptsValue(reg, field, DataHelper.repeat(char, max), errorText);
    expect(await field.inputValue()).toHaveLength(max);
  }
}
