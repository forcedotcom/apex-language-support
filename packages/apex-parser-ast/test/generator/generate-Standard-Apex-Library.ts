/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { LogLevel } from '@salesforce/apex-lsp-logging';

import { compileStubs } from '../../src/generator/compileStubs';
import { TestLogger } from '../utils/testLogger';

describe('Standard Apex Library Generation', () => {
  // Set up debug logging for all tests in this suite
  const logger = TestLogger.getInstance();
  logger.setLogLevel(LogLevel.Debug);

  it('should generate the Standard Apex Library', async () => {
    const sourceDir = path.join(
      __dirname,
      '../../src/resources/StandardApexLibrary',
    );
    const outputDir = path.join(
      __dirname,
      '../../dist/resources/StandardApexLibrary',
    );

    logger.info('Generating Standard Apex Library...');
    logger.info(`Source directory: ${sourceDir}`);
    logger.info(`Output directory: ${outputDir}`);

    // Use compileStubs to process all files
    await compileStubs(null, sourceDir, outputDir);

    // Read the compilation summary
    const summaryPath = path.join(outputDir, 'compilation-summary.json');
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    logger.info('\nCompilation Summary:');
    logger.info(`Total files: ${summary.total}`);
    logger.info(`Successful: ${summary.successful}`);
    logger.info(`Failed: ${summary.failed}`);

    // Verify the results
    expect(summary.failed).toBe(0);
    expect(summary.successful).toBeGreaterThan(0);
    expect(summary.total).toBeGreaterThan(0);
  });
});
