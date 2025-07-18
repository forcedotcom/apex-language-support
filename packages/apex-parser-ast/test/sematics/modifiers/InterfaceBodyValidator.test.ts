/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import { SymbolKind, SymbolLocation, SymbolModifiers, SymbolVisibility, TypeSymbol } from '../../../src/types/symbol';
import { InterfaceBodyValidator } from '../../../src/semantics/modifiers/InterfaceBodyValidator';
import { ErrorReporter } from '../../../src/utils/ErrorReporter';

// Mock error reporter for testing
class MockErrorReporter implements ErrorReporter {
  public errors: string[] = [];
  public warnings: string[] = [];

  addError(message: string, context: any): void {
    this.errors.push(message);
  }

  addWarning(message: string, context?: any): void {
    this.warnings.push(message);
  }
}

// Mock parser rule context
class MockParserRuleContext extends ParserRuleContext {
  constructor() {
    super(null as any, 0);
  }
}

describe('InterfaceBodyValidator', () => {
  let mockErrorReporter: MockErrorReporter;
  let mockContext: MockParserRuleContext;
  let interfaceSymbol: TypeSymbol;
  let classSymbol: TypeSymbol;

  beforeEach(() => {
    mockErrorReporter = new MockErrorReporter();
    mockContext = new MockParserRuleContext();

    const mockLocation: SymbolLocation = {
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 10,
    };

    const mockModifiers: SymbolModifiers = {
      visibility: SymbolVisibility.Public,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
    };

    interfaceSymbol = {
      name: 'TestInterface',
      kind: SymbolKind.Interface,
      location: mockLocation,
      modifiers: mockModifiers,
      interfaces: [],
      parent: null,
      key: {
        prefix: SymbolKind.Interface,
        name: 'TestInterface',
        path: ['TestInterface'],
      },
      parentKey: null,
    };

    classSymbol = {
      name: 'TestClass',
      kind: SymbolKind.Class,
      location: mockLocation,
      modifiers: mockModifiers,
      interfaces: [],
      parent: null,
      key: {
        prefix: SymbolKind.Class,
        name: 'TestClass',
        path: ['TestClass'],
      },
      parentKey: null,
    };
  });

  describe('validateFieldInInterface', () => {
    it('should report error when field is declared in interface', () => {
      const modifiers: SymbolModifiers = {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      };

      InterfaceBodyValidator.validateFieldInInterface(modifiers, mockContext, interfaceSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toContain(
        'Fields are not allowed in interfaces. Interfaces can only contain method declarations',
      );
    });

    it('should not report error when field is declared in class', () => {
      const modifiers: SymbolModifiers = {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      };

      InterfaceBodyValidator.validateFieldInInterface(modifiers, mockContext, classSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });
  });

  describe('validateConstructorInInterface', () => {
    it('should report error when constructor is declared in interface', () => {
      InterfaceBodyValidator.validateConstructorInInterface(
        'TestInterface',
        mockContext,
        interfaceSymbol,
        mockErrorReporter,
      );

      expect(mockErrorReporter.errors).toContain(
        "Constructor 'TestInterface' is not allowed in interfaces. " +
          'Interfaces can only contain method declarations',
      );
    });

    it('should not report error when constructor is declared in class', () => {
      InterfaceBodyValidator.validateConstructorInInterface('TestClass', mockContext, classSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });

    it('should not report error when currentTypeSymbol is null', () => {
      InterfaceBodyValidator.validateConstructorInInterface('TestConstructor', mockContext, null, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });
  });

  describe('validateEnumInInterface', () => {
    it('should report error when enum is declared in interface', () => {
      InterfaceBodyValidator.validateEnumInInterface('TestEnum', mockContext, interfaceSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toContain(
        "Enum 'TestEnum' is not allowed in interfaces. Interfaces can only contain method declarations",
      );
    });

    it('should not report error when enum is declared in class', () => {
      InterfaceBodyValidator.validateEnumInInterface('TestEnum', mockContext, classSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });

    it('should not report error when currentTypeSymbol is null', () => {
      InterfaceBodyValidator.validateEnumInInterface('TestEnum', mockContext, null, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });
  });

  describe('validateClassInInterface', () => {
    it('should report error when class is declared in interface', () => {
      InterfaceBodyValidator.validateClassInInterface('InnerClass', mockContext, interfaceSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toContain(
        "Inner class 'InnerClass' is not allowed in interfaces. Interfaces can only contain method declarations",
      );
    });

    it('should not report error when class is declared in class', () => {
      InterfaceBodyValidator.validateClassInInterface('InnerClass', mockContext, classSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });

    it('should not report error when currentTypeSymbol is null', () => {
      InterfaceBodyValidator.validateClassInInterface('InnerClass', mockContext, null, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });
  });

  describe('validateInterfaceInInterface', () => {
    it('should report error when interface is declared in interface', () => {
      InterfaceBodyValidator.validateInterfaceInInterface(
        'InnerInterface',
        mockContext,
        interfaceSymbol,
        mockErrorReporter,
      );

      expect(mockErrorReporter.errors).toContain(
        // eslint-disable-next-line max-len
        "Inner interface 'InnerInterface' is not allowed in interfaces. Interfaces can only contain method declarations",
      );
    });

    it('should not report error when interface is declared in class', () => {
      InterfaceBodyValidator.validateInterfaceInInterface(
        'InnerInterface',
        mockContext,
        classSymbol,
        mockErrorReporter,
      );

      expect(mockErrorReporter.errors).toHaveLength(0);
    });

    it('should not report error when currentTypeSymbol is null', () => {
      InterfaceBodyValidator.validateInterfaceInInterface('InnerInterface', mockContext, null, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });
  });

  describe('validatePropertyInInterface', () => {
    it('should report error when property is declared in interface', () => {
      const modifiers: SymbolModifiers = {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      };

      InterfaceBodyValidator.validatePropertyInInterface(modifiers, mockContext, interfaceSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toContain(
        'Properties are not allowed in interfaces. Interfaces can only contain method declarations',
      );
    });

    it('should not report error when property is declared in class', () => {
      const modifiers: SymbolModifiers = {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      };

      InterfaceBodyValidator.validatePropertyInInterface(modifiers, mockContext, classSymbol, mockErrorReporter);

      expect(mockErrorReporter.errors).toHaveLength(0);
    });
  });
});
