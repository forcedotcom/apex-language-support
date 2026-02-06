/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Binary format constants and types for apex-stdlib.bin
 *
 * This module defines the binary format used to serialize the Apex Standard Library
 * for fast runtime loading. The format is designed for:
 * - Zero reconstruction: Load pre-built data structures directly
 * - Single artifact: One file contains symbols + type registry + all indexes
 * - String interning: Deduplicate all strings in a string table
 * - Fixed-size records: O(1) random access where possible
 */

// Magic number: "APEX" in ASCII (little-endian)
export const BINARY_FORMAT_MAGIC = 0x58455041; // "APEX" reversed for little-endian

// Format version - increment when making breaking changes
export const BINARY_FORMAT_VERSION = 1;

// Header flags
export const FLAG_GZIP_COMPRESSED = 1 << 0;
export const FLAG_HAS_TYPE_REGISTRY = 1 << 1;
export const FLAG_HAS_REFERENCES = 1 << 2;

// Fixed record sizes
export const HEADER_SIZE = 64;
export const SYMBOL_RECORD_SIZE = 96;
export const TYPE_ENTRY_RECORD_SIZE = 64;

/**
 * Binary file header structure (64 bytes)
 */
export interface BinaryHeader {
  /** Magic number: "APEX" */
  magic: number;
  /** Format version */
  version: number;
  /** Feature flags */
  flags: number;
  /** Offset to string table section */
  stringTableOffset: bigint;
  /** Size of string table section in bytes */
  stringTableSize: bigint;
  /** Offset to symbol table section */
  symbolTableOffset: bigint;
  /** Total number of symbols */
  symbolCount: number;
  /** Offset to type registry section */
  typeRegistryOffset: bigint;
  /** Number of type registry entries */
  typeRegistryCount: number;
  /** xxHash64 checksum of content (excluding header) */
  checksum: bigint;
}

/**
 * String table structure for deduplication
 */
export interface StringTable {
  /** Number of strings in the table */
  count: number;
  /** Offsets into string data (relative to data start) */
  offsets: Uint32Array;
  /** Raw UTF-8 string data */
  data: Uint8Array;
}

/**
 * Symbol record structure (96 bytes fixed)
 *
 * All string fields use indices into the string table.
 * Index 0 represents null/empty string.
 */
export interface SymbolRecord {
  /** String table index for symbol ID */
  idIndex: number; // 4 bytes
  /** String table index for symbol name */
  nameIndex: number; // 4 bytes
  /** SymbolKind as byte value */
  kindByte: number; // 1 byte
  /** SymbolVisibility as byte value */
  visibilityByte: number; // 1 byte
  /** Modifier flags (static, final, abstract, etc.) */
  modifierFlags: number; // 2 bytes
  /** String table index for file URI */
  fileUriIndex: number; // 4 bytes
  /** String table index for parent ID (0 = null) */
  parentIdIndex: number; // 4 bytes
  /** String table index for fully qualified name */
  fqnIndex: number; // 4 bytes
  /** String table index for namespace */
  namespaceIndex: number; // 4 bytes

  // Symbol location (28 bytes)
  /** Symbol range start line (1-based) */
  symbolStartLine: number; // 4 bytes
  /** Symbol range start column (0-based) */
  symbolStartCol: number; // 2 bytes
  /** Symbol range end line (1-based) */
  symbolEndLine: number; // 4 bytes
  /** Symbol range end column (0-based) */
  symbolEndCol: number; // 2 bytes
  /** Identifier range start line (1-based) */
  identStartLine: number; // 4 bytes
  /** Identifier range start column (0-based) */
  identStartCol: number; // 2 bytes
  /** Identifier range end line (1-based) */
  identEndLine: number; // 4 bytes
  /** Identifier range end column (0-based) */
  identEndCol: number; // 2 bytes

  // Type-specific data
  /** Offset to extended data for methods, variables, etc. (0 = none) */
  extendedDataOffset: number; // 4 bytes

  // Scope type for block symbols
  /** ScopeType as byte value (0 = not a block) */
  scopeTypeByte: number; // 1 byte

  // Reserved for future use
  /** Padding to reach 96 bytes */
  reserved: number; // 35 bytes
}

/**
 * Type registry entry record structure (64 bytes fixed)
 */
export interface TypeEntryRecord {
  /** String table index for fully qualified name */
  fqnIndex: number; // 4 bytes
  /** String table index for type name */
  nameIndex: number; // 4 bytes
  /** String table index for namespace */
  namespaceIndex: number; // 4 bytes
  /** SymbolKind as byte value (Class, Interface, Enum) */
  kindByte: number; // 1 byte
  /** Whether this is a standard library type */
  isStdlib: number; // 1 byte (boolean)
  /** String table index for associated symbol ID */
  symbolIdIndex: number; // 4 bytes
  /** String table index for source file URI */
  fileUriIndex: number; // 4 bytes
  /** Reserved for future use */
  reserved: Uint8Array; // 42 bytes padding to 64
}

/**
 * File table entry for mapping file URIs to symbol ranges
 */
