/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { HoverHandler } from '../../src/handlers/HoverHandler';
import { LSPQueueManager } from '../../src/queue';

vi.mock('../../src/queue', () => ({
  LSPQueueManager: {
    getInstance: vi.fn(),
  },
}));

describe('HoverHandler', () => {
  const mockLogger = {
    debug: vi.fn(),
    error: vi.fn(),
  } as any;

  const params = {
    textDocument: { uri: 'memfs:/workspace/Test.cls' },
    position: { line: 1, character: 1 },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules timeout follow-up and returns null on hover timeout', async () => {
    const queueManager = {
      submitHoverRequest: vi
        .fn()
        .mockRejectedValue(
          new Error("TimeoutException: timed out after '100ms'"),
        ),
      getStats: vi.fn(),
    };
    (LSPQueueManager.getInstance as Mock).mockReturnValue(queueManager);

    const hoverProcessor = {
      processHover: vi.fn(),
      scheduleTimeoutFollowup: vi.fn().mockResolvedValue(undefined),
    };

    const handler = new HoverHandler(mockLogger, hoverProcessor as any);
    const result = await handler.handleHover(params);

    expect(result).toBeNull();
    expect(hoverProcessor.scheduleTimeoutFollowup).toHaveBeenCalledWith(params);
    expect(hoverProcessor.processHover).not.toHaveBeenCalled();
  });
});
