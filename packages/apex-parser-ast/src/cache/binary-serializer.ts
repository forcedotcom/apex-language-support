/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Serializes SymbolTable and TypeRegistryEntry to binary format.
 * Used at build time to create apex-stdlib.bin for fast runtime loading.
 */

import { StringTableBuilder } from './string-table';
import {
  BINARY_FORMAT_MAGIC,
  BINARY_FORMAT_VERSION,
  HEADER_SIZE,
  SYMBOL_RECORD_SIZE,
  TYPE_ENTRY_RECORD_SIZE,
  FLAG_HAS_TYPE_REGISTRY,
  writeHeader,
  SymbolKindToByte,
  VisibilityToByte,
  ModifierFlagBits,
  ScopeTypeToByte,
} from './binary-format';
import type {
  SymbolTable,
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  ScopeSymbol,
  SymbolModifiers,
} from '../types/symbol';
import type { TypeRegistryEntry } from '../services/GlobalTypeRegistryService';
import type { TypeInfo } from '../types/typeInfo';

/**
 * Input data for serialization
 */
export interface SerializationInput {
  /** Map of file URI to symbol table */
  symbolTables: Map<string, SymbolTable>;
  /** Type registry entries */
  typeRegistryEntries: TypeRegistryEntry[];
  /** SHA256 checksum of source files */
  sourceChecksum: string;
}

/**
 * Result of serialization
 */
export interface SerializationResult {
  /** Serialized binary data */
  buffer: Uint8Array;
  /** Statistics about the serialization */
  stats: {
    totalSize: number;
    stringTableSize: number;
    symbolCount: number;
    typeEntryCount: number;
    fileCount: number;
  };
}

/**
 * Internal structure for tracking symbol serialization
 */
interface SymbolEntry {
  symbol: ApexSymbol;
  fileUri: string;
  recordIndex: number;
}

/**
 * Internal structure for file table entries
 */
interface FileEntry {
  fileUri: string;
  fileUriIndex: number;
  startIndex: number;
  endIndex: number;
  rootIndex: number;
}

/**
 * Serializer for creating binary cache format
 */
export class BinarySerializer {
  private stringTable: StringTableBuilder;
  private symbolEntries: SymbolEntry[] = [];
  private fileEntries: FileEntry[] = [];

  constructor() {
    this.stringTable = new StringTableBuilder();
  }

  /**
   * Serialize symbol tables and type registry to binary format
   */
  serialize(input: SerializationInput): SerializationResult {
    // Reset state for fresh serialization
    this.stringTable = new StringTableBuilder();
    this.symbolEntries = [];
    this.fileEntries = [];

    // Phase 1: Intern all strings and collect symbols
    this.collectSymbols(input.symbolTables);
    this.internTypeRegistryStrings(input.typeRegistryEntries);
    this.stringTable.intern(input.sourceChecksum);

    // Phase 2: Serialize sections
    const stringTableBytes = this.stringTable.serialize();
    const symbolSectionBytes = this.serializeSymbolSection();
    const typeRegistrySectionBytes = this.serializeTypeRegistrySection(
      input.typeRegistryEntries,
    );

    // Phase 3: Calculate offsets
    const stringTableOffset = BigInt(HEADER_SIZE);
    const symbolSectionOffset =
      stringTableOffset + BigInt(stringTableBytes.length);
    const typeRegistryOffset =
      symbolSectionOffset + BigInt(symbolSectionBytes.length);
    const totalSize =
      HEADER_SIZE +
      stringTableBytes.length +
      symbolSectionBytes.length +
      typeRegistrySectionBytes.length;

    // Phase 4: Create final buffer
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // Write header
    writeHeader(view, {
      magic: BINARY_FORMAT_MAGIC,
      version: BINARY_FORMAT_VERSION,
      flags: FLAG_HAS_TYPE_REGISTRY,
      stringTableOffset,
      stringTableSize: BigInt(stringTableBytes.length),
      symbolTableOffset: symbolSectionOffset,
      symbolCount: this.symbolEntries.length,
      typeRegistryOffset,
      typeRegistryCount: input.typeRegistryEntries.length,
      checksum: BigInt(0), // Will be calculated below
    });

    // Write sections
    buffer.set(stringTableBytes, HEADER_SIZE);
    buffer.set(symbolSectionBytes, Number(symbolSectionOffset));
    buffer.set(typeRegistrySectionBytes, Number(typeRegistryOffset));

    // Calculate and write checksum (xxHash64-like simple hash for now)
    const checksum = this.calculateChecksum(
      buffer.subarray(HEADER_SIZE, totalSize),
    );
    view.setBigUint64(52, checksum, true);

    return {
      buffer,
      stats: {
        totalSize,
        stringTableSize: stringTableBytes.length,
        symbolCount: this.symbolEntries.length,
        typeEntryCount: input.typeRegistryEntries.length,
        fileCount: this.fileEntries.length,
      },
    };
  }

