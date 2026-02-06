/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Deserializes apex-stdlib.bin to hydrated SymbolTables and type registry.
 * Designed for minimal runtime overhead - no per-symbol reconstruction.
 */

import { StringTableReader } from './string-table';
import {
  HEADER_SIZE,
  SYMBOL_RECORD_SIZE,
  TYPE_ENTRY_RECORD_SIZE,
  readHeader,
  validateHeader,
  ByteToSymbolKind,
  ByteToVisibility,
  ByteToScopeType,
  ModifierFlagBits,
  type BinaryHeader,
} from './binary-format';
import {
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
  SymbolModifiers,
  SymbolLocation,
  SymbolKey,
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  ScopeSymbol,
  ScopeType,
} from '../types/symbol';
import { TypeRegistryEntry } from '../services/GlobalTypeRegistryService';
import { TypeInfo } from '../types/typeInfo';

/**
 * Result of binary deserialization
 */
export interface BinaryDeserializationResult {
  /** Map of file URI to SymbolTable */
  symbolTables: Map<string, SymbolTable>;
  /** Type registry entries */
  typeRegistryEntries: TypeRegistryEntry[];
  /** Pre-built FQN to entry index mapping */
  preBuiltFqnIndex: Map<string, number>;
  /** Pre-built name to FQN list mapping */
  preBuiltNameIndex: Map<string, string[]>;
  /** Pre-built file URI to FQN set mapping */
  preBuiltFileIndex: Map<string, Set<string>>;
  /** Load time in milliseconds */
  loadTimeMs: number;
  /** Metadata about the loaded data */
  metadata: {
    symbolCount: number;
    typeRegistryCount: number;
    fileCount: number;
    stringTableSize: number;
  };
}

/**
 * Internal structure for file table entries
 */
interface FileTableEntry {
  fileUri: string;
  startIndex: number;
  endIndex: number;
  rootIndex: number;
}

/**
 * Deserializer for binary cache format
 */
export class BinaryDeserializer {
  private buffer: Uint8Array;
  private view: DataView;
  private header: BinaryHeader;
  private stringTable!: StringTableReader;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    this.header = readHeader(this.view);
    validateHeader(this.header);

