/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { ChildProcess } from 'child_process';

// Constants
const APEX_LANGUAGE_SERVER_MAIN = 'apex.jorje.lsp.ApexLanguageServerLauncher';
const LANGUAGE_SERVER_LOG_LEVEL =
  process.env.LANGUAGE_SERVER_LOG_LEVEL ?? 'ERROR';
const JAR_FILE_NAME = 'apex-jorje-lsp.jar';
const JAVA_MEMORY = 4096; // 4GB default memory allocation

// Example Apex code for testing
const SAMPLE_APEX_CODE = `
public class HelloWorld {
    private String greeting;
    
    public HelloWorld() {
        this.greeting = 'Hello, World!';
    }
    
    public String getGreeting() {
        return this.greeting;
    }
    
    public void setGreeting(String greeting) {
        this.greeting = greeting;
    }
    
    public void printGreeting() {
        System.debug(greeting);
    }
}
`;

/**
 * Check if Java runtime is installed
 */
const checkJavaRuntime = async (): Promise<string> => {
  try {
    let javaHome = process.env.JAVA_HOME;

    if (!javaHome) {
      const { stdout, stderr } = await asyncExec('/usr/libexec/java_home');

      if (stderr && stderr.length > 0) {
        throw new Error(stderr);
      }

      javaHome = stdout.trim();
    }

    if (!javaHome) {
      throw new Error(
        'Java runtime could not be located. Please set JAVA_HOME environment variable.',
      );
    }

    return javaHome;
  } catch (error) {
    const errorMessage =
      'Failed to find Java runtime. Please install Java 11 or later and set JAVA_HOME environment variable.';
    console.error(errorMessage, error);
    const e = new Error(errorMessage);
    e.stack = error instanceof Error ? error.stack : String(error);
    throw e;
  }
};

/**
 * Check Java version
 */
const checkJavaVersion = async (javaHome: string): Promise<number> => {
  try {
    const javaExecutable = path.join(javaHome, 'bin', 'java');
    const { stdout, stderr } = await asyncExec(`"${javaExecutable}" -version`);

    const output = stderr || stdout;
    const versionRegExp = /version "(.*)"/g;
    const match = versionRegExp.exec(output);

    if (!match) {
      throw new Error('Could not determine Java version.');
    }

    const versionString = match[1];

    // Handle different version formats: 1.8.x, 9.x, 10.x, etc.
    if (versionString.startsWith('1.')) {
      // Older format: 1.8.x
      return parseInt(versionString.substring(2, 3), 10);
    } else {
      // Newer format: 11.x, 17.x, etc.
      const dotIndex = versionString.indexOf('.');
      if (dotIndex !== -1) {
        return parseInt(versionString.substring(0, dotIndex), 10);
      } else {
        return parseInt(versionString, 10);
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to check Java version: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Helper function to execute a command and return a promise
 */
const asyncExec = (
  command: string,
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

/**
 * Find the JAR file location
 */
const findJarFile = (): string => {
  // __dirname is available in CommonJS
  // No need for fileURLToPath anymore

  // Go up to the client package root
  const extensionPath = path.resolve(__dirname, '..', '..');

  const resourcesPath = path.join(extensionPath, 'src', 'resources');
  const distResourcesPath = path.join(extensionPath, 'dist', 'resources');

  let jarFilePath = path.join(resourcesPath, JAR_FILE_NAME);

  // If the jar doesn't exist in the src directory, check the dist directory
  if (!fs.existsSync(jarFilePath)) {
    jarFilePath = path.join(distResourcesPath, JAR_FILE_NAME);
    if (!fs.existsSync(jarFilePath)) {
      throw new Error(
        `Could not find ${JAR_FILE_NAME} in either ${resourcesPath} or ${distResourcesPath}`,
      );
    }
  }

  return jarFilePath;
};

/**
 * Start the language server
 */
const startLanguageServer = async (): Promise<ChildProcess> => {
  try {
    const javaHome = await checkJavaRuntime();
    const javaVersion = await checkJavaVersion(javaHome);

    console.log(`Using Java ${javaVersion} from ${javaHome}`);

    if (javaVersion < 11) {
      throw new Error(
        'Java 11 or later is required for the Apex Language Server.',
      );
    }

    const jarFilePath = findJarFile();
    console.log(`Using JAR file: ${jarFilePath}`);

    // Prepare Java executable path
    const javaExecutable = path.resolve(`${javaHome}/bin/java`);

    // Build arguments for the Java command
    const args: string[] = [
      '-cp',
      jarFilePath,
      '-Ddebug.internal.errors=true',
      '-Ddebug.semantic.errors=true',
      '-Ddebug.completion.statistics=false',
      '-Dlwc.typegeneration.disabled=true',
      `-Xmx${JAVA_MEMORY}M`,
      '-Dtrace.protocol=true',
      `-Dapex.lsp.root.log.level=${LANGUAGE_SERVER_LOG_LEVEL}`,
      // Add a temporary directory for the Apex database to avoid NullPointerException
      `-Dapex.jorje.db.path=${process.cwd()}`,
      // Set the project root to avoid SFDX project errors
      `-Dsfdx.project.root=${process.cwd()}`,
    ];

    // Add main class
    args.push(APEX_LANGUAGE_SERVER_MAIN);

    console.log('Starting Apex Language Server...');
    console.log(`Command: ${javaExecutable} ${args.join(' ')}`);

    // Start the process
    const serverProcess = cp.spawn(javaExecutable, args, {
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle standard output
    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data: Buffer) => {
        console.log(`[Server] ${data.toString().trim()}`);
      });
    }

    // Handle standard error
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data: Buffer) => {
        console.error(`[Server Error] ${data.toString().trim()}`);
      });
    }

    // Handle process exit
    serverProcess.on('exit', (code: number | null) => {
      console.log(`Language server process exited with code ${code}`);
    });

    // Handle process error
    serverProcess.on('error', (err: Error) => {
      console.error(`Failed to start language server: ${err.message}`);
    });

    return serverProcess;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
};

/**
 * Send a JSON-RPC message to the server
 */
const sendMessage = (process: ChildProcess, message: any): void => {
  const content = JSON.stringify(message);
  const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;
  if (process.stdin) {
    process.stdin.write(header + content, 'utf8');
  } else {
    console.error('Cannot send message: process.stdin is null');
  }
};

/**
 * Initialize the language server
 */
const initializeServer = (process: ChildProcess): void => {
  const initializeParams = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: process.pid,
      clientInfo: {
        name: 'Apex LSP Standalone Client',
        version: '1.0.0',
      },
      rootUri: null,
      capabilities: {
        textDocument: {
          synchronization: {
            didSave: true,
            dynamicRegistration: true,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
            },
          },
          hover: {
            dynamicRegistration: true,
          },
          definition: {
            dynamicRegistration: true,
          },
          documentSymbol: {
            dynamicRegistration: true,
          },
        },
        workspace: {
          applyEdit: true,
        },
      },
      trace: 'verbose',
    },
  };

  sendMessage(process, initializeParams);
};

