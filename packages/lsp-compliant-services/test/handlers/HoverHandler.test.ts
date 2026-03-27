/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HoverHandler } from '../../src/handlers/HoverHandler';
import { LSPQueueManager } from '../../src/queue';

jest.mock('../../src/queue', () => ({
  LSPQueueManager: {
    getInstance: jest.fn(),
  },
}));

describe('HoverHandler', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  } as any;

  const params = {
    textDocument: { uri: 'memfs:/workspace/Test.cls' },
    position: { line: 1, character: 1 },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules timeout follow-up and returns null on hover timeout', async () => {
    const queueManager = {
      submitHoverRequest: jest
        .fn()
        .mockRejectedValue(
          new Error("TimeoutException: timed out after '100ms'"),
        ),
      getStats: jest.fn(),
    };
    (LSPQueueManager.getInstance as jest.Mock).mockReturnValue(queueManager);

    const hoverProcessor = {
      processHover: jest.fn(),
      scheduleTimeoutFollowup: jest.fn().mockResolvedValue(undefined),
    };

    const handler = new HoverHandler(mockLogger, hoverProcessor as any);
    const result = await handler.handleHover(params);

    expect(result).toBeNull();
    expect(hoverProcessor.scheduleTimeoutFollowup).toHaveBeenCalledWith(params);
    expect(hoverProcessor.processHover).not.toHaveBeenCalled();
  });
});
