/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable } from '../../src/types/symbol';
import {
  ReferenceContext,
  TypeReferenceFactory,
} from '../../src/types/typeReference';

describe('SymbolTable with Type References', () => {
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolTable = new SymbolTable();
  });

  describe('addTypeReference', () => {
    it('should add a type reference to the symbol table', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 10,
            startColumn: 5,
            endLine: 10,
            endColumn: 15,
          },
          identifierRange: {
            startLine: 10,
            startColumn: 5,
            endLine: 10,
            endColumn: 15,
          },
        },
        'FileUtilities',
        'testMethod',
      );

      symbolTable.addTypeReference(reference);

      const allReferences = symbolTable.getAllReferences();
      expect(allReferences).toHaveLength(1);
      expect(allReferences[0]).toBe(reference);
    });

    it('should add multiple type references', () => {
      const reference1 = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 10,
            startColumn: 5,
            endLine: 10,
            endColumn: 15,
          },
          identifierRange: {
            startLine: 10,
            startColumn: 5,
            endLine: 10,
            endColumn: 15,
          },
        },
        'FileUtilities',
      );

      const reference2 = TypeReferenceFactory.createTypeDeclarationReference(
        'Property__c',
        {
          symbolRange: {
            startLine: 12,
            startColumn: 8,
            endLine: 12,
            endColumn: 18,
          },
          identifierRange: {
            startLine: 12,
            startColumn: 8,
            endLine: 12,
            endColumn: 18,
          },
        },
      );

      symbolTable.addTypeReference(reference1);
      symbolTable.addTypeReference(reference2);

      const allReferences = symbolTable.getAllReferences();
      expect(allReferences).toHaveLength(2);
      expect(allReferences).toContain(reference1);
      expect(allReferences).toContain(reference2);
    });
  });

  describe('getAllReferences', () => {
    it('should return a copy of references to prevent external modification', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 10,
            startColumn: 5,
            endLine: 10,
            endColumn: 15,
          },
          identifierRange: {
            startLine: 10,
            startColumn: 5,
            endLine: 10,
            endColumn: 15,
          },
        },
      );

      symbolTable.addTypeReference(reference);

      const allReferences = symbolTable.getAllReferences();
      expect(allReferences).toHaveLength(1);

      // Modify the returned array
      allReferences.push(
        TypeReferenceFactory.createTypeDeclarationReference('String', {
          symbolRange: {
            startLine: 15,
            startColumn: 0,
            endLine: 15,
            endColumn: 6,
          },
          identifierRange: {
            startLine: 15,
            startColumn: 0,
            endLine: 15,
            endColumn: 6,
          },
        }),
      );

      // Original symbol table should not be affected
      const originalReferences = symbolTable.getAllReferences();
      expect(originalReferences).toHaveLength(1);
    });
  });

  describe('getReferencesAtPosition', () => {
    it('should find references at exact position', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      symbolTable.addTypeReference(reference);

      const foundReferences = symbolTable.getReferencesAtPosition({
        line: 9, // 0-based
        character: 5, // 0-based
      });

      expect(foundReferences).toHaveLength(1);
      expect(foundReferences[0]).toBe(reference);
    });

    it('should find references within range', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      symbolTable.addTypeReference(reference);

      const foundReferences = symbolTable.getReferencesAtPosition({
        line: 9, // 0-based
        character: 7, // 0-based, within the range
      });

      expect(foundReferences).toHaveLength(1);
      expect(foundReferences[0]).toBe(reference);
    });

    it('should not find references outside range', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      symbolTable.addTypeReference(reference);

      const foundReferences = symbolTable.getReferencesAtPosition({
        line: 9, // 0-based
        character: 20, // 0-based, outside the range
      });

      expect(foundReferences).toHaveLength(0);
    });

    it('should find multiple references at same position', () => {
      const reference1 = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      const reference2 = TypeReferenceFactory.createFieldAccessReference(
        'Id',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
        'property',
      );

      symbolTable.addTypeReference(reference1);
      symbolTable.addTypeReference(reference2);

      const foundReferences = symbolTable.getReferencesAtPosition({
        line: 9, // 0-based
        character: 7, // 0-based
      });

      expect(foundReferences).toHaveLength(2);
      expect(foundReferences).toContain(reference1);
      expect(foundReferences).toContain(reference2);
    });
  });

  describe('getReferencesByContext', () => {
    it('should filter references by context', () => {
      const methodCallRef = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      const typeDeclRef = TypeReferenceFactory.createTypeDeclarationReference(
        'Property__c',
        {
          symbolRange: {
            startLine: 11,
            startColumn: 8,
            endLine: 11,
            endColumn: 18,
          }, // 0-based
          identifierRange: {
            startLine: 11,
            startColumn: 8,
            endLine: 11,
            endColumn: 18,
          }, // 0-based
        },
      );

      const fieldAccessRef = TypeReferenceFactory.createFieldAccessReference(
        'Id',
        {
          symbolRange: {
            startLine: 13,
            startColumn: 3,
            endLine: 13,
            endColumn: 5,
          }, // 0-based
          identifierRange: {
            startLine: 13,
            startColumn: 3,
            endLine: 13,
            endColumn: 5,
          }, // 0-based
        },
        'property',
      );

      symbolTable.addTypeReference(methodCallRef);
      symbolTable.addTypeReference(typeDeclRef);
      symbolTable.addTypeReference(fieldAccessRef);

      const methodCalls = symbolTable.getReferencesByContext(
        ReferenceContext.METHOD_CALL,
      );
      expect(methodCalls).toHaveLength(1);
      expect(methodCalls[0]).toBe(methodCallRef);

      const typeDeclarations = symbolTable.getReferencesByContext(
        ReferenceContext.TYPE_DECLARATION,
      );
      expect(typeDeclarations).toHaveLength(1);
      expect(typeDeclarations[0]).toBe(typeDeclRef);

      const fieldAccess = symbolTable.getReferencesByContext(
        ReferenceContext.FIELD_ACCESS,
      );
      expect(fieldAccess).toHaveLength(1);
      expect(fieldAccess[0]).toBe(fieldAccessRef);
    });

    it('should return empty array for non-existent context', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      symbolTable.addTypeReference(reference);

      // Test with a valid enum value that doesn't exist in our test data
      const nonExistentContext = symbolTable.getReferencesByContext(
        ReferenceContext.PARAMETER_TYPE,
      );
      expect(nonExistentContext).toHaveLength(0);
    });
  });

  describe('positionInRange', () => {
    it('should correctly handle zero-based positions and locations', () => {
      const reference = TypeReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
          identifierRange: {
            startLine: 9,
            startColumn: 5,
            endLine: 9,
            endColumn: 15,
          }, // 0-based
        },
      );

      symbolTable.addTypeReference(reference);

      // Test position before start of range
      const beforeStartPosition = { line: 9, character: 3 }; // 0-based, before startColumn: 5
      const beforeStartReferences =
        symbolTable.getReferencesAtPosition(beforeStartPosition);
      expect(beforeStartReferences).toHaveLength(0); // Should not include position before start

      // Test position at exact start
      const exactStartPosition = { line: 9, character: 5 }; // 0-based, at startColumn: 5
      const exactStartReferences =
        symbolTable.getReferencesAtPosition(exactStartPosition);
      expect(exactStartReferences).toHaveLength(1);

      // Test position at end of range
      const endPosition = { line: 9, character: 14 }; // 0-based, at endColumn: 15
      const endReferences = symbolTable.getReferencesAtPosition(endPosition);
      expect(endReferences).toHaveLength(1);

      // Test position after end of range
      const afterEndPosition = { line: 9, character: 16 }; // 0-based, after endColumn: 15
      const afterEndReferences =
        symbolTable.getReferencesAtPosition(afterEndPosition);
      expect(afterEndReferences).toHaveLength(0);
    });
  });
});
