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
      findSymbolsInFile: jest.fn().mockReturnValue([]),
    } as any;

    utils = new MissingArtifactUtils(logger, mockSymbolManager);
  });

  describe('extractReferenceAtPosition', () => {
    it('should return null when no references found (e.g., keywords, whitespace)', () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 2, character: 4 };

      // Keywords don't produce TypeReference objects - getReferencesAtPosition returns empty array
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([]);

      // Act
      const result = (utils as any).extractReferenceAtPosition(uri, position);

      // Assert
      expect(result).toBeNull();
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it('should return reference when TypeReference exists', () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 5, character: 10 };

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

      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockReference,
      ] as any);

      // Act
      const result = (utils as any).extractReferenceAtPosition(uri, position);

      // Assert
      expect(result).toEqual(mockReference);
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it('should return null when getReferencesAtPosition returns empty array', () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 5, character: 10 };

      mockSymbolManager.getReferencesAtPosition.mockReturnValue([]);

      // Act
      const result = (utils as any).extractReferenceAtPosition(uri, position);

      // Assert
      expect(result).toBeNull();
    });

    it('should return first reference when multiple references found', () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 5, character: 10 };

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
            endColumn: 21,
          },
        },
        context: 1,
        resolvedSymbolId: undefined,
      };

      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockReference1,
        mockReference2,
      ] as any);

      // Act
      const result = (utils as any).extractReferenceAtPosition(uri, position);

      // Assert
      expect(result).toEqual(mockReference1);
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it('should prioritize chained references over individual references when both exist', () => {
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
            startColumn: 57,
            endLine: 34,
            endColumn: 66,
          },
        },
        context: ReferenceContext.CHAINED_TYPE,
        resolvedSymbolId: undefined,
        chainNodes: [
          {
            name: 'FileUtilities',
            location: {
              identifierRange: {
                startLine: 34,
                startColumn: 57,
                endLine: 34,
                endColumn: 70,
              },
            },
            context: ReferenceContext.CLASS_REFERENCE,
          },
          {
            name: 'createFile',
            location: {
              identifierRange: {
                startLine: 34,
                startColumn: 71,
                endLine: 34,
                endColumn: 80,
              },
            },
            context: ReferenceContext.METHOD_CALL,
          },
        ],
      };

      // Simulate the scenario where both references are returned
      // Individual reference comes first (this was the bug - it was selected)
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        individualReference,
        chainedReference,
      ] as any);

      // Act
      const result = (utils as any).extractReferenceAtPosition(uri, position);

      // Assert
      // Should prioritize the chained reference, not the individual one
      expect(result).toEqual(chainedReference);
      expect(result.name).toBe('FileUtilities.createFile');
      expect(isChainedSymbolReference(result)).toBe(true);
      expect(mockSymbolManager.getReferencesAtPosition).toHaveBeenCalled();
    });

    it('should prioritize chained reference even when it comes after individual references', () => {
      // Arrange
      const uri = 'file:///test/TestClass.cls';
      const position = { line: 10, character: 20 };

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
        context: ReferenceContext.CHAINED_TYPE,
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
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        individualRef1,
        individualRef2,
        chainedRef,
      ] as any);

      // Act
      const result = (utils as any).extractReferenceAtPosition(uri, position);

      // Assert
      expect(result).toEqual(chainedRef);
      expect(result.name).toBe('FileUtilities.createFile');
      expect(isChainedSymbolReference(result)).toBe(true);
    });
  });
});
