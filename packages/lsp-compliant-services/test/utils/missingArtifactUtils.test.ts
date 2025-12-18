/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
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
        isResolved: false,
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
        isResolved: false,
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
        isResolved: false,
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
  });
});
