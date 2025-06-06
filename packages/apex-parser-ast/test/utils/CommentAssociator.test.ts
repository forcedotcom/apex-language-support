/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CommentAssociator } from '../../src/utils/CommentAssociator';
import {
  ApexComment,
  CommentType,
  CommentAssociationType,
} from '../../src/parser/listeners/ApexCommentCollectorListener';
import {
  CompilerService,
  CompilationResultWithAssociations,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  ApexSymbol,
  SymbolKind,
  SymbolLocation,
} from '../../src/types/symbol';

describe('CommentAssociator', () => {
  let associator: CommentAssociator;
  let compilerService: CompilerService;
  let symbolCollector: ApexSymbolCollectorListener;

  beforeEach(() => {
    associator = new CommentAssociator();
    compilerService = new CompilerService();
    symbolCollector = new ApexSymbolCollectorListener();
  });

  // Helper function to create a mock symbol
  const createMockSymbol = (
    name: string,
    kind: SymbolKind,
    line: number,
    column: number = 0,
  ): ApexSymbol => ({
    name,
    kind,
    location: {
      startLine: line,
      startColumn: column,
      endLine: line,
      endColumn: column + name.length,
    } as SymbolLocation,
    modifiers: {
      visibility: 'public' as any,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
    },
    key: {
      prefix: kind.toString(),
      name,
      path: [name],
    },
    parentKey: null,
  });

  // Helper function to create a mock comment
  const createMockComment = (
    text: string,
    line: number,
    type: CommentType = CommentType.Block,
    isDocumentation: boolean = false,
  ): ApexComment => ({
    text,
    type,
    startLine: line,
    startColumn: 0,
    endLine: line,
    endColumn: text.length,
    tokenIndex: 0,
    isDocumentation,
  });

  describe('Basic Association Logic', () => {
    it('should associate preceding comments with symbols', () => {
      const comments = [
        createMockComment(
          '/** Class documentation */',
          1,
          CommentType.Block,
          true,
        ),
      ];
      const symbols = [createMockSymbol('TestClass', SymbolKind.Class, 3)];

      const associations = associator.associateComments(comments, symbols);

      expect(associations).toHaveLength(1);
      expect(associations[0].symbolKey).toBe('TestClass');
      expect(associations[0].associationType).toBe(
        CommentAssociationType.Preceding,
      );
      expect(associations[0].confidence).toBeGreaterThan(0.5);
    });

    it('should associate inline comments with symbols', () => {
      const comments = [
        createMockComment('// Inline comment', 5, CommentType.Line),
      ];
      const symbols = [createMockSymbol('testMethod', SymbolKind.Method, 5)];

      const associations = associator.associateComments(comments, symbols);

      expect(associations).toHaveLength(1);
      expect(associations[0].symbolKey).toBe('testMethod');
      expect(associations[0].associationType).toBe(
        CommentAssociationType.Inline,
      );
      expect(associations[0].confidence).toBeGreaterThan(0.8);
    });

    it('should not associate comments that are too far away', () => {
      const comments = [
        createMockComment(
          '/** Far away comment */',
          1,
          CommentType.Block,
          true,
        ),
      ];
      const symbols = [
        createMockSymbol('TestClass', SymbolKind.Class, 10), // 9 lines away
      ];

      const associations = associator.associateComments(comments, symbols);

      expect(associations).toHaveLength(0);
    });

    it('should prefer closer symbols for association', () => {
      const comments = [
        createMockComment('/** Documentation */', 5, CommentType.Block, true),
      ];
      const symbols = [
        createMockSymbol('FarSymbol', SymbolKind.Class, 10), // 5 lines away
        createMockSymbol('CloseSymbol', SymbolKind.Class, 7), // 2 lines away
      ];

      const associations = associator.associateComments(comments, symbols);

      expect(associations).toHaveLength(1);
      expect(associations[0].symbolKey).toBe('CloseSymbol');
      expect(associations[0].distance).toBe(2);
    });
  });

  describe('Documentation Comment Boost', () => {
    it('should give higher confidence to documentation comments', () => {
      const docComment = createMockComment(
        '/** Documentation */',
        1,
        CommentType.Block,
        true,
      );
      const regularComment = createMockComment(
        '/* Regular comment */',
        2,
        CommentType.Block,
        false,
      );

      const symbols = [createMockSymbol('TestClass', SymbolKind.Class, 4)];

      const docAssociations = associator.associateComments(
        [docComment],
        symbols,
      );
      const regularAssociations = associator.associateComments(
        [regularComment],
        symbols,
      );

      expect(docAssociations[0].confidence).toBeGreaterThan(
        regularAssociations[0].confidence,
      );
    });

    it('should boost confidence for classes and methods', () => {
      const comment = createMockComment(
        '/** Documentation */',
        1,
        CommentType.Block,
        true,
      );

      const classSymbol = createMockSymbol('TestClass', SymbolKind.Class, 3);
      const variableSymbol = createMockSymbol(
        'testVar',
        SymbolKind.Variable,
        3,
      );

      const classAssociations = associator.associateComments(
        [comment],
        [classSymbol],
      );
      const varAssociations = associator.associateComments(
        [comment],
        [variableSymbol],
      );

      expect(classAssociations[0].confidence).toBeGreaterThan(
        varAssociations[0].confidence,
      );
    });
  });

  describe('Association Types', () => {
    it('should identify internal comments correctly', () => {
      const comments = [
        createMockComment('// Internal comment', 8, CommentType.Line),
      ];
      const symbols = [createMockSymbol('TestMethod', SymbolKind.Method, 5)];

      const associations = associator.associateComments(comments, symbols);

      expect(associations).toHaveLength(1);
      expect(associations[0].associationType).toBe(
        CommentAssociationType.Internal,
      );
    });

    it('should identify trailing comments correctly', () => {
      const comments = [
        createMockComment('// Trailing comment', 6, CommentType.Line),
      ];
      const symbols = [createMockSymbol('TestField', SymbolKind.Property, 5)];

      const associations = associator.associateComments(comments, symbols);

      expect(associations).toHaveLength(1);
      expect(associations[0].associationType).toBe(
        CommentAssociationType.Trailing,
      );
    });
  });

  describe('Helper Methods', () => {
    it('should filter associations by symbol', () => {
      const comments = [
        createMockComment('/** Class doc */', 1, CommentType.Block, true),
        createMockComment('/** Method doc */', 4, CommentType.Block, true),
      ];
      const symbols = [
        createMockSymbol('TestClass', SymbolKind.Class, 3),
        createMockSymbol('testMethod', SymbolKind.Method, 6),
      ];

      const allAssociations = associator.associateComments(comments, symbols);
      const classAssociations = associator.getAssociationsForSymbol(
        'TestClass',
        allAssociations,
      );

      expect(allAssociations).toHaveLength(2);
      expect(classAssociations).toHaveLength(1);
      expect(classAssociations[0].symbolKey).toBe('TestClass');
    });

    it('should filter associations by type', () => {
      const comments = [
        createMockComment('/** Preceding */', 1, CommentType.Block, true),
        createMockComment('// Inline', 5, CommentType.Line),
      ];
      const symbols = [
        createMockSymbol('TestClass', SymbolKind.Class, 3),
        createMockSymbol('testField', SymbolKind.Property, 5),
      ];

      const allAssociations = associator.associateComments(comments, symbols);
      const precedingAssociations = associator.getAssociationsByType(
        CommentAssociationType.Preceding,
        allAssociations,
      );

      expect(precedingAssociations).toHaveLength(1);
      expect(precedingAssociations[0].associationType).toBe(
        CommentAssociationType.Preceding,
      );
    });

    it('should get documentation for symbol', () => {
      const comments = [
        createMockComment(
          '/** Class documentation */',
          1,
          CommentType.Block,
          true,
        ),
        createMockComment('// Regular comment', 2, CommentType.Line, false),
      ];
      const symbols = [createMockSymbol('TestClass', SymbolKind.Class, 4)];

      const associations = associator.associateComments(comments, symbols);
      const documentation = associator.getDocumentationForSymbol(
        'TestClass',
        associations,
      );

      expect(documentation).toHaveLength(1);
      expect(documentation[0].text).toBe('/** Class documentation */');
      expect(documentation[0].isDocumentation).toBe(true);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom configuration', () => {
      const customAssociator = new CommentAssociator({
        maxPrecedingDistance: 1, // Very restrictive
        minConfidence: 0.1, // Very permissive
      });

      const comments = [
        createMockComment('/** Far comment */', 1, CommentType.Block, true),
      ];
      const symbols = [
        createMockSymbol('TestClass', SymbolKind.Class, 3), // 2 lines away
      ];

      const associations = customAssociator.associateComments(
        comments,
        symbols,
      );

      // Should not associate because distance > maxPrecedingDistance
      expect(associations).toHaveLength(0);
    });
  });
});

