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

const packages = [
  'apex-ls',
  'apex-lsp-shared',
  'apex-lsp-client',
  'apex-lsp-testbed',
  'apex-lsp-vscode-extension',
  'apex-parser-ast',
  'custom-services',
  'lsp-compliant-services',
];

let totalSuites = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalPending = 0;
let totalTests = 0;
let totalSnapshots = 0;
let totalSnapshotsPassed = 0;
let totalTime = 0;
// For wall-clock: earliest start and latest end across every package's run.
const packageResults = [];

packages.forEach((pkg) => {
  const resultPath = path.join(
    __dirname,
    '..',
    'packages',
    pkg,
    '.wireit',
    'test-results.json',
  );
  if (!fs.existsSync(resultPath)) {
    packageResults.push({ name: pkg, missing: true });
  } else {
    try {
      const results = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      const suites = results.numTotalTestSuites ?? results.numTotalTestFiles ?? 0;
      const passed = results.numPassedTests ?? 0;
      const failed = results.numFailedTests ?? 0;
      const pending = results.numPendingTests ?? 0;
      const tests = results.numTotalTests ?? 0;
      const snapshots = results.numTotalSnapshots ?? results.snapshot?.total ?? 0;
      const snapshotsPassed = results.snapshots?.passed ?? ((results.snapshot?.added ?? 0) + (results.snapshot?.matched ?? 0));
      const suiteEnds = results.testResults?.map((suite) => suite.endTime).filter(Boolean) ?? [];
      const suiteStarts = results.testResults?.map((suite) => suite.startTime).filter(Boolean) ?? [];
      const begin = Math.min(...[results.startTime, ...suiteStarts].filter(Boolean));
      const finish = results.endTime ?? (suiteEnds.length > 0 ? Math.max(...suiteEnds) : 0);
      const time = begin && finish && finish > begin ? finish - begin : 0;
      // Track the global window so we can also report wall-clock (packages run
      // in parallel under wireit, so wall-clock < sum of per-package times).

      totalSuites += suites;
      totalPassed += passed;
      totalFailed += failed;
      totalPending += pending;
      totalTests += tests;
      totalSnapshots += snapshots;
      totalSnapshotsPassed += snapshotsPassed;
      totalTime += time;

      packageResults.push({ name: pkg, suites, passed, failed, pending, tests, snapshots, snapshotsPassed, time });
    } catch (e) {
      packageResults.push({ name: pkg, missing: true });
    }
  }
});

// Display summary
const output = (msg) => {
  process.stdout.write(msg + '\n');
};
output('\n' + '='.repeat(70));
output('Test Summary');
output('='.repeat(70));

if (packageResults.length > 0) {
  // Per-package breakdown
  packageResults.forEach((result) => {
    const status = result.missing || result.failed > 0 ? '❌' : '✅';
    if (result.missing) {
      output(`${status} ${result.name.padEnd(30)} missing test results`);
      return;
    }
    output(
      `${status} ${result.name.padEnd(30)} ${result.passed}/${result.tests} passed (${(result.time / 1000).toFixed(1)}s)`,
    );
  });

  output('-'.repeat(70));

  // Overall summary
  const missingResults = packageResults.filter((result) => result.missing).map((result) => result.name);
  const status = totalFailed > 0 || missingResults.length > 0 ? '❌' : '✅';
  output(`${status} Test Suites: ${totalSuites} total`);
  output(
    `   Tests:       ${totalPassed} passed, ${totalFailed} failed, ${totalPending} pending (${totalTests} total)`,
  );
  if (totalSnapshots > 0) {
    output(`   Snapshots:   ${totalSnapshotsPassed}/${totalSnapshots} passed`);
  }
  output(`   Time:        ${(totalTime / 1000).toFixed(1)}s in tests`);
  if (missingResults.length > 0) output(`   Missing:     ${missingResults.join(', ')}`);
} else {
  output('No test results found. Run tests first.');
}

output('='.repeat(70) + '\n');

// Exit with error code if any tests failed
process.exit(totalFailed > 0 || packageResults.some((result) => result.missing) ? 1 : 0);
