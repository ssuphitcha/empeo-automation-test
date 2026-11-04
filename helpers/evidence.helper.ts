import { Page, TestInfo } from '@playwright/test';

/** One API call made by the page, kept for the evidence report. */
export type ApiCall = {
  step: number; // index of the top-level test.step that was running (0-based)
  method: string;
  url: string;
  status: number;
  statusText: string;
  ms: number | null;
  request?: string;
  response: string;
};

/** Cuts long arrays so a 200-item list does not fill the report. */
function trim(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    const head = value.slice(0, 5).map((v) => trim(v, depth + 1));
    return value.length > 5 ? [...head, `... ${value.length - 5} more item(s)`] : head;
  }
  if (value && typeof value === 'object' && depth < 8) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trim(v, depth + 1)]));
  }
  if (typeof value === 'string' && value.length > 300) return value.slice(0, 300) + '...';
  return value;
}

function pretty(text: string | null | undefined): string {
  if (!text) return '';
  try {
    return JSON.stringify(trim(JSON.parse(text)), null, 1);
  } catch {
    return text.slice(0, 1500);
  }
}

/**
 * Records the API calls of one test (calls to the API host only) and the step that
 * made them. test.fixture.ts wires this in; the reporter turns it into API cards.
 */
export class EvidenceRecorder {
  readonly calls: ApiCall[] = [];
  private stepIndex = -1;
  private depth = 0;

  constructor(private readonly page: Page, private readonly apiBase: string) {
    page.on('response', async (res) => {
      const url = res.url();
      if (!this.apiBase || !url.startsWith(this.apiBase)) return;
      const req = res.request();
      let body = '';
      try {
        body = await res.text();
      } catch {
        body = '(body not available)';
      }
      const timing = req.timing();
      this.calls.push({
        step: this.stepIndex,
        method: req.method(),
        url,
        status: res.status(),
        statusText: res.statusText(),
        ms: timing.responseEnd > 0 ? Math.round(timing.responseEnd) : null,
        request: req.postData() ? pretty(req.postData()) : undefined,
        response: pretty(body),
      });
    });
  }

  /** Called when a test.step starts; only top-level steps count as steps. */
  enter(): void {
    if (this.depth === 0) this.stepIndex++;
    this.depth++;
  }

  leave(): void {
    this.depth = Math.max(0, this.depth - 1);
  }

  async attach(testInfo: TestInfo): Promise<void> {
    await testInfo.attach('api-log', {
      body: JSON.stringify(this.calls),
      contentType: 'application/json',
    });
  }
}
