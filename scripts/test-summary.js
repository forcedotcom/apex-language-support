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
let wallBegin = Infinity;
let wallFinish = 0;
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
  if (fs.existsSync(resultPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      const suites = results.numTotalTestSuites || 0;
      const passed = results.numPassedTests || 0;
      const failed = results.numFailedTests || 0;
      const pending = results.numPendingTests || 0;
      const tests = results.numTotalTests || 0;
      const snapshots = results.numTotalSnapshots || 0;
      const snapshotsPassed = results.snapshots?.passed || 0;
      // Jest's --json output writes a top-level `startTime` but no top-level
      // `endTime`; the per-suite entries in `testResults[]` carry both. Derive
      // the run's wall-clock as the span from the earliest start to the latest
      // suite end. Fall back to a top-level `endTime` if a future Jest adds one.
      const suites_ = results.testResults || [];
      const suiteEnds = suites_.map((s) => s.endTime).filter(Boolean);
      const suiteStarts = suites_.map((s) => s.startTime).filter(Boolean);
      const begin = Math.min(
        ...[results.startTime, ...suiteStarts].filter(Boolean),
      );
      const finish = results.endTime || (suiteEnds.length ? Math.max(...suiteEnds) : 0);
      const time = begin && finish && finish > begin ? finish - begin : 0;
      // Track the global window so we can also report wall-clock (packages run
      // in parallel under wireit, so wall-clock < sum of per-package times).
      if (time > 0) {
        wallBegin = Math.min(wallBegin, begin);
        wallFinish = Math.max(wallFinish, finish);
      }

      totalSuites += suites;
      totalPassed += passed;
      totalFailed += failed;
      totalPending += pending;
      totalTests += tests;
      totalSnapshots += snapshots;
      totalSnapshotsPassed += snapshotsPassed;
      totalTime += time;

      if (tests > 0) {
        packageResults.push({
          name: pkg,
          suites,
          passed,
          failed,
          pending,
          tests,
          snapshots,
          snapshotsPassed,
          time,
        });
      }
    } catch (e) {
      // Ignore parse errors or missing files
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
    const status = result.failed > 0 ? '❌' : '✅';
    output(
      `${status} ${result.name.padEnd(30)} ${result.passed}/${result.tests} passed (${(result.time / 1000).toFixed(1)}s)`,
    );
  });

  output('-'.repeat(70));

  // Overall summary
  const status = totalFailed > 0 ? '❌' : '✅';
  output(`${status} Test Suites: ${totalSuites} total`);
  output(
    `   Tests:       ${totalPassed} passed, ${totalFailed} failed, ${totalPending} pending (${totalTests} total)`,
  );
  if (totalSnapshots > 0) {
    output(`   Snapshots:   ${totalSnapshotsPassed}/${totalSnapshots} passed`);
  }
  // Wall-clock = the global span across packages. It's only meaningful when
  // every package's result file comes from the SAME run (overlapping windows).
  // If packages were run separately, the span includes idle gaps between runs
  // and exceeds the cumulative in-test time — in that case the figure is a lie,
  // so report the gap instead of a bogus wall-clock.
  const wallTime = wallFinish > wallBegin ? wallFinish - wallBegin : 0;
  if (wallTime > 0 && wallTime <= totalTime) {
    output(
      `   Time:        ${(totalTime / 1000).toFixed(1)}s in tests, ` +
        `${(wallTime / 1000).toFixed(1)}s wall-clock`,
    );
  } else {
    output(`   Time:        ${(totalTime / 1000).toFixed(1)}s in tests`);
    output(
      '   Note:        results span multiple runs; wall-clock unavailable. ' +
        'Run `npm test` once for all packages to get it.',
    );
  }
} else {
  output('No test results found. Run tests first.');
}

output('='.repeat(70) + '\n');

// Exit with error code if any tests failed
process.exit(totalFailed > 0 ? 1 : 0);
