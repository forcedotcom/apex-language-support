/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  ReferenceContext,
  isChainedSymbolReference,
} from '@salesforce/apex-lsp-parser-ast';
import { MissingArtifactUtils } from '../../src/utils/missingArtifactUtils';

describe('MissingArtifactUtils', () => {
  let utils: MissingArtifactUtils;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let logger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = getLogger();

    mockSymbolManager = {
      getReferencesAtPosition: jest.fn(),
      getSymbolAtPosition: jest.fn(),
      getSymbolTableForFile: jest.fn(),
      findSymbolsInFile: jest.fn().mockResolvedValue([]),
    } as any;

    utils = new MissingArtifactUtils(logger, mockSymbolManager);
  });

  describe('extractReferenceAtPosition', () => {
    it('should return null when no references found (e.g., keywords, whitespace)', async () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 2, character: 4 };

      // Keywords don't produce TypeReference objects - getReferencesAtPosition returns empty array
      mockSymbolManager.getReferencesAtPosition.mockResolvedValue([]);

      // Act
      const result = await (utils as any).extractReferenceAtPosition(
        uri,
        position,
      );

      // Assert
      expect(result).toBeNull();
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it('should return reference when TypeReference exists', async () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 4, character: 10 };

      const mockReference = {
        name: 'MyClass',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 17,
          },
        },
        context: 1,
        resolvedSymbolId: undefined,
      };

      mockSymbolManager.getReferencesAtPosition.mockResolvedValue([
        mockReference,
      ] as any);

      // Act
      const result = await (utils as any).extractReferenceAtPosition(
        uri,
        position,
      );

      // Assert
      expect(result).toEqual(mockReference);
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it('should return null when getReferencesAtPosition returns empty array', async () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 5, character: 10 };

      mockSymbolManager.getReferencesAtPosition.mockResolvedValue([]);

      // Act
      const result = await (utils as any).extractReferenceAtPosition(
        uri,
        position,
      );

      // Assert
      expect(result).toBeNull();
    });

    it.each([
      ['unresolved-first', false],
      ['resolved-first', true],
    ] as const)(
      'should select the resolved reference independent of result order (%s)',
      async (_description, resolvedFirst) => {
        // Arrange
        const uri = 'file:///test/TestClass.cls';

        const mockReference1 = {
          name: 'FirstClass',
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 20,
            },
          },
          context: 1,
          resolvedSymbolId: undefined,
        };

        const mockReference2 = {
          name: 'SecondClass',
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 20,
            },
          },
          context: 1,
          resolvedSymbolId: 'class:SecondClass',
        };

        mockSymbolManager.getReferencesAtPosition.mockResolvedValue([
          ...(resolvedFirst
            ? [mockReference2, mockReference1]
            : [mockReference1, mockReference2]),
        ] as any);

        // Act
        const result = await (utils as any).extractReferenceAtPosition(uri, {
          line: 4,
          character: 10,
        });

        // Assert
        expect(result).toEqual(mockReference2);
        expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
      },
    );

    it('should prioritize chained references over individual references when both exist', async () => {
      // Arrange
      // This test case covers the bug where hovering over "FileUtilities.createFile"
      // would extract just "createFile" instead of the full chain "FileUtilities.createFile"
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 33, character: 61 }; // Position on "createFile" in "FileUtilities.createFile"

      // Individual reference for "createFile" (this was being incorrectly selected)
      const individualReference = {
        name: 'createFile',
        location: {
          identifierRange: {
            startLine: 34,
            startColumn: 57,
            endLine: 34,
            endColumn: 66,
          },
        },
        context: ReferenceContext.METHOD_CALL,
        resolvedSymbolId: undefined,
      };

      // Chained reference for "FileUtilities.createFile" (this should be prioritized)
      const chainedReference = {
        name: 'FileUtilities.createFile',
        location: {
          identifierRange: {
            startLine: 34,
            startColumn: 43,
            endLine: 34,
            endColumn: 66,
          },
        },
        context: ReferenceContext.CHAIN_STEP,
        resolvedSymbolId: undefined,
        chainNodes: [
          {
            name: 'FileUtilities',
            location: {
              identifierRange: {
                startLine: 34,
                startColumn: 43,
                endLine: 34,
                endColumn: 55,
              },
            },
            context: ReferenceContext.CLASS_REFERENCE,
          },
          {
            name: 'createFile',
            location: {
              identifierRange: {
                startLine: 34,
                startColumn: 57,
                endLine: 34,
                endColumn: 66,
              },
            },
            context: ReferenceContext.METHOD_CALL,
          },
        ],
      };

      // Simulate the scenario where both references are returned
      // Individual reference comes first (this was the bug - it was selected)
      mockSymbolManager.getReferencesAtPosition.mockResolvedValue([
        individualReference,
        chainedReference,
      ] as any);

      // Act
      const result = await (utils as any).extractReferenceAtPosition(
        uri,
        position,
      );

      // Assert
      // Should prioritize the chained reference, not the individual one
      expect(result).toEqual(chainedReference);
      expect(result.name).toBe('FileUtilities.createFile');
      expect(isChainedSymbolReference(result)).toBe(true);
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it.each(['this', 'super'] as const)(
      'should use the member leaf instead of treating %s as an artifact qualifier',
      async (receiver) => {
        const memberReference = {
          name: 'inheritedWork',
          context: ReferenceContext.METHOD_CALL,
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 23,
            },
          },
        };
        const receiverChain = {
          name: `${receiver}.inheritedWork`,
          context: ReferenceContext.METHOD_CALL,
          location: {
            identifierRange: {
              startLine: 5,
              startColumn: 5,
              endLine: 5,
              endColumn: 23,
            },
          },
          chainNodes: [{ name: 'inheritedWork' }],
        };
        const unknownType = {
          name: 'unknown',
          context: ReferenceContext.CLASS_REFERENCE,
          location: receiverChain.location,
        };
        mockSymbolManager.getReferencesAtPosition.mockResolvedValue([
          unknownType,
          receiverChain,
          memberReference,
        ] as any);

        const result = await (utils as any).extractReferenceAtPosition(
          'file:///test/TestClass.cls',
          { line: 4, character: 15 },
        );

        expect(result).toBe(memberReference);
        expect(result.name).not.toBe('unknown');
      },
    );

    it.each(['this', 'super', 'unknown'] as const)(
      'should reject %s as a standalone missing-artifact candidate',
      async (name) => {
        mockSymbolManager.getReferencesAtPosition.mockResolvedValue([
          {
            name,
            context: ReferenceContext.VARIABLE_USAGE,
            location: {
              identifierRange: {
                startLine: 5,
                startColumn: 5,
                endLine: 5,
                endColumn: 12,
              },
            },
          },
        ] as any);

        await expect(
          (utils as any).extractReferenceAtPosition(
            'file:///test/TestClass.cls',
            { line: 4, character: 7 },
          ),
        ).resolves.toBeNull();
      },
    );

    it('should prioritize chained reference even when it comes after individual references', async () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 9, character: 36 };

      const individualRef1 = {
        name: 'FileUtilities',
        context: ReferenceContext.CLASS_REFERENCE,
        location: {
          identifierRange: {
            startLine: 10,
            startColumn: 20,
            endLine: 10,
            endColumn: 33,
          },
        },
      };

      const individualRef2 = {
        name: 'createFile',
        context: ReferenceContext.METHOD_CALL,
        location: {
          identifierRange: {
            startLine: 10,
            startColumn: 35,
            endLine: 10,
            endColumn: 44,
          },
        },
      };

      const chainedRef = {
        name: 'FileUtilities.createFile',
        context: ReferenceContext.CHAIN_STEP,
        location: {
          identifierRange: {
            startLine: 10,
            startColumn: 20,
            endLine: 10,
            endColumn: 44,
          },
        },
        chainNodes: [individualRef1, individualRef2],
      };

      // Chained reference comes last in the array
      mockSymbolManager.getReferencesAtPosition.mockResolvedValue([
        individualRef1,
        individualRef2,
        chainedRef,
      ] as any);

      // Act
      const result = await (utils as any).extractReferenceAtPosition(
        uri,
        position,
      );

      // Assert
      expect(result).toEqual(chainedRef);
      expect(result.name).toBe('FileUtilities.createFile');
      expect(isChainedSymbolReference(result)).toBe(true);
    });

    it.each([
      ['chain-first', true],
      ['leaf-first', false],
    ] as const)(
      'should preserve a local SObject receiver chain independent of result order (%s)',
      async (_description, chainFirst) => {
        const receiver = {
          name: 'property',
          context: ReferenceContext.VARIABLE_USAGE,
          resolvedSymbolId: 'variable:property',
          resolvedTypeId: 'type:Property__c',
          location: {
            identifierRange: {
              startLine: 20,
              startColumn: 8,
              endLine: 20,
              endColumn: 15,
            },
          },
        };
        const field = {
          name: 'Beds__c',
          context: ReferenceContext.FIELD_ACCESS,
          location: {
            identifierRange: {
              startLine: 20,
              startColumn: 17,
              endLine: 20,
              endColumn: 23,
            },
          },
        };
        const chain = {
          name: 'property.Beds__c',
          context: ReferenceContext.FIELD_ACCESS,
          location: field.location,
          chainNodes: [receiver, field],
        };
        const overlappingReceiverUsage = {
          ...receiver,
          location: {
            identifierRange: {
              startLine: 20,
              startColumn: 8,
              endLine: 20,
              endColumn: 23,
            },
          },
        };
        mockSymbolManager.getReferencesAtPosition.mockResolvedValue(
          (chainFirst
            ? [chain, overlappingReceiverUsage, field]
            : [overlappingReceiverUsage, field, chain]) as any,
        );

        const result = await (utils as any).extractReferenceAtPosition(
          'file:///test/TestClass.cls',
          { line: 19, character: 20 },
        );

        expect(result).toBe(chain);
        expect(
          (utils as any).inferQualifierType(
            { ...chain, qualifier: 'property' },
            null,
          ),
        ).toBe('variable');
      },
    );
  });

  describe('semantic provenance', () => {
    it('captures snapshot version, completeness, exact range, and resolved identity', async () => {
      mockSymbolManager.getSymbolTableForFile.mockResolvedValue({
        getMetadata: () => ({
          documentVersion: 12,
          parseCompleteness: 'complete',
        }),
      } as any);
      const reference = {
        name: 'Property__c',
        context: ReferenceContext.CLASS_REFERENCE,
        resolvedSymbolId: 'symbol:Property__c',
        resolvedTypeId: 'type:Property__c',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 8,
            endLine: 5,
            endColumn: 19,
          },
        },
      };

      await expect(
        (utils as any).createSemanticProvenance(
          'file:///PropertyConsumer.cls',
          reference,
        ),
      ).resolves.toEqual({
        sourceUri: 'file:///PropertyConsumer.cls',
        documentVersion: 12,
        referenceRange: reference.location.identifierRange,
        referenceIdentity:
          'symbol:Property__c|type:Property__c|1|Property__c|5|8|5|19',
        resolvedSymbolId: 'symbol:Property__c',
        resolvedTypeId: 'type:Property__c',
        parseCompleteness: 'complete',
      });
    });
  });
});
