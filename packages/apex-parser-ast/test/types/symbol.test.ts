/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { ParserRuleContext } from 'antlr4ts';
import {
  ApexSymbol,
  SymbolKind,
  SymbolTable,
  TypeSymbol,
  EnumSymbol,
  MethodSymbol,
  VariableSymbol,
} from '../../src/types/symbol';
import {
  inTypeSymbolGroup,
  hasIdMethod,
  isEnumSymbol,
  isMethodSymbol,
  isClassSymbol,
  isInterfaceSymbol,
  isTriggerSymbol,
  isVariableSymbol,
} from '../../src/utils/symbolNarrowing';

describe('hasIdMethod', () => {
  it('should return true for context with id method', () => {
    const mockContext = {
      id: () => 'test-id',
    } as ParserRuleContext & { id(): any };

    expect(hasIdMethod(mockContext)).toBe(true);
  });

  it('should return false for context without id method', () => {
    const mockContext = {} as ParserRuleContext;

    expect(hasIdMethod(mockContext)).toBe(false);
  });

  it('should return false for context with non-function id property', () => {
    const mockContext = {
      id: 'not-a-function',
    } as ParserRuleContext & { id: any };

    expect(hasIdMethod(mockContext)).toBe(false);
  });
});

describe('isEnumSymbol', () => {
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: {} as any,
    parentKey: null,
  };

  it('should return true for enum symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Enum,
      name: 'MyEnum',
      interfaces: [],
      values: [],
      ...MOCK_SYMBOL_PROPS,
    } as EnumSymbol;

    expect(isEnumSymbol(symbol)).toBe(true);
  });

  it('should return false for non-enum symbols', () => {
    const symbols: ApexSymbol[] = [
      {
        kind: SymbolKind.Class,
        name: 'MyClass',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Method,
        name: 'myMethod',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Variable,
        name: 'myVar',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
    ];

    symbols.forEach((symbol) => {
      expect(isEnumSymbol(symbol)).toBe(false);
    });
  });

  it('should correctly narrow the type to EnumSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Enum,
      name: 'MyEnum',
      interfaces: [],
      values: [],
      ...MOCK_SYMBOL_PROPS,
    } as EnumSymbol;

    if (isEnumSymbol(symbol)) {
      // If the type guard is working, this should compile
      const enumSymbol: EnumSymbol = symbol;
      expect(enumSymbol.values).toEqual([]);
    } else {
      fail('isEnumSymbol should have returned true for an enum symbol');
    }
  });
});

describe('isMethodSymbol', () => {
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: {} as any,
    parentKey: null,
  };

  it('should return true for method symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Method,
      name: 'myMethod',
      returnType: {} as any,
      parameters: [],
      ...MOCK_SYMBOL_PROPS,
    } as MethodSymbol;

    expect(isMethodSymbol(symbol)).toBe(true);
  });

  it('should return false for non-method symbols', () => {
    const symbols: ApexSymbol[] = [
      {
        kind: SymbolKind.Class,
        name: 'MyClass',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Variable,
        name: 'myVar',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Property,
        name: 'myProp',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
    ];

    symbols.forEach((symbol) => {
      expect(isMethodSymbol(symbol)).toBe(false);
    });
  });

  it('should correctly narrow the type to MethodSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Method,
      name: 'myMethod',
      returnType: {} as any,
      parameters: [],
      ...MOCK_SYMBOL_PROPS,
    } as MethodSymbol;

    if (isMethodSymbol(symbol)) {
      // If the type guard is working, this should compile
      const methodSymbol: MethodSymbol = symbol;
      expect(methodSymbol.parameters).toEqual([]);
    } else {
      fail('isMethodSymbol should have returned true for a method symbol');
    }
  });
});

describe('isClassSymbol', () => {
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: {} as any,
    parentKey: null,
  };

  it('should return true for class symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Class,
      name: 'MyClass',
      interfaces: [],
      ...MOCK_SYMBOL_PROPS,
    } as TypeSymbol;

    expect(isClassSymbol(symbol)).toBe(true);
  });

  it('should return false for non-class symbols', () => {
    const symbols: ApexSymbol[] = [
      {
        kind: SymbolKind.Interface,
        name: 'MyInterface',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Method,
        name: 'myMethod',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Variable,
        name: 'myVar',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
    ];

    symbols.forEach((symbol) => {
      expect(isClassSymbol(symbol)).toBe(false);
    });
  });

  it('should correctly narrow the type to TypeSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Class,
      name: 'MyClass',
      interfaces: [],
      ...MOCK_SYMBOL_PROPS,
    } as TypeSymbol;

    if (isClassSymbol(symbol)) {
      // If the type guard is working, this should compile
      const classSymbol: TypeSymbol = symbol;
      expect(classSymbol.interfaces).toEqual([]);
    } else {
      fail('isClassSymbol should have returned true for a class symbol');
    }
  });
});

describe('isInterfaceSymbol', () => {
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: {} as any,
    parentKey: null,
  };

  it('should return true for interface symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Interface,
      name: 'MyInterface',
      interfaces: [],
      ...MOCK_SYMBOL_PROPS,
    } as TypeSymbol;

    expect(isInterfaceSymbol(symbol)).toBe(true);
  });

  it('should return false for non-interface symbols', () => {
    const symbols: ApexSymbol[] = [
      {
        kind: SymbolKind.Class,
        name: 'MyClass',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Method,
        name: 'myMethod',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Variable,
        name: 'myVar',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
    ];

    symbols.forEach((symbol) => {
      expect(isInterfaceSymbol(symbol)).toBe(false);
    });
  });

  it('should correctly narrow the type to TypeSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Interface,
      name: 'MyInterface',
      interfaces: [],
      ...MOCK_SYMBOL_PROPS,
    } as TypeSymbol;

    if (isInterfaceSymbol(symbol)) {
      // If the type guard is working, this should compile
      const interfaceSymbol: TypeSymbol = symbol;
      expect(interfaceSymbol.interfaces).toEqual([]);
    } else {
      fail(
        'isInterfaceSymbol should have returned true for an interface symbol',
      );
    }
  });
});

