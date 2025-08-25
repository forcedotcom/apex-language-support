/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal os polyfill for web worker environments
 * This provides basic OS functionality needed by the language server
 */

// Constants
const constants = {
  UV_UDP_REUSEADDR: 4,
  dlopen: {
    RTLD_LAZY: 1,
    RTLD_NOW: 2,
    RTLD_GLOBAL: 8,
    RTLD_LOCAL: 4,
  },
  errno: {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
  },
  signals: {
    SIGHUP: 1,
    SIGINT: 2,
    SIGQUIT: 3,
    SIGILL: 4,
    SIGTRAP: 5,
    SIGABRT: 6,
    SIGIOT: 6,
    SIGBUS: 7,
    SIGFPE: 8,
    SIGKILL: 9,
    SIGUSR1: 10,
  },
  priority: {
    PRIORITY_LOW: 19,
    PRIORITY_BELOW_NORMAL: 10,
    PRIORITY_NORMAL: 0,
    PRIORITY_ABOVE_NORMAL: -7,
    PRIORITY_HIGH: -14,
    PRIORITY_HIGHEST: -20,
  },
};

// Platform-specific EOL
const EOL = '\n';
const platform = 'browser';
const arch = 'web';

function cpus(): Array<{
  model: string;
  speed: number;
  times: { user: number; nice: number; sys: number; idle: number; irq: number };
}> {
  return [
    {
      model: 'Browser Virtual CPU',
      speed: 0,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
    },
  ];
}

function endianness(): string {
  // Most modern browsers are little-endian
  return 'LE';
}

function freemem(): number {
  return 0;
}

function getPriority(pid?: number): number {
  return 0;
}

function homedir(): string {
  return '/';
}

function hostname(): string {
  return 'browser';
}

function loadavg(): number[] {
  return [0, 0, 0];
}

function networkInterfaces(): {
  [key: string]: Array<{
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
  }>;
} {
  return {};
}

function release(): string {
  return '1.0.0';
}

function setPriority(pid: number, priority: number): void {
  // No-op in browser
}

function tmpdir(): string {
  return '/tmp';
}

function totalmem(): number {
  return 0;
}

function type(): string {
  return 'Browser';
}

function uptime(): number {
  return 0;
}

function userInfo(options: { encoding: string } = { encoding: 'utf-8' }): {
  username: string;
  uid: number;
  gid: number;
  shell: string;
  homedir: string;
} {
  return {
    username: '',
    uid: -1,
    gid: -1,
    shell: '',
    homedir: '/',
  };
}

// Export the os module interface
export const os = {
  EOL,
  arch,
  constants,
  cpus,
  endianness,
  freemem,
  getPriority,
  homedir,
  hostname,
  loadavg,
  networkInterfaces,
  platform,
  release,
  setPriority,
  tmpdir,
  totalmem,
  type,
  uptime,
  userInfo,
};

// Make os available globally
declare const global: any;

if (typeof globalThis !== 'undefined') {
  (globalThis as any).os = os;
}

if (typeof global !== 'undefined') {
  global.os = os;
}

// Also make it available in the current scope
(self as any).os = os;

export default os;
