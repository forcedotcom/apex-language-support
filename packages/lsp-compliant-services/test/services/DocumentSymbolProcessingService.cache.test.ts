/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import { DocumentSymbolProcessingService } from '../../src/services/DocumentSymbolProcessingService';
import { DocumentSymbolResultStore } from '../../src/services/DocumentSymbolResultStore';

const mockProvideDocumentSymbols = jest.fn();

jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../src/documentSymbol/ApexDocumentSymbolProvider', () => ({
  DefaultApexDocumentSymbolProvider: jest.fn().mockImplementation(() => ({
    provideDocumentSymbols: mockProvideDocumentSymbols,
  })),
}));

describe('DocumentSymbolProcessingService cache behavior', () => {
  let service: DocumentSymbolProcessingService;
  let mockStorage: { getDocument: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    DocumentSymbolResultStore.getInstance().clear();

    mockStorage = {
      getDocument: jest.fn(),
    };
    const {
      ApexStorageManager,
    } = require('../../src/storage/ApexStorageManager');
    ApexStorageManager.getInstance.mockReturnValue({
      getStorage: () => mockStorage,
    });

    service = new DocumentSymbolProcessingService(getLogger(), {
      findSymbolsInFile: jest.fn(() => []),
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
