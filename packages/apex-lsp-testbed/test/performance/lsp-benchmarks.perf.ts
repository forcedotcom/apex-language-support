/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unified LSP Performance Benchmarks
 *
 * This test file can benchmark any of the three LSP server implementations
 * by setting the SERVER_TYPE environment variable:
 *
 * Usage:
 *   # Default (nodeServer)
 *   npm test -- --testNamePattern="LSP Performance Benchmarks"
 *
 *   # Specific server types
 *   SERVER_TYPE=nodeServer npm test -- --testNamePattern="LSP Performance Benchmarks"
 *   SERVER_TYPE=jorje npm test -- --testNamePattern="LSP Performance Benchmarks"
 *   SERVER_TYPE=webServer npm test -- --testNamePattern="LSP Performance Benchmarks"
 *
 *   # CI mode (comprehensive benchmarks)
 *   CI=true SERVER_TYPE=nodeServer npm test -- --testNamePattern="LSP Performance Benchmarks"
 *
 * Features:
 *   - Runtime server type configuration
 *   - Environment-based timing (fast local vs comprehensive CI)
 *   - Stateful LSP workflow testing
 *   - Server-specific output files and configurations
 *   - Automatic skipping for problematic servers
 */

import { readFileSync } from 'fs';
import { join, basename } from 'path';

import Benchmark from 'benchmark';

import {
  createTestServer,
  ServerOptions,
} from '../../src/test-utils/serverFactory';

// --- Load test data synchronously ---
const logPath = join(__dirname, '../fixtures/ls-sample-trace.log.json');
const rawData = readFileSync(logPath, 'utf8');
const logData: Record<string, any> = JSON.parse(rawData);

jest.setTimeout(1000 * 60 * 10);

// Helper function to extract filename from URI
const getFilenameFromUri = (uri: string): string => {
  try {
    // Handle file:// URIs
    if (uri.startsWith('file://')) {
      const filePath = uri.replace('file://', '');
      return basename(filePath);
    }
    // Handle other URI schemes (http, https, etc.)
    const url = new URL(uri);
    const pathname = url.pathname;
    return basename(pathname) || 'unknown';
  } catch (_error) {
    // Fallback for malformed URIs
    return 'unknown';
  }
};

// Runtime server type configuration
const serverType = (process.env.SERVER_TYPE || 'nodeServer') as
  | 'nodeServer'
  | 'jorje'
  | 'webServer';
const isValidServerType = ['nodeServer', 'jorje', 'webServer'].includes(
  serverType,
);

if (!isValidServerType) {
  throw new Error(
    `Invalid SERVER_TYPE: ${serverType}. Must be one of: nodeServer, jorje, webServer`,
  );
}

// Server-specific configuration
const serverConfig = {
  nodeServer: {
    setupDelay: 5000,
    outputFile: 'nodeserver-benchmark-results.json',
    skipReason: null,
    implementedMethods: [
      'textDocument/documentSymbol',
      'textDocument/foldingRange',
      'textDocument/didOpen',
      'textDocument/didSave',
      'textDocument/didChange',
      'textDocument/didClose',
      'apexlib/resolve',
    ],
  },
  jorje: {
    setupDelay: 5000,
    outputFile: 'jorje-benchmark-results.json',
    skipReason: null,
    implementedMethods: [
      'textDocument/documentSymbol',
      'textDocument/foldingRange',
      'textDocument/didOpen',
      'textDocument/didSave',
      'textDocument/didChange',
      'textDocument/didClose',
    ],
  },
  webServer: {
    setupDelay: 10000, // WebServer needs more time
    outputFile: 'webserver-benchmark-results.json',
    skipReason: 'Known issue with WebServer connection headers',
    implementedMethods: [
      'textDocument/documentSymbol',
      'textDocument/foldingRange',
      'textDocument/didOpen',
      'textDocument/didSave',
      'textDocument/didChange',
      'textDocument/didClose',
    ],
  },
};

console.log(`Running benchmarks for server type: ${serverType}`);

const currentConfig = serverConfig[serverType];
const shouldSkip = currentConfig.skipReason !== null;

// Extract relevant request/response pairs - only include implemented LSP methods
const implementedMethods = currentConfig.implementedMethods;

// Categorize methods by LSP protocol type
const requestMethods = [
  'textDocument/documentSymbol',
  'textDocument/foldingRange',
  'apexlib/resolve',
];

const notificationMethods = [
  'textDocument/didOpen',
  'textDocument/didSave',
  'textDocument/didChange',
  'textDocument/didClose',
];

// Define the logical order for stateful LSP operations (IDE workflow)
const methodOrder = [
  'textDocument/didOpen', // User opens a file
  'textDocument/documentSymbol', // Editor requests symbols
  'textDocument/foldingRange', // Editor requests folding ranges
  'textDocument/didChange', // User makes changes
  'textDocument/didSave', // User saves the file
  'textDocument/didClose', // User closes the file
  'apexlib/resolve', // Custom resolver (can occur at various points)
];

// Group requests by document URI to maintain proper state
const requestsByDocument = new Map<string, any[]>();

