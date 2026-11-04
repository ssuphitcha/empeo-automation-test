#!/usr/bin/env node
/**
 * Runs the Playwright suite and stores everything under results/<RUN_ID>/.
 *   node scripts/run-tests.js                  -> all safe tests (no real registration)
 *   node scripts/run-tests.js tests/04-email   -> one spec file / any playwright args
 *   RUN_REAL_REGISTRATION=1 node scripts/run-tests.js tests/10-registration-flow.spec.ts
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const runId = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;

// A run of only some scenarios is merged into the previous run, so its report still shows all 14.
const latestFile = path.join('results', 'LATEST');
const previous = fs.existsSync(latestFile) ? fs.readFileSync(latestFile, 'utf8').trim() : '';
const partial = process.argv.length > 2; // any filter (spec file, --grep) is a partial run
fs.mkdirSync(path.join('results', runId), { recursive: true });
fs.writeFileSync(path.join('results', 'LATEST'), runId);
console.log(`Run id: ${runId}\nResults: results/${runId}\n`);

const res = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, RUN_ID: runId, ...(partial && previous ? { MERGE_WITH: previous } : {}) },
});
console.log(`\nHTML report: npm run report   (results/${runId}/report)`);
process.exit(res.status ?? 1);
