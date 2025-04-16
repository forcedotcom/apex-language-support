/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import * as childProcess from 'child_process';

import {
  ApexJsonRpcClient,
  ConsoleLogger,
  JsonRpcClientOptions,
} from './client/ApexJsonRpcClient.js';
import { isDebugMode } from './servers/jorje/javaServerLauncher.js';

// Define server types
enum ServerType {
  DEMO = 'demo',
  JORJE = 'jorje',
}

// Define CLI options interface
interface CliOptions {
  serverType: ServerType;
  verbose: boolean;
  interactive: boolean;
  workspace?: string; // Path to workspace or GitHub URL
  suspend: boolean; // Whether to suspend the Java process for debugging
}

// Define workspace configuration
interface WorkspaceConfig {
  rootUri: string; // The root URI in file:// format
  rootPath: string; // The absolute path to the workspace
  isTemporary: boolean; // Whether this is a temporary cloned workspace
}

/**
 * Find the path to the language server based on server type
 */
function findServerPath(serverType: ServerType): string {
  // Find the project root directory
  let currentDir = process.cwd();
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return process.cwd();
    }
    currentDir = parentDir;
  }
  const projectRoot = currentDir;

  switch (serverType) {
    case ServerType.DEMO:
      // The demo server uses the mockServer.ts which simulates responses
      // It doesn't need a real server path as it uses mock responses
      return 'demo-mode';
    case ServerType.JORJE:
      // Jorje server is a Java application
      // The JAR file is in the dist/resources directory after build
      return path.resolve(
        projectRoot,
        'dist',
        'resources',
        'apex-jorje-lsp.jar',
      );
    default:
      throw new Error(`Unknown server type: ${serverType}`);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    serverType: ServerType.DEMO, // Default server type
    verbose: false,
    interactive: false,
    suspend: false, // Default to not suspending
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--server' || arg === '-s') {
      const value = args[++i]?.toLowerCase();
      if (value === 'demo' || value === 'jorje') {
        options.serverType = value as ServerType;
      } else {
        console.error(
          `Invalid server type: ${value}. Using default: ${options.serverType}`,
        );
      }
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
    } else if (arg === '--workspace' || arg === '-w') {
      options.workspace = args[++i];
    } else if (arg === '--suspend') {
      options.suspend = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log('Apex Language Server Testbed');
  console.log('');
  console.log('Usage: apex-lsp-testbed [options]');
  console.log('');
  console.log('Options:');
  console.log(
    '  -s, --server <type>      Server type to launch (demo or jorje)',
  );
  console.log('  -v, --verbose            Enable verbose logging');
  console.log('  -i, --interactive        Start in interactive mode');
  console.log(
    '  -w, --workspace <path>   Path to test workspace or GitHub URL',
  );
  console.log(
    '  --suspend                Suspend the Java process for debugging (JDWP port: 2739)',
  );
  console.log('  -h, --help               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  # Start jorje server in interactive mode');
  console.log('  npm run start:jorje');
  console.log('');
  console.log('  # Start jorje server with a local workspace');
  console.log('  npm run start:jorje -- --workspace /path/to/apex/project');
  console.log('');
  console.log('  # Start jorje server with debugging enabled');
  console.log('  npm run start:jorje -- --suspend');
  console.log('');
  console.log('  # Start jorje server with a GitHub repository');
  console.log(
    '  npm run start:jorje -- --workspace https://github.com/username/repo.git',
  );
  console.log('');
  console.log('  # Start demo server with verbose logging and a workspace');
  console.log(
    '  npm run start:demo:verbose -- --workspace /path/to/apex/project',
  );
}

/**
 * Prepare the workspace configuration
 *
 * Handles both local directories and GitHub repositories:
 * - If the workspace path is a local directory, it will be used directly
 * - If the workspace path is a GitHub URL, it will be cloned into a test artifacts folder
 */
