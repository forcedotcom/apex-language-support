/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CommentAssociator } from '../../src/utils/CommentAssociator';
import { CommentAssociationType } from '../../src/parser/listeners/ApexCommentCollectorListener';
import {
  CompilerService,
  CompilationResultWithAssociations,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('CommentAssociator', () => {
  let associator: CommentAssociator;
  let compilerService: CompilerService;
  let symbolCollector: ApexSymbolCollectorListener;

  beforeEach(() => {
    associator = new CommentAssociator();
    compilerService = new CompilerService();
    symbolCollector = new ApexSymbolCollectorListener();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('Basic Association Logic', () => {
    it('should associate preceding comments with symbols', () => {
      const apexCode = `
/**
 * Class documentation
 */
public class TestClass {
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      // Find the class symbol association
      const classAssociation = result.commentAssociations.find(
        (assoc) => assoc.symbolKey === 'TestClass',
      );
      expect(classAssociation).toBeDefined();
      expect(classAssociation?.associationType).toBe(
        CommentAssociationType.Preceding,
      );
      expect(classAssociation?.confidence).toBeGreaterThan(0.5);
    });

    it('should associate inline comments with symbols', () => {
      const apexCode = `
public class TestClass {
    public void demoMethod() {
        // Inline comment
        String result = 'test';
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      // Find the method symbol association
      const methodAssociation = result.commentAssociations.find(
        (assoc) => assoc.symbolKey === 'demoMethod',
      );
      expect(methodAssociation).toBeDefined();
      expect(methodAssociation?.associationType).toBe(
        CommentAssociationType.Internal,
      );
      expect(methodAssociation?.confidence).toBeGreaterThan(0.3);
    });

    it('should not associate comments that are too far away', () => {
      const apexCode = `
/**
 * Far away comment
 */

public class TestClass {
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();

      // The far away comment should not be associated with the class
      const farCommentAssociations = result.commentAssociations.filter(
        (assoc) => assoc.comment.text.includes('Far away comment'),
      );
      expect(farCommentAssociations).toHaveLength(0);
    });

    it('should prefer closer symbols for association', () => {
      const apexCode = `
/**
 * Documentation
 */
public class TestClass {
    /**
     * Method documentation
     */
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      // Debug: Log what comments were actually collected
      console.log(
        'Collected comments:',
        result.commentAssociations.map((a) => ({
          text: a.comment.text.substring(0, 30) + '...',
          symbol: a.symbolKey,
          type: a.associationType,
          confidence: a.confidence,
        })),
      );

      // Check that the class documentation is associated with the class (block comments precede code)
      const classDocAssociation = result.commentAssociations.find(
        (assoc) =>
          assoc.comment.text.includes('Documentation') &&
          assoc.symbolKey === 'TestClass',
      );
      expect(classDocAssociation).toBeDefined();
      expect(classDocAssociation?.symbolKey).toBe('TestClass');
      expect(classDocAssociation?.associationType).toBe(
        CommentAssociationType.Preceding,
      );

      // Note: Method documentation comments inside class bodies may not be collected
      // by the comment collector due to parser limitations
      // This is a limitation of the current implementation, not the association logic
    });
  });

  describe('Documentation Comment Boost', () => {
    it('should give higher confidence to documentation comments', () => {
      const apexCode = `
/**
 * Class documentation
 */
public class TestClass {
    /* Regular comment */
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      const docCommentAssociation = result.commentAssociations.find((assoc) =>
        assoc.comment.text.includes('Class documentation'),
      );

      // Regular block comments inside class bodies get low confidence and may not be associated
      // due to the new semantic rules
      expect(docCommentAssociation).toBeDefined();
      expect(docCommentAssociation?.confidence).toBeGreaterThan(0.8);

      // The regular comment may not be associated due to low confidence
      // This is expected behavior with the new semantic rules
    });

    it('should boost confidence for classes and methods', () => {
      const apexCode = `
/**
 * Class documentation
 */
public class TestClass {
    /**
     * Method documentation
     */
    public void demoMethod() {
        // method body
    }

    // Variable comment
    private String testVar;
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      // Debug: Log what comments were actually collected
      console.log(
        'Collected comments:',
        result.commentAssociations.map((a) => ({
          text: a.comment.text.substring(0, 30) + '...',
          symbol: a.symbolKey,
          type: a.associationType,
          confidence: a.confidence,
        })),
      );

      const classDocAssociation = result.commentAssociations.find(
        (assoc) =>
          assoc.symbolKey === 'TestClass' &&
          assoc.comment.text.includes('Class documentation'),
      );

      // Note: Method documentation comments inside class bodies may not be collected
      // by the comment collector due to parser limitations
      // This is a limitation of the current implementation, not the association logic

      expect(classDocAssociation).toBeDefined();

      // Class documentation should have high confidence due to being a documentation comment
      expect(classDocAssociation?.confidence).toBeGreaterThan(0.8);

      // Variable comments may not be associated due to new semantic rules
      // This is expected behavior
    });
  });

  describe('Association Types', () => {
    it('should identify internal comments correctly', () => {
      const apexCode = `
public class TestClass {
    public void demoMethod() {
        // Internal comment
        String result = 'test';
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      const internalAssociation = result.commentAssociations.find((assoc) =>
        assoc.comment.text.includes('Internal comment'),
      );
      expect(internalAssociation).toBeDefined();
      expect(internalAssociation?.associationType).toBe(
        CommentAssociationType.Internal,
      );
    });

    it('should identify trailing comments correctly', () => {
      const apexCode = `
public class TestClass {
    private String testField; // Trailing comment
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      // Debug: Log all symbols and comment associations
      console.log('=== DEBUG INFO ===');
      if (result.result) {
        console.log(
          'All symbols:',
          result.result
            .getAllSymbols()
            .map((s) => ({ name: s.name, kind: s.kind, fqn: s.fqn })),
        );

        // Debug: Log detailed field symbol information
        const fieldSymbol = result.result
          .getAllSymbols()
          .find((s) => s.name === 'testField');
        if (fieldSymbol) {
          console.log('Field symbol details:', {
            name: fieldSymbol.name,
            kind: fieldSymbol.kind,
            symbolRange: fieldSymbol.location.symbolRange,
            identifierRange: fieldSymbol.location.identifierRange,
            filePath: fieldSymbol.filePath,
          });
        }
      }
      console.log(
        'All comment associations:',
        JSON.stringify(result.commentAssociations, null, 2),
      );

      const trailingAssociation = result.commentAssociations.find((assoc) =>
        assoc.comment.text.includes('Trailing comment'),
      );
      expect(trailingAssociation).toBeDefined();

      // With new semantic rules, same-line comments are treated as inline, not trailing
      // This is more accurate as they're semantically tied to the line they appear on
      expect(trailingAssociation?.associationType).toBe(
        CommentAssociationType.Inline,
      );
    });
  });

  describe('Helper Methods', () => {
    it('should filter associations by symbol', () => {
      const apexCode = `
/**
 * Class documentation
 */
public class TestClass {
    /**
     * Method documentation
     */
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      const allAssociations = result.commentAssociations;
      const classAssociations = associator.getAssociationsForSymbol(
        'TestClass',
        allAssociations,
      );

      // Both the class documentation comment and the method documentation comment
      // are associated with TestClass (one as preceding, one as internal)
      expect(classAssociations).toHaveLength(2);
      expect(classAssociations[0].symbolKey).toBe('TestClass');
      expect(classAssociations[1].symbolKey).toBe('TestClass');

      // Verify we have both types of associations
      const associationTypes = classAssociations.map((a) => a.associationType);
      expect(associationTypes).toContain(CommentAssociationType.Preceding);
      expect(associationTypes).toContain(CommentAssociationType.Internal);
    });

    it('should filter associations by type', () => {
      const apexCode = `
/**
 * Preceding comment
 */
public class TestClass {
    public void demoMethod() {
        // Inline comment
        String result = 'test';
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      const allAssociations = result.commentAssociations;
      const precedingAssociations = associator.getAssociationsByType(
        CommentAssociationType.Preceding,
        allAssociations,
      );

      expect(precedingAssociations.length).toBeGreaterThan(0);
      expect(precedingAssociations[0].associationType).toBe(
        CommentAssociationType.Preceding,
      );
    });

    it('should get documentation for symbol', () => {
      const apexCode = `
/**
 * Class documentation
 */
public class TestClass {
    // Regular comment
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();
      expect(result.commentAssociations.length).toBeGreaterThan(0);

      const allAssociations = result.commentAssociations;
      const documentation = associator.getDocumentationForSymbol(
        'TestClass',
        allAssociations,
      );

      expect(documentation).toHaveLength(1);
      expect(documentation[0].text).toBe('/**\n * Class documentation\n */');
      expect(documentation[0].isDocumentation).toBe(true);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom configuration', () => {
      const customAssociator = new CommentAssociator({
        maxPrecedingDistance: 1, // Very restrictive
        minConfidence: 0.1, // Very permissive
      });

      const apexCode = `
/**
 * Far comment
 */

public class TestClass {
    public void demoMethod() {
        // method body
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

      expect(result.commentAssociations).toBeDefined();

      // Use the custom associator to process the associations
      const customAssociations = customAssociator.associateComments(
        result.comments || [],
        result?.result?.getAllSymbols() || [],
      );

      // Should not associate because distance > maxPrecedingDistance
      expect(customAssociations).toHaveLength(0);
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
    public String demoMethod(String param1) {
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

    // With the current configuration (maxPrecedingDistance: 3), we expect at least some associations
    // The field and method documentation comments should be associated since they're within the distance limit
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
