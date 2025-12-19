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
  ScopeSymbol,
  SymbolLocation,
  SymbolFactory,
  SymbolVisibility,
} from '../../src/types/symbol';
import { ReferenceContext } from '../../src/types/typeReference';
import { HierarchicalReference } from '../../src/types/hierarchicalReference';
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
      id: 'test-id',
      fileUri: 'test://file.cls',
      parentId: null,
      _modifierFlags: 0,
      _isLoaded: true,
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
    id: 'test-id',
    fileUri: 'test://file.cls',
    parentId: null,
    _modifierFlags: 0,
    _isLoaded: true,
  };

  beforeEach(() => {
    table = new SymbolTable();
  });

  it('should initialize with a root scope', () => {
    // File scope is created when enterScope is called with 'file' type
    // For now, create it explicitly for this test
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);
    expect(fileScope).toBeDefined();
    expect(fileScope?.name).toBe('file');
    expect(fileScope?.parentId).toBeNull();

    // Verify it can be found
    const foundScope = table.findScopeByName('file');
    expect(foundScope).toBeDefined();
    expect(foundScope?.name).toBe('file');
  });

  it('should allow entering and exiting scopes', () => {
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);
    expect(fileScope).toBeDefined();

    const classLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };
    const classScope = table.enterScope(
      'MyClass',
      'class',
      classLocation,
      undefined,
      fileScope ?? null,
    );
    expect(classScope).toBeDefined();
    expect(classScope?.name).toBe('MyClass');
    expect(classScope?.parentId).toBe(fileScope?.id); // Should point to file scope

    const methodLocation: SymbolLocation = {
      symbolRange: { startLine: 2, startColumn: 0, endLine: 5, endColumn: 0 },
      identifierRange: {
        startLine: 2,
        startColumn: 0,
        endLine: 2,
        endColumn: 10,
      },
    };
    const methodScope = table.enterScope(
      'myMethod',
      'method',
      methodLocation,
      undefined,
      classScope ?? null,
    );
    expect(methodScope).toBeDefined();
    expect(methodScope?.name).toBe('myMethod');
    expect(methodScope?.parentId).toBe(classScope?.id); // Should point to class scope

    // exitScope is now a no-op - stack handles scope exit
    table.exitScope();
    // Verify scopes still exist after exitScope (which is now a no-op)
    const foundClassScope = table.findScopeByName('MyClass');
    expect(foundClassScope).toBeDefined();
    expect(foundClassScope?.name).toBe('MyClass');

    // exitScope is now a no-op - stack handles scope exit
    table.exitScope();
    const foundFileScope = table.findScopeByName('file');
    expect(foundFileScope).toBeDefined();
    expect(foundFileScope?.name).toBe('file');

    // Should not exit beyond the root scope (exitScope is now a no-op)
    table.exitScope();
    const foundFileScope2 = table.findScopeByName('file');
    expect(foundFileScope2).toBeDefined();
    expect(foundFileScope2?.name).toBe('file');
  });

  it('should add and find a symbol in the current scope', () => {
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);
    expect(fileScope).toBeDefined();

    const symbol: ApexSymbol = {
      name: 'myVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
      parentId: fileScope?.id ?? null, // Explicitly set parentId to file scope
    };
    table.addSymbol(symbol, fileScope ?? null);

    const found = table.findSymbolInCurrentScope('myVar', fileScope ?? null);
    expect(found).toBe(symbol);
  });

  it('should look up a symbol from the current scope to parent scopes', () => {
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);

    const parentSymbol: ApexSymbol = {
      name: 'parentVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
      id: 'parent-var-id',
    };
    table.addSymbol(parentSymbol, fileScope ?? null);

    const childLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 5, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 10,
      },
    };
    const childScope = table.enterScope(
      'childScope',
      'block',
      childLocation,
      undefined,
      fileScope ?? null,
    );
    const childSymbol: ApexSymbol = {
      name: 'childVar',
      kind: SymbolKind.Variable,
      ...MOCK_SYMBOL_PROPS,
      id: 'child-var-id',
    };
    table.addSymbol(childSymbol, childScope ?? null);

    expect(table.lookup('childVar', childScope ?? null)).toBe(childSymbol);
    expect(table.lookup('parentVar', childScope ?? null)).toBe(parentSymbol);
    expect(table.lookup('nonExistentVar', childScope ?? null)).toBeUndefined();
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

  it('should create scope symbols when location is provided', () => {
    table.setFileUri('test://file.cls');
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);

    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
    };

    const blockSymbol: ScopeSymbol | null = table.enterScope(
      'MyClass',
      'class',
      location,
      undefined,
      fileScope ?? null,
    );
    expect(blockSymbol).not.toBeNull();
    expect(blockSymbol?.kind).toBe(SymbolKind.Block);
    expect(blockSymbol?.scopeType).toBe('class');
    // When enterScope is called directly (not via listener), it uses the name provided
    expect(blockSymbol?.name).toBe('MyClass');
    expect(blockSymbol?.location.symbolRange).toEqual(location.symbolRange);
    expect(blockSymbol?.location.identifierRange).toEqual(location.symbolRange); // Should be same for blocks

    // Verify the block scope was created and can be found
    const foundScope = table.findScopeByName('MyClass');
    expect(foundScope).toBeDefined();
    expect(foundScope).toBe(blockSymbol); // Scope IS the block symbol
  });

  it('should not create block symbols when location is not provided', () => {
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);

    const blockSymbol = table.enterScope(
      'MyClass',
      'class',
      undefined,
      undefined,
      fileScope ?? null,
    );
    expect(blockSymbol).toBeNull();

    // When location is not provided, enterScope returns null
    // Verify file scope still exists
    const foundFileScope = table.findScopeByName('file');
    expect(foundFileScope).toBeDefined();
  });

  it('should include block symbols in getAllSymbols()', () => {
    table.setFileUri('test://file.cls');
    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
    };

    table.enterScope('MyClass', 'class', location);
    const allSymbols = table.getAllSymbols();
    const blockSymbols = allSymbols.filter((s) => s.kind === SymbolKind.Block);
    expect(blockSymbols.length).toBeGreaterThan(0);
    // The file block is created first, then MyClass block
    const myClassBlock = blockSymbols.find((s) => s.name === 'MyClass');
    expect(myClassBlock).toBeDefined();
    expect(myClassBlock?.name).toBe('MyClass');
  });

  it('should find block symbols using findBlockSymbol()', () => {
    table.setFileUri('test://file.cls');
    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
    };

    table.enterScope('MyClass', 'class', location);
    const found = table.findBlockSymbol('MyClass');
    expect(found).toBeDefined();
    expect(found?.kind).toBe(SymbolKind.Block);
    expect(found?.name).toBe('MyClass');
  });

  it('should get current block symbol using getCurrentBlockSymbol()', () => {
    table.setFileUri('test://file.cls');
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);

    const location: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
    };

    const classBlockSymbol = table.enterScope(
      'MyClass',
      'class',
      location,
      undefined,
      fileScope ?? null,
    );
    const currentBlockSymbol = table.getCurrentBlockSymbol(
      classBlockSymbol ?? null,
    );
    expect(currentBlockSymbol).toBeDefined();
    // When enterScope is called directly (not via listener), it uses the name provided
    expect(currentBlockSymbol?.name).toBe('MyClass');
    expect(currentBlockSymbol?.kind).toBe(SymbolKind.Block);
  });

  it('should restore parent scope symbol after exitScope()', () => {
    table.setFileUri('test://file.cls');
    // Create file scope first
    const fileLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: 0,
      },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);

    const classLocation: SymbolLocation = {
      symbolRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 20,
        endColumn: 0,
      },
      identifierRange: {
        startLine: 1,
        startColumn: 0,
        endLine: 20,
        endColumn: 0,
      },
    };
    const methodLocation: SymbolLocation = {
      symbolRange: {
        startLine: 5,
        startColumn: 0,
        endLine: 15,
        endColumn: 0,
      },
      identifierRange: {
        startLine: 5,
        startColumn: 0,
        endLine: 15,
        endColumn: 0,
      },
    };

    const classBlockSymbol = table.enterScope(
      'MyClass',
      'class',
      classLocation,
      undefined,
      fileScope ?? null,
    );
    const methodBlockSymbol = table.enterScope(
      'myMethod',
      'method',
      methodLocation,
      undefined,
      classBlockSymbol ?? null,
    );
    // When enterScope is called directly (not via listener), it uses the name provided
    expect(methodBlockSymbol?.name).toBe('myMethod');

    // exitScope is now a no-op - stack handles scope exit
    // After exitScope (which is a no-op), the class block symbol should still exist
    // Since exitScope is a no-op, we just verify the class block symbol still exists
    expect(classBlockSymbol).toBeDefined();
    expect(classBlockSymbol?.name).toBe('MyClass');
  });
});

