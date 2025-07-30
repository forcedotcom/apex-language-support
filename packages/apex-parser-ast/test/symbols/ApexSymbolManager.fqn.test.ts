/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

describe('ApexSymbolManager FQN Bug Fix Tests', () => {
  let symbolManager: ApexSymbolManager;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('FQN Calculation and Storage', () => {
    it('should calculate and store FQN for top-level class', () => {
      // Create a symbol without FQN (simulating the bug condition)
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        null, // parentId
        { interfaces: [] }, // typeData
        undefined, // fqn - intentionally undefined to simulate the bug
      );

      // Add symbol to manager
      symbolManager.addSymbol(classSymbol, 'test.cls');

      // Verify FQN was calculated and stored
      expect(classSymbol.fqn).toBe('TestClass');

      // Verify FQN can be looked up
      const foundSymbol = symbolManager.findSymbolByFQN('TestClass');
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('TestClass');
    });

    it('should calculate and store FQN for nested method', () => {
      // Create a class symbol
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        null, // parentId
        { interfaces: [] }, // typeData
        'TestClass', // fqn for class
      );

      // Create a method symbol without FQN
      const methodSymbol = SymbolFactory.createFullSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 5, startColumn: 1, endLine: 5, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        classSymbol.id, // parentId
        {
          returnType: { name: 'String', isPrimitive: true, isArray: false },
          parameters: [],
        }, // typeData
        undefined, // fqn - intentionally undefined to simulate the bug
      );

      // Set up parent relationship
      methodSymbol.parent = classSymbol;

      // Add symbols to manager
      symbolManager.addSymbol(classSymbol, 'test.cls');
      symbolManager.addSymbol(methodSymbol, 'test.cls');

      // Verify FQN was calculated and stored
      expect(methodSymbol.fqn).toBe('TestClass.testMethod');

      // Verify FQN can be looked up
      const foundSymbol = symbolManager.findSymbolByFQN('TestClass.testMethod');
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('testMethod');
    });

    it('should handle deeply nested symbols', () => {
      // Create outer class
      const outerClass = SymbolFactory.createFullSymbol(
        'OuterClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        null, // parentId
        { interfaces: [] }, // typeData
        'OuterClass', // fqn for outer class
      );

      // Create inner class
      const innerClass = SymbolFactory.createFullSymbol(
        'InnerClass',
        SymbolKind.Class,
        { startLine: 3, startColumn: 1, endLine: 3, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        outerClass.id, // parentId
        { interfaces: [] }, // typeData
        undefined, // fqn - intentionally undefined
      );

      // Create method in inner class
      const methodSymbol = SymbolFactory.createFullSymbol(
        'innerMethod',
        SymbolKind.Method,
        { startLine: 5, startColumn: 1, endLine: 5, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        innerClass.id, // parentId
        {
          returnType: { name: 'String', isPrimitive: true, isArray: false },
          parameters: [],
        }, // typeData
        undefined, // fqn - intentionally undefined
      );

      // Set up parent relationships
      innerClass.parent = outerClass;
      methodSymbol.parent = innerClass;

      // Add symbols to manager
      symbolManager.addSymbol(outerClass, 'test.cls');
      symbolManager.addSymbol(innerClass, 'test.cls');
      symbolManager.addSymbol(methodSymbol, 'test.cls');

      // Verify FQNs were calculated and stored
      expect(innerClass.fqn).toBe('OuterClass.InnerClass');
      expect(methodSymbol.fqn).toBe('OuterClass.InnerClass.innerMethod');

      // Verify FQNs can be looked up
      const foundInnerClass = symbolManager.findSymbolByFQN(
        'OuterClass.InnerClass',
      );
      expect(foundInnerClass).toBeTruthy();
      expect(foundInnerClass?.name).toBe('InnerClass');

      const foundMethod = symbolManager.findSymbolByFQN(
        'OuterClass.InnerClass.innerMethod',
      );
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('innerMethod');
    });

    it('should preserve existing FQNs when already present', () => {
      // Create a symbol with FQN already set
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        null, // parentId
        { interfaces: [] }, // typeData
        'CustomNamespace.TestClass', // fqn already set
      );

      // Add symbol to manager
      symbolManager.addSymbol(classSymbol, 'test.cls');

      // Verify existing FQN was preserved
      expect(classSymbol.fqn).toBe('CustomNamespace.TestClass');

      // Verify FQN can be looked up
      const foundSymbol = symbolManager.findSymbolByFQN(
        'CustomNamespace.TestClass',
      );
      expect(foundSymbol).toBeTruthy();
      expect(foundSymbol?.name).toBe('TestClass');
    });
  });

  describe('FQN Index Population', () => {
    it('should populate FQN index for all symbols', () => {
      // Create multiple symbols without FQNs
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        null, // parentId
        { interfaces: [] }, // typeData
        undefined, // fqn
      );

      const methodSymbol = SymbolFactory.createFullSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 5, startColumn: 1, endLine: 5, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        classSymbol.id, // parentId
        {
          returnType: { name: 'String', isPrimitive: true, isArray: false },
          parameters: [],
        }, // typeData
        undefined, // fqn
      );

      // Set up parent relationship
      methodSymbol.parent = classSymbol;

      // Add symbols to manager
      symbolManager.addSymbol(classSymbol, 'test.cls');
      symbolManager.addSymbol(methodSymbol, 'test.cls');

      // Verify both FQNs can be looked up
      const foundClass = symbolManager.findSymbolByFQN('TestClass');
      expect(foundClass).toBeTruthy();
      expect(foundClass?.name).toBe('TestClass');

      const foundMethod = symbolManager.findSymbolByFQN('TestClass.testMethod');
      expect(foundMethod).toBeTruthy();
      expect(foundMethod?.name).toBe('testMethod');
    });
  });

  describe('Integration with Symbol Resolution', () => {
    it('should resolve symbols by FQN in hover context', () => {
      // Create a class with a method
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        null, // parentId
        { interfaces: [] }, // typeData
        undefined, // fqn
      );

      const methodSymbol = SymbolFactory.createFullSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 5, startColumn: 1, endLine: 5, endColumn: 10 },
        'test.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        classSymbol.id, // parentId
        {
          returnType: { name: 'String', isPrimitive: true, isArray: false },
          parameters: [],
        }, // typeData
        undefined, // fqn
      );

      // Set up parent relationship
      methodSymbol.parent = classSymbol;

      // Add symbols to manager
      symbolManager.addSymbol(classSymbol, 'test.cls');
      symbolManager.addSymbol(methodSymbol, 'test.cls');

      // Test symbol resolution with context (simulating hover)
      const resolutionContext = {
        sourceFile: 'test.cls',
        namespaceContext: 'public',
        currentScope: 'method',
        scopeChain: ['method', 'class', 'global'],
        expectedType: 'String',
        parameterTypes: [],
        accessModifier: 'public' as const,
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
        importStatements: [],
      };

      // Resolve by name (should work)
      const nameResult = symbolManager.resolveSymbol(
        'testMethod',
        resolutionContext,
      );
      expect(nameResult.symbol).toBeTruthy();
      expect(nameResult.symbol?.name).toBe('testMethod');

      // Verify FQN lookup works separately
      const fqnResult = symbolManager.findSymbolByFQN('TestClass.testMethod');
      expect(fqnResult).toBeTruthy();
      expect(fqnResult?.name).toBe('testMethod');
    });
  });
});
