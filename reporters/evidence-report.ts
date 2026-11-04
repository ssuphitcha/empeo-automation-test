import fs from 'fs';
import path from 'path';

type Flat = { title: string; failed: boolean; error: string };
type Top = Flat & { children: Flat[] };
type Call = { step: number; method: string; url: string; status: number; statusText: string; ms: number | null; request?: string; response: string };
type Test = {
  id: string; title: string; tags: string[]; status: string; expected: string;
  steps: Flat[][]; tops: Top[]; calls: Call[]; videoPath?: string; fileBase: string;
  annotations: { type: string; description?: string }[]; error: string; duration: number;
};

const SHELL = path.join(__dirname, 'shell');

function inline(file: string | undefined): string | null {
  if (!file || !fs.existsSync(file)) return null;
  const mime = file.endsWith('.webm') ? 'video/webm' : file.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';
  return `data:${mime};base64,` + fs.readFileSync(file).toString('base64');
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/** Short sentence for the "why" line of an API card. */
const PURPOSE: [RegExp, string][] = [
  [/additional-information/i, 'Load the business type and number-of-users dropdown options'],
  [/tax|company|search/i, 'Search companies by tax ID or name for the Thai-company field'],
  [/duplicateemail/i, 'Check whether the email is already used (called when leaving the email field)'],
  [/duplicateinfo/i, 'Check whether the company or phone is already registered'],
  [/verify-otp/i, 'Verify the OTP typed in the modal'],
  [/resend/i, 'Ask for a new OTP'],
  [/validation/i, 'Validate the registration before the password step'],
  [/create-password/i, 'Create the password and finish the registration'],
  [/coupon|promo/i, 'Check the promo code'],
  [/register/i, 'Submit the registration form'],
];
const purposeOf = (url: string) => PURPOSE.find(([re]) => re.test(pathOf(url)))?.[1];

export function buildEvidenceReport(tests: Test[], opts: { out: string; started: Date; runDir: string }): void {
  const head = fs.readFileSync(path.join(SHELL, '_shell_head.html'), 'utf8');
  const tail = fs.readFileSync(path.join(SHELL, '_shell_tail.html'), 'utf8');

  const rows = tests.map((t) => {
    const status = t.status === 'skipped' ? 'SKIP' : t.status === t.expected ? 'PASS' : 'FAIL';
    const flatSteps = t.steps.flat();
    const kind = t.tags.includes('@flow') ? 'Flow (registers real accounts on UAT)' : 'Safe (creates nothing)';

    const timeline: any[] = [];
    t.tops.forEach((s, i) => {
      timeline.push({
        kind: 'run', step: i + 1, ng: s.failed,
        why: s.title + (s.failed ? ` -- failed: ${s.error}` : ''),
        cmd: s.children.length ? s.children.map((c) => `${c.failed ? '✕' : '✓'} ${c.title}`).join('\n') : undefined,
      });
      const folded = new Map<string, any>();
      for (const c of t.calls.filter((c) => c.step === i)) {
        const k = `${c.method} ${pathOf(c.url)} ${c.status}`;
        if (folded.has(k)) { folded.get(k).times++; continue; }
        folded.set(k, { ...c, times: 1 });
      }
      for (const c of folded.values()) {
        timeline.push({
          kind: 'api', step: i + 1,
          why: [purposeOf(c.url), c.times > 1 ? `called ${c.times} times in this step (first call shown)` : null].filter(Boolean).join(' · ') || undefined,
          api: { method: c.method, url: c.url, status: c.status, statusText: c.statusText, time: c.ms, request: c.request, response: c.response },
        });
      }
    });

    const checks = t.annotations
      .filter((a) => a.type !== 'skip' && a.type !== 'fixme')
      .map((a) => ({ label: a.type, value: a.description ?? '', ok: a.type === 'finding-fixed' ? true : a.type === 'bug' ? false : null }));

    const video = inline(t.videoPath);
    return {
      id: t.id, localId: t.id, suite: 'Registration scenarios', type: kind, priority: '-',
      name: t.title.replace(/@\w+/g, '').replace(/^M\d+\s*/, '').trim(),
      precondition: '-',
      steps: flatSteps.map((s) => s.title),
      expected: flatSteps.map((s) => (s.failed ? `Failed: ${s.error}` : 'Passed')),
      status,
      result: status === 'PASS' ? `All ${flatSteps.length} steps passed in ${(t.duration / 1000).toFixed(0)}s`
        : status === 'SKIP' ? 'Skipped (see the note in the spec)' : t.error,
      videos: video ? [{ src: video, caption: `${t.id} run video`, file: path.basename(t.videoPath!) }] : [],
      images: [], timeline, checks,
    };
  });

  const meta = {
    title: 'empeo registration - automated test evidence',
    jiraKey: 'empeo-registration',
    jiraUrl: 'https://portal.uat.gofive.co.th/Register/empeo',
    environments: 'UAT · portal.uat.gofive.co.th · Chromium (Playwright)',
    dateTested: `${opts.started.getFullYear()}-${String(opts.started.getMonth() + 1).padStart(2, '0')}-${String(opts.started.getDate()).padStart(2, '0')}`,
    scope: 'Registration of a new empeo account: required fields, validation, promo code, OTP, password, login (14 scenarios M1-M14, 146 test cases in TEST_CASES.md)',
    testedVia: 'Playwright + TypeScript. Each scenario is one test; the test cases are its steps. Video shows a red frame on every action and the step title at the bottom.',
  };

  const js = (v: unknown, indent?: number) => JSON.stringify(v, null, indent).replace(/</g, '\\u003c');
  fs.writeFileSync(opts.out, head + 'const REPORT_META = ' + js(meta, 1) + ';\nconst TESTS = ' + js(rows) + ';\n' + tail);
}