  /**
   * Collect all symbols from symbol tables and intern their strings
   */
  private collectSymbols(symbolTables: Map<string, SymbolTable>): void {
    let recordIndex = 0;

    for (const [fileUri, symbolTable] of symbolTables) {
      const fileUriIndex = this.stringTable.intern(fileUri);
      const startIndex = recordIndex;
      let rootIndex = -1;

      const symbols = symbolTable.getAllSymbols();

      for (const symbol of symbols) {
        // Intern all symbol strings
        this.internSymbolStrings(symbol);

        // Track root symbol (top-level with null parentId)
        if (symbol.parentId === null && rootIndex === -1) {
          rootIndex = recordIndex;
        }

        this.symbolEntries.push({
          symbol,
          fileUri,
          recordIndex,
        });
        recordIndex++;
      }

      this.fileEntries.push({
        fileUri,
        fileUriIndex,
        startIndex,
        endIndex: recordIndex,
        rootIndex,
      });
    }
  }

  /**
   * Intern all strings from a symbol
   */
  private internSymbolStrings(symbol: ApexSymbol): void {
    this.stringTable.intern(symbol.id);
    this.stringTable.intern(symbol.name);
    this.stringTable.intern(symbol.fileUri);
    if (symbol.parentId) this.stringTable.intern(symbol.parentId);
    if (symbol.fqn) this.stringTable.intern(symbol.fqn);
    if (symbol.namespace) {
      const ns =
        typeof symbol.namespace === 'object'
          ? symbol.namespace.toString()
          : symbol.namespace;
      this.stringTable.intern(ns);
    }

    // Intern method-specific strings
    if (this.isMethodSymbol(symbol)) {
      const method = symbol as MethodSymbol;
      if (method.returnType) {
        this.internTypeInfo(method.returnType);
      }
      if (method.parameters) {
        for (const param of method.parameters) {
          this.internSymbolStrings(param);
        }
      }
    }

    // Intern variable-specific strings
    if (this.isVariableSymbol(symbol)) {
      const variable = symbol as VariableSymbol;
      if (variable.type) {
        this.internTypeInfo(variable.type);
      }
      if (variable.initialValue) {
        this.stringTable.intern(variable.initialValue);
      }
    }

    // Intern type-specific strings
    if (this.isTypeSymbol(symbol)) {
      const type = symbol as TypeSymbol;
      if (type.superClass) {
        this.stringTable.intern(type.superClass);
      }
      if (type.interfaces) {
        for (const iface of type.interfaces) {
          this.stringTable.intern(iface);
        }
      }
    }
  }

  /**
   * Intern type info strings
   */
  private internTypeInfo(typeInfo: TypeInfo): void {
    this.stringTable.intern(typeInfo.name);
    this.stringTable.intern(typeInfo.originalTypeString);
    if (typeInfo.namespace) {
      const ns =
        typeof typeInfo.namespace === 'object'
          ? typeInfo.namespace.toString()
          : String(typeInfo.namespace);
      this.stringTable.intern(ns);
    }
    if (typeInfo.typeParameters) {
      for (const tp of typeInfo.typeParameters) {
        this.internTypeInfo(tp);
      }
    }
    if (typeInfo.keyType) {
      this.internTypeInfo(typeInfo.keyType);
    }
  }

  /**
   * Intern type registry entry strings
   */
  private internTypeRegistryStrings(entries: TypeRegistryEntry[]): void {
    for (const entry of entries) {
      this.stringTable.intern(entry.fqn);
      this.stringTable.intern(entry.name);
      this.stringTable.intern(entry.namespace);
      this.stringTable.intern(entry.symbolId);
      this.stringTable.intern(entry.fileUri);
      // Also intern lowercase versions used in indexes
      this.stringTable.intern(entry.fqn.toLowerCase());
      this.stringTable.intern(entry.name.toLowerCase());
    }
  }

