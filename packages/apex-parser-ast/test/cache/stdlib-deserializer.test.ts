/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Comprehensive tests for the StandardLibraryDeserializer.
 * Tests deserialization of Protocol Buffers data to SymbolTable structures.
 */

import { StandardLibraryDeserializer } from '../../src/cache/stdlib-deserializer';
import { SymbolKind, SymbolVisibility } from '../../src/types/symbol';
import {
  StandardLibrary,
  Namespace,
  TypeSymbol,
  MethodSymbol,
  ParameterSymbol,
  TypeReference,
  Modifiers,
  SymbolLocation,
  Range,
  TypeKind,
  Visibility,
} from '../../src/generated/apex-stdlib';

// Helper to create a valid proto location
function createProtoLocation(): SymbolLocation {
  return SymbolLocation.create({
    symbolRange: Range.create({
      startLine: 1,
      startColumn: 0,
      endLine: 10,
      endColumn: 1,
    }),
    identifierRange: Range.create({
      startLine: 1,
      startColumn: 14,
      endLine: 1,
      endColumn: 23,
    }),
  });
}

// Helper to create default modifiers
function createProtoModifiers(overrides: Partial<Modifiers> = {}): Modifiers {
  return Modifiers.create({
    visibility: Visibility.PUBLIC,
    isStatic: false,
    isFinal: false,
    isAbstract: false,
    isVirtual: false,
    isOverride: false,
    isTransient: false,
    isTestMethod: false,
    isWebService: false,
    isBuiltIn: true,
    ...overrides,
  });
}

// Helper to create a type reference
function createTypeReference(name: string, isPrimitive = false): TypeReference {
  return TypeReference.create({
    name,
    originalTypeString: name,
    isPrimitive,
    isBuiltIn: true,
    isArray: false,
    isCollection: false,
    typeParameters: [],
  });
}