const allRequests = Object.values(logData);
const relevantEntries = allRequests.filter(
  (entry) =>
    (entry.type === 'request' || entry.type === 'notification') &&
    implementedMethods.includes(entry.method),
);
console.log(
  `Found ${relevantEntries.length} relevant LSP entries for ${serverType}`,
);

relevantEntries.forEach((request) => {
  const uri =
    request.params?.textDocument?.uri || request.params?.uri || 'unknown';
  if (!requestsByDocument.has(uri)) {
    requestsByDocument.set(uri, []);
  }
  requestsByDocument.get(uri)!.push(request);
});

// Create ordered test data - one complete file operation set
// Structure: Map<URI, Array<[method, request]>>
const fileOperationSets = new Map<string, [string, any][]>();

// Debug: Log what we found in the trace file (reduced output)
console.log(`Total document URIs found: ${requestsByDocument.size}`);

// Build complete operation sets for each URI
for (const [uri, requests] of requestsByDocument) {
  const operationSet: [string, any][] = [];

  // Build operations in logical order for this URI
  for (const method of methodOrder) {
    if (implementedMethods.includes(method)) {
      const request = requests.find((r) => r.method === method);
      if (request) {
        operationSet.push([method, request]);
      }
    }
  }

  // Include URIs with at least one operation
  if (operationSet.length > 0) {
    fileOperationSets.set(uri, operationSet);
  }
}

// Select the best URI (most complete operation set)
let selectedUri: string | null = null;
let maxOperationsCount = 0;

for (const [uri, operationSet] of fileOperationSets) {
  if (operationSet.length > maxOperationsCount) {
    maxOperationsCount = operationSet.length;
    selectedUri = uri;
  }
}

// Use the selected URI's operation set
const testData: [string, any][] = selectedUri
  ? fileOperationSets.get(selectedUri)!
  : [];

if (selectedUri) {
  console.log(`Selected URI: ${selectedUri}`);
  console.log(
    `Operations available: ${testData.map(([method]) => method).join(', ')}`,
  );
  console.log(`Total operations: ${testData.length}`);

  // Log file size info from the first operation
  if (testData.length > 0) {
    const firstRequest = testData[0][1];
    const textContent = firstRequest.params?.textDocument?.text;
    if (textContent) {
      console.log(`File size: ${textContent.length} characters`);
    }
  }
} else {
  console.warn('No suitable document URI found with multiple operations');
}

const describeMethod = shouldSkip ? describe.skip : describe.only;
const testTitle = `${serverType.charAt(0).toUpperCase() + serverType.slice(1)} LSP Performance Benchmarks`;

