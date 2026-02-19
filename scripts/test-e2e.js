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
const slopdocsDir = path.join(repoRoot, 'slopdocs');
const summaryPath = path.join(slopdocsDir, 'e2e-test-summary.md');

const isCI = !!process.env.CI;

/**
 * Ports used by the e2e test infrastructure:
 * - 3000: VS Code web test server
 * - 9323: Playwright HTML report server (show-report default)
 */
const E2E_PORTS = [3000, 9323];

/**
 * Kill any processes occupying the ports needed for e2e tests.
 * Prevents EADDRINUSE errors from stale servers left by previous runs.
 */
function freeRequiredPorts() {
  if (process.platform === 'win32') {
    for (const port of E2E_PORTS) {
      const result = spawnSync(
        'cmd',
        ['/c', `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`],
        { stdio: 'pipe', shell: true },
      );
      if (result.stdout && result.stdout.toString().trim()) {
        process.stdout.write(`Freed port ${port} (Windows)\n`);
      }
    }
    return;
  }

  for (const port of E2E_PORTS) {
    const result = spawnSync('lsof', ['-ti', `:${port}`], { stdio: 'pipe' });
    const pids = (result.stdout || '')
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    if (pids.length === 0) {
      continue;
    }

    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        process.stdout.write(`Killed PID ${pid} on port ${port}\n`);
      } catch {
        // Process may have already exited
      }
    }
  }
}

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

/**
 * Walk Playwright JSON suites recursively, collecting every spec
 * with its suite path, status, and error details.
 */
function collectSpecs(suites, parentPath) {
  const specs = [];
  for (const suite of suites || []) {
    const suitePath = parentPath
      ? `${parentPath} > ${suite.title}`
      : suite.title;

    for (const spec of suite.specs || []) {
      const test = spec.tests?.[0];
      const result = test?.results?.[0];
      const status = result?.status || 'unknown';
      const ok = spec.ok !== false && status === 'passed';
      const errorMessages = (result?.errors || [])
        .map((e) => (e.message || '').replace(/\x1b\[[0-9;]*m/g, '').trim())
        .filter(Boolean);

      specs.push({
        file: suite.file || spec.file,
        suite: suitePath,
        title: spec.title,
        line: spec.line,
        status,
        ok,
        duration: result?.duration,
        errorMessages,
      });
    }

    specs.push(...collectSpecs(suite.suites, suitePath));
  }
  return specs;
}

/**
 * Load all results.json files and extract every spec with full detail.
 */
function loadAllSpecs() {
  const jsonFiles = listFiles(
    resultsRoot,
    (name) => name === 'results.json' || name.endsWith('.results.json'),
  );

  const allSpecs = [];
  for (const filePath of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    allSpecs.push(...collectSpecs(data.suites, ''));
  }
  return allSpecs;
}

function buildSummary() {
  const allSpecs = loadAllSpecs();

  if (allSpecs.length === 0) {
    // Fallback: try JUnit files for basic stats
    const junitFiles = listFiles(
      resultsRoot,
      (name) => name === 'junit.xml' || name.endsWith('.junit.xml'),
    );

    if (junitFiles.length === 0) {
      return [
        '# E2E Test Results Summary',
        '',
        'No test results found.',
        '',
        'Searched for `**/results.json` and `**/junit.xml` under `e2e-tests/test-results`.',
        '',
      ].join('\n');
    }

    // Basic JUnit fallback (no per-test detail)
    let total = 0;
    let failures = 0;
    let errors = 0;
    for (const filePath of junitFiles) {
      const m = parseJUnitFile(filePath);
      total += m.total;
      failures += m.failures;
      errors += m.errors;
    }
    const passed = total - failures - errors;
    return [
      '# E2E Test Results Summary',
      '',
      `| Metric | Count |`,
      `|--------|-------|`,
      `| Passed | ${passed} |`,
      `| Failed | ${failures} |`,
      `| Errors | ${errors} |`,
      `| **Total** | **${total}** |`,
      '',
      '> Detail unavailable — only JUnit XML was found.',
      '',
    ].join('\n');
  }

  // --- Aggregate totals ---
  const totalCount = allSpecs.length;
  const passedSpecs = allSpecs.filter((s) => s.ok);
  const failedSpecs = allSpecs.filter((s) => !s.ok);
  const passedCount = passedSpecs.length;
  const failedCount = failedSpecs.length;
  const totalDuration = allSpecs.reduce(
    (sum, s) => sum + (s.duration || 0),
    0,
  );

  // --- Group by spec file ---
  const byFile = new Map();
  for (const spec of allSpecs) {
    const file = spec.file || 'unknown';
    if (!byFile.has(file)) {
      byFile.set(file, []);
    }
    byFile.get(file).push(spec);
  }

  const lines = [];

  // Header
  lines.push('# E2E Test Results Summary');
  lines.push('');
  lines.push(
    `> Generated: ${new Date().toISOString()} | Duration: ${(totalDuration / 1000).toFixed(1)}s`,
  );
  lines.push('');

  // Overall stats table
  const overallRate =
    totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : '0.0';
  lines.push('## Overall Results');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Passed | ${passedCount} |`);
  lines.push(`| Failed | ${failedCount} |`);
  lines.push(`| **Total** | **${totalCount}** |`);
  lines.push(`| **Pass Rate** | **${overallRate}%** |`);
  lines.push('');

  // Per-file breakdown
  lines.push('## Results by File');
  lines.push('');
  lines.push(
    '| Spec File | Passed | Failed | Total | Pass Rate |',
  );
  lines.push(
    '|-----------|--------|--------|-------|-----------|',
  );

  const sortedFiles = [...byFile.keys()].sort();
  for (const file of sortedFiles) {
    const specs = byFile.get(file);
    const fp = specs.filter((s) => s.ok).length;
    const ff = specs.filter((s) => !s.ok).length;
    const ft = specs.length;
    const rate = ft > 0 ? ((fp / ft) * 100).toFixed(1) : '0.0';
    const icon = ff === 0 ? '\u2705' : '\u274c';
    lines.push(`| ${icon} \`${file}\` | ${fp} | ${ff} | ${ft} | ${rate}% |`);
  }
  lines.push('');

  // Per-file test detail
  lines.push('## Test Details by File');
  lines.push('');

  for (const file of sortedFiles) {
    const specs = byFile.get(file);
    const fp = specs.filter((s) => s.ok).length;
    const ft = specs.length;
    const icon = fp === ft ? '\u2705' : '\u274c';
    lines.push(`### ${icon} \`${file}\` (${fp}/${ft})`);
    lines.push('');
    lines.push('| # | Test | Status | Duration |');
    lines.push('|---|------|--------|----------|');

    specs.forEach((spec, idx) => {
      const statusIcon = spec.ok ? '\u2705' : '\u274c';
      const dur =
        spec.duration != null ? `${(spec.duration / 1000).toFixed(1)}s` : '-';
      lines.push(
        `| ${idx + 1} | ${spec.title} | ${statusIcon} ${spec.status} | ${dur} |`,
      );
    });
    lines.push('');
  }

  // Failures section
  if (failedCount > 0) {
    lines.push('## Failures');
    lines.push('');

    for (const spec of failedSpecs) {
      lines.push(
        `### \u274c ${spec.title}`,
      );
      lines.push('');
      lines.push(`- **File:** \`${spec.file}\` (line ${spec.line})`);
      lines.push(`- **Suite:** ${spec.suite}`);
      lines.push(`- **Status:** ${spec.status}`);

      if (spec.errorMessages.length > 0) {
        lines.push('');
        lines.push('**Error:**');
        lines.push('');
        lines.push('```');
        for (const msg of spec.errorMessages) {
          // Truncate very long error messages but keep enough to be useful
          const truncated =
            msg.length > 1500 ? `${msg.substring(0, 1500)}\n... (truncated)` : msg;
          lines.push(truncated);
        }
        lines.push('```');
      }
      lines.push('');
    }
  } else {
    lines.push('## Failures');
    lines.push('');
    lines.push('None — all tests passed.');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

/**
 * CI mode: run each spec file individually so we get per-file artifacts
 * and can continue past failures in one spec.
 */
function runCI(specFiles) {
  ensureCleanResultsDir();

  let overallExitCode = 0;

  for (const specFile of specFiles) {
    process.stdout.write(
      `\nRunning: npx playwright test tests/${specFile}\n`,
    );
    const testMode = process.env.TEST_MODE || 'web';
    const configArg =
      testMode === 'web'
        ? ['test', '--config=playwright.config.web.ts', `tests/${specFile}`]
        : ['test', `tests/${specFile}`];

    const runResult = spawnSync('npx', ['playwright', ...configArg], {
      cwd: e2eRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        CI: process.env.CI ?? '1',
        TEST_MODE: testMode,
        ...(testMode === 'desktop' ? { VSCODE_DESKTOP: '1' } : {}),
      },
    });

    moveRunArtifacts(specFile);

    if (typeof runResult.status === 'number' && runResult.status !== 0) {
      overallExitCode = runResult.status;
    }

    if (runResult.error) {
      throw runResult.error;
    }
  }

  return overallExitCode;
}