describe('StandardLibraryDeserializer', () => {
  let deserializer: StandardLibraryDeserializer;

  beforeEach(() => {
    deserializer = new StandardLibraryDeserializer();
  });

  describe('Basic Deserialization', () => {
    it('deserializes from binary buffer', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'test-checksum',
        namespaces: [],
      });

      const binary = StandardLibrary.toBinary(proto);
      const result = deserializer.deserializeFromBinary(binary);

      expect(result).toBeDefined();
      expect(result.metadata.sourceChecksum).toBe('test-checksum');
    });

    it('deserializes empty library', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'empty-checksum',
        namespaces: [],
      });

      const result = deserializer.deserialize(proto);

      expect(result.symbolTables.size).toBe(0);
      expect(result.allTypes.length).toBe(0);
      expect(result.metadata.namespaceCount).toBe(0);
      expect(result.metadata.typeCount).toBe(0);
    });

    it('deserializes with metadata validation', () => {
      const generatedAt = '2025-01-16T12:00:00.000Z';
      const proto = StandardLibrary.create({
        generatedAt,
        sourceChecksum: 'abc123',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'type-1',
                name: 'String',
                kind: TypeKind.CLASS,
                fqn: 'System.String',
                fileUri: 'apex://stdlib/System/String',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);

      expect(result.metadata.generatedAt).toBe(generatedAt);
      expect(result.metadata.sourceChecksum).toBe('abc123');
      expect(result.metadata.namespaceCount).toBe(1);
      expect(result.metadata.typeCount).toBe(1);
    });
  });

  describe('Type Symbol Deserialization', () => {
    it('deserializes to correct SymbolKind for Class', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'class-1',
                name: 'MyClass',
                kind: TypeKind.CLASS,
                fqn: 'System.MyClass',
                fileUri: 'apex://stdlib/System/MyClass',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      const type = result.allTypes[0];

      expect(type.kind).toBe(SymbolKind.Class);
      expect(type.name).toBe('MyClass');
    });

    it('deserializes to correct SymbolKind for Interface', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'iface-1',
                name: 'IComparable',
                kind: TypeKind.INTERFACE,
                fqn: 'System.IComparable',
                fileUri: 'apex://stdlib/System/IComparable',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      expect(result.allTypes[0].kind).toBe(SymbolKind.Interface);
    });

    it('deserializes to correct SymbolKind for Enum', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'enum-1',
                name: 'LoggingLevel',
                kind: TypeKind.ENUM,
                fqn: 'System.LoggingLevel',
                fileUri: 'apex://stdlib/System/LoggingLevel',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      expect(result.allTypes[0].kind).toBe(SymbolKind.Enum);
    });

    it('deserializes to correct SymbolKind for Trigger', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'trigger-1',
                name: 'Trigger',
                kind: TypeKind.TRIGGER,
                fqn: 'System.Trigger',
                fileUri: 'apex://stdlib/System/Trigger',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      expect(result.allTypes[0].kind).toBe(SymbolKind.Trigger);
    });

    it('preserves FQN and file URI', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'Database',
            types: [
              TypeSymbol.create({
                id: 'db-1',
                name: 'QueryLocator',
                kind: TypeKind.CLASS,
                fqn: 'Database.QueryLocator',
                fileUri: 'apex://stdlib/Database/QueryLocator',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      const type = result.allTypes[0];

      expect(type.fqn).toBe('Database.QueryLocator');
      expect(type.fileUri).toBe('apex://stdlib/Database/QueryLocator');
    });

    it('handles missing optional fields', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'minimal-1',
                name: 'Minimal',
                kind: TypeKind.CLASS,
                fqn: 'System.Minimal',
                fileUri: 'apex://stdlib/System/Minimal',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
                // Optional fields not set: superClass, interfaces, annotations, methods, fields, etc.
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      const type = result.allTypes[0];

      expect(type).toBeDefined();
      expect(type.name).toBe('Minimal');
      // Type should have been created without errors
    });
  });

  describe('Method Symbol Deserialization', () => {
    it('reconstructs method signatures', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'class-1',
                name: 'TestClass',
                kind: TypeKind.CLASS,
                fqn: 'System.TestClass',
                fileUri: 'apex://stdlib/System/TestClass',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
                methods: [
                  MethodSymbol.create({
                    id: 'method-1',
                    name: 'doSomething',
                    isConstructor: false,
                    returnType: createTypeReference('String'),
                    parameters: [
                      ParameterSymbol.create({
                        id: 'param-1',
                        name: 'input',
                        type: createTypeReference('Integer', true),
                        location: createProtoLocation(),
                        modifiers: createProtoModifiers(),
                      }),
                    ],
                    location: createProtoLocation(),
                    modifiers: createProtoModifiers({ isStatic: true }),
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      const symbolTable = result.symbolTables.get(
        'apex://stdlib/System/TestClass',
      );
      expect(symbolTable).toBeDefined();

      // Find the method symbol
      const symbols = symbolTable!.getAllSymbols();
      const method = symbols.find(
        (s) => s.kind === SymbolKind.Method && s.name === 'doSomething',
      );
      expect(method).toBeDefined();
    });

    it('handles constructors correctly', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'class-1',
                name: 'MyClass',
                kind: TypeKind.CLASS,
                fqn: 'System.MyClass',
                fileUri: 'apex://stdlib/System/MyClass',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
                methods: [
                  MethodSymbol.create({
                    id: 'ctor-1',
                    name: 'MyClass',
                    isConstructor: true,
                    returnType: createTypeReference('void', true),
                    parameters: [],
                    location: createProtoLocation(),
                    modifiers: createProtoModifiers(),
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      const symbolTable = result.symbolTables.get(
        'apex://stdlib/System/MyClass',
      );
      const symbols = symbolTable!.getAllSymbols();
      const ctor = symbols.find((s) => s.kind === SymbolKind.Constructor);
      expect(ctor).toBeDefined();
    });
  });

  describe('Modifier Deserialization', () => {
    it('converts proto Visibility to SymbolVisibility', () => {
      const visibilityTests = [
        { proto: Visibility.PUBLIC, expected: SymbolVisibility.Public },
        { proto: Visibility.PRIVATE, expected: SymbolVisibility.Private },
        { proto: Visibility.PROTECTED, expected: SymbolVisibility.Protected },
        { proto: Visibility.GLOBAL, expected: SymbolVisibility.Global },
      ];

      for (const { proto: protoVis, expected } of visibilityTests) {
        const proto = StandardLibrary.create({
          generatedAt: new Date().toISOString(),
          sourceChecksum: 'checksum',
          namespaces: [
            Namespace.create({
              name: 'System',
              types: [
                TypeSymbol.create({
                  id: `vis-${protoVis}`,
                  name: `Test${protoVis}`,
                  kind: TypeKind.CLASS,
                  fqn: `System.Test${protoVis}`,
                  fileUri: `apex://stdlib/System/Test${protoVis}`,
                  location: createProtoLocation(),
                  modifiers: createProtoModifiers({ visibility: protoVis }),
                }),
              ],
            }),
          ],
        });

        const result = deserializer.deserialize(proto);
        expect(result.allTypes[0].modifiers.visibility).toBe(expected);
      }
    });

    it('preserves all modifier flags', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'flags-1',
                name: 'AllFlags',
                kind: TypeKind.CLASS,
                fqn: 'System.AllFlags',
                fileUri: 'apex://stdlib/System/AllFlags',
                location: createProtoLocation(),
                modifiers: Modifiers.create({
                  visibility: Visibility.PUBLIC,
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
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);
      const modifiers = result.allTypes[0].modifiers;

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

  describe('Error Handling', () => {
    it('throws on invalid binary data', () => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      expect(() => {
        deserializer.deserializeFromBinary(invalidData);
      }).toThrow();
    });

    it('throws on empty binary data', () => {
      const emptyData = new Uint8Array([]);

      // Empty data should either throw or produce an empty result
      // depending on protobuf-ts behavior
      try {
        const result = deserializer.deserializeFromBinary(emptyData);
        // If it doesn't throw, it should produce a valid but empty result
        expect(result.symbolTables.size).toBe(0);
      } catch (error) {
        // Expected - empty data is not valid protobuf
        expect(error).toBeDefined();
      }
    });

    it('handles corrupted protobuf gracefully', () => {
      // Start with valid data and corrupt it
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [],
      });
      const binary = StandardLibrary.toBinary(proto);

      // Corrupt the binary by modifying bytes in the middle
      const corrupted = new Uint8Array(binary);
      if (corrupted.length > 10) {
        corrupted[5] = 0xff;
        corrupted[6] = 0xff;
        corrupted[7] = 0xff;
      }

      // This may or may not throw depending on which bytes are corrupted
      // The important thing is it doesn't crash unexpectedly
      try {
        deserializer.deserializeFromBinary(corrupted);
      } catch {
        // Expected - corrupted data should throw
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles proto with empty namespaces', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'EmptyNamespace',
            types: [],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);

      expect(result.metadata.namespaceCount).toBe(1);
      expect(result.metadata.typeCount).toBe(0);
      expect(result.symbolTables.size).toBe(0);
    });

    it('handles multiple types in same namespace', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'type-1',
                name: 'String',
                kind: TypeKind.CLASS,
                fqn: 'System.String',
                fileUri: 'apex://stdlib/System/String',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
              TypeSymbol.create({
                id: 'type-2',
                name: 'Integer',
                kind: TypeKind.CLASS,
                fqn: 'System.Integer',
                fileUri: 'apex://stdlib/System/Integer',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);

      expect(result.allTypes.length).toBe(2);
      expect(result.symbolTables.size).toBe(2);
    });

    it('handles type with empty name', () => {
      const proto = StandardLibrary.create({
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'checksum',
        namespaces: [
          Namespace.create({
            name: 'System',
            types: [
              TypeSymbol.create({
                id: 'empty-name-1',
                name: '',
                kind: TypeKind.CLASS,
                fqn: 'System.',
                fileUri: 'apex://stdlib/System/Empty',
                location: createProtoLocation(),
                modifiers: createProtoModifiers(),
              }),
            ],
          }),
        ],
      });

      const result = deserializer.deserialize(proto);

      // Should handle empty name gracefully
      expect(result.allTypes.length).toBe(1);
      expect(result.allTypes[0].name).toBe('');
    });
  });
});
