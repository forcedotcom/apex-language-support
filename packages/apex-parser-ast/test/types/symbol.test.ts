/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  ApexSymbol,
  isCompoundSymbolType,
  SymbolKind,
  SymbolTable,
  TypeSymbol,
} from '../../src/types/symbol';

describe('isCompoundSymbolType', () => {
  it('should return true for class symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Class,
      name: 'MyClass',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(true);
  });

  it('should return true for interface symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Interface,
      name: 'MyInterface',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(true);
  });

  it('should return true for enum symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Enum,
      name: 'MyEnum',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(true);
  });

  it('should return true for trigger symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Trigger,
      name: 'MyTrigger',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(true);
  });

  it('should return false for method symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Method,
      name: 'myMethod',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(false);
  });

  it('should return false for property symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Property,
      name: 'myProp',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(false);
  });

  it('should return false for field symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Field,
      name: 'myField',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(false);
  });

  it('should return false for variable symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Variable,
      name: 'myVar',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(isCompoundSymbolType(symbol)).toBe(false);
  });

  it('should correctly narrow the type to TypeSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Class,
      name: 'MyClass',
      interfaces: [],
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;

    if (isCompoundSymbolType(symbol)) {
      // If the type guard is working, this should compile
      const typeSymbol: TypeSymbol = symbol;
      expect(typeSymbol.interfaces).toEqual([]);
    } else {
      fail('isCompoundSymbolType should have returned true for a class symbol');
    }
  });
});

describe('SymbolTable', () => {
  let table: SymbolTable;
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: { prefix: 'test', name: 'test', path: ['test'] },
    parentKey: null,
  };

  beforeEach(() => {
    table = new SymbolTable();
  });

  it('should initialize with a root scope', () => {
    const scope = table.getCurrentScope();
    expect(scope.name).toBe('file');
    expect(scope.parent).toBeNull();
  });

  it('should allow entering and exiting scopes', () => {
    table.enterScope('MyClass', 'class');
    const classScope = table.getCurrentScope();
    expect(classScope.name).toBe('MyClass');
    expect(classScope.parent?.name).toBe('file');

    table.enterScope('myMethod', 'method');
    const methodScope = table.getCurrentScope();
    expect(methodScope.name).toBe('myMethod');
    expect(methodScope.parent?.name).toBe('MyClass');

    table.exitScope();
    expect(table.getCurrentScope().name).toBe('MyClass');

    table.exitScope();
    expect(table.getCurrentScope().name).toBe('file');

    // Should not exit beyond the root scope
    table.exitScope();
    expect(table.getCurrentScope().name).toBe('file');
  });

  it('should add and find a symbol in the current scope', () => {
    const symbol: ApexSymbol = {
      name: 'myVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
    };
    table.addSymbol(symbol);

    const found = table.findSymbolInCurrentScope('myVar');
    expect(found).toBe(symbol);
  });

  it('should look up a symbol from the current scope to parent scopes', () => {
    const parentSymbol: ApexSymbol = {
      name: 'parentVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
    };
    table.addSymbol(parentSymbol);

    table.enterScope('childScope');
    const childSymbol: ApexSymbol = {
      name: 'childVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
    };
    table.addSymbol(childSymbol);

    expect(table.lookup('childVar')).toBe(childSymbol);
    expect(table.lookup('parentVar')).toBe(parentSymbol);
    expect(table.lookup('nonExistentVar')).toBeUndefined();
  });

  it('should look up a symbol by its key', () => {
    const symbol: ApexSymbol = {
      name: 'myVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
      key: { prefix: 'file', name: 'myVar', path: ['file', 'myVar'] },
    };
    table.addSymbol(symbol);

    const found = table.lookupByKey(symbol.key);
    expect(found).toBe(symbol);
  });
});