/**
 * Local mode: run all specs in a single Playwright invocation so we get
 * one unified HTML report, then open it in the default browser.
 */
function runLocal() {
  ensureCleanResultsDir();

  process.stdout.write('\nRunning all e2e tests...\n');

  const testMode = process.env.TEST_MODE || 'web';
  const configArg =
    testMode === 'web'
      ? ['test', '--config=playwright.config.web.ts']
      : ['test'];

  const runResult = spawnSync('npx', ['playwright', ...configArg], {
    cwd: e2eRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      TEST_MODE: testMode,
      ...(testMode === 'desktop' ? { VSCODE_DESKTOP: '1' } : {}),
    },
  });

  if (runResult.error) {
    throw runResult.error;
  }

  const exitCode =
    typeof runResult.status === 'number' ? runResult.status : 1;

  return exitCode;
}

function showReport() {
  process.stdout.write('\nOpening Playwright HTML report...\n');
  spawnSync('npx', ['playwright', 'show-report'], {
    cwd: e2eRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

// --- Main ---

freeRequiredPorts();

const specFiles = getSpecFiles();

if (specFiles.length === 0) {
  process.stdout.write(
    `No matching spec files found under ${path.relative(repoRoot, testsRoot)}\n`,
  );
  process.exit(0);
}

const exitCode = isCI ? runCI(specFiles) : runLocal();

const summary = buildSummary();
fs.mkdirSync(slopdocsDir, { recursive: true });
fs.writeFileSync(summaryPath, summary, 'utf8');
process.stdout.write(
  `\nWrote E2E summary to slopdocs/${path.basename(summaryPath)}\n`,
);

if (!isCI) {
  showReport();
}

process.exit(exitCode);