    // Initialize string table
    const stringTableStart = Number(this.header.stringTableOffset);
    const stringTableEnd =
      stringTableStart + Number(this.header.stringTableSize);
    const stringTableBuffer = buffer.subarray(stringTableStart, stringTableEnd);
    this.stringTable = new StringTableReader(stringTableBuffer);
  }

  /**
   * Deserialize the binary cache to runtime structures
   */
  deserialize(): BinaryDeserializationResult {
    const startTime = performance.now();

    // Verify checksum
    this.verifyChecksum();

    // Read file table
    const symbolSectionOffset = Number(this.header.symbolTableOffset);
    const fileTable = this.readFileTable(symbolSectionOffset);

    // Deserialize symbol tables
    const symbolTables = this.deserializeSymbolTables(
      fileTable,
      symbolSectionOffset,
    );

    // Deserialize type registry with pre-built indexes
    const {
      entries: typeRegistryEntries,
      fqnIndex: preBuiltFqnIndex,
      nameIndex: preBuiltNameIndex,
      fileIndex: preBuiltFileIndex,
    } = this.deserializeTypeRegistry();

    const loadTimeMs = performance.now() - startTime;

    return {
      symbolTables,
      typeRegistryEntries,
      preBuiltFqnIndex,
      preBuiltNameIndex,
      preBuiltFileIndex,
      loadTimeMs,
      metadata: {
        symbolCount: this.header.symbolCount,
        typeRegistryCount: this.header.typeRegistryCount,
        fileCount: fileTable.length,
        stringTableSize: Number(this.header.stringTableSize),
      },
    };
  }

  /**
   * Verify the checksum of the binary content
   */
  private verifyChecksum(): void {
    const contentStart = HEADER_SIZE;
    const content = this.buffer.subarray(contentStart);
    const calculated = this.calculateChecksum(content);
    const stored = this.header.checksum;

    if (calculated !== stored) {
      throw new Error(
        `Binary cache checksum mismatch: expected ${stored.toString(16)}, got ${calculated.toString(16)}`,
      );
    }
  }

  /**
   * Calculate checksum of buffer content (must match serializer)
   */
  private calculateChecksum(data: Uint8Array): bigint {
    let hash = 0n;
    const prime = 0x100000001b3n;
    const offset = 0xcbf29ce484222325n;

    hash = offset;
    for (let i = 0; i < data.length; i++) {
      hash ^= BigInt(data[i]);
      hash = BigInt.asUintN(64, hash * prime);
    }

    return hash;
  }

  /**
   * Read the file table from the symbol section
   */
  private readFileTable(sectionOffset: number): FileTableEntry[] {
    const fileCount = this.view.getUint32(sectionOffset, true);
    const fileTable: FileTableEntry[] = [];

    let offset = sectionOffset + 4;
    for (let i = 0; i < fileCount; i++) {
      const fileUriIndex = this.view.getUint32(offset, true);
      offset += 4;
      const startIndex = this.view.getUint32(offset, true);
      offset += 4;
      const endIndex = this.view.getUint32(offset, true);
      offset += 4;
      const rootIndex = this.view.getInt32(offset, true);
      offset += 4;

      fileTable.push({
        fileUri: this.stringTable.get(fileUriIndex),
        startIndex,
        endIndex,
        rootIndex,
      });
    }

    return fileTable;
  }

  /**
   * Deserialize symbol tables from file table entries
   */
  private deserializeSymbolTables(
    fileTable: FileTableEntry[],
    sectionOffset: number,
  ): Map<string, SymbolTable> {
    const symbolTables = new Map<string, SymbolTable>();
    const fileTableSize = 4 + fileTable.length * 16;
    const symbolRecordsOffset = sectionOffset + fileTableSize;

    for (const entry of fileTable) {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri(entry.fileUri);

      // Read all symbols for this file
      const symbols: ApexSymbol[] = [];
      for (let i = entry.startIndex; i < entry.endIndex; i++) {
        const symbol = this.readSymbolRecord(
          symbolRecordsOffset,
          i,
          sectionOffset,
        );
        symbols.push(symbol);
      }

      // Build symbol map for hydration
      const symbolMap = new Map<string, ApexSymbol | ApexSymbol[]>();
      for (const symbol of symbols) {
        const existing = symbolMap.get(symbol.id);
        if (existing) {
          if (Array.isArray(existing)) {
            existing.push(symbol);
          } else {
            symbolMap.set(symbol.id, [existing, symbol]);
          }
        } else {
          symbolMap.set(symbol.id, symbol);
        }
      }

      // Find root symbol
      const root =
        entry.rootIndex >= 0
          ? symbols[entry.rootIndex - entry.startIndex]
          : null;

      // Hydrate symbol table directly (bypass addSymbol)
      this.hydrateSymbolTable(symbolTable, symbols, symbolMap, root);

      symbolTables.set(entry.fileUri, symbolTable);
    }

    return symbolTables;
  }

  /**
   * Hydrate a symbol table with pre-built data
   */
  private hydrateSymbolTable(
    symbolTable: SymbolTable,
    symbols: ApexSymbol[],
    symbolMap: Map<string, ApexSymbol | ApexSymbol[]>,
    root: ApexSymbol | null,
  ): void {
    // Access private fields via any cast for direct hydration
    // This bypasses the expensive addSymbol() path
    const table = symbolTable as any;

    // Direct assignment of pre-built structures
    table.symbolArray = symbols;
    table.symbolMap = new Map(symbolMap);
    table.root = root;
  }

  /**
   * Read a single symbol record from the buffer
   */
  private readSymbolRecord(
    recordsBaseOffset: number,
    index: number,
    sectionOffset: number,
  ): ApexSymbol {
    const recordOffset = recordsBaseOffset + index * SYMBOL_RECORD_SIZE;
    let offset = recordOffset;

    // Read fixed fields
    const idIndex = this.view.getUint32(offset, true);
    offset += 4;
    const nameIndex = this.view.getUint32(offset, true);
    offset += 4;
    const kindByte = this.view.getUint8(offset);
    offset += 1;
    const visibilityByte = this.view.getUint8(offset);
    offset += 1;
    const modifierFlags = this.view.getUint16(offset, true);
    offset += 2;
    const fileUriIndex = this.view.getUint32(offset, true);
    offset += 4;
    const parentIdIndex = this.view.getUint32(offset, true);
    offset += 4;
    const fqnIndex = this.view.getUint32(offset, true);
    offset += 4;
    const namespaceIndex = this.view.getUint32(offset, true);
    offset += 4;

    // Read location (28 bytes)
    const symbolStartLine = this.view.getUint32(offset, true);
    offset += 4;
    const symbolStartCol = this.view.getUint16(offset, true);
    offset += 2;
    const symbolEndLine = this.view.getUint32(offset, true);
    offset += 4;
    const symbolEndCol = this.view.getUint16(offset, true);
    offset += 2;
    const identStartLine = this.view.getUint32(offset, true);
    offset += 4;
    const identStartCol = this.view.getUint16(offset, true);
    offset += 2;
    const identEndLine = this.view.getUint32(offset, true);
    offset += 4;
    const identEndCol = this.view.getUint16(offset, true);
    offset += 2;

    // Extended data offset
    const extendedDataOffset = this.view.getUint32(offset, true);
    offset += 4;

    // Scope type byte
    const scopeTypeByte = this.view.getUint8(offset);
    offset += 1;

    // Convert to runtime types
    const id = this.stringTable.get(idIndex);
    const name = this.stringTable.get(nameIndex);
    const kind = (ByteToSymbolKind[kindByte] as SymbolKind) || SymbolKind.Class;
    const fileUri = this.stringTable.get(fileUriIndex);
    const parentId =
      parentIdIndex > 0 ? this.stringTable.get(parentIdIndex) : null;
    const fqn = fqnIndex > 0 ? this.stringTable.get(fqnIndex) : undefined;
    const namespace =
      namespaceIndex > 0 ? this.stringTable.get(namespaceIndex) : null;

    const location: SymbolLocation = {
      symbolRange: {
        startLine: symbolStartLine,
        startColumn: symbolStartCol,
        endLine: symbolEndLine,
        endColumn: symbolEndCol,
      },
      identifierRange: {
        startLine: identStartLine,
        startColumn: identStartCol,
        endLine: identEndLine,
        endColumn: identEndCol,
      },
    };

    const modifiers = this.decodeModifierFlags(visibilityByte, modifierFlags);

    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [fileUri, name],
      unifiedId: id,
      fileUri,
      kind: kind as SymbolKind,
    };

    // Create base symbol
    const baseSymbol: ApexSymbol = {
      id,
      name,
      kind: kind as SymbolKind,
      location,
      fileUri,
      parentId,
      key,
      fqn,
      namespace,
      modifiers,
      _isLoaded: true,
    };

    // Handle specific symbol types
    if (kind === SymbolKind.Block) {
      const scopeType =
        (ByteToScopeType[scopeTypeByte] as ScopeType) || 'block';
      return this.createScopeSymbol(baseSymbol, scopeType);
    }

    if (
      (kind === SymbolKind.Method || kind === SymbolKind.Constructor) &&
      extendedDataOffset > 0
    ) {
      // extendedDataOffset is relative to the start of the symbol section buffer,
      // so add sectionOffset to convert to an absolute position in the global buffer
      return this.readMethodExtendedData(
        baseSymbol,
        sectionOffset + extendedDataOffset,
        sectionOffset,
      );
    }

    if (this.isVariableKind(kind) && extendedDataOffset > 0) {
      // extendedDataOffset is relative to the start of the symbol section buffer,
      // so add sectionOffset to convert to an absolute position in the global buffer
      return this.readVariableExtendedData(
        baseSymbol,
        sectionOffset + extendedDataOffset,
      );
    }

    // For type symbols, return as TypeSymbol
    if (this.isTypeKind(kind)) {
      const typeSymbol = baseSymbol as TypeSymbol;
      typeSymbol.interfaces = [];
      return typeSymbol;
    }

    return baseSymbol;
  }

  /**
   * Create a ScopeSymbol from base symbol data
   */
  private createScopeSymbol(
    base: ApexSymbol,
    scopeType: ScopeType,
  ): ScopeSymbol {
    return new ScopeSymbol(
      base.id,
      base.name,
      base.location,
      base.fileUri,
      base.parentId,
      base.key,
      base.modifiers,
      scopeType,
    );
  }

  /**
   * Read method extended data and create MethodSymbol
   */
  private readMethodExtendedData(
    base: ApexSymbol,
    extOffset: number,
    sectionOffset: number,
  ): MethodSymbol {
    const returnTypeIndex = this.view.getUint32(extOffset, true);
    const isConstructor = this.view.getUint8(extOffset + 4) !== 0;
    const hasBody = this.view.getUint8(extOffset + 5) !== 0;
    const paramCount = this.view.getUint16(extOffset + 6, true);
    const paramsOffsetRaw = this.view.getUint32(extOffset + 8, true);

    const returnTypeStr = this.stringTable.get(returnTypeIndex);
    const returnType = this.createTypeInfoFromString(returnTypeStr);

    const parameters: VariableSymbol[] = [];
    if (paramCount > 0 && paramsOffsetRaw > 0) {
      // paramsOffset is also section-relative, convert to absolute
      let pOffset = sectionOffset + paramsOffsetRaw;
      for (let i = 0; i < paramCount; i++) {
        const typeIndex = this.view.getUint32(pOffset, true);
        pOffset += 4;
        const paramNameIndex = this.view.getUint32(pOffset, true);
        pOffset += 4;

        const paramType = this.createTypeInfoFromString(
          this.stringTable.get(typeIndex),
        );
        const paramName = this.stringTable.get(paramNameIndex);

        const param: VariableSymbol = {
          id: `${base.id}:param:${paramName}`,
          name: paramName,
          kind: SymbolKind.Parameter,
          location: base.location,
          fileUri: base.fileUri,
          parentId: base.id,
          key: {
            prefix: SymbolKind.Parameter,
            name: paramName,
            path: [base.fileUri, paramName],
            unifiedId: `${base.id}:param:${paramName}`,
            fileUri: base.fileUri,
            kind: SymbolKind.Parameter,
          },
          modifiers: this.createDefaultModifiers(),
          type: paramType,
          _isLoaded: true,
        };
        parameters.push(param);
      }
    }

    const method: MethodSymbol = {
      ...base,
      kind: isConstructor ? SymbolKind.Constructor : SymbolKind.Method,
      returnType,
      parameters,
      isConstructor,
      hasBody,
    };

    return method;
  }

  /**
   * Read variable extended data and create VariableSymbol
   */
  private readVariableExtendedData(
    base: ApexSymbol,
    extOffset: number,
  ): VariableSymbol {
    const typeIndex = this.view.getUint32(extOffset, true);
    const initialValueIndex = this.view.getUint32(extOffset + 4, true);

    const typeStr = this.stringTable.get(typeIndex);
    const type = this.createTypeInfoFromString(typeStr);
    const initialValue =
      initialValueIndex > 0
        ? this.stringTable.get(initialValueIndex)
        : undefined;

    // Assert the kind is a valid VariableSymbol kind
    const variableKind = base.kind as
      | SymbolKind.Field
      | SymbolKind.Property
      | SymbolKind.Variable
      | SymbolKind.Parameter
      | SymbolKind.EnumValue;

    const variable: VariableSymbol = {
      ...base,
      kind: variableKind,
      type,
      initialValue,
    };

    return variable;
  }

  /**
   * Create TypeInfo from a type string
   */
  private createTypeInfoFromString(typeStr: string): TypeInfo {
    const isVoid = typeStr === 'void' || typeStr === '';
    const isArray = typeStr.endsWith('[]');
    const isCollection = /^(List|Set|Map)</.test(typeStr);
    const isPrimitive = [
      'void',
      'boolean',
      'integer',
      'long',
      'double',
      'decimal',
      'string',
      'id',
      'blob',
      'date',
      'datetime',
      'time',
    ].includes(typeStr.toLowerCase().replace('[]', ''));

    return {
      name: typeStr || 'void',
      originalTypeString: typeStr || 'void',
      isArray,
      isCollection,
      isPrimitive: isVoid || isPrimitive,
      isBuiltIn: isVoid || isPrimitive || isCollection,
      getNamespace: () => null,
    };
  }

  /**
   * Decode modifier flags from visibility byte and flags word
   */
  private decodeModifierFlags(
    visibilityByte: number,
    flags: number,
  ): SymbolModifiers {
    const visibility =
      (ByteToVisibility[visibilityByte] as SymbolVisibility) ||
      SymbolVisibility.Default;

    return {
      visibility,
      isStatic: (flags & ModifierFlagBits.STATIC) !== 0,
      isFinal: (flags & ModifierFlagBits.FINAL) !== 0,
      isAbstract: (flags & ModifierFlagBits.ABSTRACT) !== 0,
      isVirtual: (flags & ModifierFlagBits.VIRTUAL) !== 0,
      isOverride: (flags & ModifierFlagBits.OVERRIDE) !== 0,
      isTransient: (flags & ModifierFlagBits.TRANSIENT) !== 0,
      isTestMethod: (flags & ModifierFlagBits.TEST_METHOD) !== 0,
      isWebService: (flags & ModifierFlagBits.WEB_SERVICE) !== 0,
      isBuiltIn: (flags & ModifierFlagBits.BUILT_IN) !== 0,
    };
  }

  /**
   * Create default modifiers
   */
  private createDefaultModifiers(): SymbolModifiers {
    return {
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
    };
  }

  /**
   * Deserialize type registry with pre-built indexes
   */
  private deserializeTypeRegistry(): {
    entries: TypeRegistryEntry[];
    fqnIndex: Map<string, number>;
    nameIndex: Map<string, string[]>;
    fileIndex: Map<string, Set<string>>;
  } {
    const entries: TypeRegistryEntry[] = [];
    const fqnIndex = new Map<string, number>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, Set<string>>();

    const registryOffset = Number(this.header.typeRegistryOffset);
    let offset = registryOffset;

    // Read entry count
    const entryCount = this.view.getUint32(offset, true);
    offset += 4;

    // Read entry records
    for (let i = 0; i < entryCount; i++) {
      const entry = this.readTypeEntryRecord(offset);
      entries.push(entry);
      offset += TYPE_ENTRY_RECORD_SIZE;
    }

    // Read FQN index
    offset += 4; // Skip marker
    offset = this.readFqnIndex(offset, entries, fqnIndex);

    // Read name index
    offset += 4; // Skip marker
    offset = this.readNameIndex(offset, nameIndex);

    // Read file index
    offset += 4; // Skip marker
    this.readFileIndex(offset, fileIndex);

    return { entries, fqnIndex, nameIndex, fileIndex };
  }

  /**
   * Read a type registry entry record
   */
  private readTypeEntryRecord(offset: number): TypeRegistryEntry {
    const fqnIndex = this.view.getUint32(offset, true);
    offset += 4;
    const nameIndex = this.view.getUint32(offset, true);
    offset += 4;
    const namespaceIndex = this.view.getUint32(offset, true);
    offset += 4;
    const kindByte = this.view.getUint8(offset);
    offset += 1;
    const isStdlib = this.view.getUint8(offset) !== 0;
    offset += 1;
    const symbolIdIndex = this.view.getUint32(offset, true);
    offset += 4;
    const fileUriIndex = this.view.getUint32(offset, true);

    const kind = ByteToSymbolKind[kindByte] as
      | SymbolKind.Class
      | SymbolKind.Interface
      | SymbolKind.Enum;

    return {
      fqn: this.stringTable.get(fqnIndex),
      name: this.stringTable.get(nameIndex),
      namespace: this.stringTable.get(namespaceIndex),
      kind: kind || SymbolKind.Class,
      isStdlib,
      symbolId: this.stringTable.get(symbolIdIndex),
      fileUri: this.stringTable.get(fileUriIndex),
    };
  }

  /**
   * Read pre-built FQN index
   */
  private readFqnIndex(
    offset: number,
    entries: TypeRegistryEntry[],
    fqnIndex: Map<string, number>,
  ): number {
    const count = this.view.getUint32(offset, true);
    offset += 4;

    for (let i = 0; i < count; i++) {
      const fqnStringIndex = this.view.getUint32(offset, true);
      offset += 4;
      const entryIndex = this.view.getUint32(offset, true);
      offset += 4;

      const fqn = this.stringTable.get(fqnStringIndex);
      fqnIndex.set(fqn.toLowerCase(), entryIndex);
    }

    return offset;
  }

  /**
   * Read pre-built name index
   */
  private readNameIndex(
    offset: number,
    nameIndex: Map<string, string[]>,
  ): number {
    const count = this.view.getUint32(offset, true);
    offset += 4;

    for (let i = 0; i < count; i++) {
      const nameStringIndex = this.view.getUint32(offset, true);
      offset += 4;
      const fqnCount = this.view.getUint32(offset, true);
      offset += 4;

      const name = this.stringTable.get(nameStringIndex);
      const fqns: string[] = [];

      for (let j = 0; j < fqnCount; j++) {
        const fqnStringIndex = this.view.getUint32(offset, true);
        offset += 4;
        fqns.push(this.stringTable.get(fqnStringIndex));
      }

      nameIndex.set(name.toLowerCase(), fqns);
    }

    return offset;
  }

  /**
   * Read pre-built file index
   */
  private readFileIndex(
    offset: number,
    fileIndex: Map<string, Set<string>>,
  ): number {
    const count = this.view.getUint32(offset, true);
    offset += 4;

    for (let i = 0; i < count; i++) {
      const fileUriIndex = this.view.getUint32(offset, true);
      offset += 4;
      const fqnCount = this.view.getUint32(offset, true);
      offset += 4;

      const fileUri = this.stringTable.get(fileUriIndex);
      const fqns = new Set<string>();

      for (let j = 0; j < fqnCount; j++) {
        const fqnStringIndex = this.view.getUint32(offset, true);
        offset += 4;
        fqns.add(this.stringTable.get(fqnStringIndex));
      }

      fileIndex.set(fileUri, fqns);
    }

    return offset;
  }

  // Type guards
  private isTypeKind(kind: SymbolKind | string): boolean {
    return (
      kind === SymbolKind.Class ||
      kind === SymbolKind.Interface ||
      kind === SymbolKind.Enum ||
      kind === SymbolKind.Trigger ||
      kind === 'class' ||
      kind === 'interface' ||
      kind === 'enum' ||
      kind === 'trigger'
    );
  }

  private isVariableKind(kind: SymbolKind | string): boolean {
    return (
      kind === SymbolKind.Field ||
      kind === SymbolKind.Property ||
      kind === SymbolKind.Variable ||
      kind === SymbolKind.Parameter ||
      kind === SymbolKind.EnumValue ||
      kind === 'field' ||
      kind === 'property' ||
      kind === 'variable' ||
      kind === 'parameter' ||
      kind === 'enumValue'
    );
  }
}
