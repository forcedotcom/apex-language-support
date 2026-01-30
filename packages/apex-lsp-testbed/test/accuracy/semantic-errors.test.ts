/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

// Import the test utils
import {
  createTestServer,
  ServerOptions,
} from '../../src/test-utils/serverFactory';
import { ServerType } from '../../src/utils/serverUtils';

jest.setTimeout(180_000); // Increased timeout for server operations

// Add global error handlers to catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

/**
 * Normalize a file URI to be workspace-relative for snapshots
 * This makes snapshots portable across different environments
 */
function normalizeUriForSnapshot(
  uri: string,
  workspaceRootUri: string,
): string {
  // Extract the file path from the URI
  const filePath = uri.replace(/^file:\/\//, '');
  const workspacePath = workspaceRootUri.replace(/^file:\/\//, '');

  // Make path relative to workspace
  if (filePath.startsWith(workspacePath)) {
    const relativePath = filePath.substring(workspacePath.length);
    // Normalize to use forward slashes and remove leading slash
    return `file:///workspace${relativePath.replace(/\\/g, '/')}`;
  }

  // If not relative to workspace, return as-is (shouldn't happen in tests)
  return uri;
}

/**
 * Filter diagnostics to only include those relevant to the requested file
 * This prevents cross-file diagnostics from appearing in snapshots
 */
function filterDiagnosticsForFile(response: any, requestedUri: string): any {
  if (!response || !response.items || !Array.isArray(response.items)) {
    return response;
  }

  // Extract the file path from the requested URI (normalize for cross-platform)
  const requestedPath = requestedUri
    .replace(/^file:\/\//, '')
    .replace(/\\/g, '/') // Normalize Windows backslashes
    .toLowerCase();

  // Extract the class name from the file path for matching
  const fileName = requestedPath
    .split('/')
    .pop()
    ?.replace(/\.cls$/, '')
    .toLowerCase();

  // Filter diagnostics to only include those for the requested file
  const filteredItems = response.items.filter((item: any) => {
    // Include diagnostics that have relatedInformation pointing to the requested file
    if (item.relatedInformation && Array.isArray(item.relatedInformation)) {
      const hasRelatedToRequestedFile = item.relatedInformation.some(
        (related: any) => {
          const relatedPath = related.location?.uri
            ?.replace(/^file:\/\//, '')
            .replace(/\\/g, '/') // Normalize Windows backslashes
            .toLowerCase();
          return relatedPath === requestedPath;
        },
      );
      if (hasRelatedToRequestedFile) {
        return true;
      }
    }

    // Include diagnostics that don't have relatedInformation (file-level errors)
    // But exclude workspace-level warnings like CIRCULAR_DEPENDENCY that aren't file-specific
    if (!item.relatedInformation || item.relatedInformation.length === 0) {
      // For CIRCULAR_DEPENDENCY warnings, only include if they mention the current file's class
      if (item.severity === 2 && item.code === 'CIRCULAR_DEPENDENCY') {
        if (fileName && item.message?.toLowerCase().includes(fileName)) {
          return true;
        }
        return false;
      }
      // Include all other diagnostics (errors and warnings) - they should be file-specific
      // The LSP diagnostic handler returns diagnostics for the specific file URI,
      // so all diagnostics should be relevant to the requested file
      return true;
    }

    // Exclude diagnostics with relatedInformation that doesn't point to requested file
    return false;
  });

  return {
    ...response,
    items: filteredItems,
  };
}

/**
 * Recursively normalize all URIs in a diagnostic response object
 * This ensures snapshots are portable across different environments
 */
function normalizeResponseUris(obj: any, workspaceRootUri: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // If it's a URI string, normalize it
    if (obj.startsWith('file://')) {
      return normalizeUriForSnapshot(obj, workspaceRootUri);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeResponseUris(item, workspaceRootUri));
  }

  if (typeof obj === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      normalized[key] = normalizeResponseUris(value, workspaceRootUri);
    }
    return normalized;
  }

  return obj;
}

// Skip semantic error tests on Windows due to platform-specific differences in error detection
const isWindows = platform() === 'win32';
const testSuite = isWindows ? describe.skip : describe;

testSuite('Semantic Error Detection', () => {
  const targetServer: ServerType = 'nodeServer';
  let serverContext: Awaited<ReturnType<typeof createTestServer>>;
  const workspacePath = join(__dirname, '../fixtures/i-have-problems');
  const classesDir = join(workspacePath, 'force-app/main/default/classes');

  beforeAll(async () => {
    // Skip setup on Windows to prevent server startup and worker leaks
    if (isWindows) {
      return;
    }
    const options: ServerOptions = {
      serverType: targetServer,
      verbose: false,
      workspacePath: resolve(workspacePath),
    };

    // Add timeout to server startup
    const serverPromise = createTestServer(options);
    let timeoutId: NodeJS.Timeout | undefined = undefined;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Server startup timeout')),
        120000,
      );
    });

    serverContext = (await Promise.race([
      serverPromise,
      timeoutPromise,
    ])) as Awaited<ReturnType<typeof createTestServer>>;

    // Clear the timeout if server started successfully
    if (timeoutId) clearTimeout(timeoutId);

    // Give the server a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Skip cleanup on Windows to prevent any execution
    if (isWindows) {
      return;
    }

    if (serverContext) {
      try {
        await serverContext.cleanup();
      } catch (error) {
        console.warn(`Cleanup failed: ${error}`);
      }
    }

    // Give some time for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Force cleanup any remaining processes
    try {
      const { execSync } = require('child_process');
      try {
        execSync('pkill -f "apex-ls"', { stdio: 'ignore' });
      } catch (_error) {
        // Silently ignore if no processes to kill
      }
    } catch (error) {
      console.warn('Failed to force cleanup processes:', error);
    }
  });

  // Get all class files
  const classFiles = readdirSync(classesDir)
    .filter((file) => file.endsWith('.cls'))
    .sort();

  // Define cross-file dependencies - files that must be opened before others
  const dependencies: Record<string, string[]> = {
    ClassHierarchyIssue: ['FinalBaseClass'],
  };

  // Open dependencies first
  const openedFiles = new Set<string>();

  /**
   * Open a class file and its dependencies
   */
  async function openClassFile(className: string): Promise<void> {
    // Open dependencies first
    const deps = dependencies[className] || [];
    for (const dep of deps) {
      if (!openedFiles.has(dep)) {
        await openClassFile(dep);
      }
    }

    // Open the file itself
    if (!openedFiles.has(className)) {
      const filePath = join(classesDir, `${className}.cls`);
      const content = readFileSync(filePath, 'utf8');
      const uri = `file://${filePath}`;

      try {
        await serverContext.client.openTextDocument(uri, content, 'apex');
        openedFiles.add(className);

        // Give the server time to process the document and add it to symbol manager
        // This is important for cross-file validation (e.g., ClassHierarchyIssue needs FinalBaseClass)
        // Wait longer to ensure document is fully processed and symbols are indexed
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Also wait a bit after opening before requesting diagnostics
        // This ensures the document is fully processed
      } catch (error) {
        console.warn(`Failed to open ${className}: ${error}`);
        throw error;
      }
    }
  }

  // Test each class file
  describe.each(classFiles)('Class: %s', (className) => {
    const baseName = className.replace('.cls', '');

    it(`should detect semantic errors in ${baseName}`, async () => {
      // Check if server is still healthy
      if (!(await serverContext.client.isHealthy())) {
        throw new Error('Server is not healthy, cannot send request');
      }

      // Open the document and its dependencies
      await openClassFile(baseName);

      const filePath = join(classesDir, className);
      const uri = `file://${filePath}`;

      // Wait a bit more after opening to ensure all documents are processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Request diagnostics
      let diagnosticResponse;
      try {
        diagnosticResponse = await serverContext.client.sendRequest(
          'textDocument/diagnostic',
          {
            textDocument: { uri },
          },
        );
      } catch (error) {
        // Handle errors gracefully
        if (error instanceof Error && error.message.includes('EPIPE')) {
          console.error(`EPIPE error in test: ${error.message}`);
          diagnosticResponse = {
            error: `Server connection lost (EPIPE): ${error.message}`,
            type: 'connection_error',
          };
        } else {
          console.warn(`Request failed: ${error}`);
          diagnosticResponse = {
            error: error instanceof Error ? error.message : String(error),
            type: 'request_error',
          };
        }
      }

      // Normalize URI for snapshot
      const workspaceRootUri = serverContext.workspace?.rootUri || '';
      const normalizedUri = normalizeUriForSnapshot(uri, workspaceRootUri);

      // Filter diagnostics to only include those for the requested file
      // This prevents cross-file diagnostics from appearing in snapshots
      const filteredResponse = filterDiagnosticsForFile(
        diagnosticResponse,
        uri,
      );

      // Normalize all URIs in the response (including relatedInformation)
      const normalizedResponse = normalizeResponseUris(
        filteredResponse,
        workspaceRootUri,
      );

      const snapshotData = {
        request: {
          method: 'textDocument/diagnostic',
          params: {
            textDocument: { uri: normalizedUri },
          },
        },
        response: normalizedResponse,
      };

      expect(snapshotData).toMatchSnapshot(`${baseName}-diagnostics`);
    });
  });
});
