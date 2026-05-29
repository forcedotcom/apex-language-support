/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RemoteWorkspaceLoadCoordinator } from '../src/RemoteWorkspaceLoadCoordinator';

describe('RemoteWorkspaceLoadCoordinator', () => {
  it('forwards ensureLoaded to the assistance proxy with the correct method', async () => {
    const requestAssistance = jest.fn().mockResolvedValue(undefined);
    const coordinator = new RemoteWorkspaceLoadCoordinator(requestAssistance);

    await coordinator.ensureLoaded('token-123');

    expect(requestAssistance).toHaveBeenCalledTimes(1);
    expect(requestAssistance).toHaveBeenCalledWith(
      'coordinator:EnsureWorkspaceLoaded',
      { workDoneToken: 'token-123' },
      true,
    );
  });

  it('forwards undefined token when none provided', async () => {
    const requestAssistance = jest.fn().mockResolvedValue(undefined);
    const coordinator = new RemoteWorkspaceLoadCoordinator(requestAssistance);

    await coordinator.ensureLoaded();

    expect(requestAssistance).toHaveBeenCalledWith(
      'coordinator:EnsureWorkspaceLoaded',
      { workDoneToken: undefined },
      true,
    );
  });

  it('propagates assistance proxy rejections', async () => {
    const requestAssistance = jest
      .fn()
      .mockRejectedValue(new Error('bus down'));
    const coordinator = new RemoteWorkspaceLoadCoordinator(requestAssistance);

    await expect(coordinator.ensureLoaded()).rejects.toThrow('bus down');
  });
});
