/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ServiceFactory } from '../../src/factories/ServiceFactory';
import type { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import { createMockLogger } from '../utils/mockLogger';

describe('ServiceFactory', () => {
  it('creates a semantic-token service using request-pool storage', async () => {
    const uri = 'file:///Example.cls';
    const storage = {
      getDocument: vi
        .fn()
        .mockResolvedValue(TextDocument.create(uri, 'apex', 1, 'class A {}')),
    } as Pick<ApexStorageInterface, 'getDocument'>;
    const factory = new ServiceFactory({
      logger: createMockLogger(),
      symbolManager: {} as any,
      storageManager: { getStorage: () => storage } as any,
      settingsManager: {} as any,
    });

    await expect(
      factory.createSemanticTokensService().processSemanticTokens(uri),
    ).resolves.toEqual({ data: [0, 6, 1, 1, 1] });
    expect(storage.getDocument).toHaveBeenCalledWith(uri);
  });
});
