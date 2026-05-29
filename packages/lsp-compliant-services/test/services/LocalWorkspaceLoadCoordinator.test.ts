/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { Connection } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { LocalWorkspaceLoadCoordinator } from '../../src/services/LocalWorkspaceLoadCoordinator';

const mockEnsureWorkspaceLoaded = jest.fn();
jest.mock('../../src/services/WorkspaceLoadCoordinator', () => ({
  ensureWorkspaceLoaded: jest.fn((...args: unknown[]) =>
    mockEnsureWorkspaceLoaded(...args),
  ),
}));

function createSpyLogger(): LoggerInterface {
  const noop = () => {};
  return {
    info: noop,
    debug: noop,
    warn: noop,
    error: noop,
    log: noop,
    alwaysLog: noop,
  } as unknown as LoggerInterface;
}

describe('LocalWorkspaceLoadCoordinator', () => {
  let connection: Connection;
  let logger: LoggerInterface;

  beforeEach(() => {
    jest.clearAllMocks();
    connection = { sendNotification: jest.fn() } as unknown as Connection;
    logger = createSpyLogger();
    mockEnsureWorkspaceLoaded.mockReturnValue(Effect.succeed(undefined));
  });

  it('forwards connection, logger, and workDoneToken to ensureWorkspaceLoaded', async () => {
    const coordinator = new LocalWorkspaceLoadCoordinator(connection, logger);

    await coordinator.ensureLoaded('token-xyz');

    expect(mockEnsureWorkspaceLoaded).toHaveBeenCalledWith(
      connection,
      logger,
      'token-xyz',
    );
  });

  it('calls ensureWorkspaceLoaded with undefined token when none provided', async () => {
    const coordinator = new LocalWorkspaceLoadCoordinator(connection, logger);

    await coordinator.ensureLoaded();

    expect(mockEnsureWorkspaceLoaded).toHaveBeenCalledWith(
      connection,
      logger,
      undefined,
    );
  });

  it('propagates Effect failures as rejected promises', async () => {
    mockEnsureWorkspaceLoaded.mockReturnValue(Effect.fail('boom'));
    const coordinator = new LocalWorkspaceLoadCoordinator(connection, logger);

    await expect(coordinator.ensureLoaded()).rejects.toBeDefined();
  });
});
