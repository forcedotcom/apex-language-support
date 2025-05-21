/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { compileStubs } from '../../src/generator/compileStubs';

describe('Standard Apex Library Generation', () => {
  it('should generate the Standard Apex Library', async () => {
    const sourceDir = path.join(
      __dirname,
      '../../src/resources/StandardApexLibrary',
    );
    const outputDir = path.join(
      __dirname,
      '../../dist/resources/StandardApexLibrary',
    );

    console.log('Generating Standard Apex Library...');
    console.log(`Source directory: ${sourceDir}`);
    console.log(`Output directory: ${outputDir}`);

    // Use compileStubs to process all files
    await compileStubs(null, sourceDir, outputDir);

    // Read the compilation summary
    const summaryPath = path.join(outputDir, 'compilation-summary.json');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    console.log('\nCompilation Summary:');
    console.log(`Total files: ${summary.total}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);

    // Verify the results
    expect(summary.failed).toBe(0);
    expect(summary.successful).toBeGreaterThan(0);
    expect(summary.total).toBeGreaterThan(0);
  });
});
