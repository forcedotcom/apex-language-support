/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the Executable interface
export interface Executable {
  command: string;
  args?: string[];
  options?: cp.SpawnOptions;
}

// Define the configuration options for the Java LS
export interface JavaLSOptions {
  /**
   * Path to the Java home directory
   * If not provided, JAVA_HOME environment variable will be used
   */
  javaHome?: string;

  /**
   * Path to the apex-jorje-lsp.jar file
   * If not provided, will look in standard locations
   */
  jarPath?: string;

  /**
   * Memory allocation in MB
   * @default 4096
   */
  javaMemory?: number;

  /**
   * Enable semantic error reporting
   * @default false
   */
  enableSemanticErrors?: boolean;

  /**
   * Enable completion statistics
   * @default false
   */
  enableCompletionStatistics?: boolean;

  /**
   * Debug port for JDWP
   * @default 2739
   */
  debugPort?: number;

  /**
   * Log level
   * @default ERROR
   */
  logLevel?: string;

  /**
   * Whether to suspend on startup (for debugging)
   * @default false
   */
  suspendStartup?: boolean;

  /**
   * Custom environment variables
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Path to the workspace folder
   * This will be used as the current working directory (cwd) for the Java process
   * The jorje language server assumes that the cwd is the root of the workspace
   */
  workspacePath?: string;
}

// Constants
const JDWP_DEBUG_PORT = 2739;
const APEX_LANGUAGE_SERVER_MAIN = 'apex.jorje.lsp.ApexLanguageServerLauncher';
const JAR_FILE_NAME = 'apex-jorje-lsp.jar';

/**
 * Check if currently running in debug mode
 */
export const isDebugMode = (): boolean => {
  const args = (process as any).execArgv;
  if (args) {
    return args.some(
      (arg: any) =>
        /^--debug=?/.test(arg) ||
        /^--debug-brk=?/.test(arg) ||
        /^--inspect=?/.test(arg) ||
        /^--inspect-brk=?/.test(arg),
    );
  }
  return typeof (global as any).v8debug === 'object';
};

/**
 * Check if Java runtime is installed and return its path
 */
const getJavaHome = async (): Promise<string> => {
  try {
    let javaHome = process.env.JAVA_HOME;

    if (!javaHome) {
      const isWin = process.platform === 'win32';

      // For macOS
      if (process.platform === 'darwin') {
        try {
          const { stdout, stderr } = await asyncExec('/usr/libexec/java_home');

          if (stderr && stderr.length > 0) {
            throw new Error(`Error running /usr/libexec/java_home: ${stderr}`);
          }

          javaHome = stdout.trim();
        } catch (e) {
          throw new Error(
            `Failed to locate Java on macOS: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      } else if (isWin) {
        // For Windows, try to find Java in Program Files
        const possiblePaths = [
          process.env['PROGRAMFILES(X86)'] + '\\Java',
          process.env['PROGRAMFILES'] + '\\Java',
          process.env['PROGRAMW6432'] + '\\Java',
        ].filter(Boolean);

        for (const basePath of possiblePaths) {
          if (fs.existsSync(basePath as string)) {
            try {
              const dirs = fs.readdirSync(basePath as string);
              // Look for JDK directories, prioritize newer versions
              const jdkDirs = dirs
                .filter((dir) => dir.startsWith('jdk'))
                .sort()
                .reverse();

              if (jdkDirs.length > 0) {
                javaHome = path.join(basePath as string, jdkDirs[0]);
                break;
              }
            } catch (e) {
              console.warn(
                `Error reading directory ${basePath}: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
        }
      } else {
        // For Linux, try common locations
        const possiblePaths = [
          '/usr/lib/jvm/default-java',
          '/usr/lib/jvm/java-11-openjdk',
          '/usr/lib/jvm/java-17-openjdk',
        ];

        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            javaHome = p;
            break;
          }
        }
      }
    }

    if (!javaHome) {
      const errorMessages = {
        win32:
          'Java runtime not found in Program Files. Please install JDK 11+ and set JAVA_HOME.',
        darwin:
          'Java runtime not found using /usr/libexec/java_home. Please install JDK 11+ and set JAVA_HOME.',
        linux:
          'Java runtime not found in common locations. Please install JDK 11+ and set JAVA_HOME.',
      };

      throw new Error(
        errorMessages[process.platform as keyof typeof errorMessages] ||
          'Java runtime could not be located. Please set JAVA_HOME environment variable.',
      );
    }

    return javaHome;
  } catch (error) {
    console.error('Java home detection failed:', error);
    const errorMessage =
      'Failed to find Java runtime. Please install Java 11 or later and set JAVA_HOME environment variable.';
    throw new Error(errorMessage);
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
      throw new Error(
        'Could not determine Java version from output: ' + output,
      );
    }

    const versionString = match[1];
    let majorVersion: number;

    // Handle different version formats: 1.8.x, 9.x, 10.x, etc.
    if (versionString.startsWith('1.')) {
      // Old version format: 1.8.x
      majorVersion = parseInt(versionString.substring(2, 3), 10);
    } else {
      // New version format: 9.x, 10.x, etc.
      majorVersion = parseInt(versionString.split('.')[0], 10);
    }

    if (isNaN(majorVersion)) {
      throw new Error(`Could not parse Java version from: ${versionString}`);
    }

    if (majorVersion < 11) {
      throw new Error(
        `Java version ${majorVersion} is not supported. Please install Java 11 or later.`,
      );
    }

    return majorVersion;
  } catch (error) {
    // Check if java executable exists
    const javaExecutable = path.join(javaHome, 'bin', 'java');
    if (!fs.existsSync(javaExecutable)) {
      throw new Error(
        `Java executable not found at path: ${javaExecutable}. Please check your Java installation.`,
      );
    }

    console.error('Error checking Java version:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to check Java version. Please ensure Java 11+ is installed. Error: ${errorMsg}`,
    );
  }
};

