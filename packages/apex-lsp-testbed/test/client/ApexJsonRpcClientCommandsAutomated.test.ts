/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import {
  ApexJsonRpcClient,
  JsonRpcClientOptions,
  ConsoleLogger,
} from '../../src/client/ApexJsonRpcClient';
import { RequestResponseCapturingMiddleware } from '../../src/test-utils/RequestResponseCapturingMiddleware';

// Mock sample Apex file content
const SAMPLE_APEX_CODE = `
public class TestClass {
    private String name;
    private Integer count;
    
    public TestClass(String name, Integer count) {
        this.name = name;
        this.count = count;
    }
    
    public void sayHello() {
        System.debug('Hello, ' + this.name + '! Count: ' + this.count);
    }
    
    public String getName() {
        return this.name;
    }
    
    public Integer getCount() {
        return this.count;
    }
}`.trim();

/**
 * Create a temporary test workspace
 */
function createTempWorkspace(): {
  rootUri: string;
  rootPath: string;
  cleanup: () => void;
} {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-lsp-test-'));

  // Create a simple Apex class file in the workspace
  const apexFilePath = path.join(tempDir, 'TestClass.cls');
  fs.writeFileSync(apexFilePath, SAMPLE_APEX_CODE);

  return {
    rootUri: `file://${tempDir}`,
    rootPath: tempDir,
    cleanup: () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`Failed to clean up temp directory: ${e}`);
      }
    },
  };
}

/**
 * Create client options based on server type
 */
function createClientOptions(
  serverType: 'demo' | 'jorje',
  workspace: { rootUri: string; rootPath: string },
): JsonRpcClientOptions {
  const initializeParams = {
    workspaceFolders: [
      {
        uri: workspace.rootUri,
        name: path.basename(workspace.rootPath),
      },
    ],
    rootUri: workspace.rootUri,
    rootPath: workspace.rootPath,
    capabilities: {
      textDocument: {
        completion: { dynamicRegistration: true },
        hover: { dynamicRegistration: true },
        documentSymbol: { dynamicRegistration: true },
        formatting: { dynamicRegistration: true },
      },
    },
  };

  if (serverType === 'demo') {
    // For demo server, use the mockServer.ts
    return {
      serverPath: path.resolve(
        __dirname,
        '../../src/servers/demo/mockServer.ts',
      ),
      nodeArgs: ['--nolazy'],
      serverArgs: [],
      env: process.env,
      requestTimeout: 10000,
      initializeParams,
    };
  } else {
    // For jorje server, we need special configuration
    const jarPath =
      process.env.APEX_LSP_JAR_PATH ||
      path.resolve(__dirname, '../../dist/resources/apex-jorje-lsp.jar');

    return {
      serverPath: 'java',
      serverArgs: [
        '-Xmx4096M',
        '-Dapex.lsp.root.log.level=ERROR',
        '-Ddebug.internal.errors=true',
        '-Ddebug.semantic.errors=true',
        '-Dlwc.typegeneration.disabled=true',
        '-cp',
        jarPath,
        'apex.jorje.lsp.ApexLanguageServerLauncher',
      ],
      env: {
        ...process.env,
        APEX_LSP_WORKSPACE: workspace.rootPath,
      },
      requestTimeout: 30000,
      initializeParams,
    };
  }
}

/**
 * Helper to identify known LSP method implementations
 * Maps the client method name to a function that will invoke it with appropriate parameters
 */
type ClientCommand = {
  name: string;
  execute: (client: ApexJsonRpcClient, uri: string) => Promise<any>;
};

/**
 * Test suite for ApexJsonRpcClient LSP commands
 * Automatically tests all supported LSP commands against different language server implementations
 */