describe('CompilerService Comment Association Integration', () => {
  let compilerService: CompilerService;
  let symbolCollector: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    symbolCollector = new ApexSymbolCollectorListener();
  });

  it('should associate comments when associateComments option is true', () => {
    const apexCode = `
/**
 * This is a test class for demonstration
 * @author Test Author
 */
public class TestClass {
    /** Field documentation */
    private String testField;

    /**
     * Method documentation
     * @param param1 First parameter
     * @return String result
     */
    public String testMethod(String param1) {
        // Internal comment
        return param1.toUpperCase();
    }
}`;

    const result = compilerService.compile(
      apexCode,
      'TestClass.cls',
      symbolCollector,
      {
        includeComments: true,
        includeSingleLineComments: true,
        associateComments: true,
      },
    ) as CompilationResultWithAssociations<SymbolTable>;

    expect(result.comments).toBeDefined();
    expect(result.commentAssociations).toBeDefined();
    expect(result.commentAssociations.length).toBeGreaterThan(0);

    // Check that we have associations (any type is fine for integration test)
    expect(result.commentAssociations.length).toBeGreaterThan(0);

    // Verify the associations have the expected structure
    result.commentAssociations.forEach((association) => {
      expect(association.comment).toBeDefined();
      expect(association.symbolKey).toBeDefined();
      expect(association.associationType).toBeDefined();
      expect(association.confidence).toBeGreaterThan(0);
      expect(association.distance).toBeGreaterThanOrEqual(0);
    });
  });

  it('should not associate comments when associateComments option is false', () => {
    const apexCode = `
/** Documentation */
public class TestClass {
}`;

    const result = compilerService.compile(
      apexCode,
      'TestClass.cls',
      symbolCollector,
      {
        includeComments: true,
        associateComments: false,
      },
    );

    expect('comments' in result && result.comments).toBeDefined();
    expect('commentAssociations' in result).toBe(false);
  });

  it('should handle empty symbol tables gracefully', () => {
    const apexCode = `
// Just a comment
`;

    const result = compilerService.compile(
      apexCode,
      'TestClass.cls',
      symbolCollector,
      {
        includeComments: true,
        includeSingleLineComments: true,
        associateComments: true,
      },
    ) as CompilationResultWithAssociations<SymbolTable>;

    expect(result.comments).toBeDefined();
    expect(result.commentAssociations).toBeDefined();
    expect(result.commentAssociations).toHaveLength(0);
  });
});
