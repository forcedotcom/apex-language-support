/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Deserializer for converting Protocol Buffers data back to runtime SymbolTable structures.
 * This is used at runtime to load the pre-compiled standard library cache.
 */

import {
  StandardLibrary,
  TypeSymbol as ProtoTypeSymbol,
  MethodSymbol as ProtoMethodSymbol,
  VariableSymbol as ProtoVariableSymbol,
  ParameterSymbol as ProtoParameterSymbol,
  BlockSymbol as ProtoBlockSymbol,
  TypeReference as ProtoTypeReference,
  Modifiers as ProtoModifiers,
  Annotation as ProtoAnnotation,
  AnnotationParameter as ProtoAnnotationParameter,
  SymbolLocation as ProtoSymbolLocation,
  Range as ProtoRange,
  TypeKind,
  VariableKind,
  Visibility,
} from '../generated/apex-stdlib';

import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
  SymbolModifiers,
  SymbolLocation,
  Range,
  Annotation,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  ScopeSymbol,
  ScopeType,
} from '../types/symbol';

import { TypeInfo } from '../types/typeInfo';

/**
 * Result of deserialization
 */
export interface DeserializationResult {
  /** Map of file URI to SymbolTable */
  symbolTables: Map<string, SymbolTable>;
  /** Flat list of all type symbols for quick access */
  allTypes: TypeSymbol[];
  /** Metadata about the cache */
  metadata: {
    generatedAt: string;
    sourceChecksum: string;
    namespaceCount: number;
    typeCount: number;
  };
}

/**
 * Deserializes Protocol Buffers data to runtime SymbolTable structures
 */
export class StandardLibraryDeserializer {
  /**
   * Deserialize a protobuf binary buffer to runtime structures
   */
  deserializeFromBinary(buffer: Uint8Array): DeserializationResult {
    const proto = StandardLibrary.fromBinary(buffer);
    return this.deserialize(proto);
  }

  /**
   * Deserialize a StandardLibrary protobuf message to runtime structures
   */
  deserialize(proto: StandardLibrary): DeserializationResult {
    const symbolTables = new Map<string, SymbolTable>();
    const allTypes: TypeSymbol[] = [];
    let typeCount = 0;

    for (const namespace of proto.namespaces) {
      for (const protoType of namespace.types) {
        const symbolTable = this.createSymbolTableForType(
          protoType,
          namespace.name,
        );
        symbolTables.set(protoType.fileUri, symbolTable);

        // Also add to allTypes for quick access
        const typeSymbol = this.convertTypeSymbol(
          protoType,
          null,
          namespace.name,
        );
        allTypes.push(typeSymbol);
        typeCount++;
      }
    }

    return {
      symbolTables,
      allTypes,
      metadata: {
        generatedAt: proto.generatedAt,
        sourceChecksum: proto.sourceChecksum,
        namespaceCount: proto.namespaces.length,
        typeCount,
      },
    };
  }

  /**
   * Create a SymbolTable for a single type (class/interface/enum)
   */
  private createSymbolTableForType(
    protoType: ProtoTypeSymbol,
    namespace: string,
  ): SymbolTable {
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri(protoType.fileUri);

    // Add the main type symbol
    const typeSymbol = this.convertTypeSymbol(protoType, null, namespace);
    symbolTable.addSymbol(typeSymbol);

    // Add block symbols FIRST (before methods/fields that reference them)
    const blockIdMap = new Map<string, string>(); // Map old parentId format to actual block ID
    for (const protoBlock of protoType.blocks || []) {
      const blockSymbol = this.convertBlockSymbol(protoBlock, namespace);
      symbolTable.addSymbol(blockSymbol);

      // Create mapping for parentId normalization
      // If parentId format is ...:class:ClassName:block:blockName, map it to ...:block:blockName
      if (protoBlock.parentId && protoBlock.parentId.includes(':class:')) {
        const match = protoBlock.parentId.match(
          /^(.*):class:[^:]+:block:(.+)$/,
        );
        if (match) {
          const normalizedId = `${match[1]}:block:${match[2]}`;
          blockIdMap.set(protoBlock.parentId, normalizedId);
        }
      }
    }

    // Add methods
    for (const protoMethod of protoType.methods) {
      // Normalize parentId if it has the old format with :class: in it
      let normalizedParentId = protoMethod.parentId;
      if (
        normalizedParentId &&
        normalizedParentId.includes(':class:') &&
        normalizedParentId.includes(':block:')
      ) {
        const match = normalizedParentId.match(/^(.*):class:[^:]+:block:(.+)$/);
        if (match) {
          normalizedParentId = `${match[1]}:block:${match[2]}`;
          // Verify this block exists
          const blockExists = (protoType.blocks || []).some(
            (b) =>
              b.id === normalizedParentId ||
              b.id.endsWith(`:block:${match[2]}`),
          );
          if (!blockExists) {
            // Fallback to original if normalization doesn't match
            normalizedParentId = protoMethod.parentId;
          }
        }
      }

      const methodSymbol = this.convertMethodSymbol(
        protoMethod,
        typeSymbol.id,
        namespace,
        normalizedParentId,
      );
      symbolTable.addSymbol(methodSymbol);

      // Add parameters as symbols
      for (const protoParam of protoMethod.parameters) {
        const paramSymbol = this.convertParameterToVariableSymbol(
          protoParam,
          methodSymbol.id,
        );
        symbolTable.addSymbol(paramSymbol);
      }
    }

    // Add fields
    for (const protoField of protoType.fields) {
      const fieldSymbol = this.convertVariableSymbol(
        protoField,
        typeSymbol.id,
        namespace,
      );
      symbolTable.addSymbol(fieldSymbol);
    }

    // Add properties
    for (const protoProp of protoType.properties) {
      const propSymbol = this.convertVariableSymbol(
        protoProp,
        typeSymbol.id,
        namespace,
      );
      symbolTable.addSymbol(propSymbol);
    }

    // Add enum values
    for (const protoEnumVal of protoType.enumValues) {
      const enumValSymbol = this.convertVariableSymbol(
        protoEnumVal,
        typeSymbol.id,
        namespace,
      );
      symbolTable.addSymbol(enumValSymbol);
    }

    // Add inner types recursively
    for (const innerType of protoType.innerTypes) {
      this.addInnerTypeToSymbolTable(
        symbolTable,
        innerType,
        typeSymbol.id,
        namespace,
      );
    }

    return symbolTable;
  }