/**
 * Open a document in the language server
 */
const openDocument = (
  process: ChildProcess,
  uri: string,
  text: string,
): void => {
  const openDocumentParams = {
    jsonrpc: '2.0',
    method: 'textDocument/didOpen',
    params: {
      textDocument: {
        uri: uri,
        languageId: 'apex',
        version: 1,
        text: text,
      },
    },
  };

  sendMessage(process, openDocumentParams);
};

/**
 * Get document symbols
 */
const getDocumentSymbols = (process: ChildProcess, uri: string): void => {
  const symbolsParams = {
    jsonrpc: '2.0',
    id: 2,
    method: 'textDocument/documentSymbol',
    params: {
      textDocument: {
        uri: uri,
      },
    },
  };

  sendMessage(process, symbolsParams);
};

/**
 * Get hover information
 */
const getHoverInfo = (
  process: ChildProcess,
  uri: string,
  line: number,
  character: number,
): void => {
  const hoverParams = {
    jsonrpc: '2.0',
    id: 3,
    method: 'textDocument/hover',
    params: {
      textDocument: {
        uri: uri,
      },
      position: {
        line: line,
        character: character,
      },
    },
  };

  sendMessage(process, hoverParams);
};

/**
 * Shutdown the language server
 */
const shutdownServer = (process: ChildProcess): void => {
  const shutdownParams = {
    jsonrpc: '2.0',
    id: 4,
    method: 'shutdown',
  };

  sendMessage(process, shutdownParams);

  // Send exit notification
  setTimeout(() => {
    const exitParams = {
      jsonrpc: '2.0',
      method: 'exit',
    };

    sendMessage(process, exitParams);

    // Force kill the process if it doesn't exit on its own
    setTimeout(() => {
      if (!process.killed) {
        process.kill();
      }
    }, 1000);
  }, 500);
};

/**
 * Start interactive mode
 */
const startInteractiveMode = (serverProcess: ChildProcess): void => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const documentUri = 'file:///sample/HelloWorld.cls';

  console.log('\n--- Apex Language Server Standalone Mode ---');
  console.log('Opening sample Apex document...');
  openDocument(serverProcess, documentUri, SAMPLE_APEX_CODE);

  console.log('\nAvailable commands:');
  console.log('1: Get document symbols');
  console.log('2: Get hover info (at line 7, character 15)');
  console.log('exit: Shutdown the server and exit');

  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', (input) => {
    const command = input.trim();

    switch (command) {
      case '1':
        console.log('Getting document symbols...');
        getDocumentSymbols(serverProcess, documentUri);
        break;
      case '2':
        console.log('Getting hover info...');
        getHoverInfo(serverProcess, documentUri, 7, 15);
        break;
      case 'exit':
        console.log('Shutting down server...');
        shutdownServer(serverProcess);
        rl.close();
        setTimeout(() => {
          // Use global process.exit
          process.exit(0);
        }, 2000);
        return;
      default:
        console.log('Unknown command. Available commands: 1, 2, exit');
    }

    rl.prompt();
  });
};

// Main function
async function main() {
  try {
    const server = await startLanguageServer();

    // Setup message processing
    let buffer = '';
    let contentLength = -1;

    if (server.stdout) {
      server.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();

        while (buffer.length > 0) {
          if (contentLength < 0) {
            const headerMatch = buffer.match(/Content-Length: (\d+)\r\n\r\n/);

            if (!headerMatch) {
              break;
            }

            contentLength = parseInt(headerMatch[1], 10);
            buffer = buffer.substring(headerMatch[0].length);

            if (buffer.length < contentLength) {
              break;
            }
          }

          const message = buffer.substring(0, contentLength);
          buffer = buffer.substring(contentLength);
          contentLength = -1;

          try {
            const parsed = JSON.parse(message);
            console.log('[Received]', JSON.stringify(parsed, null, 2));

            // If this is the initialize result, we can start the interactive mode
            if (parsed.id === 1 && parsed.result) {
              startInteractiveMode(server);
            }
          } catch (e) {
            console.error('Error parsing message:', e);
          }
        }
      });
    }

    // Initialize the server
    initializeServer(server);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
