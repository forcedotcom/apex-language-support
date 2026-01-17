/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared test utilities for cache tests.
 * Provides helper functions for creating test data structures.
 */

import { gzipSync } from 'fflate';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
  SymbolModifiers,
  SymbolLocation,
} from '../../src/types/symbol';
import { StandardLibrarySerializer } from '../../src/cache/stdlib-serializer';
import {
  StandardLibrary,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  ParameterSymbol,
  TypeReference,
  Modifiers,
  SymbolLocation as ProtoSymbolLocation,
  Range,
  TypeKind,
  VariableKind,
  Visibility,
} from '../../src/generated/apex-stdlib';

/**
 * Create default symbol modifiers for testing
 */
export function createDefaultModifiers(
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
    isBuiltIn: true,
    ...overrides,
  };
}

/**
 * Create a default symbol location for testing
 */
export function createDefaultLocation(): SymbolLocation {
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

/**
 * Create a minimal valid protobuf data for testing
 */
export function createTestProtobufData(): Uint8Array {
  const serializer = new StandardLibrarySerializer();
  const symbolTable = createTestSymbolTable('TestClass');

  const namespaceData = [
    {
      name: 'System',
      symbolTables: new Map([['apex://stdlib/System/TestClass', symbolTable]]),
    },
  ];

  return serializer.serialize(namespaceData, '59.0', 'test-checksum');
}

/**
 * Create a SymbolTable with test data
 */
export function createTestSymbolTable(
  className: string = 'TestClass',
): SymbolTable {
  const symbolTable = new SymbolTable();
  symbolTable.setFileUri(`apex://stdlib/System/${className}`);

  const classSymbol = SymbolFactory.createFullSymbol(
    className,
    SymbolKind.Class,
    createDefaultLocation(),
    `apex://stdlib/System/${className}`,
    createDefaultModifiers(),
    null,
    undefined,
    `System.${className}`,
  );
  symbolTable.addSymbol(classSymbol);

  return symbolTable;
}

/**
 * Compress data for testing using gzip
 */
export function compressTestData(data: Uint8Array): Uint8Array {
  return gzipSync(data, { level: 9 });
}

/**
 * Create a base64 data URL from binary data
 */
export function createMockDataUrl(
  data: Uint8Array,
  mimeType: string = 'application/x-gzip',
): string {
  const base64 = Buffer.from(data).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Create a proto location for testing
 */
export function createProtoLocation(): ProtoSymbolLocation {
  return ProtoSymbolLocation.create({
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

/**
 * Create proto modifiers for testing
 */
export function createProtoModifiers(
  overrides: Partial<Modifiers> = {},
): Modifiers {
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

/**
 * Create a proto type reference for testing
 */
export function createProtoTypeReference(
  name: string,
  isPrimitive = false,
): TypeReference {
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

/**
 * Create a full test class symbol in proto format with all fields populated
 */
export function createFullTestClassSymbol(
  name: string = 'FullTestClass',
): TypeSymbol {
  return TypeSymbol.create({
    id: `${name.toLowerCase()}-id`,
    name,
    kind: TypeKind.CLASS,
    fqn: `System.${name}`,
    fileUri: `apex://stdlib/System/${name}`,
    location: createProtoLocation(),
    modifiers: createProtoModifiers({ isVirtual: true }),
    superClass: 'System.Object',
    interfaces: ['System.IComparable'],
    annotations: [],
    methods: [
      createTestMethodSymbol('testMethod', false),
      createTestMethodSymbol(name, true), // Constructor
    ],
    fields: [createTestVariableSymbol('testField', VariableKind.FIELD)],
    properties: [
      createTestVariableSymbol('TestProperty', VariableKind.PROPERTY),
    ],
    innerTypes: [],
    enumValues: [],
    parentId: '',
  });
}

/**
 * Create a test method symbol in proto format
 */
export function createTestMethodSymbol(
  name: string = 'testMethod',
  isConstructor: boolean = false,
): MethodSymbol {
  return MethodSymbol.create({
    id: `${name.toLowerCase()}-method-id`,
    name,
    isConstructor,
    returnType: createProtoTypeReference(isConstructor ? 'void' : 'String'),
    parameters: isConstructor
      ? []
      : [createTestParameterSymbol('param1', 'Integer')],
    location: createProtoLocation(),
    modifiers: createProtoModifiers({ isStatic: !isConstructor }),
    annotations: [],
    parentId: '',
  });
}

/**
 * Create a test variable symbol in proto format
 */
export function createTestVariableSymbol(
  name: string = 'testField',
  kind: VariableKind = VariableKind.FIELD,
): VariableSymbol {
  return VariableSymbol.create({
    id: `${name.toLowerCase()}-var-id`,
    name,
    kind,
    type: createProtoTypeReference('String'),
    initialValue: '',
    location: createProtoLocation(),
    modifiers: createProtoModifiers({
      visibility:
        kind === VariableKind.FIELD ? Visibility.PRIVATE : Visibility.PUBLIC,
    }),
    parentId: '',
  });
}

/**
 * Create a test parameter symbol in proto format
 */
export function createTestParameterSymbol(
  name: string = 'param',
  typeName: string = 'String',
): ParameterSymbol {
  return ParameterSymbol.create({
    id: `${name.toLowerCase()}-param-id`,
    name,
    type: createProtoTypeReference(typeName),
    location: createProtoLocation(),
    modifiers: createProtoModifiers(),
    parentId: '',
  });
}

/**
 * Create a StandardLibrary proto with customizable content
 */
export function createTestStandardLibraryProto(
  options: {
    version?: string;
    sourceChecksum?: string;
    namespaces?: { name: string; types: TypeSymbol[] }[];
  } = {},
): StandardLibrary {
  const {
    version = '59.0',
    sourceChecksum = 'test-checksum',
    namespaces = [],
  } = options;

  return StandardLibrary.create({
    version,
    generatedAt: new Date().toISOString(),
    sourceChecksum,
    namespaces: namespaces.map((ns) => ({
      name: ns.name,
      types: ns.types,
    })),
  });
}

/**
 * Create test data of a specific size
 */
export function createTestDataOfSize(size: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = i % 256;
  }
  return data;
}
