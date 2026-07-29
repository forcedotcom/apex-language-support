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
 * Roles whose heap should track the user's `jsHeapSizeGB` setting.
 *
 * Only the data owner holds state that scales with workspace size (the full
 * symbol graph), so it is the sole worker that inherits the custom heap limit.
 * Enrichment (lspRequest) workers hold bounded per-request symbol subsets, the
 * resource loader holds the fixed-size stdlib, and compilation sub-workers
 * process one file at a time — none of them benefit from a larger heap, and
 * applying it to every worker would over-commit system memory.
 */
const HEAP_LIMITED_ROLES = new Set<string>(['dataOwner']);

/**
 * Collects role-specific profile output directories that need to be
 * created before the worker starts. The caller is responsible for
 * creating them (the builder is pure — no fs side effects).
 *
 * `maxOldGenerationSizeMb`, when present, must be passed to the Worker
 * constructor via `resourceLimits` — NOT as a `--max-old-space-size` execArgv
 * flag, which `worker_threads` rejects as an "invalid execArgv flag".
 */
export interface BuildResult {
  readonly execArgv: string[];
  readonly profileDirs: string[];
  readonly maxOldGenerationSizeMb?: number;
}

export function buildWorkerExecArgv(opts: WorkerExecArgvOptions): BuildResult {
  const parentArgv = opts.parentExecArgv ?? process.execArgv;
  const execArgv: string[] = [];
  const profileDirs: string[] = [];
  let maxOldGenerationSizeMb: number | undefined;

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
      // `--max-old-space-size` is rejected by the Worker constructor as an
      // invalid execArgv flag, so it must NOT be forwarded. Translate it into
      // a resourceLimits value, and only for roles whose heap should scale
      // with the workspace (see HEAP_LIMITED_ROLES).
      if (HEAP_LIMITED_ROLES.has(opts.role)) {
        const mb = Number(arg.slice('--max-old-space-size='.length));
        if (Number.isFinite(mb) && mb > 0) {
          maxOldGenerationSizeMb = mb;
        }
      }
      continue;
    }
  }

  return { execArgv, profileDirs, maxOldGenerationSizeMb };
}
