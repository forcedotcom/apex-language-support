/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexCommentCollectorListener,
  CommentType,
} from '../../src/parser/listeners/ApexCommentCollectorListener';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  CompilerService,
  CompilationResultWithComments,
} from '../../src/parser/compilerService';
import { SymbolTable } from '../../src/types/symbol';

describe('ApexCommentCollectorListener', () => {
  let compilerService: CompilerService;
  let symbolCollector: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    symbolCollector = new ApexSymbolCollectorListener();
  });

  describe('Basic comment collection', () => {
    it('should collect single-line comments', () => {
      const code = `
// This is a single-line comment
public class TestClass {
    // Another comment
    public void method1() {
        // Method body comment
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);

      const lineComments = result.comments.filter(
        (c) => c.type === CommentType.Line,
      );
      expect(lineComments.length).toBeGreaterThan(0);
      expect(lineComments[0].text).toContain('This is a single-line comment');
    });

    it('should collect block comments', () => {
      const code = `
/*
 * This is a block comment
 * with multiple lines
 */
public class TestClass {
    /* Another block comment */
    public void method1() {
        /* Method body comment */
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);

      const blockComments = result.comments.filter(
        (c) => c.type === CommentType.Block,
      );
      expect(blockComments.length).toBeGreaterThan(0);
      expect(blockComments[0].text).toContain('This is a block comment');
    });

    it('should collect both line and block comments', () => {
      const code = `
// Single line comment
/*
 * Block comment
 */
public class TestClass {
    // Method comment
    public void method1() {
        /* Another block comment */
        // Another line comment
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);

      const lineComments = result.comments.filter(
        (c) => c.type === CommentType.Line,
      );
      const blockComments = result.comments.filter(
        (c) => c.type === CommentType.Block,
      );

      expect(lineComments.length).toBeGreaterThan(0);
      expect(blockComments.length).toBeGreaterThan(0);
    });
  });

  describe('Documentation comment detection', () => {
    it('should identify JavaDoc-style documentation comments', () => {
      const code = `
/**
 * This is a JavaDoc-style comment
 * @param param1 First parameter
 * @return Return value description
 */
public class TestClass {
    /**
     * Method documentation
     */
    public void method1() {
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      const docComments = result.comments.filter((c) => c.isDocumentation);
      expect(docComments.length).toBeGreaterThan(0);
      expect(docComments[0].text).toContain('JavaDoc-style comment');
    });

    it('should identify triple-slash documentation comments', () => {
      const code = `
/// This is a triple-slash comment
/// Used for documentation
public class TestClass {
    /// Method documentation
    public void method1() {
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      const docComments = result.comments.filter((c) => c.isDocumentation);
      expect(docComments.length).toBeGreaterThan(0);
    });
  });

  describe('Comment positioning', () => {
    it('should capture accurate line and column positions', () => {
      const code = `// Line 1 comment
public class TestClass {
    // Line 3 comment
    public void method1() {
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments.length).toBeGreaterThanOrEqual(2);

      // Find the first comment
      const firstComment = result.comments.find((c) =>
        c.text.includes('Line 1 comment'),
      );
      expect(firstComment).toBeDefined();
      expect(firstComment!.range.startLine).toBe(1);

      // Find the second comment
      const secondComment = result.comments.find((c) =>
        c.text.includes('Line 3 comment'),
      );
      expect(secondComment).toBeDefined();
      expect(secondComment!.range.startLine).toBe(3);
    });

    it('should handle multi-line block comments correctly', () => {
      const code = `/*
 * Line 1 of block comment
 * Line 2 of block comment
 * Line 3 of block comment
 */
public class TestClass {
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      const blockComment = result.comments.find(
        (c) => c.type === CommentType.Block,
      );
      expect(blockComment).toBeDefined();
      expect(blockComment!.range.startLine).toBe(1);
      expect(blockComment!.range.endLine).toBe(5);
    });
  });

  describe('Comment filtering methods', () => {
    let commentCollector: ApexCommentCollectorListener;

    beforeEach(() => {
      commentCollector = new ApexCommentCollectorListener();
    });

    it('should provide methods to filter comments by type', () => {
      // Test that the methods exist on the collector
      expect(typeof commentCollector.getCommentsByType).toBe('function');
      expect(typeof commentCollector.getDocumentationComments).toBe('function');
      expect(typeof commentCollector.getCommentsInRange).toBe('function');
    });
  });

  describe('Single-line comment filtering', () => {
    const testCode = `
// Single-line comment 1
public class TestClass {
    /* Block comment 1 */
    private String field;
    
    // Single-line comment 2
    /* Block comment 2 */
    public void method() {
        // Single-line comment 3
        /* Block comment 3 */
    }
}`;

    it('should exclude single-line comments by default', () => {
      const result = compilerService.compile(
        testCode,
        'TestClass.cls',
        symbolCollector,
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();

      // Should only have block comments (2 of them)
      const blockComments = result.comments.filter(
        (c) => c.type === CommentType.Block,
      );
      const lineComments = result.comments.filter(
        (c) => c.type === CommentType.Line,
      );

      expect(blockComments.length).toBe(2);
      expect(lineComments.length).toBe(0);
      expect(result.comments.length).toBe(2);
    });

    it('should include single-line comments when explicitly requested', () => {
      const result = compilerService.compile(
        testCode,
        'TestClass.cls',
        symbolCollector,
        {
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();

      // Should have both block and line comments
      const blockComments = result.comments.filter(
        (c) => c.type === CommentType.Block,
      );
      const lineComments = result.comments.filter(
        (c) => c.type === CommentType.Line,
      );

      expect(blockComments.length).toBe(2);
      expect(lineComments.length).toBe(2);
      expect(result.comments.length).toBe(4);
    });

    it('should exclude single-line comments when explicitly set to false', () => {
      const result = compilerService.compile(
        testCode,
        'TestClass.cls',
        symbolCollector,
        {
          includeSingleLineComments: false,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();

      // Should only have block comments
      const blockComments = result.comments.filter(
        (c) => c.type === CommentType.Block,
      );
      const lineComments = result.comments.filter(
        (c) => c.type === CommentType.Line,
      );

      expect(blockComments.length).toBe(2);
      expect(lineComments.length).toBe(0);
      expect(result.comments.length).toBe(2);
    });

    it('should still process documentation single-line comments correctly when enabled', () => {
      const docCode = `
/// Documentation comment 1
public class TestClass {
    // Regular comment
    /// Documentation comment 2
    public void method() {
        /// Documentation comment 3
    }
}`;

      const result = compilerService.compile(
        docCode,
        'TestClass.cls',
        symbolCollector,
        {
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBe(3);

      // Check documentation comments
      const docComments = result.comments.filter((c) => c.isDocumentation);
      expect(docComments.length).toBe(2);

      // All documentation comments should be triple-slash
      docComments.forEach((comment) => {
        expect(comment.text.startsWith('///')).toBe(true);
      });
    });

    it('should work with both includeComments and includeSingleLineComments options', () => {
      const result = compilerService.compile(
        testCode,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBe(4);
    });

    it('should respect includeComments: false even when includeSingleLineComments is true', () => {
      const result = compilerService.compile(
        testCode,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: false,
          includeSingleLineComments: true,
        },
      );

      // Result should not have comments property when includeComments is false
      expect('comments' in result).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle code with syntax errors gracefully', () => {
      const invalidCode = `
// Comment before invalid syntax
public class TestClass {
    invalid syntax here +++
    // Comment after invalid syntax
}`;

      const result = compilerService.compile(
        invalidCode,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
          includeSingleLineComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      // Should still collect comments even if there are syntax errors
      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('API default behavior and opt-out', () => {
    it('should not include comments when explicitly opted out with includeComments: false', () => {
      const code = `
// This comment should not be collected
public class TestClass {
    // Another comment
    public void method1() {
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        { includeComments: false },
      );

      // Should not have comments property
      expect('comments' in result).toBe(false);
      expect(result.result).toBeDefined(); // Should still have the symbol table
    });

    it('should include comments by default when no options provided', () => {
      const code = `
/* This comment should be collected by default */
public class TestClass {
    public void method1() {
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
      ) as CompilationResultWithComments<SymbolTable>;

      // Should have comments property by default
      expect('comments' in result).toBe(true);
      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.result).toBeDefined(); // Should still have the symbol table
    });

    it('should include comments when explicitly requested with includeComments: true', () => {
      const code = `
/* This comment should be collected */
public class TestClass {
    public void method1() {
    }
}`;

      const result = compilerService.compile(
        code,
        'TestClass.cls',
        symbolCollector,
        {
          includeComments: true,
        },
      ) as CompilationResultWithComments<SymbolTable>;

      // Should have comments property
      expect('comments' in result).toBe(true);
      expect(result.comments).toBeDefined();
      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.result).toBeDefined(); // Should still have the symbol table
    });
  });
});