  /**
   * Recursively add inner types to a symbol table
   */
  private addInnerTypeToSymbolTable(
    symbolTable: SymbolTable,
    protoType: ProtoTypeSymbol,
    parentId: string,
    namespace?: string,
  ): void {
    const typeSymbol = this.convertTypeSymbol(protoType, parentId, namespace);
    symbolTable.addSymbol(typeSymbol);

    // Add block symbols FIRST (before methods/fields that reference them)
    for (const protoBlock of protoType.blocks || []) {
      const blockSymbol = this.convertBlockSymbol(protoBlock, namespace);
      symbolTable.addSymbol(blockSymbol);
    }

    // Add methods
    for (const protoMethod of protoType.methods) {
      // Normalize parentId if it has the old format with :class: in it
      let normalizedParentId = protoMethod.parentId;
      if (
        normalizedParentId &&
        normalizedParentId.includes(':class:') &&
        normalizedParentId.includes(':block:')
      ) {
        const match = normalizedParentId.match(/^(.*):class:[^:]+:block:(.+)$/);
        if (match) {
          normalizedParentId = `${match[1]}:block:${match[2]}`;
          // Verify this block exists
          const blockExists = (protoType.blocks || []).some(
            (b) =>
              b.id === normalizedParentId ||
              b.id.endsWith(`:block:${match[2]}`),
          );
          if (!blockExists) {
            // Fallback to original if normalization doesn't match
            normalizedParentId = protoMethod.parentId;
          }
        }
      }

      const methodSymbol = this.convertMethodSymbol(
        protoMethod,
        typeSymbol.id,
        namespace,
        normalizedParentId,
      );
      symbolTable.addSymbol(methodSymbol);
    }

    // Add fields
    for (const protoField of protoType.fields) {
      const fieldSymbol = this.convertVariableSymbol(
        protoField,
        typeSymbol.id,
        namespace,
      );
      symbolTable.addSymbol(fieldSymbol);
    }

    // Add properties
    for (const protoProp of protoType.properties) {
      const propSymbol = this.convertVariableSymbol(
        protoProp,
        typeSymbol.id,
        namespace,
      );
      symbolTable.addSymbol(propSymbol);
    }

    // Add enum values
    for (const protoEnumVal of protoType.enumValues) {
      const enumValSymbol = this.convertVariableSymbol(
        protoEnumVal,
        typeSymbol.id,
        namespace,
      );
      symbolTable.addSymbol(enumValSymbol);
    }

    // Recurse for nested inner types
    for (const innerType of protoType.innerTypes) {
      this.addInnerTypeToSymbolTable(
        symbolTable,
        innerType,
        typeSymbol.id,
        namespace,
      );
    }
  }

