/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { DocumentSymbolProcessingService } from '../../src/services/DocumentSymbolProcessingService';
import { DocumentSymbolResultStore } from '../../src/services/DocumentSymbolResultStore';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

const mockProvideDocumentSymbols = vi.fn();

vi.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: vi.fn(),
  },
}));

vi.mock('../../src/documentSymbol/ApexDocumentSymbolProvider', () => ({
  DefaultApexDocumentSymbolProvider: class {
    provideDocumentSymbols = mockProvideDocumentSymbols;
  },
}));

describe('DocumentSymbolProcessingService cache behavior', () => {
  let service: DocumentSymbolProcessingService;
  let mockStorage: { getDocument: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    DocumentSymbolResultStore.getInstance().clear();

    mockStorage = {
      getDocument: vi.fn(),
    };
    (ApexStorageManager.getInstance as Mock).mockReturnValue({
      getStorage: () => mockStorage,
    });

    service = new DocumentSymbolProcessingService(getLogger(), {
      findSymbolsInFile: vi.fn(() => []),
    } as any);
  });

  it('returns cached symbols for same URI/version', async () => {
    const uri = 'file:///cachehit.cls';
    mockStorage.getDocument.mockResolvedValue({ version: 5 });
    mockProvideDocumentSymbols.mockReturnValue(Effect.succeed([{ name: 'A' }]));

    const first = await service.processDocumentSymbol({
      textDocument: { uri },
    });
    const second = await service.processDocumentSymbol({
      textDocument: { uri },
    });

    expect(first).toEqual([{ name: 'A' }]);
    expect(second).toEqual([{ name: 'A' }]);
    expect(mockProvideDocumentSymbols).toHaveBeenCalledTimes(1);
  });

  it('recomputes when version changes', async () => {
    const uri = 'file:///versionchange.cls';
    mockStorage.getDocument
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 2 })
      .mockResolvedValueOnce({ version: 2 });
    mockProvideDocumentSymbols
      .mockReturnValueOnce(Effect.succeed([{ name: 'V1' }]))
      .mockReturnValueOnce(Effect.succeed([{ name: 'V2' }]));

    const first = await service.processDocumentSymbol({
      textDocument: { uri },
    });
    const second = await service.processDocumentSymbol({
      textDocument: { uri },
    });

    expect(first).toEqual([{ name: 'V1' }]);
    expect(second).toEqual([{ name: 'V2' }]);
    expect(mockProvideDocumentSymbols).toHaveBeenCalledTimes(2);
  });
});
