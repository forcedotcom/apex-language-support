/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';

import { LspTestFixture, LspTestScript, LspTestResult } from './LspTestFixture';

/**
 * Options for the LSP test runner
 */
export interface LspTestRunnerOptions {
  /**
   * Path to the server executable
   */
  serverPath: string;

  /**
   * Arguments to pass to the server
   */
  serverArgs?: string[];

  /**
   * Directory containing test scripts
   */
  scriptsDir: string;

  /**
   * Directory to store snapshots
   */
  snapshotDir?: string;

  /**
   * Whether to update snapshots instead of comparing
   */
  updateSnapshots?: boolean;

  /**
   * Pattern for script filenames to include
   */
  scriptPattern?: string;

  /**
   * Array of script names to run (if not provided, all scripts will be run)
   */
  scriptNames?: string[];

  /**
   * Whether to run tests in parallel (default: false)
   */
  parallel?: boolean;

  /**
   * Maximum number of parallel test runs (default: 1)
   */
  maxParallel?: number;

  /**
   * Output directory for test results
   */
  outputDir?: string;
}

/**
 * Summary of test run results
 */
export interface TestRunSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  results: LspTestResult[];
}

/**
 * Runner for executing LSP test scripts
 */
export class LspTestRunner {
  private options: LspTestRunnerOptions;
  private scripts: LspTestScript[] = [];

  /**
   * Create a new LSP test runner
   * @param options Configuration options for the test runner
   */
  constructor(options: LspTestRunnerOptions) {
    this.options = {
      scriptPattern: '*.lsp-teston',
      parallel: false,
      maxParallel: 1,
      ...options,
    };

    if (!this.options.serverPath) {
      throw new Error('Server path is required');
    }

    if (!this.options.scriptsDir) {
      throw new Error('Scripts directory is required');
    }

    // Create output directory if specified and it doesn't exist
    if (this.options.outputDir && !fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  /**
   * Load test scripts from the scripts directory
   */
  public loadScripts(): void {
    console.log(`Loading test scripts from ${this.options.scriptsDir}`);

    if (!fs.existsSync(this.options.scriptsDir)) {
      throw new Error(
        `Scripts directory does not exist: ${this.options.scriptsDir}`,
      );
    }

    const scriptFiles = fs
      .readdirSync(this.options.scriptsDir)
      .filter((file) => file.match(this.options.scriptPattern!));

    console.log(`Found ${scriptFiles.length} test script files`);

    for (const file of scriptFiles) {
      const scriptPath = path.join(this.options.scriptsDir, file);
      try {
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        const script = JSON.parse(scriptContent) as LspTestScript;

        // Filter by script names if provided
        if (
          !this.options.scriptNames ||
          this.options.scriptNames.includes(script.name)
        ) {
          this.scripts.push(script);
        }
      } catch (error) {
        console.error(`Error loading script ${file}:`, error);
      }
    }

    console.log(`Loaded ${this.scripts.length} test scripts`);
  }

  /**
   * Run all loaded test scripts
   */
  public async runTests(): Promise<TestRunSummary> {
    const startTime = Date.now();
    console.log(`Running ${this.scripts.length} LSP test scripts`);

    if (this.scripts.length === 0) {
      console.warn('No test scripts to run');
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        results: [],
      };
    }

    let results: LspTestResult[] = [];

    if (this.options.parallel && this.scripts.length > 1) {
      // Run tests in parallel with maximum concurrency
      const chunks = this.chunkArray(
        this.scripts,
        this.options.maxParallel || 1,
      );

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((script) => this.runSingleTest(script)),
        );
        results = results.concat(chunkResults);
      }
    } else {
      // Run tests sequentially
      for (const script of this.scripts) {
        const result = await this.runSingleTest(script);
        results.push(result);
      }
    }

    // Calculate summary
    const summary: TestRunSummary = {
      totalTests: this.scripts.length,
      passedTests: results.filter((r) => r.success).length,
      failedTests: results.filter((r) => !r.success).length,
      skippedTests: this.scripts.length - results.length,
      duration: Date.now() - startTime,
      results,
    };

    // Output results if directory specified
    if (this.options.outputDir) {
      const resultPath = path.join(
        this.options.outputDir,
        `test-results-${new Date().toISOString().replace(/:/g, '-')}on`,
      );
      fs.writeFileSync(resultPath, JSON.stringify(summary, null, 2), 'utf8');
      console.log(`Test results written to ${resultPath}`);
    }

    // Log summary
    console.log('\nTest Run Summary:');
    console.log(`Total: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Skipped: ${summary.skippedTests}`);
    console.log(`Duration: ${summary.duration}ms`);

    return summary;
  }

  /**
   * Run a single test script
   * @param script The test script to run
   */
  private async runSingleTest(script: LspTestScript): Promise<LspTestResult> {
    console.log(`\nRunning test: ${script.name}`);

    const fixture = new LspTestFixture(this.options.serverPath, {
      snapshotDir: this.options.snapshotDir,
      updateSnapshots: this.options.updateSnapshots,
      serverArgs: this.options.serverArgs,
    });

    try {
      await fixture.setup();
      const result = await fixture.runScript(script);
      return result;
    } catch (error) {
      console.error(`Error running test ${script.name}:`, error);
      return {
        name: script.name,
        success: false,
        duration: 0,
        steps: [],
      };
    } finally {
      await fixture.teardown();
    }
  }

  /**
   * Split an array into chunks for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
