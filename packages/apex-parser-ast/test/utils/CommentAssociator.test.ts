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
    public void testMethod() {
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
    public void testMethod() {
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
        (assoc) => assoc.symbolKey === 'testMethod',
      );
      expect(methodAssociation).toBeDefined();
      expect(methodAssociation?.associationType).toBe(
        CommentAssociationType.Inline,
      );
      expect(methodAssociation?.confidence).toBeGreaterThan(0.8);
    });

    it('should not associate comments that are too far away', () => {
      const apexCode = `
/**
 * Far away comment
 */

public class TestClass {
    public void testMethod() {
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
    public void testMethod() {
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

      // Check that the method documentation is associated with the method, not the class
      const methodDocAssociation = result.commentAssociations.find((assoc) =>
        assoc.comment.text.includes('Method documentation'),
      );
      expect(methodDocAssociation).toBeDefined();
      expect(methodDocAssociation?.symbolKey).toBe('testMethod');
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
    public void testMethod() {
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
      const regularCommentAssociation = result.commentAssociations.find(
        (assoc) => assoc.comment.text.includes('Regular comment'),
      );

      expect(docCommentAssociation).toBeDefined();
      expect(regularCommentAssociation).toBeDefined();
      expect(docCommentAssociation?.confidence).toBeGreaterThan(
        regularCommentAssociation?.confidence || 0,
      );
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
    public void testMethod() {
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

      const classDocAssociation = result.commentAssociations.find(
        (assoc) =>
          assoc.symbolKey === 'TestClass' &&
          assoc.comment.text.includes('Class documentation'),
      );
      const varCommentAssociation = result.commentAssociations.find(
        (assoc) => assoc.symbolKey === 'testVar',
      );

      expect(classDocAssociation).toBeDefined();
      expect(varCommentAssociation).toBeDefined();
      expect(classDocAssociation?.confidence).toBeGreaterThan(
        varCommentAssociation?.confidence || 0,
      );
    });
  });

  describe('Association Types', () => {
    it('should identify internal comments correctly', () => {
      const apexCode = `
public class TestClass {
    public void testMethod() {
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
    public void testMethod() {
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

      const trailingAssociation = result.commentAssociations.find((assoc) =>
        assoc.comment.text.includes('Trailing comment'),
      );
      expect(trailingAssociation).toBeDefined();
      expect(trailingAssociation?.associationType).toBe(
        CommentAssociationType.Trailing,
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
    public void testMethod() {
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

      expect(classAssociations).toHaveLength(1);
      expect(classAssociations[0].symbolKey).toBe('TestClass');
    });

    it.only('should filter associations by type', () => {
      const apexCode = `
/**
 * Preceding comment
 */
public class TestClass {
    public void testMethod() {
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
    public void testMethod() {
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
    public void testMethod() {
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
