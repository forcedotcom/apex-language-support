/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import type { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { CompletionProcessingService } from '../../src/services/CompletionProcessingService';
import { HoverProcessingService } from '../../src/services/HoverProcessingService';
import { DefinitionProcessingService } from '../../src/services/DefinitionProcessingService';

jest.mock('../../src/storage/ApexStorageManager');

describe('incomplete semantic state propagation', () => {
  const uri = 'file:///test/ActivelyEdited.cls';
  const params = {
    textDocument: { uri },
    position: { line: 2, character: 8 },
  };

  function createIncompleteManager() {
    return {
      createResolutionContext: jest.fn().mockResolvedValue({
        sourceFile: uri,
        importStatements: [],
        namespaceContext: '',
        currentScope: 'unknown',
        scopeChain: [],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
        semanticState: 'incomplete',
      }),
      getReferencesAtPosition: jest.fn().mockResolvedValue([]),
      getIncompleteMemberAccessAtPosition: jest.fn(),
      getSymbolAtPosition: jest.fn(),
    } as unknown as ISymbolManager & {
      getReferencesAtPosition: jest.Mock;
      getIncompleteMemberAccessAtPosition: jest.Mock;
      getSymbolAtPosition: jest.Mock;
    };
  }

  it('returns a retryable empty completion result', async () => {
    const manager = createIncompleteManager();
    const document = TextDocument.create(
      uri,
      'apex',
      2,
      'public class ActivelyEdited {\n  void run() {\n    value.\n  }\n}',
    );
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: () => ({
        getDocument: jest.fn().mockResolvedValue(document),
      }),
    });

    const service = new CompletionProcessingService(getLogger(), manager);
    const result = await service.processCompletionWithReadiness(params);

    expect(result).toEqual({ items: [], isIncomplete: true });
    expect(manager.getIncompleteMemberAccessAtPosition).not.toHaveBeenCalled();
  });

  it('returns no hover without attempting symbol resolution', async () => {
    const manager = createIncompleteManager();
    const service = new HoverProcessingService(getLogger(), manager);

    await expect(service.processHover(params)).resolves.toBeNull();
    expect(manager.getReferencesAtPosition).not.toHaveBeenCalled();
    expect(manager.getSymbolAtPosition).not.toHaveBeenCalled();
  });

  it('returns no definition without launching fallback resolution', async () => {
    const manager = createIncompleteManager();
    const service = new DefinitionProcessingService(getLogger(), manager);

    await expect(service.processDefinition(params)).resolves.toEqual([]);
    expect(manager.getReferencesAtPosition).not.toHaveBeenCalled();
    expect(manager.getSymbolAtPosition).not.toHaveBeenCalled();
  });
});