describeMethod(testTitle, () => {
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    if (shouldSkip) {
      console.log(`Skipping ${serverType}: ${currentConfig.skipReason}`);
      return;
    }

    const options: ServerOptions = {
      serverType,
      verbose: true,
      workspacePath: 'https://github.com/trailheadapps/dreamhouse-lwc.git',
    };
    serverContext = await createTestServer(options);

    // Wait for server to be ready (server-specific timing)
    await new Promise((resolve) =>
      setTimeout(resolve, currentConfig.setupDelay),
    );
  });

  afterAll(async () => {
    if (serverContext) {
      await serverContext.cleanup();
      // Add a small delay to ensure cleanup completes
      const cleanupDelay = serverType === 'webServer' ? 5000 : 1000;
      await new Promise((resolve) => setTimeout(resolve, cleanupDelay));
    }
  });

  const testMethod = shouldSkip ? it.skip : it;

  testMethod(
    `should benchmark ${serverType} LSP request handling`,
    async () => {
      const suite = new Benchmark.Suite();
      const requestTimeout = 2_000; // 2 second timeout per request
      const results: Record<string, Benchmark.Target> = {};

      // Ensure client is started
      if (!serverContext.client._isRunning) {
        await serverContext.client.start();
      }

      if (testData.length === 0) {
        throw new Error('No test data found');
      }

      // Fast validation settings (use longer times in CI/CD)
      const isCI = process.env.CI === 'true';
      const workflowSettings = isCI
        ? { maxTime: 30, minTime: 10, minSamples: 3, initCount: 1 } // CI settings
        : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 }; // Local settings

      console.log(
        `Benchmark mode: ${isCI ? 'CI (comprehensive)' : 'Local (fast validation)'}`,
      );
      console.log(
        `Settings: maxTime=${workflowSettings.maxTime}s, minSamples=${workflowSettings.minSamples}`,
      );

      // Add benchmark for complete LSP workflow (stateful sequence)
      suite.add(`${serverType} LSP Complete Workflow`, {
        defer: true,
        ...workflowSettings,
        fn: function (deferred: { resolve: () => void }) {
          const executeWorkflow = async () => {
            // Execute all requests in the stateful order
            for (const [method, request] of testData) {
              try {
                if (requestMethods.includes(method)) {
                  // Send as request (expects response) - with timeout
                  const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(
                      () =>
                        reject(
                          new Error(
                            `Request ${method} timed out after ${requestTimeout}ms`,
                          ),
                        ),
                      requestTimeout,
                    );
                  });

                  const req = serverContext.client.sendRequest(
                    method,
                    request.params,
                  );
                  await Promise.race([req, timeoutPromise]);
                } else if (notificationMethods.includes(method)) {
                  // Send as notification (no response expected) - no timeout needed
                  serverContext.client.sendNotification(method, request.params);
                  // Small delay to allow notification to be processed
                  await new Promise((resolve) => setTimeout(resolve, 200));
                }

                // Small delay between requests to allow server state to settle
                await new Promise((resolve) => setTimeout(resolve, 100));
              } catch (error) {
                console.error(`Error in ${method}:`, error);
                // Continue with next request even if one fails
              }
            }
          };

          executeWorkflow()
            .then(() => deferred.resolve())
            .catch((error) => {
              console.error('Error in complete workflow:', error);
              deferred.resolve(); // Resolve anyway to continue the benchmark
            });
        },
      });

      console.log(
        `Test Data: ${testData.length} operations: ${testData.map(([method]) => method).join(' → ')}`,
      );

      // Also add individual benchmarks for each method (with proper state setup)
      testData.forEach(([method, request]) => {
        // Capture method and request in closure to avoid variable sharing issues
        const benchmarkMethod = method;
        const benchmarkRequest = request;

        const individualSettings = isCI
          ? { maxTime: 60, minTime: 10, minSamples: 5, initCount: 1 } // CI settings
          : { maxTime: 8, minTime: 2, minSamples: 2, initCount: 1 }; // Local settings

        // Extract filename from URI for better benchmark naming
        const uri =
          benchmarkRequest.params?.textDocument?.uri ||
          benchmarkRequest.params?.uri ||
          'unknown';
        const filename = getFilenameFromUri(uri);

        suite.add(`${serverType} LSP ${benchmarkMethod} ${filename}`, {
          defer: true,
          ...individualSettings,
          fn: function (deferred: { resolve: () => void }) {
            const executeWithSetup = async () => {
              console.debug(
                `>>> INDIVIDUAL BENCHMARK STARTING: ${benchmarkMethod} (ID: ${benchmarkRequest.id})`,
              );

              // For stateful requests, ensure proper setup
              if (benchmarkMethod !== 'textDocument/didOpen') {
                console.debug(
                  `>>> Setting up didOpen for ${benchmarkMethod} benchmark`,
                );
                // Find and execute didOpen first to set up state
                const didOpenRequest = testData.find(
                  ([m]) => m === 'textDocument/didOpen',
                );
                if (didOpenRequest) {
                  try {
                    // didOpen is a notification, not a request
                    serverContext.client.sendNotification(
                      didOpenRequest[0],
                      didOpenRequest[1].params,
                    );
                    await new Promise((resolve) => setTimeout(resolve, 200));
                  } catch (error) {
                    console.error('Error in setup didOpen:', error);
                  }
                }
              }

              // Execute the actual request or notification
              const methodType = requestMethods.includes(benchmarkMethod)
                ? 'REQUEST'
                : 'NOTIFICATION';
              console.debug(
                `>>> EXECUTING ACTUAL METHOD: ${benchmarkMethod} (Type: ${methodType})`,
              );
              if (requestMethods.includes(benchmarkMethod)) {
                // Send as request (expects response) - with timeout
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () =>
                      reject(
                        new Error(
                          `Request timed out after ${requestTimeout}ms`,
                        ),
                      ),
                    requestTimeout,
                  );
                });

                const req = serverContext.client.sendRequest(
                  benchmarkMethod,
                  benchmarkRequest.params,
                );
                await Promise.race([req, timeoutPromise]);

                // Log successful request completion
                console.debug(
                  `>>> ${benchmarkMethod} REQUEST completed successfully`,
                );
              } else if (notificationMethods.includes(benchmarkMethod)) {
                // Send as notification (no response expected) - no timeout needed
                serverContext.client.sendNotification(
                  benchmarkMethod,
                  benchmarkRequest.params,
                );
                // Small delay to allow notification to be processed
                await new Promise((resolve) => setTimeout(resolve, 200));
                console.debug(
                  `>>> ${benchmarkMethod} NOTIFICATION completed successfully`,
                );
              }
            };

            executeWithSetup()
              .then(() => deferred.resolve())
              .catch((error) => {
                console.error(`Error in ${benchmarkMethod}:`, error);
                deferred.resolve(); // Resolve anyway to continue the benchmark
              });
          },
        });
      });

      return new Promise<void>((resolve) => {
        suite
          .on('cycle', function (event: Benchmark.Event) {
            const benchmark = event.target as Benchmark.Target;
            if (benchmark.name) {
              results[benchmark.name] = benchmark;
            }
            console.log(String(benchmark));
          })
          .on('complete', function (this: Benchmark.Suite) {
            console.log(
              `Fastest ${serverType} method is ` +
                this.filter('fastest').map('name'),
            );

            // Write results to disk with server-specific filename
            const outputPath = join(
              __dirname,
              `../${currentConfig.outputFile}`,
            );

            require('fs').writeFileSync(
              outputPath,
              JSON.stringify(results, null, 2),
            );
            resolve();
          })
          .run({ async: true });
      });
    },
  );
});
