/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createWorkerAssistancePort } from '../../src/services/assistance/WorkerAssistancePort';

describe('createWorkerAssistancePort', () => {
  it.each([
    [
      'findOccurrenceCandidates',
      'dataOwner:FindOccurrenceCandidates',
      { symbolName: 'Foo', skipTextFilter: true },
    ],
    [
      'checkMemberConflicts',
      'dataOwner:CheckMemberConflicts',
      {
        definingTypeFqn: 'A',
        newName: 'b',
        memberKind: 'field',
        isRenamedMemberPrivate: false,
      },
    ],
    [
      'resolveMethodRenameFamily',
      'dataOwner:ResolveMethodRenameFamily',
      { definingTypeFqn: 'A', methodName: 'm', isStatic: false },
    ],
  ] as const)(
    '%s sends a blocking %s request with the params and returns the response',
    async (method, wireMethod, params) => {
      const response = { ok: true };
      const transport = vi.fn().mockResolvedValue(response);
      const port = createWorkerAssistancePort(transport);

      await expect(
        (port[method] as (p: unknown) => Promise<unknown>)(params),
      ).resolves.toBe(response);
      expect(transport).toHaveBeenCalledExactlyOnceWith(
        wireMethod,
        params,
        true,
      );
    },
  );

  it('propagates transport rejections so callers own the fallback policy', async () => {
    const boom = new Error('bus down');
    const port = createWorkerAssistancePort(vi.fn().mockRejectedValue(boom));

    await expect(
      port.checkMemberConflicts({
        definingTypeFqn: 'A',
        newName: 'b',
        memberKind: 'method',
        isRenamedMemberPrivate: true,
      }),
    ).rejects.toBe(boom);
  });

  it('exposes the raw transport for cross-file substrate queries', () => {
    const transport = vi.fn();
    expect(createWorkerAssistancePort(transport).transport).toBe(transport);
  });
});
