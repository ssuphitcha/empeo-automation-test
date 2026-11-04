import { Page, Request, Response } from '@playwright/test';

/** Helpers to watch the API calls that the page makes. */
export class NetworkHelper {
  /** Waits for the next response whose URL contains `path` (and optional extra check). */
  static waitForResponse(page: Page, path: string, extra?: (r: Response) => boolean): Promise<Response> {
    return page.waitForResponse((r) => r.url().includes(path) && (extra ? extra(r) : true));
  }

  /** Waits for the response of exactly `path` (so /register does not match /register/verify-otp). */
  static waitForExact(page: Page, path: string, method = 'POST'): Promise<Response> {
    return page.waitForResponse(
      (r) => new URL(r.url()).pathname.toLowerCase() === path.toLowerCase() && r.request().method() === method,
    );
  }

  static waitForRequest(page: Page, path: string): Promise<Request> {
    return page.waitForRequest((r) => r.url().includes(path));
  }

  /** Counts requests to `path` from now on; call `.list` to read them. */
  static recordRequests(page: Page, path: string): { list: Request[] } {
    const rec = { list: [] as Request[] };
    page.on('request', (r) => {
      if (r.url().includes(path)) rec.list.push(r);
    });
    return rec;
  }

  /** JSON body that the page posted. */
  static postBody(request: Request): any {
    return JSON.parse(request.postData() ?? '{}');
  }
}