export interface FileTableEntry {
  /** String table index for file URI */
  fileUriIndex: number; // 4 bytes
  /** Index of first symbol for this file */
  startIndex: number; // 4 bytes
  /** Index after last symbol for this file */
  endIndex: number; // 4 bytes
  /** Index of root symbol for this file (-1 if none) */
  rootIndex: number; // 4 bytes (signed)
}

/**
 * Extended data for method symbols
 */
export interface MethodExtendedData {
  /** String table index for return type string */
  returnTypeIndex: number; // 4 bytes
  /** Whether this is a constructor */
  isConstructor: number; // 1 byte (boolean)
  /** Whether the method has a body */
  hasBody: number; // 1 byte (boolean)
  /** Number of parameters */
  parameterCount: number; // 2 bytes
  /** Offset to parameter data (array of VariableExtendedData) */
  parametersOffset: number; // 4 bytes
}

/**
 * Extended data for variable symbols (fields, properties, parameters)
 */
export interface VariableExtendedData {
  /** String table index for type string */
  typeIndex: number; // 4 bytes
  /** String table index for initial value (0 = none) */
  initialValueIndex: number; // 4 bytes
}

/**
 * Modifier flag bit positions
 */
export const ModifierFlagBits = {
  STATIC: 1 << 0,
  FINAL: 1 << 1,
  ABSTRACT: 1 << 2,
  VIRTUAL: 1 << 3,
  OVERRIDE: 1 << 4,
  TRANSIENT: 1 << 5,
  TEST_METHOD: 1 << 6,
  WEB_SERVICE: 1 << 7,
  BUILT_IN: 1 << 8,
} as const;

/**
 * SymbolKind to byte value mapping
 */
export const SymbolKindToByte: Record<string, number> = {
  class: 0,
  interface: 1,
  trigger: 2,
  method: 3,
  constructor: 4,
  property: 5,
  field: 6,
  variable: 7,
  parameter: 8,
  enum: 9,
  enumValue: 10,
  block: 11,
} as const;

/**
 * Byte value to SymbolKind mapping
 */
export const ByteToSymbolKind: string[] = [
  'class',
  'interface',
  'trigger',
  'method',
  'constructor',
  'property',
  'field',
  'variable',
  'parameter',
  'enum',
  'enumValue',
  'block',
];

/**
 * SymbolVisibility to byte value mapping
 */
export const VisibilityToByte: Record<string, number> = {
  default: 0,
  public: 1,
  private: 2,
  protected: 3,
  global: 4,
} as const;

/**
 * Byte value to SymbolVisibility mapping
 */
export const ByteToVisibility: string[] = [
  'default',
  'public',
  'private',
  'protected',
  'global',
];

/**
 * ScopeType to byte value mapping
 */
export const ScopeTypeToByte: Record<string, number> = {
  file: 0,
  class: 1,
  method: 2,
  block: 3,
  if: 4,
  while: 5,
  for: 6,
  doWhile: 7,
  try: 8,
  catch: 9,
  finally: 10,
  switch: 11,
  when: 12,
  runAs: 13,
  getter: 14,
  setter: 15,
} as const;

/**
 * Byte value to ScopeType mapping
 */
export const ByteToScopeType: string[] = [
  'file',
  'class',
  'method',
  'block',
  'if',
  'while',
  'for',
  'doWhile',
  'try',
  'catch',
  'finally',
  'switch',
  'when',
  'runAs',
  'getter',
  'setter',
];

/**
 * Read a binary header from a DataView
 */
export function readHeader(view: DataView): BinaryHeader {
  return {
    magic: view.getUint32(0, true),
    version: view.getUint32(4, true),
    flags: view.getUint32(8, true),
    stringTableOffset: view.getBigUint64(12, true),
    stringTableSize: view.getBigUint64(20, true),
    symbolTableOffset: view.getBigUint64(28, true),
    symbolCount: view.getUint32(36, true),
    typeRegistryOffset: view.getBigUint64(40, true),
    typeRegistryCount: view.getUint32(48, true),
    checksum: view.getBigUint64(52, true),
  };
}

/**
 * Write a binary header to a DataView
 */
export function writeHeader(view: DataView, header: BinaryHeader): void {
  view.setUint32(0, header.magic, true);
  view.setUint32(4, header.version, true);
  view.setUint32(8, header.flags, true);
  view.setBigUint64(12, header.stringTableOffset, true);
  view.setBigUint64(20, header.stringTableSize, true);
  view.setBigUint64(28, header.symbolTableOffset, true);
  view.setUint32(36, header.symbolCount, true);
  view.setBigUint64(40, header.typeRegistryOffset, true);
  view.setUint32(48, header.typeRegistryCount, true);
  view.setBigUint64(52, header.checksum, true);
  // Bytes 60-63 are reserved/padding (already zero)
}

/**
 * Validate a binary header
 */
export function validateHeader(header: BinaryHeader): void {
  if (header.magic !== BINARY_FORMAT_MAGIC) {
    const expected = BINARY_FORMAT_MAGIC.toString(16);
    const actual = header.magic.toString(16);
    throw new Error(
      `Invalid binary format: wrong magic number (expected 0x${expected}, got 0x${actual})`,
    );
  }
  if (header.version !== BINARY_FORMAT_VERSION) {
    throw new Error(
      `Unsupported binary format version: ${header.version} (expected ${BINARY_FORMAT_VERSION})`,
    );
  }
}