describe('ApexJsonRpcClient Commands Automated Tests', () => {
  // Define server types to test
  const serverTypes = [
    { type: 'demo' },
    // Uncomment to test against jorje server if available and APEX_LSP_JAR_PATH is set
    // { type: 'jorje' }
  ];

  // Map of client methods to functions that will invoke them with appropriate parameters
  const commandMap: Record<
    string,
    (client: ApexJsonRpcClient, uri: string) => Promise<any>
  > = {
    // LSP requests
    completion: (client, uri) => client.completion(uri, 10, 30), // Position inside sayHello method
    hover: (client, uri) => client.hover(uri, 5, 15), // Position inside constructor
    documentSymbol: (client, uri) => client.documentSymbol(uri),
    formatting: (client, uri) => client.formatting(uri),

    // Document operations - these are not tested as commands since they're used in setup
    // openTextDocument: handled in beforeAll
    // updateTextDocument: could be added if needed
    // closeTextDocument: handled in afterAll
  };

  // Detect additional client methods dynamically if available
  const detectClientMethods = (client: ApexJsonRpcClient): ClientCommand[] => {
    const commands: ClientCommand[] = [];
    const clientProto = Object.getPrototypeOf(client);

    // Get all method names from the prototype
    const methodNames = Object.getOwnPropertyNames(clientProto).filter(
      (name) =>
        // Filter out non-function properties and private/internal methods
        typeof clientProto[name] === 'function' &&
        !name.startsWith('_') &&
        name !== 'constructor' &&
        // Skip these methods as they're not LSP command methods
        ![
          'start',
          'stop',
          'sendRequest',
          'sendNotification',
          'getServerCapabilities',
          'onNotification',
          'openTextDocument',
          'updateTextDocument',
          'closeTextDocument',
          'runTests',
        ].includes(name),
    );

    // Create command objects for each method
    methodNames.forEach((name) => {
      // Use the predefined executor if available, otherwise create a generic one
      const executor =
        commandMap[name] ||
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function (client: ApexJsonRpcClient, uri: string) {
          // For methods we don't know how to call, log a warning and return a resolved promise
          console.warn(
            `No executor defined for method ${name}, skipping actual execution`,
          );
          return Promise.resolve();
        };

      commands.push({
        name,
        execute: executor,
      });
    });

    return commands;
  };

  // Run tests for each server type
  serverTypes.forEach(({ type }) => {
    describe(`${type} language server`, () => {
      let client: ApexJsonRpcClient;
      let middleware: RequestResponseCapturingMiddleware;
      let commands: ClientCommand[];
      let workspace: { rootUri: string; rootPath: string; cleanup: () => void };
      const testUri = 'file:///test-automated.cls';

      beforeAll(async () => {
        // Create a temporary workspace
        workspace = createTempWorkspace();

        // Initialize middleware for capturing requests/responses
        middleware = new RequestResponseCapturingMiddleware();

        // Configure client
        const clientOptions = createClientOptions(
          type as 'demo' | 'jorje',
          workspace,
        );

        // Create client with logger
        const logger = new ConsoleLogger(`ApexLspTest_${type}`);
        client = new ApexJsonRpcClient(clientOptions, logger);

        // Detect available commands
        commands = detectClientMethods(client);
        console.log(
          `Detected ${commands.length} commands: ${commands.map((c) => c.name).join(', ')}`,
        );

        // Start client
        await client.start();
        console.log(`Connected to ${type} language server successfully`);

        // Install middleware after connection is established
        // const connection = client.getConnection();
        // if (!connection) {
        //   throw new Error('Failed to get connection from ApexJsonRpcClient');
        // }
        middleware.install(client as any);

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

      // Dynamically create tests for each detected command
      // commands.forEach((command) => {
      //   it(`should execute ${command.name} command and match snapshot`, async () => {
      //     // Execute the command
      //     await command.execute(client, testUri);

      //     // Get the captured request/response pairs
      //     const requests = middleware.getCapturedRequests();

      //     // Expected method name patterns based on LSP spec
      //     const methodPatterns = [
      //       command.name, // Direct match
      //       `textDocument/${command.name}`, // Standard LSP format
      //       command.name.replace(/([A-Z])/g, '/$1').toLowerCase(), // camelCase to slash format
      //     ];

      //     // Find the relevant request for this command
      //     const commandRequest = requests.find((req) =>
      //       methodPatterns.some((pattern) =>
      //         req.method.toLowerCase().includes(pattern.toLowerCase()),
      //       ),
      //     );

      //     // If no request was captured, the test should still pass if the command is not supported
      //     if (!commandRequest) {
      //       console.warn(
      //         `No request captured for command ${command.name}. This might not be supported by the server.`,
      //       );
      //       return;
      //     }

      //     // Create a normalized version for snapshot testing
      //     // This avoids issues with timestamps, request IDs, etc.
      //     const normalizedRequest = {
      //       command: command.name,
      //       method: commandRequest.method,
      //       requestParams: commandRequest.request,
      //       // Don't include the full response in snapshots to avoid fragility,
      //       // just capture enough information to verify the structure
      //       responseInfo: commandRequest.response
      //         ? {
      //             type: typeof commandRequest.response,
      //             keys: Object.keys(commandRequest.response).sort(),
      //             hasResults: Array.isArray(commandRequest.response.result)
      //               ? commandRequest.response.result.length > 0
      //               : !!commandRequest.response.result,
      //           }
      //         : null,
      //       errorOccurred: !!commandRequest.error,
      //       durationMs: commandRequest.duration,
      //     };

      //     // Match against snapshot
      //     expect(normalizedRequest).toMatchSnapshot(`${type}_${command.name}`);
      //   });
      // });
    });
  });
});