describe('isTriggerSymbol', () => {
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: {} as any,
    parentKey: null,
  };

  it('should return true for trigger symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Trigger,
      name: 'MyTrigger',
      interfaces: [],
      ...MOCK_SYMBOL_PROPS,
    } as TypeSymbol;

    expect(isTriggerSymbol(symbol)).toBe(true);
  });

  it('should return false for non-trigger symbols', () => {
    const symbols: ApexSymbol[] = [
      {
        kind: SymbolKind.Class,
        name: 'MyClass',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Method,
        name: 'myMethod',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Variable,
        name: 'myVar',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
    ];

    symbols.forEach((symbol) => {
      expect(isTriggerSymbol(symbol)).toBe(false);
    });
  });

  it('should correctly narrow the type to TypeSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Trigger,
      name: 'MyTrigger',
      interfaces: [],
      ...MOCK_SYMBOL_PROPS,
    } as TypeSymbol;

    if (isTriggerSymbol(symbol)) {
      // If the type guard is working, this should compile
      const triggerSymbol: TypeSymbol = symbol;
      expect(triggerSymbol.interfaces).toEqual([]);
    } else {
      fail('isTriggerSymbol should have returned true for a trigger symbol');
    }
  });
});

describe('isVariableSymbol', () => {
  const MOCK_SYMBOL_PROPS = {
    location: {} as any,
    modifiers: {} as any,
    key: {} as any,
    parentKey: null,
  };

  it('should return true for property symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Property,
      name: 'myProp',
      type: {} as any,
      ...MOCK_SYMBOL_PROPS,
    } as VariableSymbol;

    expect(isVariableSymbol(symbol)).toBe(true);
  });

  it('should return true for field symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Field,
      name: 'myField',
      type: {} as any,
      ...MOCK_SYMBOL_PROPS,
    } as VariableSymbol;

    expect(isVariableSymbol(symbol)).toBe(true);
  });

  it('should return true for variable symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Variable,
      name: 'myVar',
      type: {} as any,
      ...MOCK_SYMBOL_PROPS,
    } as VariableSymbol;

    expect(isVariableSymbol(symbol)).toBe(true);
  });

  it('should return true for parameter symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Parameter,
      name: 'myParam',
      type: {} as any,
      ...MOCK_SYMBOL_PROPS,
    } as VariableSymbol;

    expect(isVariableSymbol(symbol)).toBe(true);
  });

  it('should return true for enum value symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.EnumValue,
      name: 'VALUE1',
      type: {} as any,
      ...MOCK_SYMBOL_PROPS,
    } as VariableSymbol;

    expect(isVariableSymbol(symbol)).toBe(true);
  });

  it('should return false for non-variable symbols', () => {
    const symbols: ApexSymbol[] = [
      {
        kind: SymbolKind.Class,
        name: 'MyClass',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Method,
        name: 'myMethod',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Interface,
        name: 'MyInterface',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Trigger,
        name: 'MyTrigger',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
      {
        kind: SymbolKind.Enum,
        name: 'MyEnum',
        ...MOCK_SYMBOL_PROPS,
      } as ApexSymbol,
    ];

    symbols.forEach((symbol) => {
      expect(isVariableSymbol(symbol)).toBe(false);
    });
  });

  it('should correctly narrow the type to VariableSymbol', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Variable,
      name: 'myVar',
      type: {} as any,
      ...MOCK_SYMBOL_PROPS,
    } as VariableSymbol;

    if (isVariableSymbol(symbol)) {
      // If the type guard is working, this should compile
      const variableSymbol: VariableSymbol = symbol;
      expect(variableSymbol.type).toBeDefined();
    } else {
      fail('isVariableSymbol should have returned true for a variable symbol');
    }
  });
});

describe('inTypeSymbolGroup', () => {
  it('should return true for class symbols', () => {
    const symbol: ApexSymbol = {
      kind: SymbolKind.Class,
      name: 'MyClass',
      location: {} as any,
      modifiers: {} as any,
      key: {} as any,
      parentKey: null,
    } as ApexSymbol;
    expect(inTypeSymbolGroup(symbol)).toBe(true);
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
    expect(inTypeSymbolGroup(symbol)).toBe(true);
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
    expect(inTypeSymbolGroup(symbol)).toBe(true);
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
    expect(inTypeSymbolGroup(symbol)).toBe(true);
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
    expect(inTypeSymbolGroup(symbol)).toBe(false);
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
    expect(inTypeSymbolGroup(symbol)).toBe(false);
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
    expect(inTypeSymbolGroup(symbol)).toBe(false);
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
    expect(inTypeSymbolGroup(symbol)).toBe(false);
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

    if (inTypeSymbolGroup(symbol)) {
      // If the type guard is working, this should compile
      const typeSymbol: TypeSymbol = symbol;
      expect(typeSymbol.interfaces).toEqual([]);
    } else {
      fail('inTypeSymbolGroup should have returned true for a class symbol');
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
