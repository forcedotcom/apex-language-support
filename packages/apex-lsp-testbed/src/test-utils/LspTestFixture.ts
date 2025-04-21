/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';

import { ApexJsonRpcClient } from '../client/ApexJsonRpcClient';
import {
  RequestResponseCapturingMiddleware,
  RequestResponsePair,
} from './RequestResponseCapturingMiddleware';

export interface LspTestStep {
  description: string;
  method: string;
  params: any;
  // Optional expected result for direct assertion
  expectedResult?: any;
}

export interface LspTestScript {
  name: string;
  description: string;
  setup?: {
    workspaceRoot?: string;
    serverOptions?: Record<string, any>;
    initializeParams?: Record<string, any>;
  };
  steps: LspTestStep[];
}

export interface LspTestResult {
  name: string;
  success: boolean;
  duration: number;
  steps: {
    description: string;
    success: boolean;
    requestResponsePair?: RequestResponsePair;
    error?: Error;
  }[];
}

/**
 * A fixture for running LSP tests with middleware capturing requests and responses
 */
export class LspTestFixture {
  private client: ApexJsonRpcClient;
  private middleware: RequestResponseCapturingMiddleware;
  private snapshotDir: string;
  private updateSnapshots: boolean;

  /**
   * Create a new LSP test fixture
   * @param serverPath Path to the LSP server to spawn
   * @param options Options for the fixture
   */
  constructor(
    serverPath: string,
    options: {
      snapshotDir?: string;
      updateSnapshots?: boolean;
      serverArgs?: string[];
    } = {},
  ) {
    this.client = new ApexJsonRpcClient({
      serverPath,
      serverArgs: options.serverArgs || [],
    });

    this.middleware = new RequestResponseCapturingMiddleware();
    this.snapshotDir =
      options.snapshotDir || path.join(process.cwd(), '__snapshots__');
    this.updateSnapshots = options.updateSnapshots || false;

    // Create snapshot directory if it doesn't exist
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  /**
   * Setup the fixture before running tests
   */
  public async setup(): Promise<void> {
    await this.client.start();

    // Install middleware after client is started
    if (this.client.getConnection()) {
      this.middleware.install(this.client.getConnection());
    } else {
      throw new Error('Client connection not available');
    }
  }

  /**
   * Teardown the fixture after running tests
   */
  public async teardown(): Promise<void> {
    this.middleware.uninstall();
    await this.client.stop();
  }

  /**
   * Run a test script and capture results
   * @param script The test script to run
   */
  public async runScript(script: LspTestScript): Promise<LspTestResult> {
    console.log(`Running test: ${script.name}`);
    const startTime = Date.now();

    // Clear middleware for fresh test
    this.middleware.clearCapturedRequests();

    const result: LspTestResult = {
      name: script.name,
      success: true,
      duration: 0,
      steps: [],
    };

    try {
      // Execute each step in sequence
      for (const step of script.steps) {
        console.log(`  Step: ${step.description}`);
        const stepResult = await this.executeTestStep(step);
        result.steps.push(stepResult);

        // If any step fails, mark the entire test as failed
        if (!stepResult.success) {
          result.success = false;
        }
      }

      // Create or verify snapshot
      await this.handleSnapshot(
        script.name,
        this.middleware.getCapturedRequests(),
      );
    } catch (error) {
      result.success = false;
      console.error(`Error running test script ${script.name}:`, error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute a single test step
   * @param step The test step to execute
   */
  private async executeTestStep(
    step: LspTestStep,
  ): Promise<LspTestResult['steps'][0]> {
    try {
      // Send the request via the client
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await this.client.sendRequest(step.method, step.params);

      // Get the captured request-response pair
      const pair = this.middleware.getLastCapturedRequest();

      // If there's an expected result, compare it
      if (step.expectedResult && pair?.response) {
        const matches = this.compareResults(pair.response, step.expectedResult);
        return {
          description: step.description,
          success: matches,
          requestResponsePair: pair,
          error: matches
            ? undefined
            : new Error('Response did not match expected result'),
        };
      }

      return {
        description: step.description,
        success: true,
        requestResponsePair: pair,
      };
    } catch (error) {
      return {
        description: step.description,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Compare actual result with expected result
   * Supports partial matching where expected is a subset of actual
   */
  private compareResults(actual: any, expected: any): boolean {
    if (expected === null || expected === undefined) {
      return actual === expected;
    }

    if (typeof expected !== 'object') {
      return expected === actual;
    }

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length < expected.length) {
        return false;
      }

      return expected.every((item, index) =>
        this.compareResults(actual[index], item),
      );
    }

    // For objects, every key in expected must exist in actual with matching values
    return Object.keys(expected).every(
      (key) =>
        Object.prototype.hasOwnProperty.call(actual, key) &&
        this.compareResults(actual[key], expected[key]),
    );
  }

  /**
   * Handle snapshot creation or verification
   * @param testName The name of the test
   * @param capturedRequests The captured request-response pairs
   */
  private async handleSnapshot(
    testName: string,
    capturedRequests: RequestResponsePair[],
  ): Promise<void> {
    const sanitizedName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const snapshotPath = path.join(
      this.snapshotDir,
      `${sanitizedName}.snapshoton`,
    );

    // Prepare the snapshot data
    const snapshotData = {
      testName,
      timestamp: new Date().toISOString(),
      capturedRequests,
    };

    if (this.updateSnapshots || !fs.existsSync(snapshotPath)) {
      // Create or update the snapshot
      fs.writeFileSync(
        snapshotPath,
        JSON.stringify(snapshotData, null, 2),
        'utf8',
      );
      console.log(`  Created/updated snapshot: ${snapshotPath}`);
    } else {
      // Verify against existing snapshot
      const existingSnapshot = JSON.parse(
        fs.readFileSync(snapshotPath, 'utf8'),
      );

      // Compare captured requests with snapshot
      // This is a simplified comparison - you may need more sophisticated comparison
      const currentRequests = capturedRequests.map((req) => ({
        method: req.method,
        request: req.request,
        response: req.response,
        error: req.error,
      }));

      const snapshotRequests = existingSnapshot.capturedRequests.map((req) => ({
        method: req.method,
        request: req.request,
        response: req.response,
        error: req.error,
      }));

      const equal =
        JSON.stringify(currentRequests) === JSON.stringify(snapshotRequests);
      if (!equal) {
        console.error('  Snapshot comparison failed!');
        throw new Error(`Snapshot verification failed for test: ${testName}`);
      } else {
        console.log('  Snapshot verification passed');
      }
    }
  }
}
