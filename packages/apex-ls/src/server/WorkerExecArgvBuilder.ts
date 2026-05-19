/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export interface WorkerExecArgvOptions {
  readonly role: string;
  readonly parentExecArgv?: readonly string[];
}

const PASSTHROUGH_FLAGS = new Set([
  '--cpu-prof',
  '--heap-prof',
  '--enable-source-maps',
  '--nolazy',
]);

function isPassthroughFlag(flag: string): boolean {
  return PASSTHROUGH_FLAGS.has(flag);
}

/**
 * Collects role-specific profile output directories that need to be
 * created before the worker starts. The caller is responsible for
 * creating them (the builder is pure — no fs side effects).
 */
export interface BuildResult {
  readonly execArgv: string[];
  readonly profileDirs: string[];
}

export function buildWorkerExecArgv(opts: WorkerExecArgvOptions): BuildResult {
  const parentArgv = opts.parentExecArgv ?? process.execArgv;
  const execArgv: string[] = [];
  const profileDirs: string[] = [];

  for (const arg of parentArgv) {
    if (isPassthroughFlag(arg)) {
      execArgv.push(arg);
      continue;
    }

    if (arg.startsWith('--cpu-prof-dir=')) {
      const baseDir = arg.slice('--cpu-prof-dir='.length);
      const roleDir = `${baseDir}/${opts.role}`;
      profileDirs.push(roleDir);
      execArgv.push(`--cpu-prof-dir=${roleDir}`);
      continue;
    }

    if (arg.startsWith('--heap-prof-dir=')) {
      const baseDir = arg.slice('--heap-prof-dir='.length);
      const roleDir = `${baseDir}/${opts.role}`;
      profileDirs.push(roleDir);
      execArgv.push(`--heap-prof-dir=${roleDir}`);
      continue;
    }

    if (arg.startsWith('--inspect=') || arg.startsWith('--inspect-brk=')) {
      execArgv.push('--inspect=0');
      continue;
    }

    if (arg.startsWith('--max-old-space-size=')) {
      execArgv.push(arg);
      continue;
    }
  }

  return { execArgv, profileDirs };
}