  /**
   * Convert a protobuf TypeSymbol to runtime TypeSymbol
   */
  private convertTypeSymbol(
    proto: ProtoTypeSymbol,
    parentId: string | null,
    namespace?: string,
  ): TypeSymbol {
    const kind = this.convertTypeKind(proto.kind);
    const modifiers = this.convertModifiers(proto.modifiers);
    const location = this.convertLocation(proto.location);

    const symbol = SymbolFactory.createFullSymbol(
      proto.name,
      kind,
      location,
      proto.fileUri,
      modifiers,
      parentId || proto.parentId || null,
      undefined,
      proto.fqn,
      namespace, // Pass namespace to symbol
      this.convertAnnotations(proto.annotations),
    ) as TypeSymbol;

    // Set TypeSymbol-specific properties
    symbol.superClass = proto.superClass || undefined;
    symbol.interfaces = proto.interfaces || [];

    return symbol;
  }

  /**
   * Convert a protobuf MethodSymbol to runtime MethodSymbol
   */
  private convertMethodSymbol(
    proto: ProtoMethodSymbol,
    parentId: string,
    namespace?: string,
    normalizedParentId?: string,
  ): MethodSymbol {
    const kind = proto.isConstructor
      ? SymbolKind.Constructor
      : SymbolKind.Method;
    const modifiers = this.convertModifiers(proto.modifiers);
    const location = this.convertLocation(proto.location);

    // Use normalized parentId if provided, otherwise fall back to proto.parentId or parentId
    const effectiveParentId = normalizedParentId || proto.parentId || parentId;

    // First create the base symbol
    const symbol = SymbolFactory.createFullSymbol(
      proto.name,
      kind,
      location,
      proto.fileUri || '', // fileUri from protobuf cache
      modifiers,
      effectiveParentId,
      undefined,
      proto.fqn || undefined, // fqn from protobuf cache
      namespace, // namespace from parent context
      this.convertAnnotations(proto.annotations),
    ) as MethodSymbol;

    // Set MethodSymbol-specific properties
    symbol.returnType = this.convertTypeReference(proto.returnType);
    symbol.parameters = proto.parameters.map((p) =>
      this.convertParameterToVariableSymbol(p, symbol.id),
    );
    symbol.isConstructor = proto.isConstructor;
    symbol.hasBody = proto.hasBody ?? true; // Default true for backward compatibility

    return symbol;
  }

  /**
   * Convert a protobuf VariableSymbol to runtime VariableSymbol
   */
  private convertVariableSymbol(
    proto: ProtoVariableSymbol,
    parentId: string,
    namespace?: string,
  ): VariableSymbol {
    const kind = this.convertVariableKind(proto.kind);
    const modifiers = this.convertModifiers(proto.modifiers);
    const location = this.convertLocation(proto.location);

    const symbol = SymbolFactory.createFullSymbol(
      proto.name,
      kind,
      location,
      proto.fileUri || '', // fileUri from protobuf cache
      modifiers,
      proto.parentId || parentId,
      undefined,
      proto.fqn || undefined, // fqn from protobuf cache
      namespace, // namespace from parent context
    ) as VariableSymbol;

    // Set VariableSymbol-specific properties
    symbol.type = this.convertTypeReference(proto.type);
    symbol.initialValue = proto.initialValue || undefined;
    symbol.initializerType = proto.initializerType
      ? this.convertTypeReference(proto.initializerType)
      : undefined;

    return symbol;
  }

  /**
   * Convert a protobuf ParameterSymbol to runtime VariableSymbol
   */
  private convertParameterToVariableSymbol(
    proto: ProtoParameterSymbol,
    parentId: string,
  ): VariableSymbol {
    const modifiers = this.convertModifiers(proto.modifiers);
    const location = this.convertLocation(proto.location);

    const symbol = SymbolFactory.createFullSymbol(
      proto.name,
      SymbolKind.Parameter,
      location,
      '', // fileUri will be inherited from parent
      modifiers,
      proto.parentId || parentId,
    ) as VariableSymbol;

    symbol.type = this.convertTypeReference(proto.type);

    return symbol;
  }

  /**
   * Convert a protobuf BlockSymbol to runtime ScopeSymbol
   */
  private convertBlockSymbol(
    proto: ProtoBlockSymbol,
    namespace?: string,
  ): ScopeSymbol {
    const location = this.convertLocation(proto.location);

    const blockSymbol = SymbolFactory.createBlockSymbol(
      proto.name,
      proto.scopeType as ScopeType,
      location,
      proto.fileUri,
      proto.parentId || null,
    );

    // Set namespace if provided
    if (namespace) {
      blockSymbol.namespace = namespace;
    }

    return blockSymbol;
  }

