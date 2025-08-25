/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * child_process polyfill for web worker environments
 * Provides minimal child_process functionality for browser compatibility
 * Most operations will be no-ops since child processes don't exist in browsers
 */

export interface ChildProcess {
  stdout: any;
  stderr: any;
  stdin: any;
  pid: number;
  kill: (signal?: string) => boolean;
  on: (event: string, listener: Function) => void;
}

// Mock child process that does nothing but doesn't crash
class MockChildProcess implements ChildProcess {
  stdout = null;
  stderr = null;
  stdin = null;
  pid = 0;

  kill(signal?: string): boolean {
    // Can't kill processes in browser, but don't error
    return true;
  }

  on(event: string, listener: Function): void {
    // No-op event listener registration
    // In browser, we can't have child processes so no events to listen to
  }
}

export function spawn(
  command: string,
  args?: string[],
  options?: any,
): ChildProcess {
  // Return mock child process - can't actually spawn processes in browser
  console.warn(
    `child_process.spawn('${command}') called in browser environment - returning mock process`,
  );
  return new MockChildProcess();
}

export function exec(command: string, callback?: Function): ChildProcess {
  // Return mock child process and call callback with empty result if provided
  console.warn(
    `child_process.exec('${command}') called in browser environment - returning mock process`,
  );
  if (callback) {
    // Call callback asynchronously with no error and empty stdout/stderr
    setTimeout(() => callback(null, '', ''), 0);
  }
  return new MockChildProcess();
}

export function execSync(command: string, options?: any): string {
  // Can't execute commands synchronously in browser
  console.warn(
    `child_process.execSync('${command}') called in browser environment - returning empty string`,
  );
  return '';
}

export function fork(
  modulePath: string,
  args?: string[],
  options?: any,
): ChildProcess {
  // Can't fork processes in browser
  console.warn(
    `child_process.fork('${modulePath}') called in browser environment - returning mock process`,
  );
  return new MockChildProcess();
}

export function execFile(
  file: string,
  args?: string[],
  callback?: Function,
): ChildProcess {
  // Can't execute files in browser
  console.warn(
    `child_process.execFile('${file}') called in browser environment - returning mock process`,
  );
  if (callback) {
    setTimeout(() => callback(null, '', ''), 0);
  }
  return new MockChildProcess();
}

export function execFileSync(
  file: string,
  args?: string[],
  options?: any,
): string {
  // Can't execute files synchronously in browser
  console.warn(
    `child_process.execFileSync('${file}') called in browser environment - returning empty string`,
  );
  return '';
}

// Default export for compatibility
const childProcess = {
  spawn,
  exec,
  execSync,
  fork,
  execFile,
  execFileSync,
  ChildProcess: MockChildProcess,
};

export default childProcess;

// Make it available globally for browser environments
if (typeof globalThis !== 'undefined') {
  (globalThis as any).child_process = childProcess;
}
