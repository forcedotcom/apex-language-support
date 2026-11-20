/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import type { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ReferencesProcessingService } from '../../src/services/ReferencesProcessingService';
import type { WorkerAssistancePort } from '../../src/services/assistance/WorkerAssistancePort';

const req = {
  textDocument: { uri: 'file:///Foo.cls' },
  position: { line: 0, character: 0 },
  context: { includeDeclaration: true },
};

describe('ReferencesProcessingService', () => {
  it('returns no references when no assistance port is installed', async () => {
    const service = new ReferencesProcessingService(
      getLogger(),
      {} as ISymbolManager,
    );

    await expect(
      Effect.runPromise(service.resolveReferences(req)),
    ).resolves.toEqual([]);
  });

  it('declines without querying the data owner when the cursor file has no text', async () => {
    const port: WorkerAssistancePort = {
      transport: vi.fn(),
      findOccurrenceCandidates: vi.fn(),
      checkMemberConflicts: vi.fn(),
      resolveMethodRenameFamily: vi.fn(),
    };
    const service = new ReferencesProcessingService(getLogger(), {
      getSymbolTableForFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as ISymbolManager);
    service.setAssistancePort(port);

    await expect(
      Effect.runPromise(service.resolveReferences(req)),
    ).resolves.toEqual([]);
    expect(port.findOccurrenceCandidates).not.toHaveBeenCalled();
  });
});
