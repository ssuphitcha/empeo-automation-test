#!/usr/bin/env node
/** Opens the HTML report of the latest run (or of the run id given as argument). */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const runId = process.argv[2] ?? fs.readFileSync(path.join('results', 'LATEST'), 'utf8').trim();
const report = path.join('results', runId, 'report');
if (!fs.existsSync(report)) {
  console.error(`No report found at ${report}`);
  process.exit(1);
}
spawnSync('npx', ['playwright', 'show-report', report], { stdio: 'inherit' });
