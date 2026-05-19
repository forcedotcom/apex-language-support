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
      role: 'compilation',
      parentExecArgv: ['--heap-prof', '--heap-prof-dir=/tmp/profiles'],
    });
    expect(result.execArgv).toEqual([
      '--heap-prof',
      '--heap-prof-dir=/tmp/profiles/compilation',
    ]);
    expect(result.profileDirs).toEqual(['/tmp/profiles/compilation']);
  });

  it('handles both cpu and heap profiling together', () => {
    const result = buildWorkerExecArgv({
      role: 'enrichmentSearch',
      parentExecArgv: [
        '--cpu-prof',
        '--cpu-prof-dir=/tmp/p',
        '--heap-prof',
        '--heap-prof-dir=/tmp/p',
      ],
    });
    expect(result.execArgv).toEqual([
      '--cpu-prof',
      '--cpu-prof-dir=/tmp/p/enrichmentSearch',
      '--heap-prof',
      '--heap-prof-dir=/tmp/p/enrichmentSearch',
    ]);
    expect(result.profileDirs).toEqual([
      '/tmp/p/enrichmentSearch',
      '/tmp/p/enrichmentSearch',
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

  it('passes through --max-old-space-size', () => {
    const { execArgv } = buildWorkerExecArgv({
      role: 'dataOwner',
      parentExecArgv: ['--max-old-space-size=4096'],
    });
    expect(execArgv).toEqual(['--max-old-space-size=4096']);
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
      role: 'resourceLoader',
      parentExecArgv: [
        '--nolazy',
        '--inspect=6009',
        '--cpu-prof',
        '--cpu-prof-dir=/tmp/p',
        '--enable-source-maps',
        '--max-old-space-size=2048',
      ],
    });
    expect(result.execArgv).toEqual([
      '--nolazy',
      '--inspect=0',
      '--cpu-prof',
      '--cpu-prof-dir=/tmp/p/resourceLoader',
      '--enable-source-maps',
      '--max-old-space-size=2048',
    ]);
    expect(result.profileDirs).toEqual(['/tmp/p/resourceLoader']);
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