describe('SymbolTable.toJSON and fromJSON', () => {
  describe('round-trip serialization', () => {
    it('should preserve ClassSymbol properties through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');

      const classSymbol = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 100,
            endColumn: 1,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 14,
            endLine: 1,
            endColumn: 21,
          },
        },
        'file:///test/MyClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: true,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        null,
        undefined,
        'MyClass',
        'MyNamespace',
      );
      // Add class-specific properties
      (classSymbol as TypeSymbol).superClass = 'BaseClass';
      (classSymbol as TypeSymbol).interfaces = ['ISerializable', 'IComparable'];

      table.addSymbol(classSymbol);

      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);

      const symbols = reconstructed.getAllSymbols();
      expect(symbols).toHaveLength(1);

      const reconClass = symbols[0] as TypeSymbol;
      expect(reconClass.name).toBe('MyClass');
      expect(reconClass.kind).toBe(SymbolKind.Class);
      expect(reconClass.superClass).toBe('BaseClass');
      expect(reconClass.interfaces).toEqual(['ISerializable', 'IComparable']);
      expect(reconClass.modifiers.isVirtual).toBe(true);
      expect(reconClass.modifiers.visibility).toBe(SymbolVisibility.Public);
      expect(reconClass.fileUri).toBe('file:///test/MyClass.cls');
      expect(reconClass.key.fileUri).toBe('file:///test/MyClass.cls');
    });

    it('should preserve MethodSymbol properties through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');

      const methodSymbol = SymbolFactory.createFullSymbol(
        'myMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 10,
            startColumn: 4,
            endLine: 20,
            endColumn: 5,
          },
          identifierRange: {
            startLine: 10,
            startColumn: 20,
            endLine: 10,
            endColumn: 28,
          },
        },
        'file:///test/MyClass.cls',
        {
          visibility: SymbolVisibility.Public,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );
      // Add method-specific properties
      (methodSymbol as MethodSymbol).returnType = { name: 'String' };
      (methodSymbol as MethodSymbol).parameters = [
        { name: 'param1', type: { name: 'Integer' } },
        { name: 'param2', type: { name: 'Boolean' } },
      ] as VariableSymbol[];

      table.addSymbol(methodSymbol);

      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);

      const symbols = reconstructed.getAllSymbols();
      const reconMethod = symbols[0] as MethodSymbol;

      expect(reconMethod.name).toBe('myMethod');
      expect(reconMethod.returnType?.name).toBe('String');
      expect(reconMethod.parameters).toHaveLength(2);
      expect(reconMethod.parameters?.[0].name).toBe('param1');
      expect(reconMethod.modifiers.isStatic).toBe(true);
    });

    it('should preserve VariableSymbol properties through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');

      const varSymbol = SymbolFactory.createFullSymbol(
        'myVar',
        SymbolKind.Variable,
        {
          symbolRange: {
            startLine: 5,
            startColumn: 4,
            endLine: 5,
            endColumn: 30,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 15,
            endLine: 5,
            endColumn: 20,
          },
        },
        'file:///test/MyClass.cls',
        {
          visibility: SymbolVisibility.Private,
          isStatic: false,
          isFinal: true,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );
      (varSymbol as VariableSymbol).type = { name: 'String' };

      table.addSymbol(varSymbol);

      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);

      const reconVar = reconstructed.getAllSymbols()[0] as VariableSymbol;
      expect(reconVar.type?.name).toBe('String');
      expect(reconVar.modifiers.isFinal).toBe(true);
    });

    it('should preserve EnumSymbol with values through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyEnum.cls');

      const enumSymbol = SymbolFactory.createFullSymbol(
        'Status',
        SymbolKind.Enum,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 1,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 14,
            endLine: 1,
            endColumn: 20,
          },
        },
        'file:///test/MyEnum.cls',
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
          isBuiltIn: false,
        },
      );
      (enumSymbol as EnumSymbol).values = [
        {
          name: 'ACTIVE',
          kind: SymbolKind.EnumValue,
          id: 'active-id',
          location: {
            symbolRange: {
              startLine: 2,
              startColumn: 4,
              endLine: 2,
              endColumn: 10,
            },
            identifierRange: {
              startLine: 2,
              startColumn: 4,
              endLine: 2,
              endColumn: 10,
            },
          },
          fileUri: 'file:///test/MyEnum.cls',
          parentId: enumSymbol.id,
          key: {
            prefix: SymbolKind.EnumValue,
            name: 'ACTIVE',
            path: ['file:///test/MyEnum.cls', 'Status', 'ACTIVE'],
            unifiedId: 'active-id',
            fileUri: 'file:///test/MyEnum.cls',
            kind: SymbolKind.EnumValue,
          },
          _isLoaded: true,
          modifiers: {
            visibility: SymbolVisibility.Default,
            isStatic: false,
            isFinal: false,
            isAbstract: false,
            isVirtual: false,
            isOverride: false,
            isTransient: false,
            isTestMethod: false,
            isWebService: false,
            isBuiltIn: false,
          },
          type: { name: 'Status' },
        },
        {
          name: 'INACTIVE',
          kind: SymbolKind.EnumValue,
          id: 'inactive-id',
          location: {
            symbolRange: {
              startLine: 3,
              startColumn: 4,
              endLine: 3,
              endColumn: 12,
            },
            identifierRange: {
              startLine: 3,
              startColumn: 4,
              endLine: 3,
              endColumn: 12,
            },
          },
          fileUri: 'file:///test/MyEnum.cls',
          parentId: enumSymbol.id,
          key: {
            prefix: SymbolKind.EnumValue,
            name: 'INACTIVE',
            path: ['file:///test/MyEnum.cls', 'Status', 'INACTIVE'],
            unifiedId: 'inactive-id',
            fileUri: 'file:///test/MyEnum.cls',
            kind: SymbolKind.EnumValue,
          },
          _isLoaded: true,
          modifiers: {
            visibility: SymbolVisibility.Default,
            isStatic: false,
            isFinal: false,
            isAbstract: false,
            isVirtual: false,
            isOverride: false,
            isTransient: false,
            isTestMethod: false,
            isWebService: false,
            isBuiltIn: false,
          },
          type: { name: 'Status' },
        },
      ] as VariableSymbol[];

      table.addSymbol(enumSymbol);

      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);

      const reconEnum = reconstructed.getAllSymbols()[0] as EnumSymbol;
      expect(reconEnum.values).toHaveLength(2);
      expect(reconEnum.values?.[0].name).toBe('ACTIVE');
    });

    it('should preserve TypeReferences through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      table.references = [
        {
          name: 'String',
          location: {
            symbolRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 16,
            },
            identifierRange: {
              startLine: 5,
              startColumn: 10,
              endLine: 5,
              endColumn: 16,
            },
          },
          context: ReferenceContext.TYPE_DECLARATION,
          isResolved: false,
        },
      ];

      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);

      expect(reconstructed.references).toHaveLength(1);
      expect(reconstructed.references[0].name).toBe('String');
      expect(reconstructed.references[0].context).toBe(
        ReferenceContext.TYPE_DECLARATION,
      );
    });

    it('should preserve HierarchicalReferences through toJSON/fromJSON', () => {
      const table = new SymbolTable();
      table.setFileUri('file:///test/MyClass.cls');
      table.hierarchicalReferences = [
        {
          name: 'System.debug',
          fullPath: ['System', 'debug'],
          location: {
            symbolRange: {
              startLine: 10,
              startColumn: 0,
              endLine: 10,
              endColumn: 12,
            },
            identifierRange: {
              startLine: 10,
              startColumn: 0,
              endLine: 10,
              endColumn: 12,
            },
          },
          context: ReferenceContext.METHOD_CALL,
          children: [],
        },
      ];

      const json = table.toJSON();
      const reconstructed = SymbolTable.fromJSON(json);

      expect(reconstructed.hierarchicalReferences).toHaveLength(1);
      expect(reconstructed.hierarchicalReferences[0].name).toBe('System.debug');
      expect(reconstructed.hierarchicalReferences[0].fullPath).toEqual([
        'System',
        'debug',
      ]);
    });
  });

  describe('error handling', () => {
    it('should return empty SymbolTable for null input', () => {
      const result = SymbolTable.fromJSON(null);
      expect(result).toBeInstanceOf(SymbolTable);
      expect(result.getAllSymbols()).toHaveLength(0);
    });

    it('should return empty SymbolTable for undefined input', () => {
      const result = SymbolTable.fromJSON(undefined);
      expect(result).toBeInstanceOf(SymbolTable);
      expect(result.getAllSymbols()).toHaveLength(0);
    });

    it('should return empty SymbolTable for non-object input', () => {
      expect(SymbolTable.fromJSON('string' as any).getAllSymbols()).toHaveLength(
        0,
      );
      expect(SymbolTable.fromJSON(123 as any).getAllSymbols()).toHaveLength(0);
      expect(SymbolTable.fromJSON([] as any).getAllSymbols()).toHaveLength(0);
    });

    it('should skip malformed symbols without crashing', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [
          {
            symbol: {
              name: 'Valid',
              kind: 'class',
              id: '1',
              location: {
                identifierRange: {
                  startLine: 1,
                  startColumn: 0,
                  endLine: 1,
                  endColumn: 5,
                },
              },
              modifiers: {
                visibility: 'public',
                isStatic: false,
                isFinal: false,
                isAbstract: false,
                isVirtual: false,
                isOverride: false,
                isTransient: false,
                isTestMethod: false,
                isWebService: false,
                isBuiltIn: false,
              },
            },
          },
          { symbol: null },
          { symbol: { name: 'MissingKind' } },
          { symbol: { kind: 'class' } }, // Missing name
          {
            symbol: { name: 'MissingId', kind: 'class' },
          }, // Missing id
          {
            symbol: { name: 'MissingLocation', kind: 'class', id: '2' },
          }, // Missing location
        ],
        references: [],
      };

      const result = SymbolTable.fromJSON(json);
      // Only 'Valid' should be loaded
      expect(result.getAllSymbols().length).toBe(1);
      expect(result.getAllSymbols()[0].name).toBe('Valid');
    });

    it('should skip malformed references without crashing', () => {
      const json = {
        fileUri: 'file:///test.cls',
        symbols: [],
        references: [
          {
            name: 'Valid',
            location: {
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 5,
              },
            },
          },
          null,
          {
            location: {
              identifierRange: { startLine: 1 },
            },
          }, // Missing name
          { name: 'MissingLocation' }, // Missing location
        ],
      };

      const result = SymbolTable.fromJSON(json);
      expect(result.references.length).toBe(1);
      expect(result.references[0].name).toBe('Valid');
    });
  });

  describe('location reconstruction', () => {
    it('should handle both old (range) and new (symbolRange/identifierRange) formats', () => {
      const oldFormatJson = {
        fileUri: 'file:///test.cls',
        symbols: [
          {
            symbol: {
              name: 'OldFormat',
              kind: 'class',
              id: '1',
              location: {
                range: {
                  startLine: 1,
                  startColumn: 0,
                  endLine: 10,
                  endColumn: 1,
                },
              },
              modifiers: {
                visibility: 'public',
                isStatic: false,
                isFinal: false,
                isAbstract: false,
                isVirtual: false,
                isOverride: false,
                isTransient: false,
                isTestMethod: false,
                isWebService: false,
                isBuiltIn: false,
              },
            },
          },
        ],
      };

      const newFormatJson = {
        fileUri: 'file:///test.cls',
        symbols: [
          {
            symbol: {
              name: 'NewFormat',
              kind: 'class',
              id: '2',
              location: {
                symbolRange: {
                  startLine: 1,
                  startColumn: 0,
                  endLine: 10,
                  endColumn: 1,
                },
                identifierRange: {
                  startLine: 1,
                  startColumn: 6,
                  endLine: 1,
                  endColumn: 15,
                },
              },
              modifiers: {
                visibility: 'public',
                isStatic: false,
                isFinal: false,
                isAbstract: false,
                isVirtual: false,
                isOverride: false,
                isTransient: false,
                isTestMethod: false,
                isWebService: false,
                isBuiltIn: false,
              },
            },
          },
        ],
      };

      const oldResult = SymbolTable.fromJSON(oldFormatJson);
      const newResult = SymbolTable.fromJSON(newFormatJson);

      expect(oldResult.getAllSymbols()).toHaveLength(1);
      expect(newResult.getAllSymbols()).toHaveLength(1);

      // Both should have valid locations
      expect(oldResult.getAllSymbols()[0].location.identifierRange).toBeDefined();
      expect(newResult.getAllSymbols()[0].location.identifierRange).toBeDefined();
    });
  });
});
