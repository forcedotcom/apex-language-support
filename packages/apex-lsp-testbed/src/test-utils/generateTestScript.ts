/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import { LspTestScript, LspTestStep } from './LspTestFixture';
import { RequestResponsePair } from './RequestResponseCapturingMiddleware';

interface GenerateScriptOptions {
  /**
   * Test script name
   */
  name: string;

  /**
   * Test script description
   */
  description: string;

  /**
   * Captured request/response pairs to convert to script steps
   */
  capturedRequests: RequestResponsePair[];

  /**
   * Root URI to use for the workspace
   */
  rootUri?: string;

  /**
   * Output file path for the generated script
   */
  outputFile: string;

  /**
   * Whether to include response as expected result in the steps
   */
  includeResponses?: boolean;

  /**
   * Additional setup options to include
   */
  setupOptions?: LspTestScript['setup'];
}

/**
 * Generate a test script from captured LSP requests
 * This is useful for creating new test scripts based on actual LSP interactions
 */
export function generateTestScript(options: GenerateScriptOptions): void {
  const steps: LspTestStep[] = [];

  // Process captured requests into test steps
  for (const request of options.capturedRequests) {
    const step: LspTestStep = {
      description: `${request.method} request`,
      method: request.method,
      params: request.request,
    };

    // Add response if requested
    if (options.includeResponses && request.response) {
      step.expectedResult = request.response;
    }

    steps.push(step);
  }

  // Create script object
  const script: LspTestScript = {
    name: options.name,
    description: options.description,
    setup: options.setupOptions || {
      workspaceRoot: options.rootUri || 'test-artifacts/sample-project',
    },
    steps,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(options.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write script to file
  fs.writeFileSync(options.outputFile, JSON.stringify(script, null, 2), 'utf8');

  console.log(`Test script generated: ${options.outputFile}`);
}

/**
 * Command line script to generate a test script from captured requests
 * Expected JSON format should match RequestResponsePair[]
 */
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node generateTestScript.js <input-file> <output-file> <script-name> [script-description]');
    process.exit(1);
  }

  const [inputFile, outputFile, scriptName] = args;
  const scriptDescription = args[3] || `Generated test script for ${scriptName}`;

  try {
    // Read input file
    const capturedRequests: RequestResponsePair[] = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    // Generate script
    generateTestScript({
      name: scriptName,
      description: scriptDescription,
      capturedRequests,
      outputFile,
      includeResponses: true,
    });
  } catch (error) {
    console.error('Error generating test script:', error);
    process.exit(1);
  }
}
