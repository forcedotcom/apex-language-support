/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolCollectorListener } from '../../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../../src/parser/compilerService';
import { SymbolKind } from '../../../src/types/symbol';

describe('ApexSymbolCollectorListener with Namespace Support - Integration Tests', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  describe('setProjectNamespace', () => {
    it('should set project namespace correctly', () => {
      const listener = new ApexSymbolCollectorListener();
      listener.setProjectNamespace('MyNamespace');

      // Access private property for testing
      const currentNamespace = (listener as any).currentNamespace;
      expect(currentNamespace?.toString()).toBe('MyNamespace');
    });

    it('should handle null namespace', () => {
      const listener = new ApexSymbolCollectorListener();
      listener.setProjectNamespace('');

      const currentNamespace = (listener as any).currentNamespace;
      expect(currentNamespace).toBeNull();
    });

    it('should handle undefined namespace', () => {
      const listener = new ApexSymbolCollectorListener();
      listener.setProjectNamespace(undefined as any);

      const currentNamespace = (listener as any).currentNamespace;
      expect(currentNamespace).toBeNull();
    });
  });

  describe('namespace inheritance for top-level types', () => {
    it('should assign project namespace to top-level class', () => {
      const sourceCode = `
        public class TestClass {
          private String testField;
          
          public void testMethod() {
            // method body
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

    it('should assign project namespace to top-level interface', () => {
      const sourceCode = `
        public interface TestInterface {
          void testMethod();
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
      const interfaceSymbol = symbols.find((s) => s.name === 'TestInterface');

      expect(interfaceSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(interfaceSymbol?.fqn).toBe('mynamespace/testinterface');
    });

    it('should assign project namespace to top-level enum', () => {
      const sourceCode = `
        public enum TestEnum {
          VALUE1,
          VALUE2,
          VALUE3
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
      const enumSymbol = symbols.find((s) => s.name === 'TestEnum');

      expect(enumSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(enumSymbol?.fqn).toBe('mynamespace/testenum');
    });

    it('should assign project namespace to top-level trigger', () => {
      const sourceCode = `
        trigger TestTrigger on Account (before insert, after insert) {
          // trigger body
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestTrigger.trigger',
        listener,
        { projectNamespace: 'MyNamespace' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const triggerSymbol = symbols.find((s) => s.name === 'TestTrigger');

      expect(triggerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(triggerSymbol?.fqn).toBe('mynamespace/testtrigger');
    });
  });

  describe('namespace inheritance for inner types', () => {
    it('should inherit namespace for inner class', () => {
      const sourceCode = `
        public class OuterClass {
          public class InnerClass {
            private String innerField;
            
            public void innerMethod() {
              // method body
            }
          }
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
      const innerSymbol = symbols.find((s) => s.name === 'InnerClass');

      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.fqn).toBe('mynamespace/innerclass');
    });

    it('should inherit namespace for inner interface', () => {
      const sourceCode = `
        public class OuterClass {
          public interface InnerInterface {
            void innerMethod();
          }
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
      const innerSymbol = symbols.find((s) => s.name === 'InnerInterface');

      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.fqn).toBe('mynamespace/innerinterface');
    });

    it('should inherit namespace for inner enum', () => {
      const sourceCode = `
        public class OuterClass {
          public enum InnerEnum {
            VALUE1,
            VALUE2
          }
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
      const innerSymbol = symbols.find((s) => s.name === 'InnerEnum');

      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.fqn).toBe('mynamespace/innerenum');
    });
  });

  describe('namespace inheritance for methods', () => {
    it('should inherit namespace for method in class', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            // method body
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

      // Find any method symbol (since the name might be empty)
      const methodSymbol = symbols.find((s) => s.kind === 'method');

      // Debug: Log all symbols
      console.log(
        'All symbols:',
        symbols.map((s) => ({
          name: s.name,
          kind: s.kind,
          namespace: s.namespace,
          fqn: s.fqn,
        })),
      );

      console.log('Method symbol:', methodSymbol);

      expect(methodSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(methodSymbol?.fqn).toBe('mynamespace/testmethod');
    });

    it('should inherit namespace for method in interface', () => {
      const sourceCode = `
        public interface TestInterface {
          void testMethod();
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
      const methodSymbol = symbols.find((s) => s.name === 'testMethod');

      expect(methodSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(methodSymbol?.fqn).toBe('mynamespace/testmethod');
    });

    it('should inherit namespace for constructor', () => {
      const sourceCode = `
        public class TestClass {
          public TestClass() {
            // constructor body
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
      const constructorSymbol = symbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Constructor,
      );

      expect(constructorSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(constructorSymbol?.fqn).toBe('mynamespace/testclass');
    });
  });

  describe('namespace inheritance for fields and properties', () => {
    it('should inherit namespace for field in class', () => {
      const sourceCode = `
        public class TestClass {
          private String testField;
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
      const fieldSymbol = symbols.find((s) => s.name === 'testField');

      expect(fieldSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(fieldSymbol?.fqn).toBe('mynamespace/testfield');
    });

    it('should inherit namespace for property in class', () => {
      const sourceCode = `
        public class TestClass {
          public String testProperty { get; set; }
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
      const propertySymbol = symbols.find((s) => s.name === 'testProperty');

      expect(propertySymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(propertySymbol?.fqn).toBe('mynamespace/testproperty');
    });
  });

  describe('namespace inheritance for local variables and parameters', () => {
    it('should inherit namespace for local variable in method', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            String localVar = 'test';
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
      const variableSymbol = symbols.find((s) => s.name === 'localVar');

      expect(variableSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(variableSymbol?.fqn).toBe('mynamespace/localvar');
    });

    it('should inherit namespace for parameter in method', () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod(String param) {
            // method body
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
      const parameterSymbol = symbols.find((s) => s.name === 'param');

      expect(parameterSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(parameterSymbol?.fqn).toBe('mynamespace/param');
    });
  });

  describe('namespace inheritance for enum values', () => {
    it('should inherit namespace for enum values', () => {
      const sourceCode = `
        public enum TestEnum {
          VALUE1,
          VALUE2,
          VALUE3
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
      const enumValueSymbol = symbols.find((s) => s.name === 'VALUE1');

      expect(enumValueSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(enumValueSymbol?.fqn).toBe('mynamespace/value1');
    });
  });

  describe('complex namespace scenarios', () => {
    it('should handle nested inner classes with namespace inheritance', () => {
      const sourceCode = `
        public class OuterClass {
          public class InnerClass {
            private String innerField;
            
            public void innerMethod() {
              String localVar = 'test';
            }
          }
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

      const outerSymbol = symbols.find((s) => s.name === 'OuterClass');
      const innerSymbol = symbols.find((s) => s.name === 'InnerClass');
      const methodSymbol = symbols.find((s) => s.name === 'innerMethod');
      const fieldSymbol = symbols.find((s) => s.name === 'innerField');
      const variableSymbol = symbols.find((s) => s.name === 'localVar');

      expect(outerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(methodSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(fieldSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(variableSymbol?.namespace?.toString()).toBe('MyNamespace');
    });

    it('should handle multiple top-level types with same namespace', () => {
      const sourceCode = `
        public class OuterClass {
          private String field1;
          
          public class InnerClass1 {
            private String innerField1;
          }
          
          public class InnerClass2 {
            private String innerField2;
          }
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

      const outerClassSymbol = symbols.find((s) => s.name === 'OuterClass');
      const innerClass1Symbol = symbols.find((s) => s.name === 'InnerClass1');
      const innerClass2Symbol = symbols.find((s) => s.name === 'InnerClass2');

      expect(outerClassSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerClass1Symbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerClass2Symbol?.namespace?.toString()).toBe('MyNamespace');
    });
  });

  describe('edge cases', () => {
    it('should handle compilation without project namespace', () => {
      const sourceCode = `
        public class TestClass {
          private String testField;
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
        {}, // No project namespace
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.namespace).toBeNull();
      expect(classSymbol?.fqn).toBeUndefined();
    });

    it('should handle empty project namespace', () => {
      const sourceCode = `
        public class TestClass {
          private String testField;
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
        { projectNamespace: '' },
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.namespace).toBeNull();
      expect(classSymbol?.fqn).toBeUndefined();
    });

    it('should maintain backward compatibility with existing functionality', () => {
      const sourceCode = `
        public class TestClass {
          private String testField;
          
          public void testMethod() {
            // method body
          }
        }
      `;

      const listener = new ApexSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'TestClass.cls',
        listener,
        {}, // No namespace
      );

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');

      expect(classSymbol).toBeDefined();
      expect(classSymbol?.name).toBe('TestClass');
      expect(classSymbol?.kind).toBe(SymbolKind.Class);
    });
  });
});