  /**
   * Serialize the symbol section
   * Layout: [file table][symbol records][extended data]
   */
  private serializeSymbolSection(): Uint8Array {
    // Calculate sizes
    const fileTableSize = 4 + this.fileEntries.length * 16; // count + entries (16 bytes each)
    const symbolRecordsSize = this.symbolEntries.length * SYMBOL_RECORD_SIZE;
    const extendedDataSize = this.calculateExtendedDataSize();

    const totalSize = fileTableSize + symbolRecordsSize + extendedDataSize;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    // Write file table
    let offset = 0;
    view.setUint32(offset, this.fileEntries.length, true);
    offset += 4;

    for (const entry of this.fileEntries) {
      view.setUint32(offset, entry.fileUriIndex, true);
      offset += 4;
      view.setUint32(offset, entry.startIndex, true);
      offset += 4;
      view.setUint32(offset, entry.endIndex, true);
      offset += 4;
      view.setInt32(offset, entry.rootIndex, true);
      offset += 4;
    }

    // Write symbol records
    const symbolRecordsOffset = offset;
    let extendedDataOffset = symbolRecordsOffset + symbolRecordsSize;

    for (const entry of this.symbolEntries) {
      const recordOffset =
        symbolRecordsOffset + entry.recordIndex * SYMBOL_RECORD_SIZE;
      const extOffset = this.writeSymbolRecord(
        view,
        buffer,
        recordOffset,
        entry.symbol,
        extendedDataOffset,
      );
      extendedDataOffset = extOffset;
    }

    return buffer;
  }

  /**
   * Write a single symbol record to the buffer
   * Returns the new extended data offset
   */
  private writeSymbolRecord(
    view: DataView,
    buffer: Uint8Array,
    recordOffset: number,
    symbol: ApexSymbol,
    extendedDataOffset: number,
  ): number {
    let offset = recordOffset;

    // ID index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(symbol.id), true);
    offset += 4;

    // Name index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(symbol.name), true);
    offset += 4;

    // Kind byte (1 byte)
    view.setUint8(offset, SymbolKindToByte[symbol.kind] ?? 0);
    offset += 1;

    // Visibility byte (1 byte)
    view.setUint8(offset, VisibilityToByte[symbol.modifiers.visibility] ?? 0);
    offset += 1;

    // Modifier flags (2 bytes)
    view.setUint16(offset, this.encodeModifierFlags(symbol.modifiers), true);
    offset += 2;

    // File URI index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(symbol.fileUri), true);
    offset += 4;

    // Parent ID index (4 bytes)
    view.setUint32(
      offset,
      symbol.parentId ? this.stringTable.intern(symbol.parentId) : 0,
      true,
    );
    offset += 4;

    // FQN index (4 bytes)
    view.setUint32(
      offset,
      symbol.fqn ? this.stringTable.intern(symbol.fqn) : 0,
      true,
    );
    offset += 4;

    // Namespace index (4 bytes)
    const nsString = symbol.namespace
      ? typeof symbol.namespace === 'object'
        ? symbol.namespace.toString()
        : symbol.namespace
      : '';
    view.setUint32(
      offset,
      nsString ? this.stringTable.intern(nsString) : 0,
      true,
    );
    offset += 4;

    // Symbol location (28 bytes)
    view.setUint32(offset, symbol.location.symbolRange.startLine, true);
    offset += 4;
    view.setUint16(offset, symbol.location.symbolRange.startColumn, true);
    offset += 2;
    view.setUint32(offset, symbol.location.symbolRange.endLine, true);
    offset += 4;
    view.setUint16(offset, symbol.location.symbolRange.endColumn, true);
    offset += 2;
    view.setUint32(offset, symbol.location.identifierRange.startLine, true);
    offset += 4;
    view.setUint16(offset, symbol.location.identifierRange.startColumn, true);
    offset += 2;
    view.setUint32(offset, symbol.location.identifierRange.endLine, true);
    offset += 4;
    view.setUint16(offset, symbol.location.identifierRange.endColumn, true);
    offset += 2;

    // Extended data offset (4 bytes)
    let extDataWritten = 0;
    if (this.isMethodSymbol(symbol) || this.isVariableSymbol(symbol)) {
      view.setUint32(offset, extendedDataOffset, true);
      extDataWritten = this.writeExtendedData(
        view,
        buffer,
        extendedDataOffset,
        symbol,
      );
    } else {
      view.setUint32(offset, 0, true);
    }
    offset += 4;

    // Scope type byte (1 byte) - for block symbols
    if (this.isBlockSymbol(symbol)) {
      const scopeSymbol = symbol as ScopeSymbol;
      view.setUint8(offset, ScopeTypeToByte[scopeSymbol.scopeType] ?? 0);
    } else {
      view.setUint8(offset, 0);
    }
    offset += 1;

    // Reserved (35 bytes) - already zero

    return extendedDataOffset + extDataWritten;
  }

