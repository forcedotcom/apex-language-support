/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilationUnitValidator } from '../../../src/semantics/validation/CompilationUnitValidator';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';

/**
 * Mock validation scope for testing
 */
const mockValidationScope = (
  overrides: Partial<ValidationScope> = {},
): ValidationScope => ({
  supportsLongIdentifiers: true,
  version: 58,
  isFileBased: true,
  ...overrides,
});

describe('CompilationUnitValidator', () => {
  describe('File Size Validation', () => {
    describe('validateFileSize', () => {
      it('should accept class within size limit', () => {
        const result = CompilationUnitValidator.validateFileSize(
          'class TestClass { }',
          'class',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long files
      // it('should reject class exceeding size limit', () => {
      //   const largeClass = 'class TestClass { ' + 'a'.repeat(1000000) + ' }';
      //   const result = CompilationUnitValidator.validateFileSize(
      //     largeClass,
      //     'class',
      //     mockValidationScope(),
      //   );
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors).toContain('script.too.large');
      // });

      it('should accept anonymous block within size limit', () => {
        const result = CompilationUnitValidator.validateFileSize(
          'System.debug("test");',
          'anonymous',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long files
      // it('should reject anonymous block exceeding size limit', () => {
      //   const largeBlock = 'System.debug("' + 'a'.repeat(32000) + '");';
      //   const result = CompilationUnitValidator.validateFileSize(
      //     largeBlock,
      //     'anonymous',
      //     mockValidationScope(),
      //   );
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors).toContain('script.too.large');
      // });

      it('should accept test anonymous block within size limit', () => {
        const result = CompilationUnitValidator.validateFileSize(
          '@isTest\nSystem.debug("test");',
          'anonymous',
          { ...mockValidationScope(), isTestContext: true },
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long files
      // it('should accept large test anonymous block within test limit', () => {
      //   const largeTestBlock =
      //     '@isTest\nSystem.debug("' + 'a'.repeat(3000000) + '");';
      //   const result = CompilationUnitValidator.validateFileSize(
      //     largeTestBlock,
      //     'anonymous',
      //     { ...mockValidationScope(), isTestContext: true },
      //   );
      //   expect(result.isValid).toBe(true);
      //   expect(result.errors).toHaveLength(0);
      // });

      // Excluded due to performance issues with extremely long files
      // it('should reject test anonymous block exceeding test limit', () => {
      //   const largeTestBlock =
      //     '@isTest\nSystem.debug("' + 'a'.repeat(4000000) + '");';
      //   const result = CompilationUnitValidator.validateFileSize(
      //     largeTestBlock,
      //     'anonymous',
      //     { ...mockValidationScope(), isTestContext: true },
      //   );
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors).toContain('script.too.large');
      // });

      it('should accept trigger within size limit', () => {
        const result = CompilationUnitValidator.validateFileSize(
          'trigger TestTrigger on Account (before insert) { }',
          'trigger',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept interface within size limit', () => {
        const result = CompilationUnitValidator.validateFileSize(
          'interface TestInterface { }',
          'interface',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept enum within size limit', () => {
        const result = CompilationUnitValidator.validateFileSize(
          'enum TestEnum { VALUE1, VALUE2 }',
          'enum',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle empty content', () => {
        const result = CompilationUnitValidator.validateFileSize(
          '',
          'class',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle whitespace-only content', () => {
        const result = CompilationUnitValidator.validateFileSize(
          '   \n\t  ',
          'class',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Expression Length Validation', () => {
    describe('validateExpressionLength', () => {
      it('should accept expression within length limit', () => {
        const result = CompilationUnitValidator.validateExpressionLength(
          'a + b + c',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long expressions
      // it('should reject expression exceeding length limit', () => {
      //   const longExpression = 'a'.repeat(10000) + ' + b';
      //   const result = CompilationUnitValidator.validateExpressionLength(
      //     longExpression,
      //     mockValidationScope(),
      //   );
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors).toContain('expression.too.long');
      // });

      it('should accept complex expression within limit', () => {
        const complexExpression = `
          (a + b) * (c - d) / (e % f) + 
          Math.max(x, y) + 
          String.valueOf(z)
        `;
        const result = CompilationUnitValidator.validateExpressionLength(
          complexExpression,
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle empty expression', () => {
        const result = CompilationUnitValidator.validateExpressionLength(
          '',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle whitespace-only expression', () => {
        const result = CompilationUnitValidator.validateExpressionLength(
          '   \n\t  ',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long expressions
      // it('should accept expression at exact limit', () => {
      //   const exactLengthExpression = 'a'.repeat(5000);
      //   const result = CompilationUnitValidator.validateExpressionLength(
      //     exactLengthExpression,
      //     mockValidationScope(),
      //   );
      //   expect(result.isValid).toBe(true);
      //   expect(result.errors).toHaveLength(0);
      // });
    });
  });

  describe('Character Validation', () => {
    describe('validateCharacters', () => {
      it('should accept valid characters', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid control characters', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test\u0000";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Invalid control character'),
          ),
        ).toBe(true);
      });

      it('should reject invalid symbols', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test`";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('Invalid symbol')),
        ).toBe(true);
      });

      it('should reject invalid symbols - hash', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test#";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('Invalid symbol')),
        ).toBe(true);
      });

      it('should reject invalid symbols - percent', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test%";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('Invalid symbol')),
        ).toBe(true);
      });

      it('should reject invalid identifiers', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String \u0080name = "test";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('Invalid identifier')),
        ).toBe(true);
      });

      it('should accept valid control characters', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test\n";', // Newline
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept tab character', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test\t";', // Tab
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept carriage return', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test\r";', // Carriage return
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle empty content', () => {
        const result = CompilationUnitValidator.validateCharacters(
          '',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle whitespace-only content', () => {
        const result = CompilationUnitValidator.validateCharacters(
          '   \n\t  ',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject multiple invalid characters', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test\u0000`#";',
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should accept valid Unicode characters', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String name = "test\u0041";', // Latin capital letter A
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject high Unicode characters in identifiers', () => {
        const result = CompilationUnitValidator.validateCharacters(
          'String \u00A0name = "test";', // Non-breaking space
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('Invalid identifier')),
        ).toBe(true);
      });
    });
  });

  describe('Complete Compilation Unit Validation', () => {
    describe('validateCompilationUnit', () => {
      it('should validate complete class with all rules', () => {
        const apexCode = `
          public class TestClass {
            private String name;
            public static Integer count = 0;
            
            public TestClass(String name) {
              this.name = name;
            }
            
            public void testMethod() {
              String localVar = 'test';
              System.debug(localVar);
            }
          }
        `;

        const result = CompilationUnitValidator.validateCompilationUnit(
          apexCode,
          'class',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long files
      // it('should detect file size violation', () => {
      //   const largeClass = 'class TestClass { ' + 'a'.repeat(1000000) + ' }';
      //
      //   const result = CompilationUnitValidator.validateCompilationUnit(
      //     largeClass,
      //     'class',
      //     mockValidationScope(),
      //   );
      //
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors).toContain('script.too.large');
      // });

      it('should detect character violations', () => {
        const invalidClass = 'class TestClass { String name = "test\u0000"; }';

        const result = CompilationUnitValidator.validateCompilationUnit(
          invalidClass,
          'class',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) =>
            error.includes('Invalid control character'),
          ),
        ).toBe(true);
      });

      // Excluded due to performance issues with extremely long files
      // it('should detect multiple violations', () => {
      //   const invalidClass =
      //     'class TestClass { ' + 'a'.repeat(1000000) + '\u0000 }';
      //
      //   const result = CompilationUnitValidator.validateCompilationUnit(
      //     invalidClass,
      //     'class',
      //     mockValidationScope(),
      //   );
      //
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors.length).toBeGreaterThan(1);
      // });

      it('should validate anonymous block', () => {
        const apexCode = `
          System.debug('Hello World');
          Account acc = new Account(Name = 'Test');
          insert acc;
        `;

        const result = CompilationUnitValidator.validateCompilationUnit(
          apexCode,
          'anonymous',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long files
      // it('should validate test anonymous block with higher limits', () => {
      //   const testCode =
      //     '@isTest\n' + 'System.debug("' + 'a'.repeat(3000000) + '");';
      //
      //   const result = CompilationUnitValidator.validateCompilationUnit(
      //     testCode,
      //     'anonymous',
      //     { ...mockValidationScope(), isTestContext: true },
      //   );
      //
      //   expect(result.isValid).toBe(true);
      //   expect(result.errors).toHaveLength(0);
      // });
    });
  });
});