async function prepareWorkspace(
  workspacePath?: string,
): Promise<WorkspaceConfig | undefined> {
  if (!workspacePath) {
    return undefined;
  }

  console.log(`Preparing workspace: ${workspacePath}`);

  // Check if the workspace path is a GitHub URL
  const githubUrlRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\.git$/;
  const isGithubUrl = githubUrlRegex.test(workspacePath);

  if (isGithubUrl) {
    return await cloneGitHubRepository(workspacePath);
  } else {
    // Use the local path
    const absPath = path.resolve(workspacePath);

    // Check if the directory exists
    if (!fs.existsSync(absPath)) {
      throw new Error(`Workspace path does not exist: ${absPath}`);
    }

    // Check if it's a directory
    const stats = fs.statSync(absPath);
    if (!stats.isDirectory()) {
      throw new Error(`Workspace path is not a directory: ${absPath}`);
    }

    return {
      rootUri: `file://${absPath}`,
      rootPath: absPath,
      isTemporary: false,
    };
  }
}

/**
 * Clone a GitHub repository into the test artifacts folder
 */
async function cloneGitHubRepository(
  repoUrl: string,
): Promise<WorkspaceConfig> {
  // Extract the repository name from the URL
  const repoName = path.basename(repoUrl, '.git');

  // Create test artifacts directory if it doesn't exist
  const artifactsDir = path.resolve('test-artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Create a unique folder for this repository
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const repoDir = path.join(artifactsDir, `${repoName}-${timestamp}`);

  console.log(`Cloning ${repoUrl} into ${repoDir}...`);

  // Clone the repository
  try {
    await executeCommand(`git clone ${repoUrl} ${repoDir}`);
    console.log(`Successfully cloned repository into ${repoDir}`);

    return {
      rootUri: `file://${repoDir}`,
      rootPath: repoDir,
      isTemporary: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Execute a command and return a promise that resolves when the command completes
 */
function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    childProcess.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Create client options based on server type
 */
function createClientOptions(
  serverType: ServerType,
  verbose: boolean,
  workspace?: WorkspaceConfig,
  suspend: boolean = false,
): JsonRpcClientOptions {
  const serverPath = findServerPath(serverType);

  // Common initialization options that include the workspace configuration
  const initializationOptions = workspace
    ? {
        workspaceFolders: [
          {
            uri: workspace.rootUri,
            name: path.basename(workspace.rootPath),
          },
        ],
        rootUri: workspace.rootUri,
        rootPath: workspace.rootPath,
      }
    : undefined;

  switch (serverType) {
    case ServerType.DEMO:
      // For demo mode, we'll use the mockServer.ts which simulates responses
      // We don't actually start a real server for this mode
      // Instead, we'll override methods in the MockApexJsonRpcClient below
      return {
        serverPath: 'demo-mode', // This is just a placeholder
        nodeArgs: verbose ? ['--nolazy'] : [],
        env: process.env,
        requestTimeout: 1000, // Short timeout for demo mode
        initializeParams: initializationOptions,
      };
    case ServerType.JORJE:
      return {
        // For Java server, use 'java' as the executable
        serverPath: 'java',
        // No need for nodePath since we're directly specifying java as serverPath
        serverArgs: [
          '-Xmx4096M',
          '-Dapex.lsp.root.log.level=' + (verbose ? 'INFO' : 'ERROR'),
          '-Ddebug.internal.errors=true',
          '-Ddebug.semantic.errors=true',
          '-Dlwc.typegeneration.disabled=true',
          // If debug mode is enabled, add JDWP options
          ...(isDebugMode() || suspend
            ? [
                '-agentlib:jdwp=transport=dt_socket,server=y,suspend=' +
                  (suspend ? 'y' : 'n') +
                  ',address=*:2739,quiet=y',
              ]
            : []),
          '-cp',
          // Use the JAR file path as an argument to java
          serverPath,
          'apex.jorje.lsp.ApexLanguageServerLauncher',
        ],
        env: {
          ...process.env,
          APEX_LSP_DEBUG: verbose ? '1' : '0',
          // If workspace is specified, add it to environment
          ...(workspace ? { APEX_LSP_WORKSPACE: workspace.rootPath } : {}),
        },
        initializeParams: initializationOptions,
        // For the Java server, we need to pass additional options specific to the jorje launcher
        ...(workspace ? { workspacePath: workspace.rootPath } : {}),
      };
    default:
      throw new Error(`Unknown server type: ${serverType}`);
  }
}

/**
 * Mock implementation of ApexJsonRpcClient for demo mode
 * This simulates responses without starting a real server
 */
class MockApexJsonRpcClient extends ApexJsonRpcClient {
  private documentContents: Map<string, string> = new Map();
  private isStarted = false;
  private mockCapabilities = {
    textDocumentSync: {
      openClose: true,
      change: 1, // full content sync
    },
    completionProvider: {
      resolveProvider: false,
      triggerCharacters: ['.'],
    },
    hoverProvider: true,
    documentSymbolProvider: true,
    documentFormattingProvider: true,
  };

  constructor(options: JsonRpcClientOptions, logger?: ConsoleLogger) {
    super(options, logger || new ConsoleLogger('MockApexJsonRpcClient'));
  }

  /**
   * Mock start method - doesn't actually start a server
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;
    // No need to call super.start() as we're not starting a real server
  }

  /**
   * Mock stop method
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;
    // No need to call super.stop() as we didn't start a real server
  }

  /**
   * Mock getServerCapabilities method
   */
  public getServerCapabilities(): any {
    return this.mockCapabilities;
  }

  /**
   * Mock sendRequest method
   */
  public async sendRequest<T>(method: string, params: any): Promise<T> {
    if (!this.isStarted) {
      throw new Error('Client not initialized');
    }

    // Return mock responses based on the request method
    switch (method) {
      case 'textDocument/completion':
        return this.mockCompletion(params) as unknown as T;
      case 'textDocument/hover':
        return this.mockHover(params) as unknown as T;
      case 'textDocument/documentSymbol':
        return this.mockDocumentSymbol(params) as unknown as T;
      case 'textDocument/formatting':
        return this.mockFormatting(params) as unknown as T;
      default:
        return {} as T;
    }
  }

  /**
   * Mock sendNotification method
   */
  public sendNotification(method: string, params: any): void {
    if (!this.isStarted) {
      throw new Error('Client not initialized');
    }

    // Handle document notifications
    switch (method) {
      case 'textDocument/didOpen':
        this.documentContents.set(
          params.textDocument.uri,
          params.textDocument.text,
        );
        break;
      case 'textDocument/didChange':
        this.documentContents.set(
          params.textDocument.uri,
          params.contentChanges[0].text,
        );
        break;
      case 'textDocument/didClose':
        this.documentContents.delete(params.textDocument.uri);
        break;
    }
  }

  /**
   * Mock completion request
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockCompletion(params: any): any {
    return [
      {
        label: 'getName',
        kind: 2, // Method
        detail: 'String getName()',
        documentation: 'Gets the name of the instance.',
      },
      {
        label: 'setName',
        kind: 2, // Method
        detail: 'void setName(String name)',
        documentation: 'Sets the name of the instance.',
      },
      {
        label: 'count',
        kind: 7, // Property
        detail: 'Integer',
        documentation: 'The count property.',
      },
      {
        label: 'isActive',
        kind: 7, // Property
        detail: 'Boolean',
        documentation: 'Indicates if the instance is active.',
      },
    ];
  }

  /**
   * Mock hover request
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockHover(params: any): any {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Apex Demo Server**',
          '',
          'This is a hover information example from the mock client.',
          '',
          '```apex',
          'public String getGreeting() {',
          '    return "Hello from Apex Mock Client!";',
          '}',
          '```',
        ].join('\n'),
      },
    };
  }

  /**
   * Mock document symbol request
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private mockDocumentSymbol(params: any): any {
    return [
      {
        name: 'TestClass',
        kind: 5, // Class
        range: {
          start: { line: 1, character: 0 },
          end: { line: 12, character: 1 },
        },
        selectionRange: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 18 },
        },
        children: [
          {
            name: 'name',
            kind: 8, // Property
            range: {
              start: { line: 2, character: 4 },
              end: { line: 2, character: 24 },
            },
            selectionRange: {
              start: { line: 2, character: 12 },
              end: { line: 2, character: 16 },
            },
          },
          {
            name: 'TestClass',
            kind: 9, // Constructor
            range: {
              start: { line: 4, character: 4 },
              end: { line: 6, character: 5 },
            },
            selectionRange: {
              start: { line: 4, character: 4 },
              end: { line: 4, character: 13 },
            },
          },
          {
            name: 'getName',
            kind: 6, // Method
            range: {
              start: { line: 8, character: 4 },
              end: { line: 10, character: 5 },
            },
            selectionRange: {
              start: { line: 8, character: 4 },
              end: { line: 8, character: 11 },
            },
          },
        ],
      },
    ];
  }

  /**
   * Mock formatting request
   */
  private mockFormatting(params: any): any {
    const content = this.documentContents.get(params.textDocument.uri);
    if (!content) {
      return [];
    }

    // Simple formatting simulation
    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 999, character: 999 },
        },
        newText: content
          .split('\n')
          .map((line) => line.trim()) // Remove existing whitespace
          .join('\n')
          .replace(/\{/g, ' {') // Add space before braces
          .replace(/;/g, ';\n') // Add newline after semicolons
          .replace(/\}/g, '}\n') // Add newline after closing braces
          .replace(/\s*\n\s*/g, '\n'), // Clean up extra whitespace
      },
    ];
  }
}

