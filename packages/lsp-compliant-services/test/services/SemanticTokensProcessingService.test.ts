/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { SemanticTokensProcessingService } from '../../src';
import type { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import { createMockLogger } from '../utils/mockLogger';

function decode(data: readonly number[]) {
  let line = 0;
  let character = 0;
  return data.reduce<{ line: number; character: number; type: number }[]>(
    (tokens, value, index) => {
      if (index % 5 !== 0) return tokens;
      line += value;
      character = value === 0 ? character + data[index + 1] : data[index + 1];
      tokens.push({ line, character, type: data[index + 3] });
      return tokens;
    },
    [],
  );
}

describe('SemanticTokensProcessingService', () => {
  const uri = 'file:///Example.cls';
  let storage: Pick<ApexStorageInterface, 'getDocument'>;

  beforeEach(() => {
    storage = { getDocument: vi.fn() };
  });

  it('encodes fresh Tier 1 tokens from the stored document', async () => {
    vi.mocked(storage.getDocument).mockResolvedValue(
      TextDocument.create(uri, 'apex', 1, 'class Example {}'),
    );

    await expect(
      new SemanticTokensProcessingService(
        createMockLogger(),
        storage,
      ).processSemanticTokens(uri),
    ).resolves.toEqual({ data: [0, 6, 7, 1, 1] });
  });

  it('returns an empty valid response when the document is unavailable', async () => {
    vi.mocked(storage.getDocument).mockResolvedValue(null);

    await expect(
      new SemanticTokensProcessingService(
        createMockLogger(),
        storage,
      ).processSemanticTokens(uri),
    ).resolves.toEqual({ data: [] });
  });

  it('recompiles current text after an edit at the same URI', async () => {
    vi.mocked(storage.getDocument)
      .mockResolvedValueOnce(TextDocument.create(uri, 'apex', 1, 'class A {}'))
      .mockResolvedValueOnce(
        TextDocument.create(uri, 'apex', 2, 'class Longer {}'),
      );
    const service = new SemanticTokensProcessingService(
      createMockLogger(),
      storage,
    );

    await expect(service.processSemanticTokens(uri)).resolves.toEqual({
      data: [0, 6, 1, 1, 1],
    });
    await expect(service.processSemanticTokens(uri)).resolves.toEqual({
      data: [0, 6, 6, 1, 1],
    });
  });

  it('preserves parser-confirmed evidence when the document has syntax errors', async () => {
    vi.mocked(storage.getDocument).mockResolvedValue(
      TextDocument.create(
        uri,
        'apex',
        1,
        "class Example { String value = 'ok';",
      ),
    );

    await expect(
      new SemanticTokensProcessingService(
        createMockLogger(),
        storage,
      ).processSemanticTokens(uri),
    ).resolves.toMatchObject({ data: expect.arrayContaining([0, 6, 7, 1, 1]) });
  });

  it('retains unrelated evidence when an ambiguous chain is omitted', async () => {
    vi.mocked(storage.getDocument).mockResolvedValue(
      TextDocument.create(
        uri,
        'apex',
        1,
        "class Example { void run() { missing.call(); String value = 'ok'; } }",
      ),
    );

    const result = await new SemanticTokensProcessingService(
      createMockLogger(),
      storage,
    ).processSemanticTokens(uri);

    expect(decode(result.data)).toEqual(
      expect.arrayContaining([
        { line: 0, character: 6, type: 1 },
        { line: 0, character: 21, type: 9 },
        { line: 0, character: 60, type: 12 },
      ]),
    );
  });
});
