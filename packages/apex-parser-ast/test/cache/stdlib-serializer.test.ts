/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Comprehensive tests for the StandardLibrarySerializer.
 * Tests serialization of SymbolTable structures to Protocol Buffers format.
 */

import {
  StandardLibrarySerializer,
  NamespaceData,
} from '../../src/cache/stdlib-serializer';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
  SymbolModifiers,
} from '../../src/types/symbol';
import {
  StandardLibrary,
  TypeKind,
  Visibility,
} from '../../src/generated/apex-stdlib';

// Helper function to create default modifiers
function createModifiers(
  overrides: Partial<SymbolModifiers> = {},
): SymbolModifiers {
  return {
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
    ...overrides,
  };
}

// Helper function to create a default location
function createLocation() {
  return {
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
      endColumn: 23,
    },
  };
}

describe('StandardLibrarySerializer', () => {
  let serializer: StandardLibrarySerializer;

  beforeEach(() => {
    serializer = new StandardLibrarySerializer();
  });

  describe('Basic Serialization', () => {
    it('serializes empty namespace array', () => {
      const binary = serializer.serialize([], 'test-checksum');

      expect(binary).toBeInstanceOf(Uint8Array);
      expect(binary.length).toBeGreaterThan(0);

      // Verify it can be deserialized
      const proto = StandardLibrary.fromBinary(binary);
      expect(proto.sourceChecksum).toBe('test-checksum');
      expect(proto.namespaces.length).toBe(0);
    });

    it('serializes single namespace with single type', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/TestClass');

      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        createLocation(),
        'apex://stdlib/System/TestClass',
        createModifiers({ isBuiltIn: true }),
        null,
      );
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/TestClass', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces.length).toBe(1);
      expect(proto.namespaces[0].name).toBe('System');
      expect(proto.namespaces[0].types.length).toBe(1);
      expect(proto.namespaces[0].types[0].name).toBe('TestClass');
    });

    it('serializes multiple namespaces', () => {
      const systemTable = new SymbolTable();
      systemTable.setFileUri('apex://stdlib/System/String');
      systemTable.addSymbol(
        SymbolFactory.createFullSymbol(
          'String',
          SymbolKind.Class,
          createLocation(),
          'apex://stdlib/System/String',
          createModifiers({ isBuiltIn: true }),
          null,
        ),
      );

      const databaseTable = new SymbolTable();
      databaseTable.setFileUri('apex://stdlib/Database/DMLOptions');
      databaseTable.addSymbol(
        SymbolFactory.createFullSymbol(
          'DMLOptions',
          SymbolKind.Class,
          createLocation(),
          'apex://stdlib/Database/DMLOptions',
          createModifiers({ isBuiltIn: true }),
          null,
        ),
      );

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([['apex://stdlib/System/String', systemTable]]),
        },
        {
          name: 'Database',
          symbolTables: new Map([
            ['apex://stdlib/Database/DMLOptions', databaseTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces.length).toBe(2);
      expect(proto.namespaces[0].name).toBe('System');
      expect(proto.namespaces[1].name).toBe('Database');
    });
  });

  describe('Type Symbol Serialization', () => {
    it('serializes Class with modifiers, superclass, and interfaces', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/MyClass');

      const classSymbol = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Class,
        createLocation(),
        'apex://stdlib/System/MyClass',
        createModifiers({
          visibility: SymbolVisibility.Public,
          isVirtual: true,
          isBuiltIn: true,
        }),
        null,
        undefined,
        'System.MyClass',
      );
      // Cast to access TypeSymbol properties
      (classSymbol as any).superClass = 'System.BaseClass';
      (classSymbol as any).interfaces = [
        'System.ISerializable',
        'System.IComparable',
      ];
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/MyClass', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      const type = proto.namespaces[0].types[0];
      expect(type.name).toBe('MyClass');
      expect(type.kind).toBe(TypeKind.CLASS);
      expect(type.superClass).toBe('System.BaseClass');
      expect(type.interfaces).toContain('System.ISerializable');
      expect(type.interfaces).toContain('System.IComparable');
      expect(type.modifiers?.visibility).toBe(Visibility.PUBLIC);
      expect(type.modifiers?.isVirtual).toBe(true);
    });

    it('serializes Interface', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/IComparable');

      const interfaceSymbol = SymbolFactory.createFullSymbol(
        'IComparable',
        SymbolKind.Interface,
        createLocation(),
        'apex://stdlib/System/IComparable',
        createModifiers({ isBuiltIn: true }),
        null,
      );
      symbolTable.addSymbol(interfaceSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/IComparable', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces[0].types[0].kind).toBe(TypeKind.INTERFACE);
    });

    it('serializes Enum with values', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/LoggingLevel');

      const enumSymbol = SymbolFactory.createFullSymbol(
        'LoggingLevel',
        SymbolKind.Enum,
        createLocation(),
        'apex://stdlib/System/LoggingLevel',
        createModifiers({ isBuiltIn: true }),
        null,
      );
      symbolTable.addSymbol(enumSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/LoggingLevel', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces[0].types[0].kind).toBe(TypeKind.ENUM);
    });

    it('serializes Trigger type', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/Trigger');

      const triggerSymbol = SymbolFactory.createFullSymbol(
        'Trigger',
        SymbolKind.Trigger,
        createLocation(),
        'apex://stdlib/System/Trigger',
        createModifiers({ isBuiltIn: true }),
        null,
      );
      symbolTable.addSymbol(triggerSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/Trigger', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces[0].types[0].kind).toBe(TypeKind.TRIGGER);
    });
  });

  describe('Modifier Serialization', () => {
    it('serializes all visibility levels', () => {
      const visibilities = [
        { input: SymbolVisibility.Public, expected: Visibility.PUBLIC },
        { input: SymbolVisibility.Private, expected: Visibility.PRIVATE },
        { input: SymbolVisibility.Protected, expected: Visibility.PROTECTED },
        { input: SymbolVisibility.Global, expected: Visibility.GLOBAL },
      ];

      for (const { input, expected } of visibilities) {
        const symbolTable = new SymbolTable();
        symbolTable.setFileUri(`apex://stdlib/System/Test${input}`);

        const classSymbol = SymbolFactory.createFullSymbol(
          `Test${input}`,
          SymbolKind.Class,
          createLocation(),
          `apex://stdlib/System/Test${input}`,
          createModifiers({ visibility: input }),
          null,
        );
        symbolTable.addSymbol(classSymbol);

        const namespaceData: NamespaceData[] = [
          {
            name: 'System',
            symbolTables: new Map([
              [`apex://stdlib/System/Test${input}`, symbolTable],
            ]),
          },
        ];

        const binary = serializer.serialize(namespaceData, 'checksum');
        const proto = StandardLibrary.fromBinary(binary);

        expect(proto.namespaces[0].types[0].modifiers?.visibility).toBe(
          expected,
        );
      }
    });

    it('serializes all modifier flags', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/FullModifiers');

      const classSymbol = SymbolFactory.createFullSymbol(
        'FullModifiers',
        SymbolKind.Class,
        createLocation(),
        'apex://stdlib/System/FullModifiers',
        createModifiers({
          visibility: SymbolVisibility.Public,
          isStatic: true,
          isFinal: true,
          isAbstract: true,
          isVirtual: true,
          isOverride: true,
          isTransient: true,
          isTestMethod: true,
          isWebService: true,
          isBuiltIn: true,
        }),
        null,
      );
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/FullModifiers', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      const modifiers = proto.namespaces[0].types[0].modifiers!;
      expect(modifiers.isStatic).toBe(true);
      expect(modifiers.isFinal).toBe(true);
      expect(modifiers.isAbstract).toBe(true);
      expect(modifiers.isVirtual).toBe(true);
      expect(modifiers.isOverride).toBe(true);
      expect(modifiers.isTransient).toBe(true);
      expect(modifiers.isTestMethod).toBe(true);
      expect(modifiers.isWebService).toBe(true);
      expect(modifiers.isBuiltIn).toBe(true);
    });
  });

  describe('Location/Range Serialization', () => {
    it('serializes symbol ranges with valid positions', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/Located');

      const customLocation = {
        symbolRange: {
          startLine: 5,
          startColumn: 10,
          endLine: 25,
          endColumn: 30,
        },
        identifierRange: {
          startLine: 5,
          startColumn: 17,
          endLine: 5,
          endColumn: 24,
        },
      };

      const classSymbol = SymbolFactory.createFullSymbol(
        'Located',
        SymbolKind.Class,
        customLocation,
        'apex://stdlib/System/Located',
        createModifiers(),
        null,
      );
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/Located', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      const location = proto.namespaces[0].types[0].location!;
      expect(location.symbolRange?.startLine).toBe(5);
      expect(location.symbolRange?.startColumn).toBe(10);
      expect(location.symbolRange?.endLine).toBe(25);
      expect(location.symbolRange?.endColumn).toBe(30);
      expect(location.identifierRange?.startLine).toBe(5);
      expect(location.identifierRange?.startColumn).toBe(17);
    });
  });

  describe('Metadata Serialization', () => {
    it('includes timestamp and checksum', () => {
      const binary = serializer.serialize([], 'my-checksum-123');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.sourceChecksum).toBe('my-checksum-123');
      expect(proto.generatedAt).toBeDefined();
      // generatedAt should be a valid ISO timestamp
      expect(new Date(proto.generatedAt).getTime()).not.toBeNaN();
    });
  });

  describe('Edge Cases', () => {
    it('handles symbol with empty name', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/EmptyName');

      const classSymbol = SymbolFactory.createFullSymbol(
        '',
        SymbolKind.Class,
        createLocation(),
        'apex://stdlib/System/EmptyName',
        createModifiers(),
        null,
      );
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/EmptyName', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces[0].types[0].name).toBe('');
    });

    it('handles type with no members', () => {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/EmptyClass');

      const classSymbol = SymbolFactory.createFullSymbol(
        'EmptyClass',
        SymbolKind.Class,
        createLocation(),
        'apex://stdlib/System/EmptyClass',
        createModifiers(),
        null,
      );
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/EmptyClass', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      const type = proto.namespaces[0].types[0];
      expect(type.methods.length).toBe(0);
      expect(type.fields.length).toBe(0);
      expect(type.properties.length).toBe(0);
      expect(type.innerTypes.length).toBe(0);
    });

    it('handles namespace with multiple symbol tables', () => {
      const table1 = new SymbolTable();
      table1.setFileUri('apex://stdlib/System/Class1');
      table1.addSymbol(
        SymbolFactory.createFullSymbol(
          'Class1',
          SymbolKind.Class,
          createLocation(),
          'apex://stdlib/System/Class1',
          createModifiers(),
          null,
        ),
      );

      const table2 = new SymbolTable();
      table2.setFileUri('apex://stdlib/System/Class2');
      table2.addSymbol(
        SymbolFactory.createFullSymbol(
          'Class2',
          SymbolKind.Class,
          createLocation(),
          'apex://stdlib/System/Class2',
          createModifiers(),
          null,
        ),
      );

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/Class1', table1],
            ['apex://stdlib/System/Class2', table2],
          ]),
        },
      ];

      const binary = serializer.serialize(namespaceData, 'checksum');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.namespaces[0].types.length).toBe(2);
      const typeNames = proto.namespaces[0].types.map((t) => t.name);
      expect(typeNames).toContain('Class1');
      expect(typeNames).toContain('Class2');
    });
  });
});
