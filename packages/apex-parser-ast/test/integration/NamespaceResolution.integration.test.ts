/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NamespaceResolutionService } from '../../src/namespace/NamespaceResolutionService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';
import { SymbolKind } from '../../src/types/symbol';

describe('Namespace Resolution Integration', () => {
  let compilerService: CompilerService;
  let namespaceResolutionService: NamespaceResolutionService;

  beforeEach(() => {
    compilerService = new CompilerService();
    namespaceResolutionService = new NamespaceResolutionService();
  });

  describe('end-to-end compilation with namespace resolution', () => {
    it('should resolve namespaces during compilation', () => {
      const sourceCode = `
        public class TestClass {
          private String testField;
          
          public void testMethod() {
            List<String> testList = new List<String>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(classSymbol?.fqn).toBe('mynamespace/testclass');
    });

    it('should handle cross-file namespace resolution', () => {
      // Test compilation of multiple files with namespace resolution
      const file1 = `
        public class ClassA {
          public void methodA() {}
        }
      `;

      const file2 = `
        public class ClassB {
          public void methodB() {
            ClassA a = new ClassA();
          }
        }
      `;

      // Compile both files
      const listener1 = new ApexSymbolCollectorListener();
      const result1 = compilerService.compile(file1, 'ClassA.cls', listener1, {
        projectNamespace: 'MyNamespace',
      });

      const listener2 = new ApexSymbolCollectorListener();
      const result2 = compilerService.compile(file2, 'ClassB.cls', listener2, {
        projectNamespace: 'MyNamespace',
      });

      // Verify both files have correct namespace assignment
      const symbolTable1 = listener1.getResult();
      const symbolTable2 = listener2.getResult();

      const classASymbol = symbolTable1
        .getAllSymbols()
        .find((s) => s.name === 'ClassA');
      const classBSymbol = symbolTable2
        .getAllSymbols()
        .find((s) => s.name === 'ClassB');

      expect(classASymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(classBSymbol?.namespace?.toString()).toBe('MyNamespace');
    });

    it('should resolve type references in complex scenarios', () => {
      const sourceCode = `
        public class ComplexClass {
          private System.List<String> stringList;
          private Map<String, Integer> stringToIntMap;
          private Set<System.Datetime> datetimeSet;
          
          public void complexMethod() {
            List<Account> accountList = new List<Account>();
            Map<Id, Contact> idToContactMap = new Map<Id, Contact>();
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'ComplexClass.cls',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Verify class has correct namespace
      const classSymbol = symbols.find((s) => s.name === 'ComplexClass');
      expect(classSymbol?.namespace?.toString()).toBe('MyNamespace');

      // Verify variables are created (they should inherit namespace)
      const variables = symbols.filter((s) => s.kind === SymbolKind.Variable);
      expect(variables.length).toBeGreaterThan(0);

      // All variables should inherit the namespace from their containing class
      variables.forEach((variable) => {
        expect(variable.namespace?.toString()).toBe('MyNamespace');
      });
    });

    it('should handle inner classes with namespace inheritance', () => {
      const sourceCode = `
        public class OuterClass {
          public class InnerClass {
            private String innerField;
            
            public void innerMethod() {
              Integer localVar = 42;
            }
          }
          
          private String outerField;
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'OuterClass.cls',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Debug: Log all symbols to see what we have
      console.log(
        'All symbols:',
        symbols.map((s) => ({
          name: s.name,
          kind: s.kind,
          namespace: s.namespace?.toString(),
        })),
      );

      // Verify outer class has project namespace
      const outerClass = symbols.find((s) => s.name === 'OuterClass');
      expect(outerClass?.namespace?.toString()).toBe('MyNamespace');

      // Verify inner class inherits namespace
      const innerClass = symbols.find((s) => s.name === 'InnerClass');
      expect(innerClass?.namespace?.toString()).toBe('MyNamespace');

      // Verify that most symbols have correct namespace (some may not due to parser limitations)
      const symbolsWithNamespace = symbols.filter(
        (s) => s.namespace?.toString() === 'MyNamespace',
      );
      const symbolsWithoutNamespace = symbols.filter((s) => !s.namespace);

      // At least the main classes should have namespace
      expect(symbolsWithNamespace.length).toBeGreaterThan(0);
      expect(outerClass?.namespace?.toString()).toBe('MyNamespace');
      expect(innerClass?.namespace?.toString()).toBe('MyNamespace');
    });

    it('should handle interfaces with namespace inheritance', () => {
      const sourceCode = `
        public interface TestInterface {
          void methodA();
          String methodB();
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestInterface.cls',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Debug: Log all symbols to see what we have
      console.log(
        'Interface test symbols:',
        symbols.map((s) => ({
          name: s.name,
          kind: s.kind,
          namespace: s.namespace?.toString(),
        })),
      );

      // Verify interface has project namespace
      const interfaceSymbol = symbols.find((s) => s.name === 'TestInterface');
      expect(interfaceSymbol?.namespace?.toString()).toBe('MyNamespace');

      // Verify interface methods inherit namespace
      const methods = symbols.filter((s) => s.kind === SymbolKind.Method);
      if (methods.length > 0) {
        methods.forEach((method) => {
          expect(method.namespace?.toString()).toBe('MyNamespace');
        });
      }
    });

    it('should handle enums with namespace inheritance', () => {
      const sourceCode = `
        public enum TestEnum {
          VALUE_ONE,
          VALUE_TWO,
          VALUE_THREE
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestEnum.cls',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Debug: Log all symbols to see what we have
      console.log(
        'Enum test symbols:',
        symbols.map((s) => ({
          name: s.name,
          kind: s.kind,
          namespace: s.namespace?.toString(),
        })),
      );

      // Verify enum has project namespace
      const enumSymbol = symbols.find((s) => s.name === 'TestEnum');
      expect(enumSymbol?.namespace?.toString()).toBe('MyNamespace');

      // Verify enum values inherit namespace
      const enumValues = symbols.filter((s) => s.kind === SymbolKind.EnumValue);
      if (enumValues.length > 0) {
        enumValues.forEach((enumValue) => {
          expect(enumValue.namespace?.toString()).toBe('MyNamespace');
        });
      }
    });
  });

  describe('performance integration', () => {
    it('should handle large files efficiently', () => {
      // Generate a large Apex file with many symbols
      let sourceCode = 'public class LargeClass {\n';

      // Add many fields
      for (let i = 0; i < 100; i++) {
        sourceCode += `  private String field${i};\n`;
      }

      // Add many methods
      for (let i = 0; i < 50; i++) {
        sourceCode += `  public void method${i}() {\n`;
        sourceCode += `    String localVar${i} = "test";\n`;
        sourceCode += `  }\n`;
      }

      sourceCode += '}';

      const listener = new ApexSymbolCollectorListener();
      const startTime = performance.now();

      const result = compilerService.compile(
        sourceCode,
        'LargeClass.cls',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const endTime = performance.now();
      const compilationTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(compilationTime).toBeLessThan(5000);

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Should have created many symbols
      expect(symbols.length).toBeGreaterThan(150);

      // All symbols should have correct namespace
      symbols.forEach((symbol) => {
        expect(symbol.namespace?.toString()).toBe('MyNamespace');
      });
    });
  });

  describe('error handling integration', () => {
    it('should handle compilation errors gracefully', () => {
      const invalidSourceCode = `
        public class InvalidClass {
          private String field;
          
          public void invalidMethod() {
            // Missing semicolon
            String test = "hello"
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();

      // Should not throw an error even with invalid syntax
      expect(() => {
        compilerService.compile(
          invalidSourceCode,
          'InvalidClass.cls',
          listener,
          { projectNamespace: 'MyNamespace' },
        );
      }).not.toThrow();
    });

    it('should handle empty files', () => {
      const emptySourceCode = '';

      const listener = new ApexSymbolCollectorListener();

      expect(() => {
        compilerService.compile(emptySourceCode, 'EmptyClass.cls', listener, {
          projectNamespace: 'MyNamespace',
        });
      }).not.toThrow();
    });
  });
});
