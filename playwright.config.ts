import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

const envName = process.env.envName || 'uat';
dotenv.config({ path: path.resolve(__dirname, `configs/.env.${envName}`), quiet: true });

/**
 * Every run writes into its own folder: results/<RUN_ID>/
 *   results/<RUN_ID>/report     HTML report (open with `npm run report`)
 *   results/<RUN_ID>/artifacts  video, screenshot and trace of every test
 * RUN_ID is set by scripts/run-tests.js (timestamp); "manual" is used when
 * Playwright is started directly.
 */
const runId = process.env.RUN_ID ?? 'manual';
const resultsDir = `results/${runId}`;

export default defineConfig({
  globalSetup: require.resolve('./plugins/globalSetup.ts'),
  testDir: './testcases',
  outputDir: `${resultsDir}/artifacts`,
  timeout: 600_000, // a scenario holds many test cases as steps
  expect: { timeout: 10_000 },
  fullyParallel: false, // fixed phone number / OTP / promo code -> run serially
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `${resultsDir}/report` }],
    ['./reporters/evidence.reporter.ts', { outDir: resultsDir }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 40) }, // slows each action so the video is readable
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
