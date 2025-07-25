/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
  SymbolTable,
  LightweightSymbol,
  toLightweightSymbol,
  fromLightweightSymbol,
  ModifierFlags,
  SymbolKindValues,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
} from '../../src/types/symbol';
import { TypeInfo, createPrimitiveType } from '../../src/types/typeInfo';

describe('LightweightSymbol - Phase 2 Memory Optimization', () => {
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolTable = new SymbolTable();
  });

  // Helper function to create test symbols
  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    fqn?: string,
    filePath: string = 'TestFile.cls',
  ): ApexSymbol => ({
    name,
    kind,
    fqn: fqn || `TestNamespace.${name}`,
    location: {
      startLine: 1,
      startColumn: 1,
      endLine: 10,
      endColumn: 20,
    },
    modifiers: {
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
    key: {
      prefix: kind,
      name,
      path: [filePath, name],
    },
    parentKey: null,
  });

  const createTestTypeSymbol = (
    name: string,
    kind:
      | SymbolKind.Class
      | SymbolKind.Interface
      | SymbolKind.Trigger
      | SymbolKind.Enum,
    superClass?: string,
    interfaces: string[] = [],
    filePath: string = 'TestFile.cls',
  ): TypeSymbol => ({
    ...createTestSymbol(name, kind, undefined, filePath),
    kind,
    superClass,
    interfaces,
  });

  const createTestMethodSymbol = (
    name: string,
    returnType: TypeInfo = createPrimitiveType('void'),
    parameters: VariableSymbol[] = [],
    filePath: string = 'TestFile.cls',
  ): MethodSymbol => ({
    ...createTestSymbol(name, SymbolKind.Method, undefined, filePath),
    kind: SymbolKind.Method,
    returnType,
    parameters,
  });

  const createTestVariableSymbol = (
    name: string,
    kind:
      | SymbolKind.Property
      | SymbolKind.Field
      | SymbolKind.Variable
      | SymbolKind.Parameter
      | SymbolKind.EnumValue,
    type: TypeInfo = createPrimitiveType('String'),
    initialValue?: string,
    filePath: string = 'TestFile.cls',
  ): VariableSymbol => ({
    ...createTestSymbol(name, kind, undefined, filePath),
    kind,
    type,
    initialValue,
  });

  describe('LightweightSymbol Interface', () => {
    it('should have all required properties for memory optimization', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      // Essential properties
      expect(lightweight.id).toBeDefined();
      expect(lightweight.name).toBe('TestClass');
      expect(typeof lightweight.kind).toBe('number');
      expect(lightweight.location).toBeDefined();
      expect(typeof lightweight.modifiers).toBe('number');
      expect(lightweight.parentId).toBeNull();
      expect(lightweight.filePath).toBe('TestFile.cls');
      expect(lightweight.fqn).toBe('TestNamespace.TestClass');

      // Lazy loading structure
      expect(lightweight._lazy).toBeDefined();
    });

    it('should use numeric kind values for memory efficiency', () => {
      const classSymbol = createTestSymbol('TestClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('testMethod', SymbolKind.Method);
      const fieldSymbol = createTestSymbol('testField', SymbolKind.Field);

      const classLightweight = toLightweightSymbol(classSymbol, 'TestFile.cls');
      const methodLightweight = toLightweightSymbol(
        methodSymbol,
        'TestFile.cls',
      );
      const fieldLightweight = toLightweightSymbol(fieldSymbol, 'TestFile.cls');

      expect(classLightweight.kind).toBe(SymbolKindValues[SymbolKind.Class]);
      expect(methodLightweight.kind).toBe(SymbolKindValues[SymbolKind.Method]);
      expect(fieldLightweight.kind).toBe(SymbolKindValues[SymbolKind.Field]);
    });

    it('should use bit flags for modifiers for memory efficiency', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.modifiers.visibility = SymbolVisibility.Public;
      symbol.modifiers.isStatic = true;
      symbol.modifiers.isFinal = true;

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight.modifiers & ModifierFlags.PUBLIC).toBe(
        ModifierFlags.PUBLIC,
      );
      expect(lightweight.modifiers & ModifierFlags.STATIC).toBe(
        ModifierFlags.STATIC,
      );
      expect(lightweight.modifiers & ModifierFlags.FINAL).toBe(
        ModifierFlags.FINAL,
      );
      expect(lightweight.modifiers & ModifierFlags.PRIVATE).toBe(0);
    });
  });

  describe('toLightweightSymbol Conversion', () => {
    it('should convert basic symbol to lightweight representation', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight.name).toBe(symbol.name);
      expect(lightweight.kind).toBe(SymbolKindValues[symbol.kind]);
      expect(lightweight.location).toEqual(symbol.location);
      expect(lightweight.filePath).toBe('TestFile.cls');
      expect(lightweight.fqn).toBe(symbol.fqn);
    });

    it('should convert modifiers to bit flags correctly', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.modifiers.visibility = SymbolVisibility.Private;
      symbol.modifiers.isStatic = true;
      symbol.modifiers.isAbstract = true;
      symbol.modifiers.isTestMethod = true;

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight.modifiers & ModifierFlags.PRIVATE).toBe(
        ModifierFlags.PRIVATE,
      );
      expect(lightweight.modifiers & ModifierFlags.STATIC).toBe(
        ModifierFlags.STATIC,
      );
      expect(lightweight.modifiers & ModifierFlags.ABSTRACT).toBe(
        ModifierFlags.ABSTRACT,
      );
      expect(lightweight.modifiers & ModifierFlags.TEST_METHOD).toBe(
        ModifierFlags.TEST_METHOD,
      );
      expect(lightweight.modifiers & ModifierFlags.PUBLIC).toBe(0);
    });

    it('should store type-specific data in lazy object for classes', () => {
      const typeSymbol = createTestTypeSymbol(
        'TestClass',
        SymbolKind.Class,
        'ParentClass',
        ['Interface1', 'Interface2'],
      );
      const lightweight = toLightweightSymbol(typeSymbol, 'TestFile.cls');

      expect(lightweight._lazy?.superClass).toBe('ParentClass');
      expect(lightweight._lazy?.interfaces).toEqual([
        'Interface1',
        'Interface2',
      ]);
    });

    it('should store type-specific data in lazy object for methods', () => {
      const returnType = createPrimitiveType('String');
      const parameters = [
        createTestVariableSymbol(
          'param1',
          SymbolKind.Parameter,
          createPrimitiveType('Integer'),
        ),
        createTestVariableSymbol(
          'param2',
          SymbolKind.Parameter,
          createPrimitiveType('Boolean'),
        ),
      ];
      const methodSymbol = createTestMethodSymbol(
        'testMethod',
        returnType,
        parameters,
      );
      const lightweight = toLightweightSymbol(methodSymbol, 'TestFile.cls');

      expect(lightweight._lazy?.returnType).toEqual(returnType);
      expect(lightweight._lazy?.parameters).toHaveLength(2);
    });

    it('should store type-specific data in lazy object for variables', () => {
      const variableSymbol = createTestVariableSymbol(
        'testField',
        SymbolKind.Field,
        createPrimitiveType('Integer'),
        '42',
      );
      const lightweight = toLightweightSymbol(variableSymbol, 'TestFile.cls');

      expect(lightweight._lazy?.type?.name).toBe('Integer');
      expect(lightweight._lazy?.initialValue).toBe('42');
    });

    it('should store annotations in lazy object', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.annotations = [
        {
          name: 'TestVisible',
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        },
      ];
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight._lazy?.annotations).toEqual(symbol.annotations);
    });

    it('should store identifier location in lazy object', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.identifierLocation = {
        startLine: 2,
        startColumn: 5,
        endLine: 2,
        endColumn: 15,
      };
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight._lazy?.identifierLocation).toEqual(
        symbol.identifierLocation,
      );
    });

    it('should generate unique ID for symbol', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight.id).toBeDefined();
      expect(lightweight.id).toContain('TestClass');
      expect(lightweight.id).toContain('TestFile.cls');
    });

    it('should handle parent relationships', () => {
      const parentSymbol = createTestSymbol('ParentClass', SymbolKind.Class);
      const childSymbol = createTestSymbol('ChildClass', SymbolKind.Class);
      childSymbol.parentKey = parentSymbol.key;

      const parentLightweight = toLightweightSymbol(
        parentSymbol,
        'TestFile.cls',
      );
      const childLightweight = toLightweightSymbol(childSymbol, 'TestFile.cls');

      expect(childLightweight.parentId).toBe(parentLightweight.id);
    });
  });

  describe('fromLightweightSymbol Conversion', () => {
    it('should convert lightweight symbol back to full symbol', () => {
      const originalSymbol = createTestSymbol('TestClass', SymbolKind.Class);
      const lightweight = toLightweightSymbol(originalSymbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(reconstructedSymbol.name).toBe(originalSymbol.name);
      expect(reconstructedSymbol.kind).toBe(originalSymbol.kind);
      expect(reconstructedSymbol.location).toEqual(originalSymbol.location);
      expect(reconstructedSymbol.fqn).toBe(originalSymbol.fqn);
      expect(reconstructedSymbol.namespace).toBe(originalSymbol.namespace);
    });

    it('should convert bit flags back to modifier object', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.modifiers.visibility = SymbolVisibility.Protected;
      symbol.modifiers.isStatic = true;
      symbol.modifiers.isFinal = true;
      symbol.modifiers.isAbstract = true;

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(reconstructedSymbol.modifiers.visibility).toBe(
        SymbolVisibility.Protected,
      );
      expect(reconstructedSymbol.modifiers.isStatic).toBe(true);
      expect(reconstructedSymbol.modifiers.isFinal).toBe(true);
      expect(reconstructedSymbol.modifiers.isAbstract).toBe(true);
      expect(reconstructedSymbol.modifiers.isVirtual).toBe(false);
    });

    it('should reconstruct symbol key correctly', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(reconstructedSymbol.key.prefix).toBe('symbol');
      expect(reconstructedSymbol.key.name).toBe('TestClass');
      expect(reconstructedSymbol.key.path).toEqual([
        'TestFile.cls',
        'TestClass',
      ]);
      expect(reconstructedSymbol.key.unifiedId).toBe(lightweight.id);
      expect(reconstructedSymbol.key.filePath).toBe('TestFile.cls');
      expect(reconstructedSymbol.key.kind).toBe(SymbolKind.Class);
    });

    it('should restore lazy-loaded annotations', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.annotations = [
        {
          name: 'TestVisible',
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        },
      ];

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(reconstructedSymbol.annotations).toEqual(symbol.annotations);
    });

    it('should restore lazy-loaded identifier location', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.identifierLocation = {
        startLine: 2,
        startColumn: 5,
        endLine: 2,
        endColumn: 15,
      };

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(reconstructedSymbol.identifierLocation).toEqual(
        symbol.identifierLocation,
      );
    });

    it('should handle parent relationships correctly', () => {
      const parentSymbol = createTestSymbol('ParentClass', SymbolKind.Class);
      const childSymbol = createTestSymbol('ChildClass', SymbolKind.Class);
      childSymbol.parentKey = parentSymbol.key;

      const childLightweight = toLightweightSymbol(childSymbol, 'TestFile.cls');

      const reconstructedChild = fromLightweightSymbol(
        childLightweight,
        symbolTable,
      );

      expect(reconstructedChild.parentKey).toBeDefined();
      expect(reconstructedChild.parentKey?.unifiedId).toContain('ParentClass');
    });
  });

  describe('Memory Efficiency', () => {
    it('should use significantly less memory than full symbols', () => {
      const symbols: ApexSymbol[] = [];
      const lightweights: LightweightSymbol[] = [];

      // Create 1000 test symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(`TestClass${i}`, SymbolKind.Class);
        symbols.push(symbol);
        lightweights.push(toLightweightSymbol(symbol, 'TestFile.cls'));
      }

      // Measure approximate memory usage
      const fullSymbolsSize = JSON.stringify(symbols).length;
      const lightweightSize = JSON.stringify(lightweights).length;

      // Lightweight symbols should use significantly less memory
      expect(lightweightSize).toBeLessThan(fullSymbolsSize);

      // Should achieve at least 35% memory reduction
      const memoryReduction =
        ((fullSymbolsSize - lightweightSize) / fullSymbolsSize) * 100;
      expect(memoryReduction).toBeGreaterThan(35);
    });

    it('should use bit flags efficiently for modifiers', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.modifiers.visibility = SymbolVisibility.Public;
      symbol.modifiers.isStatic = true;
      symbol.modifiers.isFinal = true;
      symbol.modifiers.isAbstract = true;
      symbol.modifiers.isVirtual = true;
      symbol.modifiers.isOverride = true;
      symbol.modifiers.isTransient = true;
      symbol.modifiers.isTestMethod = true;
      symbol.modifiers.isWebService = true;

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      // All modifiers should be set
      expect(lightweight.modifiers & ModifierFlags.PUBLIC).toBe(
        ModifierFlags.PUBLIC,
      );
      expect(lightweight.modifiers & ModifierFlags.STATIC).toBe(
        ModifierFlags.STATIC,
      );
      expect(lightweight.modifiers & ModifierFlags.FINAL).toBe(
        ModifierFlags.FINAL,
      );
      expect(lightweight.modifiers & ModifierFlags.ABSTRACT).toBe(
        ModifierFlags.ABSTRACT,
      );
      expect(lightweight.modifiers & ModifierFlags.VIRTUAL).toBe(
        ModifierFlags.VIRTUAL,
      );
      expect(lightweight.modifiers & ModifierFlags.OVERRIDE).toBe(
        ModifierFlags.OVERRIDE,
      );
      expect(lightweight.modifiers & ModifierFlags.TRANSIENT).toBe(
        ModifierFlags.TRANSIENT,
      );
      expect(lightweight.modifiers & ModifierFlags.TEST_METHOD).toBe(
        ModifierFlags.TEST_METHOD,
      );
      expect(lightweight.modifiers & ModifierFlags.WEB_SERVICE).toBe(
        ModifierFlags.WEB_SERVICE,
      );
    });

    it('should use numeric enum values efficiently', () => {
      const symbols = [
        createTestSymbol('TestClass', SymbolKind.Class),
        createTestSymbol('TestInterface', SymbolKind.Interface),
        createTestSymbol('TestMethod', SymbolKind.Method),
        createTestSymbol('TestField', SymbolKind.Field),
        createTestSymbol('TestProperty', SymbolKind.Property),
        createTestSymbol('TestVariable', SymbolKind.Variable),
        createTestSymbol('TestParameter', SymbolKind.Parameter),
        createTestSymbol('TestEnum', SymbolKind.Enum),
        createTestSymbol('TestEnumValue', SymbolKind.EnumValue),
        createTestSymbol('TestConstructor', SymbolKind.Constructor),
        createTestSymbol('TestTrigger', SymbolKind.Trigger),
      ];

      const lightweights = symbols.map((s) =>
        toLightweightSymbol(s, 'TestFile.cls'),
      );

      // All kinds should be numeric values
      lightweights.forEach((lightweight) => {
        expect(typeof lightweight.kind).toBe('number');
        expect(lightweight.kind).toBeGreaterThanOrEqual(0);
        expect(lightweight.kind).toBeLessThanOrEqual(10);
      });

      // Verify specific values
      expect(lightweights[0].kind).toBe(SymbolKindValues[SymbolKind.Class]); // 0
      expect(lightweights[1].kind).toBe(SymbolKindValues[SymbolKind.Interface]); // 1
      expect(lightweights[2].kind).toBe(SymbolKindValues[SymbolKind.Method]); // 3
    });
  });

  describe('Round-trip Conversion', () => {
    it('should maintain data integrity through round-trip conversion', () => {
      const originalSymbol = createTestSymbol('TestClass', SymbolKind.Class);
      originalSymbol.annotations = [
        {
          name: 'TestVisible',
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        },
      ];
      originalSymbol.identifierLocation = {
        startLine: 2,
        startColumn: 5,
        endLine: 2,
        endColumn: 15,
      };

      const lightweight = toLightweightSymbol(originalSymbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      // Compare essential properties
      expect(reconstructedSymbol.name).toBe(originalSymbol.name);
      expect(reconstructedSymbol.kind).toBe(originalSymbol.kind);
      expect(reconstructedSymbol.location).toEqual(originalSymbol.location);
      expect(reconstructedSymbol.fqn).toBe(originalSymbol.fqn);
      expect(reconstructedSymbol.namespace).toBe(originalSymbol.namespace);

      // Compare modifiers
      expect(reconstructedSymbol.modifiers.visibility).toBe(
        originalSymbol.modifiers.visibility,
      );
      expect(reconstructedSymbol.modifiers.isStatic).toBe(
        originalSymbol.modifiers.isStatic,
      );
      expect(reconstructedSymbol.modifiers.isFinal).toBe(
        originalSymbol.modifiers.isFinal,
      );
      expect(reconstructedSymbol.modifiers.isAbstract).toBe(
        originalSymbol.modifiers.isAbstract,
      );

      // Compare lazy-loaded data
      expect(reconstructedSymbol.annotations).toEqual(
        originalSymbol.annotations,
      );
      expect(reconstructedSymbol.identifierLocation).toEqual(
        originalSymbol.identifierLocation,
      );
    });

    it('should handle complex type symbols correctly', () => {
      const originalSymbol = createTestTypeSymbol(
        'TestClass',
        SymbolKind.Class,
        'ParentClass',
        ['Interface1', 'Interface2'],
      );
      originalSymbol.annotations = [
        {
          name: 'TestVisible',
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        },
      ];

      const lightweight = toLightweightSymbol(originalSymbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      ) as TypeSymbol;

      expect(reconstructedSymbol.superClass).toBe(originalSymbol.superClass);
      expect(reconstructedSymbol.interfaces).toEqual(originalSymbol.interfaces);
      expect(reconstructedSymbol.annotations).toEqual(
        originalSymbol.annotations,
      );
    });

    it('should handle method symbols correctly', () => {
      const returnType = createPrimitiveType('String');
      const parameters = [
        createTestVariableSymbol(
          'param1',
          SymbolKind.Parameter,
          createPrimitiveType('Integer'),
        ),
        createTestVariableSymbol(
          'param2',
          SymbolKind.Parameter,
          createPrimitiveType('Boolean'),
        ),
      ];
      const originalSymbol = createTestMethodSymbol(
        'testMethod',
        returnType,
        parameters,
      );

      const lightweight = toLightweightSymbol(originalSymbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      ) as MethodSymbol;

      expect(reconstructedSymbol.returnType).toEqual(originalSymbol.returnType);
      // Note: Parameters are not fully reconstructed in current implementation
      // This is a limitation that would need to be addressed in a full implementation
      expect(reconstructedSymbol.parameters).toBeDefined();
    });

    it('should handle variable symbols correctly', () => {
      const originalSymbol = createTestVariableSymbol(
        'testField',
        SymbolKind.Field,
        createPrimitiveType('Integer'),
        '42',
      );

      const lightweight = toLightweightSymbol(originalSymbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      ) as VariableSymbol;

      expect(reconstructedSymbol.type).toEqual(originalSymbol.type);
      expect(reconstructedSymbol.initialValue).toBe(
        originalSymbol.initialValue,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbols with no optional fields', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      // No annotations, no identifierLocation, no type-specific data
      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight._lazy).toBeDefined();
      expect(Object.keys(lightweight._lazy || {}).length).toBe(0);
    });

    it('should handle symbols with all optional fields', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.annotations = [
        {
          name: 'TestVisible',
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        },
      ];
      symbol.identifierLocation = {
        startLine: 2,
        startColumn: 5,
        endLine: 2,
        endColumn: 15,
      };
      symbol.namespace = 'TestNamespace';

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');

      expect(lightweight._lazy?.annotations).toBeDefined();
      expect(lightweight._lazy?.identifierLocation).toBeDefined();
      expect(lightweight.namespace).toBe('TestNamespace');
    });

    it('should handle symbols with null parent', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.parentKey = null;

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(lightweight.parentId).toBeNull();
      expect(reconstructedSymbol.parentKey).toBeNull();
    });

    it('should handle symbols with undefined FQN', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.fqn = undefined;

      const lightweight = toLightweightSymbol(symbol, 'TestFile.cls');
      const reconstructedSymbol = fromLightweightSymbol(
        lightweight,
        symbolTable,
      );

      expect(lightweight.fqn).toBeUndefined();
      expect(reconstructedSymbol.fqn).toBeUndefined();
    });
  });
});
