/** Helpers that generate test data. */
export class DataHelper {
  /** `text` repeated `times` times, e.g. repeat('ก', 255). */
  static repeat(text: string, times: number): string {
    return text.repeat(times);
  }

  /** Unique suffix so that a registration never reuses an email or a company name. */
  static uniq(): string {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  }

  /** Email on gmail.com (accepted by the duplicate-domain check). */
  static newEmail(): string {
    return `empeo.qa.${DataHelper.uniq()}@gmail.com`;
  }

  static newCompany(): string {
    return `QA Empeo Test ${DataHelper.uniq()} Co Ltd`;
  }

  /** Email of exactly `length` characters (local part padded with "a"). */
  static emailWithLength(length: number, domain = '@gmail.com'): string {
    return 'a'.repeat(length - domain.length) + domain;
  }
}
