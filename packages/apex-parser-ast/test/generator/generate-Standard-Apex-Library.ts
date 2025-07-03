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
import { TestLogger } from '../utils/testLogger';

describe.skip('Standard Apex Library Generation', () => {
  // Set up debug logging for all tests in this suite
  const logger = TestLogger.getInstance();
  logger.setLogLevel('debug');

  it('should generate the Standard Apex Library', async () => {
    const sourceDir = path.join(
      __dirname,
      '../../src/resources/StandardApexLibrary',
    );
    const outputDir = path.join(
      __dirname,
      '../../out/resources/StandardApexLibrary',
    );

    logger.info('Generating Standard Apex Library...');
    logger.info(`Source directory: ${sourceDir}`);
    logger.info(`Output directory: ${outputDir}`);

    // Use compileStubs to process all files
    await compileStubs(null, sourceDir, outputDir);

    // Read the compilation summary
    const summaryPath = path.join(outputDir, 'compilation-summary.json');
    if (!fs.existsSync(summaryPath)) {
      throw new Error(
        `Compilation summary not found at ${summaryPath}. ` +
          'This might indicate that the compilation process failed before generating the summary.',
      );
    }
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

    logger.info('\nCompilation Summary:');
    logger.info(`Total files: ${summary.total}`);
    logger.info(`Successful: ${summary.successful}`);
    logger.info(`Failed: ${summary.failed}`);

    // Verify the results
    if (summary.failed !== 0) {
      const errorDetails = summary.errors
        .map((err: any) => `File: ${err.file}\nError: ${err.error}`)
        .join('\n\n');
      throw new Error(
        `Expected no failures but got ${summary.failed} errors:\n\n${errorDetails}`,
      );
    }

    if (summary.successful === 0) {
      throw new Error(
        'Expected at least one successful compilation but got 0. ' +
          'This might indicate that no files were processed or all files failed.',
      );
    }

    if (summary.total === 0) {
      throw new Error(
        'Expected at least one file to be processed but got 0. ' +
          'This might indicate that no files were found in the source directory.',
      );
    }
  });
});