  /**
   * Write extended data for methods and variables
   * Returns the number of bytes written
   */
  private writeExtendedData(
    view: DataView,
    buffer: Uint8Array,
    offset: number,
    symbol: ApexSymbol,
  ): number {
    if (this.isMethodSymbol(symbol)) {
      const method = symbol as MethodSymbol;
      let bytesWritten = 0;

      // Return type index (4 bytes)
      const returnTypeStr = method.returnType?.originalTypeString ?? 'void';
      view.setUint32(
        offset + bytesWritten,
        this.stringTable.intern(returnTypeStr),
        true,
      );
      bytesWritten += 4;

      // Is constructor (1 byte)
      view.setUint8(offset + bytesWritten, method.isConstructor ? 1 : 0);
      bytesWritten += 1;

      // Has body (1 byte)
      view.setUint8(offset + bytesWritten, method.hasBody !== false ? 1 : 0);
      bytesWritten += 1;

      // Parameter count (2 bytes)
      const paramCount = method.parameters?.length ?? 0;
      view.setUint16(offset + bytesWritten, paramCount, true);
      bytesWritten += 2;

      // Parameters offset (4 bytes) - parameters are stored inline
      const paramsOffset = offset + bytesWritten + 4;
      view.setUint32(
        offset + bytesWritten,
        paramCount > 0 ? paramsOffset : 0,
        true,
      );
      bytesWritten += 4;

      // Write parameters
      if (method.parameters) {
        for (const param of method.parameters) {
          // Type string index (4 bytes)
          const typeStr =
            (param as VariableSymbol).type?.originalTypeString ?? '';
          view.setUint32(
            offset + bytesWritten,
            this.stringTable.intern(typeStr),
            true,
          );
          bytesWritten += 4;

          // Name index (4 bytes)
          view.setUint32(
            offset + bytesWritten,
            this.stringTable.intern(param.name),
            true,
          );
          bytesWritten += 4;
        }
      }

      return bytesWritten;
    }

    if (this.isVariableSymbol(symbol)) {
      const variable = symbol as VariableSymbol;
      let bytesWritten = 0;

      // Type string index (4 bytes)
      const typeStr = variable.type?.originalTypeString ?? '';
      view.setUint32(
        offset + bytesWritten,
        this.stringTable.intern(typeStr),
        true,
      );
      bytesWritten += 4;

      // Initial value index (4 bytes)
      view.setUint32(
        offset + bytesWritten,
        variable.initialValue
          ? this.stringTable.intern(variable.initialValue)
          : 0,
        true,
      );
      bytesWritten += 4;

      return bytesWritten;
    }

    return 0;
  }

  /**
   * Calculate the total size of extended data
   */
  private calculateExtendedDataSize(): number {
    let size = 0;
    for (const entry of this.symbolEntries) {
      const symbol = entry.symbol;
      if (this.isMethodSymbol(symbol)) {
        const method = symbol as MethodSymbol;
        // 4 (return type) + 1 (isConstructor) + 1 (hasBody) + 2 (paramCount) + 4 (paramsOffset)
        size += 12;
        // Parameters: 8 bytes each (4 type + 4 name)
        size += (method.parameters?.length ?? 0) * 8;
      } else if (this.isVariableSymbol(symbol)) {
        // 4 (type) + 4 (initialValue)
        size += 8;
      }
    }
    return size;
  }

  /**
   * Serialize type registry section
   * Layout: [entry records][fqn index][name index][file index]
   */
  private serializeTypeRegistrySection(
    entries: TypeRegistryEntry[],
  ): Uint8Array {
    // Calculate sizes
    const entryRecordsSize = entries.length * TYPE_ENTRY_RECORD_SIZE;
    const fqnIndexSize = this.calculateFqnIndexSize(entries);
    const nameIndexSize = this.calculateNameIndexSize(entries);
    const fileIndexSize = this.calculateFileIndexSize(entries);

    const totalSize =
      4 + // entry count
      entryRecordsSize +
      4 + // fqn index offset marker
      fqnIndexSize +
      4 + // name index offset marker
      nameIndexSize +
      4 + // file index offset marker
      fileIndexSize;

    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);

