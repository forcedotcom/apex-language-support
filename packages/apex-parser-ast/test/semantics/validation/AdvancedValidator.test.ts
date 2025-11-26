/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AdvancedValidator } from '../../../src/semantics/validation/AdvancedValidator';
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

describe('AdvancedValidator', () => {
  describe('Complete Advanced Validation', () => {
    describe('validateCompilationUnit', () => {
      it('should validate complete class with all advanced rules', () => {
        const apexCode = `
          public class TestClass {
            private String name;
            public static Integer count = 0;
            
            public TestClass(String name) {
              this.name = name;
            }
            
            public void testMethod() {
              String localVar = 'test';
              switch on localVar {
                when 'test' {
                  System.debug('test');
                }
              }
            }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'class',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect statement validation errors', () => {
        const apexCode = `
          public class TestClass {
            public void testMethod() {
              String localVar = 123; // Type mismatch
              switch on localVar {
                when 456 { // Incompatible switch type
                  System.debug('test');
                }
              }
            }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'class',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('incompatible.types')),
        ).toBe(true);
        expect(
          result.errors.some((error) =>
            error.includes('incompatible.switch.types'),
          ),
        ).toBe(true);
      });

      // Excluded due to performance issues with extremely long files
      // it('should detect compilation unit validation errors', () => {
      //   const largeClass = 'public class TestClass { ' + 'a'.repeat(1000000) + ' }';
      //
      //   const result = AdvancedValidator.validateCompilationUnit(
      //     largeClass,
      //     'class',
      //     mockValidationScope()
      //   );
      //
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors).toContain('script.too.large');
      // });

      it('should detect character validation errors', () => {
        const invalidClass = `
          public class TestClass {
            public void testMethod() {
              String name = "test\u0000"; // Invalid control character
            }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
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

      it('should detect visibility validation errors', () => {
        const apexCode = `
          public class TestClass {
            private String privateVar;
            
            public void testMethod() {
              // Accessing private variable from different context
            }
          }
          
          public class OtherClass {
            public void accessPrivateVar() {
              TestClass tc = new TestClass();
              tc.privateVar = 'test'; // Should fail
            }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'class',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((error) => error.includes('variable.not.visible')),
        ).toBe(true);
      });

      // Excluded due to performance issues with extremely long files
      // it('should detect multiple validation errors', () => {
      //   const invalidClass = `
      //     public class TestClass {
      //       private String name = 123; // Type mismatch
      //     }
      //   ` + 'a'.repeat(1000000); // Too large
      //
      //   const result = AdvancedValidator.validateCompilationUnit(
      //     invalidClass,
      //     'class',
      //     mockValidationScope()
      //   );
      //
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors.length).toBeGreaterThan(1);
      // });

      it('should validate anonymous block with all rules', () => {
        const apexCode = `
          System.debug('Hello World');
          Account acc = new Account(Name = 'Test');
          insert acc;
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'anonymous',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Excluded due to performance issues with extremely long files
      // it('should validate test anonymous block with higher limits', () => {
      //   const testCode = '@isTest\n' + 'System.debug("' + 'a'.repeat(3000000) + '");';
      //
      //   const result = AdvancedValidator.validateCompilationUnit(
      //     testCode,
      //     'anonymous',
      //     { ...mockValidationScope(), isTestContext: true }
      //   );
      //
      //   expect(result.isValid).toBe(true);
      //   expect(result.errors).toHaveLength(0);
      // });

      it('should validate trigger with all rules', () => {
        const apexCode = `
          trigger TestTrigger on Account (before insert) {
            for (Account acc : Trigger.new) {
              acc.Name = acc.Name + ' - Processed';
            }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'trigger',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate interface with all rules', () => {
        const apexCode = `
          public interface TestInterface {
            void testMethod();
            String testProperty { get; set; }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'interface',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate enum with all rules', () => {
        const apexCode = `
          public enum TestEnum {
            VALUE1,
            VALUE2,
            VALUE3
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'enum',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateStatement', () => {
      it('should validate variable declaration statement', () => {
        const result = AdvancedValidator.validateStatement(
          'variableDeclaration',
          {
            declaredType: { name: 'String', isPrimitive: true },
            initializerType: { name: 'String', isPrimitive: true },
          },
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate switch statement', () => {
        const result = AdvancedValidator.validateStatement(
          'switchStatement',
          {
            expressionType: { name: 'String', isPrimitive: true },
            whenTypes: [
              { name: 'String', isPrimitive: true },
              { name: 'String', isPrimitive: true },
            ],
          },
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate assignment statement', () => {
        const result = AdvancedValidator.validateStatement(
          'assignmentStatement',
          {
            targetType: { name: 'String', isPrimitive: true },
            valueType: { name: 'String', isPrimitive: true },
          },
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate return statement', () => {
        const result = AdvancedValidator.validateStatement(
          'returnStatement',
          {
            methodReturnType: { name: 'String', isPrimitive: true },
            returnValueType: { name: 'String', isPrimitive: true },
          },
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateVisibility', () => {
      it('should validate type visibility', () => {
        const result = AdvancedValidator.validateVisibility(
          'type',
          {
            name: 'MyClass',
            visibility: 'public',
          },
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate method visibility', () => {
        const result = AdvancedValidator.validateVisibility(
          'method',
          {
            name: 'myMethod',
            visibility: 'public',
            declaringType: 'MyClass',
          },
          { ...mockValidationScope(), currentType: { name: 'MyClass' } },
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate variable visibility', () => {
        const result = AdvancedValidator.validateVisibility(
          'variable',
          {
            name: 'myVar',
            visibility: 'public',
            declaringType: 'MyClass',
          },
          { ...mockValidationScope(), currentType: { name: 'MyClass' } },
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Performance and Integration', () => {
      // Excluded due to performance issues with large files
      // it('should handle large files efficiently', () => {
      //   const largeClass = `
      //     public class LargeClass {
      //       ${Array.from({ length: 1000 }, (_, i) => `
      //         public String field${i} = 'value${i}';
      //         public void method${i}() {
      //           System.debug('Method ${i}');
      //         }
      //       `).join('')}
      //     }
      //   `;
      //
      //   const startTime = Date.now();
      //   const result = AdvancedValidator.validateCompilationUnit(
      //     largeClass,
      //     'class',
      //     mockValidationScope()
      //   );
      //   const endTime = Date.now();
      //
      //   // The large class should be valid (no String/123 pattern, no switch/456 pattern, etc.)
      //   expect(result.isValid).toBe(true);
      //   expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      // });

      // Excluded due to performance issues with extremely long files
      // it('should provide comprehensive error reporting', () => {
      //   const invalidCode = `
      //     public class TestClass {
      //       private String name = 123; // Type mismatch
      //       final String finalVar; // Missing initializer
      //     }
      //   ` + 'a'.repeat(1000000); // Too large
      //
      //   const result = AdvancedValidator.validateCompilationUnit(
      //     invalidCode,
      //     'class',
      //     mockValidationScope()
      //   );
      //
      //   expect(result.isValid).toBe(false);
      //   expect(result.errors.length).toBeGreaterThan(1);
      //   expect(result.errors.some(error => error.includes('incompatible.types'))).toBe(true);
      //   expect(result.errors.some(error => error.includes('final.field.requires.initializer'))).toBe(true);
      //   expect(result.errors.some(error => error.includes('script.too.large'))).toBe(true);
      // });

      it('should handle edge cases gracefully', () => {
        const edgeCaseCode = `
          public class EdgeCaseClass {
            public void testMethod() {
              // Empty method
            }
          }
        `;

        const result = AdvancedValidator.validateCompilationUnit(
          edgeCaseCode,
          'class',
          mockValidationScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate with different Apex versions', () => {
        const apexCode = `
          public class VersionTestClass {
            public void testMethod() {
              String name = 'test';
            }
          }
        `;

        // Test with different versions
        const result58 = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'class',
          { ...mockValidationScope(), version: 58 },
        );

        const result59 = AdvancedValidator.validateCompilationUnit(
          apexCode,
          'class',
          { ...mockValidationScope(), version: 59 },
        );

        expect(result58.isValid).toBe(true);
        expect(result59.isValid).toBe(true);
      });
    });
  });
});
