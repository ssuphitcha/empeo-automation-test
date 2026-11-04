import { TestInfo } from '@playwright/test';

/**
 * For cases where UAT behaves differently from the expected result (see "Actual result"
 * in TEST_CASES.md). The scenario keeps running and the report shows an annotation:
 *  - known-finding: the expected behaviour is still missing (bug / spec to confirm)
 *  - finding-fixed: the expected behaviour now works, update the case
 */
export class FindingHelper {
  static async knownFinding(testInfo: TestInfo, title: string, check: () => Promise<void>): Promise<void> {
    try {
      await check();
      testInfo.annotations.push({ type: 'finding-fixed', description: title });
    } catch {
      testInfo.annotations.push({ type: 'known-finding', description: title });
    }
  }

  /** Cases that were not executed yet (tbc): record what was observed instead of asserting. */
  static observe(testInfo: TestInfo, title: string, observed: string): void {
    testInfo.annotations.push({ type: 'tbc-observed', description: `${title}: ${observed}` });
  }
}