    let offset = 0;

    // Write entry count
    view.setUint32(offset, entries.length, true);
    offset += 4;

    // Write entry records
    for (const entry of entries) {
      this.writeTypeEntryRecord(view, offset, entry);
      offset += TYPE_ENTRY_RECORD_SIZE;
    }

    // Write FQN index
    view.setUint32(offset, offset + 4, true); // Marker for index start
    offset += 4;
    offset = this.writeFqnIndex(view, offset, entries);

    // Write name index
    view.setUint32(offset, offset + 4, true);
    offset += 4;
    offset = this.writeNameIndex(view, offset, entries);

    // Write file index
    view.setUint32(offset, offset + 4, true);
    offset += 4;
    this.writeFileIndex(view, offset, entries);

    return buffer;
  }

  /**
   * Write a type registry entry record
   */
  private writeTypeEntryRecord(
    view: DataView,
    offset: number,
    entry: TypeRegistryEntry,
  ): void {
    // FQN index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(entry.fqn), true);
    offset += 4;

    // Name index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(entry.name), true);
    offset += 4;

    // Namespace index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(entry.namespace), true);
    offset += 4;

    // Kind byte (1 byte)
    view.setUint8(offset, SymbolKindToByte[entry.kind] ?? 0);
    offset += 1;

    // Is stdlib (1 byte)
    view.setUint8(offset, entry.isStdlib ? 1 : 0);
    offset += 1;

    // Symbol ID index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(entry.symbolId), true);
    offset += 4;

    // File URI index (4 bytes)
    view.setUint32(offset, this.stringTable.intern(entry.fileUri), true);
    // Remaining 42 bytes are reserved/padding (already zero)
  }

  /**
   * Calculate FQN index size
   */
  private calculateFqnIndexSize(entries: TypeRegistryEntry[]): number {
    // Sorted FQN list: count (4) + entries (fqnIndex: 4, entryIndex: 4)
    return 4 + entries.length * 8;
  }

  /**
   * Calculate name index size
   */
  private calculateNameIndexSize(entries: TypeRegistryEntry[]): number {
    // Build name → FQN list mapping
    const nameMap = new Map<string, string[]>();
    for (const entry of entries) {
      const key = entry.name.toLowerCase();
      const existing = nameMap.get(key) || [];
      existing.push(entry.fqn);
      nameMap.set(key, existing);
    }

    // Size: count (4) + entries (nameIndex: 4, fqnCount: 4, fqns: 4 each)
    let size = 4;
    for (const [_, fqns] of nameMap) {
      size += 4 + 4 + fqns.length * 4;
    }
    return size;
  }

  /**
   * Calculate file index size
   */
  private calculateFileIndexSize(entries: TypeRegistryEntry[]): number {
    // Build file → FQN list mapping
    const fileMap = new Map<string, string[]>();
    for (const entry of entries) {
      const existing = fileMap.get(entry.fileUri) || [];
      existing.push(entry.fqn);
      fileMap.set(entry.fileUri, existing);
    }

    // Size: count (4) + entries (fileIndex: 4, fqnCount: 4, fqns: 4 each)
    let size = 4;
    for (const [_, fqns] of fileMap) {
      size += 4 + 4 + fqns.length * 4;
    }
    return size;
  }

  /**
   * Write FQN index (sorted for binary search)
   */
  private writeFqnIndex(
    view: DataView,
    offset: number,
    entries: TypeRegistryEntry[],
  ): number {
    // Sort entries by FQN
    const sorted = [...entries].sort((a, b) =>
      a.fqn.toLowerCase().localeCompare(b.fqn.toLowerCase()),
    );

    // Create FQN to entry index mapping
    const entryIndexMap = new Map<string, number>();
    for (let i = 0; i < entries.length; i++) {
      entryIndexMap.set(entries[i].fqn.toLowerCase(), i);
    }

    // Write count
    view.setUint32(offset, sorted.length, true);
    offset += 4;

    // Write sorted entries
    for (const entry of sorted) {
      // FQN string index
      view.setUint32(offset, this.stringTable.intern(entry.fqn), true);
      offset += 4;
      // Entry index
      view.setUint32(offset, entryIndexMap.get(entry.fqn.toLowerCase())!, true);
      offset += 4;
    }

    return offset;
  }

  /**
   * Write name index (name → FQN list)
   */
  private writeNameIndex(
    view: DataView,
    offset: number,
    entries: TypeRegistryEntry[],
  ): number {
    // Build name map
    const nameMap = new Map<string, string[]>();
    for (const entry of entries) {
      const key = entry.name.toLowerCase();
      const existing = nameMap.get(key) || [];
      existing.push(entry.fqn);
      nameMap.set(key, existing);
    }

    // Write count
    view.setUint32(offset, nameMap.size, true);
    offset += 4;

    // Write entries
    for (const [name, fqns] of nameMap) {
      // Name string index
      view.setUint32(offset, this.stringTable.intern(name), true);
      offset += 4;
      // FQN count
      view.setUint32(offset, fqns.length, true);
      offset += 4;
      // FQN string indices
      for (const fqn of fqns) {
        view.setUint32(offset, this.stringTable.intern(fqn), true);
        offset += 4;
      }
    }

    return offset;
  }

  /**
   * Write file index (fileUri → FQN list)
   */
  private writeFileIndex(
    view: DataView,
    offset: number,
    entries: TypeRegistryEntry[],
  ): number {
    // Build file map
    const fileMap = new Map<string, string[]>();
    for (const entry of entries) {
      const existing = fileMap.get(entry.fileUri) || [];
      existing.push(entry.fqn);
      fileMap.set(entry.fileUri, existing);
    }

    // Write count
    view.setUint32(offset, fileMap.size, true);
    offset += 4;

    // Write entries
    for (const [fileUri, fqns] of fileMap) {
      // File URI string index
      view.setUint32(offset, this.stringTable.intern(fileUri), true);
      offset += 4;
      // FQN count
      view.setUint32(offset, fqns.length, true);
      offset += 4;
      // FQN string indices
      for (const fqn of fqns) {
        view.setUint32(offset, this.stringTable.intern(fqn), true);
        offset += 4;
      }
    }

    return offset;
  }

  /**
   * Encode modifier flags into a 16-bit value
   */
  private encodeModifierFlags(modifiers: SymbolModifiers): number {
    let flags = 0;
    if (modifiers.isStatic) flags |= ModifierFlagBits.STATIC;
    if (modifiers.isFinal) flags |= ModifierFlagBits.FINAL;
    if (modifiers.isAbstract) flags |= ModifierFlagBits.ABSTRACT;
    if (modifiers.isVirtual) flags |= ModifierFlagBits.VIRTUAL;
    if (modifiers.isOverride) flags |= ModifierFlagBits.OVERRIDE;
    if (modifiers.isTransient) flags |= ModifierFlagBits.TRANSIENT;
    if (modifiers.isTestMethod) flags |= ModifierFlagBits.TEST_METHOD;
    if (modifiers.isWebService) flags |= ModifierFlagBits.WEB_SERVICE;
    if (modifiers.isBuiltIn) flags |= ModifierFlagBits.BUILT_IN;
    return flags;
  }

  /**
   * Calculate checksum of buffer content
   */
  private calculateChecksum(data: Uint8Array): bigint {
    // Simple checksum - could be replaced with xxHash64 for better distribution
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

  // Type guards
  private isTypeSymbol(symbol: ApexSymbol): symbol is TypeSymbol {
    return (
      symbol.kind === 'class' ||
      symbol.kind === 'interface' ||
      symbol.kind === 'enum' ||
      symbol.kind === 'trigger'
    );
  }

  private isMethodSymbol(symbol: ApexSymbol): symbol is MethodSymbol {
    return symbol.kind === 'method' || symbol.kind === 'constructor';
  }

  private isVariableSymbol(symbol: ApexSymbol): symbol is VariableSymbol {
    return (
      symbol.kind === 'field' ||
      symbol.kind === 'property' ||
      symbol.kind === 'variable' ||
      symbol.kind === 'parameter' ||
      symbol.kind === 'enumValue'
    );
  }

  private isBlockSymbol(symbol: ApexSymbol): symbol is ScopeSymbol {
    return symbol.kind === 'block';
  }
}
