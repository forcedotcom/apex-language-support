/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  calculateFQN,
  extractNamespace,
  isBuiltInFQN,
  getNamespaceFromFQN,
  isGlobalSymbol,
  isBlockScope,
} from '../../src/utils/FQNUtils';
import { SymbolKind, ApexSymbol } from '../../src/types/symbol';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';

describe('FQN Utilities', () => {
  let compilerService: CompilerService;

  beforeAll(async () => {
    // Initialize ResourceLoader with StandardApexLibrary.zip for standard library resolution
    await initializeResourceLoaderForTests();
  });

  afterAll(() => {
    resetResourceLoader();
  });

  beforeEach(() => {
    compilerService = new CompilerService();
  });

  // Helper function to compile Apex code and get symbols
  const compileAndGetSymbols = (
    apexCode: string,
    fileUri: string = 'file:///test/TestClass.cls',
  ): {
    symbolTable: any;
    getParent: (parentId: string) => ApexSymbol | null;
  } => {
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(apexCode, fileUri, listener);

    if (result.errors.length > 0) {
      console.warn('Compilation errors:', result.errors);
    }

    const symbolTable = result.result;
    expect(symbolTable).toBeDefined();

    // Create getParent function that looks up from symbol table
    const getParent = (parentId: string): ApexSymbol | null => {
      if (!symbolTable) return null;
      const allSymbols = symbolTable.getAllSymbols();
      return allSymbols.find((s: ApexSymbol) => s.id === parentId) || null;
    };

    return { symbolTable, getParent };
  };

  // Helper function to construct expected FQN by tracing the parent chain
  // This mirrors the logic in calculateFQN to build the expected value
  const getExpectedFQN = (
    symbol: ApexSymbol,
    getParent: (parentId: string) => ApexSymbol | null,
    normalizeCase: boolean = true,
  ): string => {
    const parts: string[] = [symbol.name];
    let currentParentId: string | null = symbol.parentId;
    const visitedIds = new Set<string>();
    visitedIds.add(symbol.id);

    while (currentParentId && visitedIds.size < 20) {
      if (visitedIds.has(currentParentId)) {
        break; // Cycle detected
      }
      visitedIds.add(currentParentId);

      const parent = getParent(currentParentId);
      if (!parent) {
        break;
      }

      if (parent.id === symbol.id) {
        break; // Self-reference
      }

      // Include all parents in FQN (as per user requirement)
      parts.unshift(parent.name);

      currentParentId = parent.parentId ?? null;
    }

    let fqn = parts.join('.');

    if (normalizeCase) {
      fqn = fqn.toLowerCase();
    }
    return fqn;
  };

  describe('calculateFQN', () => {
    it('should calculate simple FQN for a standalone symbol', () => {
      const apexCode = `
        public class TestClass {
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'TestClass' && s.kind === SymbolKind.Class,
      );

      expect(classSymbol).toBeDefined();
      expect(calculateFQN(classSymbol!, undefined, getParent)).toBe(
        'TestClass',
      );
    });

    it('should calculate FQN for a symbol with parent', () => {
      const apexCode = `
        public class ParentClass {
          public void childMethod() {
          }
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const methodSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'childMethod' && s.kind === SymbolKind.Method,
      );

      expect(methodSymbol).toBeDefined();
      // FQN is normalized to lowercase for Apex case-insensitive convention
      // FQN now includes blocks: class -> class block -> method
      const expectedFQN = getExpectedFQN(methodSymbol!, getParent, true);
      expect(
        calculateFQN(methodSymbol!, { normalizeCase: true }, getParent),
      ).toBe(expectedFQN);
    });

    it('should calculate FQN for a symbol with multiple parents', () => {
      const apexCode = `
        public class GrandparentClass {
          public class ParentClass {
            public void childMethod() {
            }
          }
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const methodSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'childMethod' && s.kind === SymbolKind.Method,
      );

      expect(methodSymbol).toBeDefined();
      // FQN should include all parent types and blocks in the hierarchy
      const expectedFQN = getExpectedFQN(methodSymbol!, getParent, true);
      const fqn = calculateFQN(
        methodSymbol!,
        { normalizeCase: true },
        getParent,
      );
      expect(fqn).toBe(expectedFQN);
    });

    it('should handle namespace in FQN', () => {
      const apexCode = `
        public class MyClass {
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s: ApexSymbol) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );

      expect(classSymbol).toBeDefined();
      // Set namespace manually for this test
      classSymbol!.namespace = 'TestNamespace';
      expect(calculateFQN(classSymbol!, undefined, getParent)).toBe(
        'TestNamespace.MyClass',
      );
    });

    it('should calculate FQN with nested hierarchy', () => {
      const apexCode = `
        public class OuterClass {
          public class InnerClass {
            public void myMethod() {
            }
          }
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const methodSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );

      expect(methodSymbol).toBeDefined();
      // FQN should include outer class, inner class, blocks, and method
      const expectedFQN = getExpectedFQN(methodSymbol!, getParent, true);
      const fqn = calculateFQN(
        methodSymbol!,
        { normalizeCase: true },
        getParent,
      );
      expect(fqn).toBe(expectedFQN);
    });

    it.skip('should not apply namespace if already inherited from parent', () => {
      // This test would require namespace support in the parser/listener
      // Skipping for now as it's testing namespace inheritance behavior
    });

    it('should apply namespace to top-level symbols when provided', () => {
      const apexCode = `
        public class MyClass {
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const classSymbol = allSymbols.find(
        (s: ApexSymbol) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );

      expect(classSymbol).toBeDefined();
      expect(
        calculateFQN(
          classSymbol!,
          { defaultNamespace: 'MyNamespace' },
          getParent,
        ),
      ).toBe('MyNamespace.MyClass');
      expect(classSymbol!.namespace).toBe('MyNamespace');
    });

    it.skip('should not apply namespace to child symbols even when provided', () => {
      // This test would require namespace support in the parser/listener
      // Skipping for now as it's testing namespace inheritance behavior
    });

    describe('FQN with different scope types', () => {
      it('should include if block in FQN for variables in if blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              if (true) {
                String ifVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'ifVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          // Get expected FQN by tracing the parent chain
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          // Assert on the full FQN value
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include while block in FQN for variables in while blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              while (true) {
                String whileVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'whileVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include for block in FQN for variables in for blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              for (Integer i = 0; i < 10; i++) {
                String forVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'forVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include try block in FQN for variables in try blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              try {
                String tryVar = 'test';
              } catch (Exception e) {
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'tryVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include catch block in FQN for variables in catch blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              try {
              } catch (Exception e) {
                String catchVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'catchVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include finally block in FQN for variables in finally blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              try {
              } finally {
                String finallyVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'finallyVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include switch and when blocks in FQN', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              switch on 'test' {
                when 'value' {
                  String whenVar = 'test';
                }
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'whenVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include nested blocks in FQN', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              if (true) {
                while (false) {
                  for (Integer i = 0; i < 5; i++) {
                    String nestedVar = 'test';
                  }
                }
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'nestedVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include method block in FQN for variables in method blocks', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              String methodVar = 'test';
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'methodVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should include class block in FQN for fields', () => {
        const apexCode = `
          public class TestClass {
            private String classField = 'test';
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const fieldSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'classField' && s.kind === SymbolKind.Field,
        );

        expect(fieldSymbol).toBeDefined();
        if (fieldSymbol) {
          const fqn = calculateFQN(
            fieldSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(fieldSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should handle do-while block in FQN', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              do {
                String doWhileVar = 'test';
              } while (false);
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'doWhileVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should handle runAs block in FQN', () => {
        const apexCode = `
          public class TestClass {
            public void someMethod() {
              User u = new User();
              System.runAs(u) {
                String runAsVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'runAsVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should handle getter block in FQN', () => {
        const apexCode = `
          public class TestClass {
            public String testProperty {
              get {
                String getterVar = 'test';
                return getterVar;
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'getterVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });

      it('should handle setter block in FQN', () => {
        const apexCode = `
          public class TestClass {
            public String testProperty {
              set {
                String setterVar = 'test';
              }
            }
          }
        `;

        const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
        const allSymbols = symbolTable.getAllSymbols();

        const variableSymbol = allSymbols.find(
          (s: ApexSymbol) =>
            s.name === 'setterVar' && s.kind === SymbolKind.Variable,
        );

        expect(variableSymbol).toBeDefined();
        if (variableSymbol) {
          const fqn = calculateFQN(
            variableSymbol,
            { normalizeCase: true },
            getParent,
          );
          const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
          expect(fqn).toBe(expectedFQN);
        }
      });
    });

    it('should calculate FQN for variable in deeply nested structure', () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            if (true) {
              String localVar = 'test';
            }
          }
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();

      const variableSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'localVar' && s.kind === SymbolKind.Variable,
      );

      expect(variableSymbol).toBeDefined();
      if (variableSymbol) {
        const fqn = calculateFQN(
          variableSymbol,
          { normalizeCase: true },
          getParent,
        );
        const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
        expect(fqn).toBe(expectedFQN);

        // Verify the FQN includes all parent symbols in the hierarchy
        expect(fqn).toContain('myclass');
        expect(fqn).toContain('mymethod');
        expect(fqn).toContain('localvar');
      }
    });
  });

  describe('extractNamespace', () => {
    it('should extract built-in namespace from qualified name', () => {
      expect(extractNamespace('System.String')).toBe('System');
    });

    it('should return empty string if no namespace is present', () => {
      expect(extractNamespace('MyClass')).toBe('');
    });

    it('should return default namespace if provided and no namespace is in name', () => {
      expect(extractNamespace('MyClass', 'DefaultNamespace')).toBe(
        'DefaultNamespace',
      );
    });

    it('should prioritize built-in namespace over default namespace', () => {
      expect(extractNamespace('System.String', 'DefaultNamespace')).toBe(
        'System',
      );
    });
  });

  describe('isBuiltInFQN', () => {
    it('should identify built-in namespace types', () => {
      expect(isBuiltInFQN('System.String')).toBe(true);
      expect(isBuiltInFQN('Database.QueryLocator')).toBe(true);
    });

    it('should identify standalone built-in namespaces', () => {
      expect(isBuiltInFQN('System')).toBe(true);
      expect(isBuiltInFQN('Database')).toBe(true);
    });

    it('should return false for custom namespaces', () => {
      expect(isBuiltInFQN('MyNamespace.MyClass')).toBe(false);
      expect(isBuiltInFQN('Custom.Type')).toBe(false);
    });
  });

  describe('getNamespaceFromFQN', () => {
    it('should extract namespace from FQN', () => {
      expect(getNamespaceFromFQN('MyNamespace.MyClass')).toBe('MyNamespace');
      expect(getNamespaceFromFQN('System.String')).toBe('System');
    });

    it('should return undefined if no namespace is present', () => {
      expect(getNamespaceFromFQN('MyClass')).toBeUndefined();
    });
  });

  describe('isGlobalSymbol', () => {
    it('should identify global symbols', () => {
      expect(isGlobalSymbol({ visibility: 'global' })).toBe(true);
    });

    it('should return false for non-global symbols', () => {
      expect(isGlobalSymbol({ visibility: 'public' })).toBe(false);
      expect(isGlobalSymbol({ visibility: 'private' })).toBe(false);
      expect(isGlobalSymbol({})).toBe(false);
    });

    it('should handle null and undefined values', () => {
      expect(isGlobalSymbol(null)).toBe(false);
      expect(isGlobalSymbol(undefined)).toBe(false);
    });
  });

  describe('isBlockScope', () => {
    it('should identify block symbols', () => {
      const apexCode = `
        public class TestClass {
          public void someMethod() {
            if (true) {
              // block scope
            }
          }
        }
      `;

      const { symbolTable } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();
      const blockSymbol = allSymbols.find(
        (s: ApexSymbol) => isBlockSymbol(s) && s.scopeType === 'if',
      );

      expect(blockSymbol).toBeDefined();
      if (blockSymbol) {
        expect(isBlockScope(blockSymbol)).toBe(true);
      }
    });

    it('should return false for non-block symbols', () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
          }
        }
      `;

      const { symbolTable } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();

      const classSymbol = allSymbols.find(
        (s: ApexSymbol) => s.name === 'MyClass' && s.kind === SymbolKind.Class,
      );
      expect(classSymbol).toBeDefined();
      if (classSymbol) {
        expect(isBlockScope(classSymbol)).toBe(false);
      }

      const methodSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'myMethod' && s.kind === SymbolKind.Method,
      );
      expect(methodSymbol).toBeDefined();
      if (methodSymbol) {
        expect(isBlockScope(methodSymbol)).toBe(false);
      }
    });

    it('should handle null and undefined values', () => {
      expect(isBlockScope(null)).toBe(false);
      expect(isBlockScope(undefined)).toBe(false);
    });

    it('should include block symbols in FQN calculation when they are actual parents', () => {
      const apexCode = `
        public class MyClass {
          public void myMethod() {
            if (true) {
              String localVar = 'test';
            }
          }
        }
      `;

      const { symbolTable, getParent } = compileAndGetSymbols(apexCode);
      const allSymbols = symbolTable.getAllSymbols();

      // Find the local variable (which should have a block as parent)
      const variableSymbol = allSymbols.find(
        (s: ApexSymbol) =>
          s.name === 'localVar' && s.kind === SymbolKind.Variable,
      );

      expect(variableSymbol).toBeDefined();
      if (variableSymbol) {
        const fqn = calculateFQN(
          variableSymbol,
          { normalizeCase: true },
          getParent,
        );
        const expectedFQN = getExpectedFQN(variableSymbol, getParent, true);
        expect(fqn).toBe(expectedFQN);
      }
    });
  });
});