/**
 * Start interactive mode with a running client
 */
async function startInteractiveMode(client: ApexJsonRpcClient): Promise<void> {
  console.log(
    '\nInteractive mode. Type commands or "help" for assistance. Press Ctrl+C to exit.',
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // Example document URI for testing
  const testUri = 'file:///test.cls';
  let documentVersion = 1;
  let documentOpened = false;

  // Process user commands
  rl.prompt();
  rl.on('line', async (line) => {
    const cmd = line.trim();

    try {
      if (cmd === 'help') {
        console.log('Available commands:');
        console.log('  open          - Open a test document');
        console.log('  update        - Update the test document');
        console.log('  close         - Close the test document');
        console.log('  completion    - Request completion at a position');
        console.log('  hover         - Request hover information');
        console.log('  symbols       - Request document symbols');
        console.log('  format        - Request document formatting');
        console.log('  capabilities  - Show server capabilities');
        console.log('  exit/quit     - Exit the program');
        console.log('  help          - Show this help');
      } else if (cmd === 'open') {
        const sampleCode = `
public class TestClass {
    private String name;
    
    public TestClass(String name) {
        this.name = name;
    }
    
    public String getName() {
        return this.name;
    }
}`;
        client.openTextDocument(testUri, sampleCode);
        documentOpened = true;
        console.log(`Opened document ${testUri}`);
      } else if (cmd === 'update') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          documentVersion++;
          const updatedCode = `
public class TestClass {
    private String name;
    private Integer count;
    
    public TestClass(String name, Integer count) {
        this.name = name;
        this.count = count;
    }
    
    public String getName() {
        return this.name;
    }
    
    public Integer getCount() {
        return this.count;
    }
}`;
          client.updateTextDocument(testUri, updatedCode, documentVersion);
          console.log(
            `Updated document ${testUri} (version ${documentVersion})`,
          );
        }
      } else if (cmd === 'close') {
        if (!documentOpened) {
          console.log('No document is currently open');
        } else {
          client.closeTextDocument(testUri);
          documentOpened = false;
          console.log(`Closed document ${testUri}`);
        }
      } else if (cmd === 'completion') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.completion(testUri, 5, 16);
          console.log('Completion results:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'hover') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.hover(testUri, 5, 16);
          console.log('Hover results:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'symbols') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.documentSymbol(testUri);
          console.log('Document symbols:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'format') {
        if (!documentOpened) {
          console.log('Please open the document first');
        } else {
          const result = await client.formatting(testUri);
          console.log('Formatting results:', JSON.stringify(result, null, 2));
        }
      } else if (cmd === 'capabilities') {
        const capabilities = client.getServerCapabilities();
        console.log(
          'Server capabilities:',
          JSON.stringify(capabilities, null, 2),
        );
      } else if (cmd === 'exit' || cmd === 'quit') {
        rl.close();
        return;
      } else {
        console.log(
          `Unknown command: ${cmd}. Type 'help' for available commands.`,
        );
      }
    } catch (error) {
      console.error('Error executing command:', error);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('Exiting interactive mode...');
    await client.stop();
    process.exit(0);
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // Create logger with appropriate verbosity
    const logger = new ConsoleLogger();
    if (options.verbose) {
      console.log(
        `Starting Apex Language Server Testbed with ${options.serverType} server`,
      );
    }

    // Prepare workspace if specified
    const workspace = options.workspace
      ? await prepareWorkspace(options.workspace)
      : undefined;

    if (workspace) {
      console.log(`Using workspace at: ${workspace.rootPath}`);
      console.log(`Workspace URI: ${workspace.rootUri}`);
      if (workspace.isTemporary) {
        console.log(
          'This is a temporary cloned workspace that will be deleted on exit',
        );

        // Register cleanup handler for temporary workspace
        process.on('exit', () => {
          if (workspace.isTemporary) {
            console.log(
              `\nCleaning up temporary workspace: ${workspace.rootPath}`,
            );
            try {
              // Use recursive option only on Node.js versions that support it
              const nodeVersion = process.versions.node.split('.').map(Number);
              if (
                nodeVersion[0] >= 14 ||
                (nodeVersion[0] === 12 && nodeVersion[1] >= 10)
              ) {
                fs.rmSync(workspace.rootPath, { recursive: true, force: true });
              } else {
                // Fallback for older Node.js versions
                const rimrafSync = (dir: string) => {
                  if (fs.existsSync(dir)) {
                    fs.readdirSync(dir).forEach((file) => {
                      const curPath = path.join(dir, file);
                      if (fs.lstatSync(curPath).isDirectory()) {
                        rimrafSync(curPath);
                      } else {
                        fs.unlinkSync(curPath);
                      }
                    });
                    fs.rmdirSync(dir);
                  }
                };
                rimrafSync(workspace.rootPath);
              }
              console.log('Temporary workspace deleted successfully');
            } catch (error) {
              console.error(`Error cleaning up temporary workspace: ${error}`);
            }
          }
        });
      }
    }

    // Create client options with workspace configuration
    const clientOptions = createClientOptions(
      options.serverType,
      options.verbose,
      workspace,
      options.suspend,
    );

    // Create either a real or mock client based on server type
    let client: ApexJsonRpcClient;

    if (options.serverType === ServerType.DEMO) {
      client = new MockApexJsonRpcClient(clientOptions, logger);
    } else {
      client = new ApexJsonRpcClient(clientOptions, logger);
    }

    // Start client
    await client.start();
    console.log(
      `Connected to ${options.serverType} language server successfully`,
    );

    // Register exit handler
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await client.stop();
      process.exit(0);
    });

    // Start interactive mode if requested
    if (options.interactive) {
      await startInteractiveMode(client);
    } else {
      // Non-interactive mode: Just show server capabilities and exit
      const capabilities = client.getServerCapabilities();
      console.log(
        'Server capabilities:',
        JSON.stringify(capabilities, null, 2),
      );

      // Wait a moment before shutting down to ensure all messages are processed
      setTimeout(async () => {
        await client.stop();
        console.log('Server stopped');
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
