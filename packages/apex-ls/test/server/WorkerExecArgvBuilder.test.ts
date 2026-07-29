/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { buildWorkerExecArgv } from '../../src/server/WorkerExecArgvBuilder';

describe('buildWorkerExecArgv', () => {
  it('returns empty arrays when parent has no relevant flags', () => {
    const result = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--some-unknown-flag'],
    });
    expect(result.execArgv).toEqual([]);
    expect(result.profileDirs).toEqual([]);
  });

  it('passes through --cpu-prof and appends role to --cpu-prof-dir', () => {
    const result = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--cpu-prof', '--cpu-prof-dir=/tmp/profiles'],
    });
    expect(result.execArgv).toEqual([
      '--cpu-prof',
      '--cpu-prof-dir=/tmp/profiles/dataOwner',
    ]);
    expect(result.profileDirs).toEqual(['/tmp/profiles/dataOwner']);
  });

  it('passes through --heap-prof and appends role to --heap-prof-dir', () => {
    const result = buildWorkerExecArgv({
      role: 'compilerWorker',
      parentExecArgv: ['--heap-prof', '--heap-prof-dir=/tmp/profiles'],
    });
    expect(result.execArgv).toEqual([
      '--heap-prof',
      '--heap-prof-dir=/tmp/profiles/compilerWorker',
    ]);
    expect(result.profileDirs).toEqual(['/tmp/profiles/compilerWorker']);
  });

  it('handles both cpu and heap profiling together', () => {
    const result = buildWorkerExecArgv({
      role: 'lspRequest',
      parentExecArgv: [
        '--cpu-prof',
        '--cpu-prof-dir=/tmp/p',
        '--heap-prof',
        '--heap-prof-dir=/tmp/p',
      ],
    });
    expect(result.execArgv).toEqual([
      '--cpu-prof',
      '--cpu-prof-dir=/tmp/p/lspRequest',
      '--heap-prof',
      '--heap-prof-dir=/tmp/p/lspRequest',
    ]);
    expect(result.profileDirs).toEqual([
      '/tmp/p/lspRequest',
      '/tmp/p/lspRequest',
    ]);
  });

  it('replaces --inspect=PORT with --inspect=0', () => {
    const { execArgv } = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--inspect=6009'],
    });
    expect(execArgv).toEqual(['--inspect=0']);
  });

  it('replaces --inspect-brk=PORT with --inspect=0', () => {
    const { execArgv } = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--inspect-brk=6009'],
    });
    expect(execArgv).toEqual(['--inspect=0']);
  });

  // --max-old-space-size is NOT a legal worker_threads execArgv flag; the
  // Worker constructor throws "invalid execArgv flags" on it. It must be
  // surfaced as a resourceLimits.maxOldGenerationSizeMb value instead, and
  // only for the data owner (the worker whose heap actually scales with the
  // workspace symbol graph).
  it('never passes --max-old-space-size through to execArgv', () => {
    for (const role of [
      'dataOwner',
      'lspRequest',
      'resourceLoader',
      'compiler',
    ] as const) {
      const { execArgv } = buildWorkerExecArgv({
        role,
        parentExecArgv: ['--max-old-space-size=4096'],
      });
      expect(execArgv).not.toContain('--max-old-space-size=4096');
      expect(execArgv).toEqual([]);
    }
  });

  it('surfaces --max-old-space-size as maxOldGenerationSizeMb for dataOwner', () => {
    const result = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--max-old-space-size=12288'],
    });
    expect(result.maxOldGenerationSizeMb).toBe(12288);
    expect(result.execArgv).toEqual([]);
  });

  it('omits maxOldGenerationSizeMb for non-dataOwner roles', () => {
    for (const role of ['lspRequest', 'resourceLoader', 'compiler'] as const) {
      const result = buildWorkerExecArgv({
        role,
        parentExecArgv: ['--max-old-space-size=12288'],
      });
      expect(result.maxOldGenerationSizeMb).toBeUndefined();
    }
  });

  it('leaves maxOldGenerationSizeMb undefined when no heap flag is present', () => {
    const result = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--enable-source-maps'],
    });
    expect(result.maxOldGenerationSizeMb).toBeUndefined();
  });

  it('ignores a malformed --max-old-space-size value', () => {
    const result = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--max-old-space-size=not-a-number'],
    });
    expect(result.maxOldGenerationSizeMb).toBeUndefined();
    expect(result.execArgv).toEqual([]);
  });

  it('passes through --enable-source-maps and --nolazy', () => {
    const { execArgv } = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--enable-source-maps', '--nolazy'],
    });
    expect(execArgv).toEqual(['--enable-source-maps', '--nolazy']);
  });

  it('handles a full combination of flags', () => {
    const result = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: [
        '--nolazy',
        '--inspect=6009',
        '--cpu-prof',
        '--cpu-prof-dir=/tmp/p',
        '--enable-source-maps',
        '--max-old-space-size=2048',
      ],
    });
    // --max-old-space-size is stripped from execArgv (illegal for workers)
    // and surfaced separately as a resourceLimits value.
    expect(result.execArgv).toEqual([
      '--nolazy',
      '--inspect=0',
      '--cpu-prof',
      '--cpu-prof-dir=/tmp/p/dataOwner',
      '--enable-source-maps',
    ]);
    expect(result.maxOldGenerationSizeMb).toBe(2048);
    expect(result.profileDirs).toEqual(['/tmp/p/dataOwner']);
  });

  it('defaults to process.execArgv when parentExecArgv is not provided', () => {
    const original = process.execArgv;
    try {
      process.execArgv = ['--enable-source-maps'];
      const { execArgv } = buildWorkerExecArgv({ role: 'dataOwner' });
      expect(execArgv).toEqual(['--enable-source-maps']);
    } finally {
      process.execArgv = original;
    }
  });

  it('reports no profileDirs when profiling is not enabled', () => {
    const { profileDirs } = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--inspect=6009', '--nolazy'],
    });
    expect(profileDirs).toEqual([]);
  });
});