  /**
   * Convert protobuf TypeReference to runtime TypeInfo
   */
  private convertTypeReference(proto?: ProtoTypeReference): TypeInfo {
    if (!proto) {
      return this.createVoidType();
    }

    const typeParameters: TypeInfo[] = proto.typeParameters.map(
      (tp: ProtoTypeReference) => this.convertTypeReference(tp),
    );

    const typeInfo: TypeInfo = {
      name: proto.name,
      originalTypeString: proto.originalTypeString,
      isArray: proto.isArray,
      isCollection: proto.isCollection,
      isPrimitive: proto.isPrimitive,
      isBuiltIn: proto.isBuiltIn,
      typeParameters: typeParameters.length > 0 ? typeParameters : undefined,
      keyType: proto.keyType
        ? this.convertTypeReference(proto.keyType)
        : undefined,
      getNamespace: () => null,
    };

    return typeInfo;
  }

  /**
   * Create a void TypeInfo
   */
  private createVoidType(): TypeInfo {
    return {
      name: 'void',
      originalTypeString: 'void',
      isArray: false,
      isCollection: false,
      isPrimitive: true,
      isBuiltIn: true,
      getNamespace: () => null,
    };
  }

  /**
   * Convert protobuf Modifiers to runtime SymbolModifiers
   */
  private convertModifiers(proto?: ProtoModifiers): SymbolModifiers {
    if (!proto) {
      return this.createDefaultModifiers();
    }

    return {
      visibility: this.convertVisibility(proto.visibility),
      isStatic: proto.isStatic,
      isFinal: proto.isFinal,
      isAbstract: proto.isAbstract,
      isVirtual: proto.isVirtual,
      isOverride: proto.isOverride,
      isTransient: proto.isTransient,
      isTestMethod: proto.isTestMethod,
      isWebService: proto.isWebService,
      isBuiltIn: proto.isBuiltIn,
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
   * Convert protobuf Visibility to runtime SymbolVisibility
   */
  private convertVisibility(visibility: Visibility): SymbolVisibility {
    switch (visibility) {
      case Visibility.PUBLIC:
        return SymbolVisibility.Public;
      case Visibility.PRIVATE:
        return SymbolVisibility.Private;
      case Visibility.PROTECTED:
        return SymbolVisibility.Protected;
      case Visibility.GLOBAL:
        return SymbolVisibility.Global;
      case Visibility.DEFAULT:
      default:
        return SymbolVisibility.Default;
    }
  }

  /**
   * Convert protobuf TypeKind to runtime SymbolKind
   */
  private convertTypeKind(kind: TypeKind): SymbolKind {
    switch (kind) {
      case TypeKind.CLASS:
        return SymbolKind.Class;
      case TypeKind.INTERFACE:
        return SymbolKind.Interface;
      case TypeKind.ENUM:
        return SymbolKind.Enum;
      case TypeKind.TRIGGER:
        return SymbolKind.Trigger;
      default:
        return SymbolKind.Class;
    }
  }

  /**
   * Convert protobuf VariableKind to runtime SymbolKind
   */
  private convertVariableKind(kind: VariableKind): SymbolKind {
    switch (kind) {
      case VariableKind.FIELD:
        return SymbolKind.Field;
      case VariableKind.PROPERTY:
        return SymbolKind.Property;
      case VariableKind.PARAMETER:
        return SymbolKind.Parameter;
      case VariableKind.VARIABLE:
        return SymbolKind.Variable;
      case VariableKind.ENUM_VALUE:
        return SymbolKind.EnumValue;
      default:
        return SymbolKind.Variable;
    }
  }

  /**
   * Convert protobuf Annotations to runtime Annotations
   */
  private convertAnnotations(protos: ProtoAnnotation[]): Annotation[] {
    return protos.map((ann) => ({
      name: ann.name,
      location: this.convertLocation(ann.location),
      parameters: ann.parameters.map((p: ProtoAnnotationParameter) => ({
        name: p.name || undefined,
        value: p.value,
      })),
    }));
  }

  /**
   * Convert protobuf SymbolLocation to runtime SymbolLocation
   */
  private convertLocation(proto?: ProtoSymbolLocation): SymbolLocation {
    if (!proto) {
      return this.createDefaultLocation();
    }

    return {
      symbolRange: this.convertRange(proto.symbolRange),
      identifierRange: this.convertRange(proto.identifierRange),
    };
  }

  /**
   * Convert protobuf Range to runtime Range
   */
  private convertRange(proto?: ProtoRange): Range {
    if (!proto) {
      return { startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 };
    }

    return {
      startLine: proto.startLine,
      startColumn: proto.startColumn,
      endLine: proto.endLine,
      endColumn: proto.endColumn,
    };
  }

  /**
   * Create a default location
   */
  private createDefaultLocation(): SymbolLocation {
    const defaultRange: Range = {
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 0,
    };
    return {
      symbolRange: defaultRange,
      identifierRange: defaultRange,
    };
  }
}
