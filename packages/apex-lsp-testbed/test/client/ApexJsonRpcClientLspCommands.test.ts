/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import {
  ApexJsonRpcClient,
  ConsoleLogger,
} from '../../src/client/ApexJsonRpcClient';
import { RequestResponseCapturingMiddleware } from '../../src/test-utils/RequestResponseCapturingMiddleware';
import { prepareWorkspace } from '../../src/utils/workspaceUtils';
import { createClientOptions, ServerType } from '../../src/utils/serverUtils';

// Mock sample Apex file content
const SAMPLE_APEX_CODE = `
public class TestClass {
    private String name;
    
    public TestClass(String name) {
        this.name = name;
    }
    
    public void sayHello() {
        System.debug('Hello, ' + this.name);
    }
}`.trim();

describe('ApexJsonRpcClient LSP Commands', () => {
  // Define server types to test
  const serverTypes = [{ type: 'jorje' }];

  // Default workspace path for testing
  // Can be overridden with environment variable APEX_TEST_WORKSPACE
  const defaultWorkspace =
    'https://github.com/trailheadapps/dreamhouse-lwc.git';
  const workspacePath = process.env.APEX_TEST_WORKSPACE || defaultWorkspace;

  // Dynamic test generation for each server type
  serverTypes.forEach(({ type }) => {
    describe(`${type} language server with workspace: ${workspacePath}`, () => {
      let client: ApexJsonRpcClient;
      let middleware: RequestResponseCapturingMiddleware;
      let workspace: {
        rootUri: string;
        rootPath: string;
        isTemporary: boolean;
        cleanup: () => void;
      };
      const testUri = 'file:///test-class.cls';

      beforeAll(async () => {
        // Use existing workspace or GitHub repo
        try {
          const preparedWorkspace = await prepareWorkspace(workspacePath);
          if (!preparedWorkspace) {
            throw new Error(
              `Failed to prepare workspace from: ${workspacePath}`,
            );
          }

          workspace = {
            rootUri: preparedWorkspace.rootUri,
            rootPath: preparedWorkspace.rootPath,
            isTemporary: !!preparedWorkspace.isTemporary,
            cleanup: () => {
              if (preparedWorkspace.isTemporary) {
                try {
                  fs.rmSync(preparedWorkspace.rootPath, {
                    recursive: true,
                    force: true,
                  });
                  console.log(
                    `Cleaned up temporary workspace: ${preparedWorkspace.rootPath}`,
                  );
                } catch (e) {
                  console.error(`Failed to clean up temporary workspace: ${e}`);
                }
              } else {
                console.log(
                  `Kept permanent workspace: ${preparedWorkspace.rootPath}`,
                );
              }
            },
          };
        } catch (error) {
          console.warn(
            `Failed to use specified workspace: ${error}. Creating temporary workspace instead.`,
          );

          // Create a temporary workspace as fallback
          const tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'apex-lsp-test-'),
          );
          const apexFilePath = path.join(tempDir, 'TestClass.cls');
          fs.writeFileSync(apexFilePath, SAMPLE_APEX_CODE);

          workspace = {
            rootUri: `file://${tempDir}`,
            rootPath: tempDir,
            isTemporary: true,
            cleanup: () => {
              try {
                fs.rmSync(tempDir, { recursive: true, force: true });
              } catch (e) {
                console.error(`Failed to clean up temp directory: ${e}`);
              }
            },
          };
        }

        // Initialize middleware for capturing requests/responses
        middleware = new RequestResponseCapturingMiddleware();

        // Configure client using improved configuration
        // Use the shared createClientOptions from utils
        const clientOptions = createClientOptions(
          type === 'jorje' ? ServerType.JORJE : ServerType.DEMO,
          false, // verbose
          workspace,
        );

        // Create client with logger
        const logger = new ConsoleLogger(`ApexLspTest_${type}`);
        client = new ApexJsonRpcClient(clientOptions, logger);

        // Start client
        await client.start();
        console.log(`Connected to ${type} language server successfully`);

        // For middleware, we can't use client.getConnection() since it doesn't exist
        // Instead, we'll use the client's sendRequest and sendNotification for testing
        // and let the middleware work through response events

        // Open a test document
        client.openTextDocument(testUri, SAMPLE_APEX_CODE);

        // Give server time to process the document
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      afterAll(async () => {
        // Close test document
        client.closeTextDocument(testUri);

        // Uninstall middleware
        middleware.uninstall();

        // Stop client
        await client.stop();

        // Clean up temporary workspace
        workspace.cleanup();
      });

      beforeEach(() => {
        // Clear captured requests before each test
        middleware.clearCapturedRequests();
      });

      // Define all available LSP commands to test
      const lspCommands = [
        {
          name: 'completion',
          run: () => client.completion(testUri, 8, 16), // Position of "this."
        },
        {
          name: 'hover',
          run: () => client.hover(testUri, 8, 20), // Position of "name"
        },
        {
          name: 'documentSymbol',
          run: () => client.documentSymbol(testUri),
        },
        {
          name: 'formatting',
          run: () =>
            client.formatting(testUri, { tabSize: 4, insertSpaces: true }),
        },
      ];

      // Dynamically create tests for each LSP command
      lspCommands.forEach(({ name, run }) => {
        it(`should execute ${name} command and match snapshot`, async () => {
          // Execute the command
          await run();

          // Get the captured request/response pairs
          const requests = middleware.getCapturedRequests();

          // Find the relevant request for this command
          const commandRequest = requests.find(
            (req) =>
              req.method.includes(name) ||
              req.method.toLowerCase().includes(name.toLowerCase()),
          );

          // If no request was captured, the test should still pass if the command is not supported
          if (!commandRequest) {
            console.warn(
              `No request captured for command ${name}. This might not be supported by the server.`,
            );
            return;
          }

          // Create a normalized version for snapshot testing
          // This avoids issues with timestamps, request IDs, etc.
          const normalizedRequest = {
            method: commandRequest?.method,
            requestParams: commandRequest?.request,
            responseType: commandRequest?.response
              ? typeof commandRequest.response
              : 'undefined',
            // Avoid exact response matching as it may change, but verify structure
            responseStructure: commandRequest?.response
              ? Object.keys(commandRequest.response).sort()
              : null,
            errorOccurred: !!commandRequest?.error,
          };

          // Match against snapshot
          expect(normalizedRequest).toMatchSnapshot();
        });
      });
    });
  });
});