/**
 * Helper function to find the JAR file
 */
const findJarFile = (customPath?: string, fallbackPath?: string): string => {
  // First try the specifically provided path
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  // Then try the fallback path
  if (fallbackPath && fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  // In CommonJS, __filename and __dirname are available as global variables
  // No need to use fileURLToPath(import.meta.url) or path.dirname

  // Check standard locations
  const possibleLocations = [
    // Relative to this file
    path.resolve(__dirname, '..', 'resources', JAR_FILE_NAME),
    path.resolve(__dirname, '..', '..', 'resources', JAR_FILE_NAME),
    path.resolve(__dirname, '..', '..', 'src', 'resources', JAR_FILE_NAME),
    // Relative to current working directory
    path.resolve(process.cwd(), 'resources', JAR_FILE_NAME),
    path.resolve(process.cwd(), 'src', 'resources', JAR_FILE_NAME),
    path.resolve(process.cwd(), 'dist', 'resources', JAR_FILE_NAME),
  ];

  for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
      return location;
    }
  }

  throw new Error(
    `Could not find ${JAR_FILE_NAME}. Please specify the path explicitly.`,
  );
};

/**
 * Create server options for the Java-based language server
 */
export const createJavaServerOptions = async (
  options: JavaLSOptions = {},
  fallbackJarPath?: string,
): Promise<Executable> => {
  try {
    // Get Java home
    const javaHome = options.javaHome || (await getJavaHome());

    // Check Java version
    const javaVersion = await checkJavaVersion(javaHome);
    if (javaVersion < 11) {
      console.warn(
        `Java version ${javaVersion} detected. Java 11 or higher is recommended.`,
      );
    }

    // Find jar file
    const jarFilePath = findJarFile(options.jarPath, fallbackJarPath);

    // Configuration options with defaults
    const jvmMaxHeap = options.javaMemory || 4096;
    const enableSemanticErrors = options.enableSemanticErrors || false;
    const enableCompletionStatistics =
      options.enableCompletionStatistics || false;
    const debugPort = options.debugPort || JDWP_DEBUG_PORT;
    const logLevel = options.logLevel || 'ERROR';
    const suspendStartup = options.suspendStartup || false;

    // Prepare Java executable path
    const javaExecutable = path.resolve(`${javaHome}/bin/java`);

    // Build arguments for the Java command
    const args: string[] = [
      '-cp',
      jarFilePath,
      '-Ddebug.internal.errors=true',
      `-Ddebug.semantic.errors=${enableSemanticErrors}`,
      `-Ddebug.completion.statistics=${enableCompletionStatistics}`,
      '-Dlwc.typegeneration.disabled=true',
    ];

    // Add memory settings
    args.push(`-Xmx${jvmMaxHeap}M`);

    // Add debug settings if in debug mode or suspendStartup is true
    if (isDebugMode() || suspendStartup) {
      args.push(
        '-Dtrace.protocol=false',
        `-Dapex.lsp.root.log.level=${logLevel}`,
        // eslint-disable-next-line max-len
        `-agentlib:jdwp=transport=dt_socket,server=y,suspend=${suspendStartup ? 'y' : 'n'},address=*:${debugPort},quiet=y`,
      );
    }

    // Add main class
    args.push(APEX_LANGUAGE_SERVER_MAIN);

    return {
      command: javaExecutable,
      args,
      options: {
        env: options.env || process.env,
      },
    };
  } catch (err) {
    console.error(
      'Error creating Java server options:',
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
};

/**
 * Launch the Java-based language server as a child process
 */
export const launchJavaServer = async (
  options: JavaLSOptions = {},
  fallbackJarPath?: string,
): Promise<cp.ChildProcess> => {
  const execInfo = await createJavaServerOptions(options, fallbackJarPath);

  console.log(
    `Starting Java language server: ${execInfo.command} ${execInfo.args?.join(' ')}`,
  );

  // Set up spawn options
  const spawnOptions = execInfo.options || {};

  // Set the current working directory to the workspace path if provided
  if (options.workspacePath) {
    console.log(
      `Setting working directory to workspace path: ${options.workspacePath}`,
    );
    spawnOptions.cwd = options.workspacePath;
  }

  const process = cp.spawn(execInfo.command, execInfo.args || [], spawnOptions);

  // Log server output
  if (process.stdout) {
    process.stdout.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });
  }

  if (process.stderr) {
    process.stderr.on('data', (data) => {
      console.error(`[Server] ${data.toString().trim()}`);
    });
  }

  process.on('error', (err) => {
    console.error('Failed to start language server process:', err);
  });

  process.on('exit', (code, signal) => {
    console.log(
      `Language server process exited with code ${code} and signal ${signal}`,
    );
  });

  return process;
};

/**
 * Helper function to execute a command and return a promise
 */
export const asyncExec = (
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
