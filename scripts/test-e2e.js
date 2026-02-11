#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const e2eRoot = path.join(repoRoot, 'e2e-tests');
const testsRoot = path.join(e2eRoot, 'tests');
const resultsRoot = path.join(e2eRoot, 'test-results');
const summaryPath = path.join(repoRoot, 'e2e-test-summary.md');

function listFiles(rootDir, matcher) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath, matcher));
    } else if (entry.isFile() && matcher(entry.name, entryPath)) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function ensureCleanResultsDir() {
  fs.rmSync(resultsRoot, { recursive: true, force: true });
  fs.mkdirSync(resultsRoot, { recursive: true });
}

function toArtifactBaseName(specFileName) {
  return specFileName.replace(/\.spec\.ts$/, '');
}

function moveRunArtifacts(specFileName) {
  const baseName = toArtifactBaseName(specFileName);
  const junitSrc = path.join(resultsRoot, 'junit.xml');
  const jsonSrc = path.join(resultsRoot, 'results.json');
  const junitDest = path.join(resultsRoot, `${baseName}.junit.xml`);
  const jsonDest = path.join(resultsRoot, `${baseName}.results.json`);

  if (fs.existsSync(junitSrc)) {
    fs.renameSync(junitSrc, junitDest);
  }
  if (fs.existsSync(jsonSrc)) {
    fs.renameSync(jsonSrc, jsonDest);
  }
}

function getSpecFiles() {
  if (!fs.existsSync(testsRoot)) {
    return [];
  }

  return fs
    .readdirSync(testsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^apex.*\.spec\.ts$/.test(name))
    .sort();
}

function parseJUnitFile(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const extract = (name) => {
    const match = xml.match(new RegExp(`${name}="([0-9]+)"`));
    return match ? Number(match[1]) : 0;
  };

  return {
    total: extract('tests'),
    failures: extract('failures'),
    errors: extract('errors'),
  };
}

function parseJsonResults(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stats = data.stats || {};
  return {
    total: Number(stats.expected ?? stats.total ?? 0),
    failures: Number(stats.unexpected ?? 0),
    errors: Number(stats.interrupted ?? 0),
  };
}

function buildSummary() {
  const junitFiles = listFiles(
    resultsRoot,
    (name) => name === 'junit.xml' || name.endsWith('.junit.xml'),
  );
  const jsonFiles = listFiles(
    resultsRoot,
    (name) => name === 'results.json' || name.endsWith('.results.json'),
  );

  const sources = junitFiles.length > 0 ? junitFiles : jsonFiles;
  const perFileStats = [];

  let total = 0;
  let failures = 0;
  let errors = 0;

  for (const filePath of sources) {
    const metrics =
      junitFiles.length > 0
        ? parseJUnitFile(filePath)
        : parseJsonResults(filePath);

    perFileStats.push({ filePath, ...metrics });
    total += metrics.total;
    failures += metrics.failures;
    errors += metrics.errors;
  }

  const lines = [];
  lines.push('# E2E Test Results Summary');
  lines.push('');

  if (total > 0) {
    const passed = total - failures - errors;
    lines.push('## Test Results');
    lines.push('');
    lines.push(`- **Passed:** ${passed}`);
    lines.push(`- **Failed:** ${failures}`);
    lines.push(`- **Errors:** ${errors}`);
    lines.push(`- **Total:** ${total}`);
    lines.push('');
    lines.push('## Passing Rate by File');
    lines.push('');

    for (const stats of perFileStats) {
      const filePassed = stats.total - stats.failures - stats.errors;
      const rate =
        stats.total > 0
          ? ((filePassed / stats.total) * 100).toFixed(1)
          : '0.0';
      const displayPath = path.relative(resultsRoot, stats.filePath);
      lines.push(
        `- \`${displayPath}\`: **${rate}%** (${filePassed}/${stats.total} passed)`,
      );
    }

    lines.push('');
    if (failures === 0 && errors === 0) {
      lines.push('### All tests passed');
    } else {
      lines.push('### Some tests failed');
    }
  } else {
    lines.push('No test results found');
    lines.push('');
    lines.push(
      'Searched for `**/junit.xml` and `**/results.json` under `e2e-tests/test-results`.',
    );
  }

  return `${lines.join('\n')}\n`;
}

const specFiles = getSpecFiles();
let overallExitCode = 0;

if (specFiles.length === 0) {
  process.stdout.write(
    `No matching spec files found under ${path.relative(repoRoot, testsRoot)}\n`,
  );
}

ensureCleanResultsDir();

for (const specFile of specFiles) {
  process.stdout.write(`\nRunning: npx playwright test tests/${specFile}\n`);
  const runResult = spawnSync(
    'npx',
    ['playwright', 'test', `tests/${specFile}`],
    {
      cwd: e2eRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        CI: process.env.CI ?? '1',
      },
    },
  );

  moveRunArtifacts(specFile);

  if (typeof runResult.status === 'number' && runResult.status !== 0) {
    overallExitCode = runResult.status;
  }

  if (runResult.error) {
    throw runResult.error;
  }
}

const summary = buildSummary();
fs.writeFileSync(summaryPath, summary, 'utf8');
process.stdout.write(`\nWrote E2E summary to ${path.basename(summaryPath)}\n`);

process.exit(overallExitCode);
