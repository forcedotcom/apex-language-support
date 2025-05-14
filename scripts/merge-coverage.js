/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Function to get all coverage reports from packages
function getPackageCoverageFiles() {
  const packagesDir = path.join(rootDir, 'packages');
  const packages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const coverageFiles = [];
  const missingCoverage = [];

  for (const pkg of packages) {
    const coverageFile = path.join(
      packagesDir,
      pkg,
      'coverage',
      'coverage-final.json',
    );
    if (fs.existsSync(coverageFile)) {
      coverageFiles.push(coverageFile);
    } else {
      // Check if package has tests
      const testDir = path.join(packagesDir, pkg, 'test');
      if (fs.existsSync(testDir)) {
        missingCoverage.push(pkg);
      }
    }
  }

  if (missingCoverage.length > 0) {
    console.warn(
      `Warning: The following packages have tests but no coverage reports: ${missingCoverage.join(
        ', ',
      )}`,
    );
  }

  return coverageFiles;
}

// Function to merge coverage reports
function mergeCoverageReports(coverageFiles) {
  if (coverageFiles.length === 0) {
    console.error('No coverage files found.');
    return null;
  }

  console.log(`Merging ${coverageFiles.length} coverage reports...`);

  // Load the istanbul-lib-coverage package for merging
  const { createCoverageMap } = require('istanbul-lib-coverage');
  const coverageMap = createCoverageMap({});

  // Merge all coverage reports
  for (const file of coverageFiles) {
    console.log(`Processing ${file}`);
    try {
      const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
      coverageMap.merge(coverage);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  return coverageMap;
}

// Function to output the merged coverage report
function outputMergedReport(coverageMap) {
  if (!coverageMap) {
    process.exit(1);
  }

  // Ensure coverage directory exists
  const coverageDir = path.join(rootDir, 'coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Output merged JSON coverage
  const mergedCoverageFile = path.join(coverageDir, 'coverage-final.json');
  fs.writeFileSync(
    mergedCoverageFile,
    JSON.stringify(coverageMap.toJSON()),
    'utf8',
  );
  console.log(`Merged coverage written to ${mergedCoverageFile}`);

  // Generate additional report formats using istanbul-reports
  const { createContext } = require('istanbul-lib-report');
  const reports = require('istanbul-reports');

  const context = createContext({
    dir: coverageDir,
    coverageMap,
  });

  // Generate HTML report
  reports.create('html').execute(context);

  // Generate LCOV report
  reports.create('lcov').execute(context);

  // Generate text summary
  const textSummary = reports.create('text-summary');
  textSummary.execute(context);

  console.log('All reports generated successfully.');
}

// Main execution
const coverageFiles = getPackageCoverageFiles();
const coverageMap = mergeCoverageReports(coverageFiles);
outputMergedReport(coverageMap);
