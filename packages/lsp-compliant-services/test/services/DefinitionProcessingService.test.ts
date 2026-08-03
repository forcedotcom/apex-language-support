/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DefinitionParams } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { DefinitionProcessingService } from '../../src/services/DefinitionProcessingService';
import { LayerEnrichmentService } from '../../src/services/LayerEnrichmentService';
import { PrerequisiteOrchestrationService } from '../../src/services/PrerequisiteOrchestrationService';
import { ApexSymbol } from '@salesforce/apex-lsp-parser-ast';
import * as WorkspaceLoadCoordinator from '../../src/services/WorkspaceLoadCoordinator';

describe('DefinitionProcessingService', () => {
  let service: DefinitionProcessingService;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create service instance
    service = new DefinitionProcessingService(logger);
  });

  describe('processDefinition', () => {
    it('honors externally prepared execution without rerunning prerequisites', async () => {
      const prerequisiteSpy = jest
        .spyOn(
          PrerequisiteOrchestrationService.prototype,
          'runPrerequisitesForLspRequestType',
        )
        .mockResolvedValue();
      const receiverType = {
        id: 'receiver-class-id',
        name: 'ReceiverClass',
        kind: 'class',
        fileUri: 'file:///test/ReceiverClass.cls',
        parentId: null,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 1,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 26,
          },
        },
      } as unknown as ApexSymbol;
      const symbolManager = {
        getReferencesAtPosition: jest.fn().mockResolvedValue([
          {
            name: 'this',
            location: {
              identifierRange: {
                startLine: 5,
                startColumn: 4,
                endLine: 5,
                endColumn: 8,
              },
            },
          },
        ]),
        getReceiverKeywordTargetAtPosition: jest
          .fn()
          .mockResolvedValue(receiverType),
        getSymbolAtPosition: jest.fn(),
      };
      const receiverService = new DefinitionProcessingService(
        logger,
        symbolManager as any,
      );
      receiverService.setLayerEnrichmentService({} as LayerEnrichmentService);

      const result = await receiverService.processDefinition(
        {
          textDocument: { uri: 'file:///test/ReceiverClass.cls' },
          position: { line: 4, character: 6 },
        },
        { prerequisitesPrepared: true },
      );

      expect(result).toEqual([
        expect.objectContaining({ uri: 'file:///test/ReceiverClass.cls' }),
      ]);
      expect(
        symbolManager.getReceiverKeywordTargetAtPosition,
      ).toHaveBeenCalled();
      expect(symbolManager.getSymbolAtPosition).not.toHaveBeenCalled();
      expect(prerequisiteSpy).not.toHaveBeenCalled();

      await receiverService.processDefinition({
        textDocument: { uri: 'file:///test/ReceiverClass.cls' },
        position: { line: 4, character: 6 },
      });
      expect(prerequisiteSpy).toHaveBeenCalledWith(
        'definition',
        'file:///test/ReceiverClass.cls',
      );
    });

    it('should return definition location for valid request', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'doSomething',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockResolvedValue([mockTypeReference] as any);
      jest
        .spyOn(service['symbolManager'], 'createResolutionContext')
        .mockResolvedValue({ semanticState: 'complete' } as any);

      // Mock symbol manager to return a symbol
      const mockSymbol = {
        id: 'do-something-id',
        name: 'doSomething',
        kind: 'method',
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        fileUri: 'file:///test/TestClass.cls',
        parentId: null,
        key: {
          prefix: 'method',
          name: 'doSomething',
          path: ['file:///test/TestClass.cls', 'doSomething'],
          unifiedId: 'do-something-id',
          fileUri: 'file:///test/TestClass.cls',
          kind: 'method',
        },
        parentKey: null,
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          isPublic: true,
          isPrivate: false,
          isProtected: false,
          isGlobal: false,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTest: false,
        },
        parent: null,
      };
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockResolvedValue(mockSymbol as unknown as ApexSymbol);

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'file:///test/TestClass.cls',
            range: expect.any(Object),
          }),
        ]),
      );
    });

    it('should handle no symbol found gracefully', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'unresolvedSymbol',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockResolvedValue([mockTypeReference] as any);
      jest
        .spyOn(service['symbolManager'], 'createResolutionContext')
        .mockResolvedValue({ semanticState: 'complete' } as any);

      // Mock symbol manager to return no symbol
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockResolvedValue(null);

      // Mock missing artifact utils to return not-found
      jest
        .spyOn(
          service['missingArtifactUtils'],
          'tryResolveMissingArtifactBlocking',
        )
        .mockResolvedValue('not-found');

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'doSomething',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockResolvedValue([mockTypeReference] as any);
      jest
        .spyOn(service['symbolManager'], 'createResolutionContext')
        .mockResolvedValue({ semanticState: 'complete' } as any);

      // Mock symbol manager to throw an error
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockImplementation(() => {
          throw new Error('Symbol manager error');
        });

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeNull();
    });

    it('should return empty array when position is on keyword', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 2, character: 4 }, // Position on "if" keyword
      };

      // Mock isWorkspaceLoaded to return true so missing artifact resolution is not triggered
      jest
        .spyOn(WorkspaceLoadCoordinator, 'isWorkspaceLoaded')
        .mockReturnValue(true);

      // Keywords don't have TypeReferences - getReferencesAtPosition returns empty array
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockResolvedValue([]);

      // Spy on getSymbolAtPosition to verify it's not called
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockResolvedValue(null);

      // Spy on tryResolveMissingArtifactBlocking to verify it's not called
      jest
        .spyOn(
          service['missingArtifactUtils'],
          'tryResolveMissingArtifactBlocking',
        )
        .mockResolvedValue('not-found');

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toEqual([]);
      // Verify getSymbolAtPosition was NOT called (short-circuited when no TypeReference)
      expect(
        service['symbolManager'].getSymbolAtPosition,
      ).not.toHaveBeenCalled();
      // Verify missing artifact resolution was NOT triggered
      expect(
        service['missingArtifactUtils'].tryResolveMissingArtifactBlocking,
      ).not.toHaveBeenCalled();
    });
  });

  describe('definition targets', () => {
    it('prefers an external definition target over graph ownership', async () => {
      const target = {
        uri: 'file:///workspace/objects/Account/fields/Name.field-meta.xml',
        range: {
          start: { line: 3, character: 2 },
          end: { line: 3, character: 6 },
        },
      };
      const symbol = {
        name: 'Name',
        kind: 'field',
        fileUri: 'apex-internal-sobject:/Account',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 4,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 4,
          },
        },
        definitionTarget: target,
      } as unknown as ApexSymbol;

      await expect(
        (service as any).createLocationFromSymbol(symbol),
      ).resolves.toEqual(target);
    });

    it('uses a target URI with the symbol range when no target range exists', async () => {
      const symbol = {
        name: 'Account',
        kind: 'sobject',
        fileUri: 'apex-internal-sobject:/Account',
        location: {
          symbolRange: {
            startLine: 4,
            startColumn: 0,
            endLine: 4,
            endColumn: 7,
          },
          identifierRange: {
            startLine: 4,
            startColumn: 0,
            endLine: 4,
            endColumn: 7,
          },
        },
        definitionTarget: { uri: 'sf-org-data:/Account' },
      } as unknown as ApexSymbol;

      await expect(
        (service as any).createLocationFromSymbol(symbol),
      ).resolves.toEqual({
        uri: 'sf-org-data:/Account',
        range: {
          start: { line: 3, character: 0 },
          end: { line: 3, character: 7 },
        },
      });
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'doSomething',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockResolvedValue([mockTypeReference] as any);

      // Mock symbol manager to return a symbol quickly
      const mockSymbol = {
        id: 'do-something-id',
        name: 'doSomething',
        kind: 'method',
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        fileUri: 'file:///test/TestClass.cls',
        parentId: null,
        key: {
          prefix: 'method',
          name: 'doSomething',
          path: ['file:///test/TestClass.cls', 'doSomething'],
          unifiedId: 'do-something-id',
          fileUri: 'file:///test/TestClass.cls',
          kind: 'method',
        },
        parentKey: null,
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          isPublic: true,
          isPrivate: false,
          isProtected: false,
          isGlobal: false,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTest: false,
        },
        parent: null,
      };
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockResolvedValue(mockSymbol as unknown as ApexSymbol);

      const startTime = Date.now();

      // Act
      const result = await service.processDefinition(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('exact chained-reference fallback', () => {
    const range = (startColumn: number, endColumn: number) => ({
      startLine: 3,
      startColumn,
      endLine: 3,
      endColumn,
    });

    const symbol = (
      id: string,
      name: string,
      fileUri: string,
      parentId: string | null = null,
    ) =>
      ({
        id,
        name,
        kind: parentId ? 'method' : 'class',
        fileUri,
        parentId,
      }) as unknown as ApexSymbol;

    const chain = (
      qualifierId: string | undefined,
      memberId: string | undefined,
    ) => {
      const qualifier = {
        name: 'DuplicateName',
        resolvedSymbolId: qualifierId,
        context: 'TYPE_REFERENCE',
        location: { identifierRange: range(0, 13) },
      };
      const member = {
        name: 'run',
        resolvedSymbolId: memberId,
        context: 'METHOD_CALL',
        location: { identifierRange: range(14, 17) },
      };
      return [
        {
          ...member,
          chainNodes: [qualifier, member],
        },
      ] as any;
    };

    it('uses the resolved edge when duplicate simple type and member names exist', async () => {
      const expectedOwner = symbol(
        'namespace-a-owner',
        'DuplicateName',
        'file:///namespace-a/DuplicateName.cls',
      );
      const expectedMember = symbol(
        'namespace-a-run',
        'run',
        expectedOwner.fileUri,
        expectedOwner.id,
      );
      const wrongOwner = symbol(
        'namespace-b-owner',
        'DuplicateName',
        'file:///namespace-b/DuplicateName.cls',
      );
      const wrongMember = symbol(
        'namespace-b-run',
        'run',
        wrongOwner.fileUri,
        wrongOwner.id,
      );
      const byId = new Map(
        [expectedOwner, expectedMember, wrongOwner, wrongMember].map(
          (entry) => [entry.id, entry],
        ),
      );
      const manager = {
        getSymbol: jest.fn(async (id: string) => byId.get(id) ?? null),
        findSymbolByName: jest.fn(),
      };
      const exactService = new DefinitionProcessingService(
        logger,
        manager as any,
      );

      const result = await exactService['tryResolveFromChainedRef'](
        chain(expectedOwner.id, expectedMember.id),
        { line: 3, character: 15 },
        'file:///consumer.cls',
      );

      expect(result).toBe(expectedMember);
      expect(manager.findSymbolByName).not.toHaveBeenCalled();
    });

    it('uses a parser-owned FQN without degrading it to a simple-name lookup', async () => {
      const expectedOwner = symbol(
        'namespace-a-owner',
        'DuplicateName',
        'file:///namespace-a/DuplicateName.cls',
      );
      const qualifier = {
        name: 'namespaceA.DuplicateName',
        context: 'TYPE_REFERENCE',
        location: { identifierRange: range(0, 24) },
      };
      const member = {
        name: 'run',
        context: 'METHOD_CALL',
        location: { identifierRange: range(25, 28) },
      };
      const references = [
        { ...member, chainNodes: [qualifier, member] },
      ] as any;
      const manager = {
        getSymbol: jest.fn(),
        findSymbolByFQN: jest
          .fn()
          .mockImplementation(async (fqn: string) =>
            fqn === qualifier.name ? expectedOwner : null,
          ),
        findSymbolByName: jest.fn(),
      };
      const exactService = new DefinitionProcessingService(
        logger,
        manager as any,
      );

      const result = await exactService['tryResolveFromChainedRef'](
        references,
        { line: 3, character: 10 },
        'file:///consumer.cls',
      );

      expect(result).toBe(expectedOwner);
      expect(manager.findSymbolByFQN).toHaveBeenCalledWith(qualifier.name);
      expect(manager.findSymbolByName).not.toHaveBeenCalled();
    });

    it('recovers a unique member only beneath the exactly resolved owner', async () => {
      const owner = symbol(
        'namespace-a-owner',
        'DuplicateName',
        'file:///namespace-a/DuplicateName.cls',
      );
      const ownerBlock = symbol(
        'namespace-a-block',
        'DuplicateName block',
        owner.fileUri,
        owner.id,
      );
      const expected = symbol(
        'namespace-a-run',
        'run',
        owner.fileUri,
        ownerBlock.id,
      );
      const unrelated = symbol(
        'namespace-a-other-run',
        'run',
        owner.fileUri,
        'different-owner',
      );
      const manager = {
        getSymbol: jest.fn(async (id: string) =>
          id === owner.id ? owner : null,
        ),
        findSymbolsInFile: jest
          .fn()
          .mockResolvedValue([owner, ownerBlock, expected, unrelated]),
      };
      const exactService = new DefinitionProcessingService(
        logger,
        manager as any,
      );

      const result = await exactService['tryResolveFromChainedRef'](
        chain(owner.id, undefined),
        { line: 3, character: 15 },
        'file:///consumer.cls',
      );

      expect(result).toBe(expected);
    });

    it('does not return a qualifier when the requested member is unresolved', async () => {
      const owner = symbol(
        'namespace-a-owner',
        'DuplicateName',
        'file:///namespace-a/DuplicateName.cls',
      );
      const manager = {
        getSymbol: jest.fn(async (id: string) =>
          id === owner.id ? owner : null,
        ),
        findSymbolsInFile: jest.fn().mockResolvedValue([owner]),
        findSymbolByName: jest.fn(),
      };
      const exactService = new DefinitionProcessingService(
        logger,
        manager as any,
      );

      const result = await exactService['tryResolveFromChainedRef'](
        chain(owner.id, undefined),
        { line: 3, character: 15 },
        'file:///consumer.cls',
      );

      expect(result).toBeNull();
      expect(manager.findSymbolByName).not.toHaveBeenCalled();
    });

    it('does not mistake an unresolved member result type for its definition', async () => {
      const owner = symbol(
        'namespace-a-owner',
        'DuplicateName',
        'file:///namespace-a/DuplicateName.cls',
      );
      const memberResultType = symbol(
        'string-type',
        'String',
        'apexlib://System/String.cls',
      );
      const references = chain(owner.id, undefined);
      references[0].chainNodes[1].resolvedTypeId = memberResultType.id;
      const manager = {
        getSymbol: jest.fn(async (id: string) =>
          id === owner.id
            ? owner
            : id === memberResultType.id
              ? memberResultType
              : null,
        ),
        findSymbolsInFile: jest.fn().mockResolvedValue([owner]),
      };
      const exactService = new DefinitionProcessingService(
        logger,
        manager as any,
      );

      const result = await exactService['tryResolveFromChainedRef'](
        references,
        { line: 3, character: 15 },
        'file:///consumer.cls',
      );

      expect(result).toBeNull();
    });

    it('does not recover a symbol URI from a global simple-name search', async () => {
      const manager = {
        findFilesForSymbol: jest
          .fn()
          .mockResolvedValue(['file:///wrong/DuplicateName.cls']),
      };
      const exactService = new DefinitionProcessingService(
        logger,
        manager as any,
      );
      const symbolWithoutIdentityUri = symbol('owner', 'DuplicateName', '');

      const result = await exactService['getSymbolFileUri'](
        symbolWithoutIdentityUri,
      );

      expect(result).toBeNull();
      expect(manager.findFilesForSymbol).not.toHaveBeenCalled();
    });
  });
});
