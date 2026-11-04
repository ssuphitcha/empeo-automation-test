import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { buildEvidenceReport } from './evidence-report';

type Row = { test: TestCase; result: TestResult };

/**
 * Builds the single-file HTML evidence report and copies one video per scenario:
 *   results/<run>/evidence-report.html
 *   results/<run>/videos/M01-<name>.webm (+ .mp4 when ffmpeg is installed)
 */
export default class EvidenceReporter implements Reporter {
  private rows: Row[] = [];
  private started = new Date();
  private outDir: string;

  constructor(options: { outDir?: string } = {}) {
    this.outDir = path.resolve(options.outDir ?? 'results/manual');
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.started = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.rows.push({ test, result });
  }

  /** Keeps the scenarios of run MERGE_WITH that were not run now (their videos are copied too). */
  private mergeWithPrevious(now: any[], videoDir: string, ffmpeg: boolean): any[] {
    const prev = process.env.MERGE_WITH;
    const file = prev ? path.resolve('results', prev, 'evidence-data.json') : '';
    if (!prev || !fs.existsSync(file)) return now;
    const ids = new Set(now.map((t) => t.id));
    const kept = (JSON.parse(fs.readFileSync(file, 'utf8')) as any[]).filter((t) => !ids.has(t.id));
    for (const t of kept) {
      if (!t.videoPath || !fs.existsSync(t.videoPath)) continue;
      const copy = path.join(videoDir, path.basename(t.videoPath));
      fs.copyFileSync(t.videoPath, copy);
      const mp4 = t.videoPath.replace(/\.webm$/, '.mp4');
      if (ffmpeg && fs.existsSync(mp4)) fs.copyFileSync(mp4, copy.replace(/\.webm$/, '.mp4'));
      t.videoPath = copy;
    }
    const num = (t: any) => Number(String(t.id).replace(/\D/g, '')) || 0;
    return [...kept, ...now].sort((a, b) => num(a) - num(b));
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (!this.rows.length) return;
    const videoDir = path.join(this.outDir, 'videos');
    fs.mkdirSync(videoDir, { recursive: true });
    const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

    const tests = this.rows.map(({ test, result }) => {
      const id = (test.title.match(/^M\d+/) || [test.title])[0];
      const slug = test.title.replace(/@\w+/g, '').replace(/^M\d+\s*/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const fileBase = `M${id.replace('M', '').padStart(2, '0')}-${slug}`;

      let videoPath: string | undefined;
      const video = result.attachments.find((a) => a.name === 'video' && a.path);
      if (video?.path && fs.existsSync(video.path)) {
        videoPath = path.join(videoDir, `${fileBase}.webm`);
        fs.copyFileSync(video.path, videoPath);
        if (ffmpeg) {
          spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(videoDir, `${fileBase}.mp4`)]);
        }
      }

      const apiLog = result.attachments.find((a) => a.name === 'api-log');
      const calls = apiLog?.body ? JSON.parse(apiLog.body.toString()) : [];
      const steps = result.steps.filter((s) => s.category === 'test.step');

      return { id, title: test.title, tags: test.tags, status: result.status, expected: test.expectedStatus, steps: steps.map(flat), tops: steps.map(top), calls, videoPath, fileBase, annotations: test.annotations, error: result.error?.message?.split('\n')[0] ?? '', duration: result.duration };
    });

    // A partial run (only some scenarios) is merged into the previous run, so the report always shows all scenarios.
    const all = this.mergeWithPrevious(tests as any[], videoDir, ffmpeg);
    fs.writeFileSync(path.join(this.outDir, 'evidence-data.json'), JSON.stringify(all));

    const out = path.join(this.outDir, 'evidence-report.html');
    buildEvidenceReport(all as any, { out, started: this.started, runDir: this.outDir });
    // eslint-disable-next-line no-console
    console.log(`\nEvidence report: ${out}\nVideos:          ${videoDir}`);
  }
}

/** Every step (nested too) as one flat list item with its depth and outcome. */
function flat(step: TestStep): any[] {
  return [{ title: step.title, failed: !!step.error, error: step.error?.message?.split('\n')[0] ?? '' }, ...step.steps.filter((s) => s.category === 'test.step').flatMap(flat)];
}

function top(step: TestStep): any {
  return { title: step.title, failed: !!step.error, error: step.error?.message?.split('\n')[0] ?? '', children: step.steps.filter((s) => s.category === 'test.step').flatMap(flat) };
}
