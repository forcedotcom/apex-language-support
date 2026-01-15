/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilerService } from '../../src/parser/compilerService';
import { SymbolKind } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

/**
 * Read a fixture file from the namespace fixtures directory
 * @param filename The name of the fixture file
 * @returns The contents of the fixture file
 */
const readFixture = (filename: string): string => {
  const fixturePath = path.join(__dirname, '../fixtures/namespace', filename);
  return fs.readFileSync(fixturePath, 'utf8');
};

describe('ApexSymbolCollectorListener with Namespace Support - Integration Tests', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('setProjectNamespace', () => {
    it('should set project namespace correctly', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      listener.setProjectNamespace('MyNamespace');

      // Access private property for testing
      const currentNamespace = (listener as any).currentNamespace;
      expect(currentNamespace?.toString()).toBe('MyNamespace');
    });

    it('should handle null namespace', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      listener.setProjectNamespace('');

      const currentNamespace = (listener as any).currentNamespace;
      expect(currentNamespace).toBeNull();
    });

    it('should handle undefined namespace', () => {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      listener.setProjectNamespace(undefined as any);

      const currentNamespace = (listener as any).currentNamespace;
      expect(currentNamespace).toBeNull();
    });
  });

  describe('namespace inheritance for top-level types', () => {
    it('should assign project namespace to top-level class', () => {
      const sourceCode = readFixture('top-level-class.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(classSymbol?.fqn).toBe('mynamespace.testclass');
    });

    it('should assign project namespace to top-level interface', () => {
      const sourceCode = readFixture('top-level-interface.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestInterface.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const interfaceSymbol = symbols.find((s) => s.name === 'TestInterface');

      expect(interfaceSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(interfaceSymbol?.fqn).toBe('mynamespace.testinterface');
    });

    it('should assign project namespace to top-level enum', () => {
      const sourceCode = readFixture('top-level-enum.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestEnum.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const enumSymbol = symbols.find((s) => s.name === 'TestEnum');

      expect(enumSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(enumSymbol?.fqn).toBe('mynamespace.testenum');
    });

    it('should assign project namespace to top-level trigger', () => {
      const sourceCode = readFixture('top-level-trigger.trigger');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestTrigger.trigger', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const triggerSymbol = symbols.find((s) => s.name === 'TestTrigger');

      expect(triggerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(triggerSymbol?.fqn).toBe('mynamespace.testtrigger');
    });
  });

  describe('namespace inheritance for inner types', () => {
    it('should inherit namespace for inner class', () => {
      const sourceCode = readFixture('inner-class.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'OuterClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const innerSymbol = symbols.find((s) => s.name === 'InnerClass');

      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.fqn).toBe('mynamespace.innerclass');
    });

    it('should inherit namespace for inner interface', () => {
      const sourceCode = readFixture('inner-interface.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'OuterClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const innerSymbol = symbols.find((s) => s.name === 'InnerInterface');

      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.fqn).toBe('mynamespace.innerinterface');
    });

    it('should inherit namespace for inner enum', () => {
      const sourceCode = readFixture('inner-enum.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'OuterClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const innerSymbol = symbols.find((s) => s.name === 'InnerEnum');

      expect(innerSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(innerSymbol?.fqn).toBe('mynamespace.innerenum');
    });
  });

  describe('namespace inheritance for methods', () => {
    it('should inherit namespace for method in class', () => {
      const sourceCode = readFixture('method-in-class.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();

      // Find any method symbol (since the name might be empty)
      const methodSymbol = symbols.find((s) => s.kind === 'method');

      expect(methodSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(methodSymbol?.fqn).toBe('mynamespace.mymethod');
    });

    it('should inherit namespace for method in interface', () => {
      const sourceCode = readFixture('method-in-interface.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestInterface.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const methodSymbol = symbols.find((s) => s.name === 'myMethod');

      expect(methodSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(methodSymbol?.fqn).toBe('mynamespace.mymethod');
    });

    it('should inherit namespace for constructor', () => {
      const sourceCode = readFixture('constructor.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const constructorSymbol = symbols.find(
        (s) => s.name === 'TestClass' && s.kind === SymbolKind.Constructor,
      );

      expect(constructorSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(constructorSymbol?.fqn).toBe('mynamespace.testclass');
    });
  });

  describe('namespace inheritance for fields and properties', () => {
    it('should inherit namespace for field in class', () => {
      const sourceCode = readFixture('field-in-class.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const fieldSymbol = symbols.find((s) => s.name === 'testField');

      expect(fieldSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(fieldSymbol?.fqn).toBe('mynamespace.testfield');
    });

    it('should inherit namespace for property in class', () => {
      const sourceCode = readFixture('property-in-class.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const propertySymbol = symbols.find((s) => s.name === 'testProperty');

      expect(propertySymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(propertySymbol?.fqn).toBe('mynamespace.testproperty');
    });
  });

  describe('namespace inheritance for local variables and parameters', () => {
    it('should inherit namespace for local variable in method', () => {
      const sourceCode = readFixture('local-variable.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const variableSymbol = symbols.find((s) => s.name === 'localVar');

      expect(variableSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(variableSymbol?.fqn).toBe('mynamespace.localvar');
    });

    it('should inherit namespace for parameter in method', () => {
      const sourceCode = readFixture('method-parameter.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const parameterSymbol = symbols.find((s) => s.name === 'param');

      expect(parameterSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(parameterSymbol?.fqn).toBe('mynamespace.param');
    });
  });

  describe('namespace inheritance for enum values', () => {
    it('should inherit namespace for enum values', () => {
      const sourceCode = readFixture('enum-with-values.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestEnum.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const enumValueSymbol = symbols.find((s) => s.name === 'VALUE1');

      expect(enumValueSymbol?.namespace?.toString()).toBe('MyNamespace');
      expect(enumValueSymbol?.fqn).toBe('mynamespace.value1');
    });
  });

  describe('complex namespace scenarios', () => {
    it('should handle nested inner classes with namespace inheritance', () => {
      const sourceCode = readFixture('nested-inner-classes.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'OuterClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

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
      const sourceCode = readFixture('multiple-inner-classes.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'OuterClass.cls', listener, {
        projectNamespace: 'MyNamespace',
      });

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
      const sourceCode = readFixture('no-namespace.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(
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
      const sourceCode = readFixture('no-namespace.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(sourceCode, 'TestClass.cls', listener, {
        projectNamespace: '',
      });

      const symbolTable = listener.getResult();
      const symbols = symbolTable.getAllSymbols();
      const classSymbol = symbols.find((s) => s.name === 'TestClass');

      expect(classSymbol?.namespace).toBeNull();
      expect(classSymbol?.fqn).toBeUndefined();
    });

    it('should maintain backward compatibility with existing functionality', () => {
      const sourceCode = readFixture('backward-compatibility.cls');

      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      compilerService.compile(
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
