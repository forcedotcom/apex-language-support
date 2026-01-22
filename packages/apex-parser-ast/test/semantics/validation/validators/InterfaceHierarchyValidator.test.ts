/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
// eslint-disable-next-line max-len
import { InterfaceHierarchyValidator } from '../../../../src/semantics/validation/validators/InterfaceHierarchyValidator';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  type TypeSymbol,
  type MethodSymbol,
  type VariableSymbol,
} from '../../../../src/types/symbol';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { createPrimitiveType } from '../../../../src/types/typeInfo';

describe('InterfaceHierarchyValidator', () => {
  let validator: InterfaceHierarchyValidator;
  const TEST_FILE_URI = 'file:///test.cls';

  beforeEach(() => {
    validator = new InterfaceHierarchyValidator();
  });

  it('should have correct metadata', () => {
    expect(validator.id).toBe('interface-hierarchy');
    expect(validator.name).toBe('Interface Hierarchy Validator');
    expect(validator.tier).toBe(ValidationTier.THOROUGH);
    expect(validator.priority).toBe(1);
  });

  it('should pass validation for valid interface hierarchy', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface A
    const ifaceA = SymbolFactory.createMinimalSymbol(
      'InterfaceA',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceA.interfaces = [];
    symbolTable.addSymbol(ifaceA, null);

    // Create interface B extends A
    const ifaceB = SymbolFactory.createMinimalSymbol(
      'InterfaceB',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 5, startColumn: 0, endLine: 7, endColumn: 0 },
        identifierRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceB.interfaces = ['InterfaceA'];
    symbolTable.addSymbol(ifaceB, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect simple circular inheritance', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface A extends B
    const ifaceA = SymbolFactory.createMinimalSymbol(
      'InterfaceA',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceA.interfaces = ['InterfaceB'];
    symbolTable.addSymbol(ifaceA, null);

    // Create interface B extends A
    const ifaceB = SymbolFactory.createMinimalSymbol(
      'InterfaceB',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 5, startColumn: 0, endLine: 7, endColumn: 0 },
        identifierRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceB.interfaces = ['InterfaceA'];
    symbolTable.addSymbol(ifaceB, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('circular');
    expect(result.errors[0]).toContain('inheritance');
  });

  it('should detect longer circular inheritance chain', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface A extends B
    const ifaceA = SymbolFactory.createMinimalSymbol(
      'InterfaceA',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceA.interfaces = ['InterfaceB'];
    symbolTable.addSymbol(ifaceA, null);

    // Create interface B extends C
    const ifaceB = SymbolFactory.createMinimalSymbol(
      'InterfaceB',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 5, startColumn: 0, endLine: 7, endColumn: 0 },
        identifierRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceB.interfaces = ['InterfaceC'];
    symbolTable.addSymbol(ifaceB, null);

    // Create interface C extends A (completes the cycle)
    const ifaceC = SymbolFactory.createMinimalSymbol(
      'InterfaceC',
      SymbolKind.Interface,
      {
        symbolRange: {
          startLine: 9,
          startColumn: 0,
          endLine: 11,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 9,
          startColumn: 10,
          endLine: 9,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceC.interfaces = ['InterfaceA'];
    symbolTable.addSymbol(ifaceC, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('circular'))).toBe(true);
  });

  it('should detect duplicate extends', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface A
    const ifaceA = SymbolFactory.createMinimalSymbol(
      'InterfaceA',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceA.interfaces = [];
    symbolTable.addSymbol(ifaceA, null);

    // Create interface B extends A, A (duplicate)
    const ifaceB = SymbolFactory.createMinimalSymbol(
      'InterfaceB',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 5, startColumn: 0, endLine: 7, endColumn: 0 },
        identifierRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceB.interfaces = ['InterfaceA', 'InterfaceA'];
    symbolTable.addSymbol(ifaceB, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('multiple times');
  });

  it('should pass validation for interface extending multiple interfaces', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface A
    const ifaceA = SymbolFactory.createMinimalSymbol(
      'InterfaceA',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 3, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceA.interfaces = [];
    symbolTable.addSymbol(ifaceA, null);

    // Create interface B
    const ifaceB = SymbolFactory.createMinimalSymbol(
      'InterfaceB',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 5, startColumn: 0, endLine: 7, endColumn: 0 },
        identifierRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 5,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceB.interfaces = [];
    symbolTable.addSymbol(ifaceB, null);

    // Create interface C extends A, B (no duplicates)
    const ifaceC = SymbolFactory.createMinimalSymbol(
      'InterfaceC',
      SymbolKind.Interface,
      {
        symbolRange: {
          startLine: 9,
          startColumn: 0,
          endLine: 11,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 9,
          startColumn: 10,
          endLine: 9,
          endColumn: 20,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    ifaceC.interfaces = ['InterfaceA', 'InterfaceB'];
    symbolTable.addSymbol(ifaceC, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect class not implementing interface method', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface with method
    const iface = SymbolFactory.createMinimalSymbol(
      'MyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    iface.interfaces = [];
    symbolTable.addSymbol(iface, null);

    // Add method to interface
    const ifaceMethod = SymbolFactory.createMinimalSymbol(
      'doSomething',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 26,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 7,
          endLine: 2,
          endColumn: 18,
        },
      },
      TEST_FILE_URI,
      iface.id,
      undefined,
      ['MyInterface', 'doSomething'],
    ) as MethodSymbol;
    ifaceMethod.returnType = createPrimitiveType('void');
    ifaceMethod.parameters = [];
    symbolTable.addSymbol(ifaceMethod, iface);

    // Create class implementing interface but no method
    const cls = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 7, startColumn: 0, endLine: 9, endColumn: 0 },
        identifierRange: {
          startLine: 7,
          startColumn: 6,
          endLine: 7,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    cls.interfaces = ['MyInterface'];
    symbolTable.addSymbol(cls, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('does not implement');
    expect(result.errors[0]).toContain('doSomething');
  });

  it('should pass validation for class implementing all interface methods', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface with method
    const iface = SymbolFactory.createMinimalSymbol(
      'MyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    iface.interfaces = [];
    symbolTable.addSymbol(iface, null);

    // Add method to interface
    const ifaceMethod = SymbolFactory.createMinimalSymbol(
      'doSomething',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 26,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 7,
          endLine: 2,
          endColumn: 18,
        },
      },
      TEST_FILE_URI,
      iface.id,
      undefined,
      ['MyInterface', 'doSomething'],
    ) as MethodSymbol;
    ifaceMethod.returnType = createPrimitiveType('void');
    ifaceMethod.parameters = [];
    symbolTable.addSymbol(ifaceMethod, iface);

    // Create class implementing interface with method
    const cls = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 7,
          startColumn: 0,
          endLine: 11,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 7,
          startColumn: 6,
          endLine: 7,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    cls.interfaces = ['MyInterface'];
    symbolTable.addSymbol(cls, null);

    // Add implementing method to class
    const classMethod = SymbolFactory.createMinimalSymbol(
      'doSomething',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 2,
          endLine: 10,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 14,
          endLine: 8,
          endColumn: 25,
        },
      },
      TEST_FILE_URI,
      cls.id,
      undefined,
      ['MyClass', 'doSomething'],
    ) as MethodSymbol;
    classMethod.returnType = createPrimitiveType('void');
    classMethod.parameters = [];
    symbolTable.addSymbol(classMethod, cls);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation for abstract class with unimplemented methods', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface with method
    const iface = SymbolFactory.createMinimalSymbol(
      'MyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    iface.interfaces = [];
    symbolTable.addSymbol(iface, null);

    // Add method to interface
    const ifaceMethod = SymbolFactory.createMinimalSymbol(
      'doSomething',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 26,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 7,
          endLine: 2,
          endColumn: 18,
        },
      },
      TEST_FILE_URI,
      iface.id,
      undefined,
      ['MyInterface', 'doSomething'],
    ) as MethodSymbol;
    ifaceMethod.returnType = createPrimitiveType('void');
    ifaceMethod.parameters = [];
    symbolTable.addSymbol(ifaceMethod, iface);

    // Create abstract class implementing interface but no method
    const cls = SymbolFactory.createMinimalSymbol(
      'MyAbstractClass',
      SymbolKind.Class,
      {
        symbolRange: { startLine: 7, startColumn: 0, endLine: 9, endColumn: 0 },
        identifierRange: {
          startLine: 7,
          startColumn: 6,
          endLine: 7,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
      {
        visibility: 'default' as any,
        isStatic: false,
        isFinal: false,
        isAbstract: true, // This is the key - set abstract to true
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
    ) as TypeSymbol;
    cls.interfaces = ['MyInterface'];
    symbolTable.addSymbol(cls, null);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    // Abstract classes can have unimplemented methods
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate methods with parameters', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface with method that has parameters
    const iface = SymbolFactory.createMinimalSymbol(
      'MyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    iface.interfaces = [];
    symbolTable.addSymbol(iface, null);

    // Create parameter for interface method
    const ifaceParam = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 26,
          endLine: 2,
          endColumn: 34,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 33,
          endLine: 2,
          endColumn: 34,
        },
      },
      TEST_FILE_URI,
      'iface-method-id',
    ) as VariableSymbol;
    ifaceParam.type = createPrimitiveType('String');

    // Add method to interface
    const ifaceMethod = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 35,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 7,
          endLine: 2,
          endColumn: 14,
        },
      },
      TEST_FILE_URI,
      iface.id,
      undefined,
      ['MyInterface', 'process'],
    ) as MethodSymbol;
    ifaceMethod.returnType = createPrimitiveType('void');
    ifaceMethod.parameters = [ifaceParam];
    symbolTable.addSymbol(ifaceMethod, iface);

    // Create class implementing interface
    const cls = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 7,
          startColumn: 0,
          endLine: 11,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 7,
          startColumn: 6,
          endLine: 7,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    cls.interfaces = ['MyInterface'];
    symbolTable.addSymbol(cls, null);

    // Create parameter for class method
    const classParam = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 26,
          endLine: 8,
          endColumn: 34,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 33,
          endLine: 8,
          endColumn: 34,
        },
      },
      TEST_FILE_URI,
      'class-method-id',
    ) as VariableSymbol;
    classParam.type = createPrimitiveType('String');

    // Add implementing method to class
    const classMethod = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 2,
          endLine: 10,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 14,
          endLine: 8,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      cls.id,
      undefined,
      ['MyClass', 'process'],
    ) as MethodSymbol;
    classMethod.returnType = createPrimitiveType('void');
    classMethod.parameters = [classParam];
    symbolTable.addSymbol(classMethod, cls);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing method with wrong parameter type', async () => {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(TEST_FILE_URI);

    // Create interface with method that has String parameter
    const iface = SymbolFactory.createMinimalSymbol(
      'MyInterface',
      SymbolKind.Interface,
      {
        symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
        identifierRange: {
          startLine: 1,
          startColumn: 10,
          endLine: 1,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    iface.interfaces = [];
    symbolTable.addSymbol(iface, null);

    const ifaceParam = SymbolFactory.createMinimalSymbol(
      's',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 26,
          endLine: 2,
          endColumn: 34,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 33,
          endLine: 2,
          endColumn: 34,
        },
      },
      TEST_FILE_URI,
      'iface-method-id',
    ) as VariableSymbol;
    ifaceParam.type = createPrimitiveType('String');

    const ifaceMethod = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 2,
          startColumn: 2,
          endLine: 2,
          endColumn: 35,
        },
        identifierRange: {
          startLine: 2,
          startColumn: 7,
          endLine: 2,
          endColumn: 14,
        },
      },
      TEST_FILE_URI,
      iface.id,
      undefined,
      ['MyInterface', 'process'],
    ) as MethodSymbol;
    ifaceMethod.returnType = createPrimitiveType('void');
    ifaceMethod.parameters = [ifaceParam];
    symbolTable.addSymbol(ifaceMethod, iface);

    // Create class with method that has Integer parameter (wrong type!)
    const cls = SymbolFactory.createMinimalSymbol(
      'MyClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 7,
          startColumn: 0,
          endLine: 11,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 7,
          startColumn: 6,
          endLine: 7,
          endColumn: 13,
        },
      },
      TEST_FILE_URI,
      null,
    ) as TypeSymbol;
    cls.interfaces = ['MyInterface'];
    symbolTable.addSymbol(cls, null);

    const classParam = SymbolFactory.createMinimalSymbol(
      'i',
      SymbolKind.Parameter,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 26,
          endLine: 8,
          endColumn: 35,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 34,
          endLine: 8,
          endColumn: 35,
        },
      },
      TEST_FILE_URI,
      'class-method-id',
    ) as VariableSymbol;
    classParam.type = createPrimitiveType('Integer'); // Wrong type!

    const classMethod = SymbolFactory.createMinimalSymbol(
      'process',
      SymbolKind.Method,
      {
        symbolRange: {
          startLine: 8,
          startColumn: 2,
          endLine: 10,
          endColumn: 2,
        },
        identifierRange: {
          startLine: 8,
          startColumn: 14,
          endLine: 8,
          endColumn: 21,
        },
      },
      TEST_FILE_URI,
      cls.id,
      undefined,
      ['MyClass', 'process'],
    ) as MethodSymbol;
    classMethod.returnType = createPrimitiveType('void');
    classMethod.parameters = [classParam];
    symbolTable.addSymbol(classMethod, cls);

    const result = await Effect.runPromise(
      validator.validate(symbolTable, {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        maxDepth: 1,
        maxArtifacts: 5,
        timeout: 5000,
      }),
    );

    // Wrong parameter type means method is not implemented
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('does not implement');
  });
});
