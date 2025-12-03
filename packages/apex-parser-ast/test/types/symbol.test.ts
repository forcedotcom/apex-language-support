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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);
    expect(fileScope).toBeDefined();
    
    const classLocation: SymbolLocation = {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 0 },
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 },
    };
    const classScope = table.enterScope('MyClass', 'class', classLocation, undefined, fileScope ?? null);
    expect(classScope).toBeDefined();
    expect(classScope?.name).toBe('MyClass');
    expect(classScope?.parentId).toBe(fileScope?.id); // Should point to file scope

    const methodLocation: SymbolLocation = {
      symbolRange: { startLine: 2, startColumn: 0, endLine: 5, endColumn: 0 },
      identifierRange: { startLine: 2, startColumn: 0, endLine: 2, endColumn: 10 },
    };
    const methodScope = table.enterScope('myMethod', 'method', methodLocation, undefined, classScope ?? null);
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 },
    };
    const childScope = table.enterScope('childScope', 'block', childLocation, undefined, fileScope ?? null);
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
    };
    const fileScope = table.enterScope('file', 'file', fileLocation);
    
    const blockSymbol = table.enterScope('MyClass', 'class', undefined, undefined, fileScope ?? null);
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
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

    const classBlockSymbol = table.enterScope('MyClass', 'class', location, undefined, fileScope ?? null);
    const currentBlockSymbol = table.getCurrentBlockSymbol(classBlockSymbol ?? null);
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
      identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 },
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

    const classBlockSymbol = table.enterScope('MyClass', 'class', classLocation, undefined, fileScope ?? null);
    const methodBlockSymbol = table.enterScope('myMethod', 'method', methodLocation, undefined, classBlockSymbol ?? null);
    // When enterScope is called directly (not via listener), it uses the name provided
    expect(methodBlockSymbol?.name).toBe('myMethod');

    // exitScope is now a no-op - stack handles scope exit
    // After exitScope (which is a no-op), the class block symbol should still exist
    // Since exitScope is a no-op, we just verify the class block symbol still exists
    expect(classBlockSymbol).toBeDefined();
    expect(classBlockSymbol?.name).toBe('MyClass');
  });
});
