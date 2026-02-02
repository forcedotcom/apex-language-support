/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Serializer for converting runtime SymbolTable structures to Protocol Buffers format.
 * This is used at build time to create the pre-compiled standard library cache.
 */

import {
  StandardLibrary,
  Namespace as ProtoNamespace,
  TypeSymbol as ProtoTypeSymbol,
  MethodSymbol as ProtoMethodSymbol,
  VariableSymbol as ProtoVariableSymbol,
  ParameterSymbol as ProtoParameterSymbol,
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
  generateParameterSignature,
  type SymbolTable,
  type ApexSymbol,
  type TypeSymbol,
  type MethodSymbol,
  type VariableSymbol,
  type SymbolModifiers,
  type SymbolLocation,
  type Range,
  type Annotation,
  type AnnotationParameter,
  type SymbolKind,
} from '../types/symbol';

import type { TypeInfo } from '../types/typeInfo';

/**
 * Interface for namespace data collected during serialization
 */
export interface NamespaceData {
  name: string;
  symbolTables: Map<string, SymbolTable>;
}

/**
 * Serializes SymbolTable data to Protocol Buffers format
 */
export class StandardLibrarySerializer {
  /**
   * Serialize the entire standard library to protobuf format.
   * Note: version is intentionally omitted - the library is updated manually
   * by external processes and the source checksum provides integrity verification.
   */
  serialize(namespaces: NamespaceData[], sourceChecksum: string): Uint8Array {
    const protoNamespaces: ProtoNamespace[] = [];

    for (const ns of namespaces) {
      const types: ProtoTypeSymbol[] = [];

      for (const [_fileUri, symbolTable] of ns.symbolTables) {
        const typeSymbols = this.extractTypeSymbols(symbolTable, ns.name);
        types.push(...typeSymbols);
      }

      protoNamespaces.push(
        ProtoNamespace.create({
          name: ns.name,
          types,
        }),
      );
    }

    const stdlib = StandardLibrary.create({
      generatedAt: new Date().toISOString(),
      sourceChecksum,
      namespaces: protoNamespaces,
    });

    return StandardLibrary.toBinary(stdlib);
  }

  /**
   * Extract all type symbols from a SymbolTable
   */
  private extractTypeSymbols(
    symbolTable: SymbolTable,
    namespace: string,
  ): ProtoTypeSymbol[] {
    const types: ProtoTypeSymbol[] = [];
    const allSymbols = symbolTable.getAllSymbols();

    // Find all top-level type symbols (parentId === null)
    for (const symbol of allSymbols) {
      if (this.isTypeSymbol(symbol) && symbol.parentId === null) {
        types.push(
          this.convertTypeSymbol(symbol as TypeSymbol, symbolTable, namespace),
        );
      }
    }

    return types;
  }

  /**
   * Check if a symbol is a type symbol (class, interface, enum, trigger)
   */
  private isTypeSymbol(symbol: ApexSymbol): boolean {
    return (
      symbol.kind === 'class' ||
      symbol.kind === 'interface' ||
      symbol.kind === 'enum' ||
      symbol.kind === 'trigger'
    );
  }

  /**
   * Convert a TypeSymbol to protobuf format
   */
  private convertTypeSymbol(
    symbol: TypeSymbol,
    symbolTable: SymbolTable,
    namespace: string,
  ): ProtoTypeSymbol {
    // Collect child symbols
    const methods: ProtoMethodSymbol[] = [];
    const fields: ProtoVariableSymbol[] = [];
    const properties: ProtoVariableSymbol[] = [];
    const innerTypes: ProtoTypeSymbol[] = [];
    const enumValues: ProtoVariableSymbol[] = [];

    const allSymbols = symbolTable.getAllSymbols();

    for (const child of allSymbols) {
      // Find symbols that belong to this type (by parentId or scope)
      if (this.isChildOf(child, symbol, symbolTable)) {
        if (child.kind === 'method' || child.kind === 'constructor') {
          methods.push(this.convertMethodSymbol(child as MethodSymbol));
        } else if (child.kind === 'field') {
          fields.push(this.convertVariableSymbol(child as VariableSymbol));
        } else if (child.kind === 'property') {
          properties.push(this.convertVariableSymbol(child as VariableSymbol));
        } else if (child.kind === 'enumValue') {
          enumValues.push(this.convertVariableSymbol(child as VariableSymbol));
        } else if (this.isTypeSymbol(child)) {
          // Inner type
          innerTypes.push(
            this.convertTypeSymbol(child as TypeSymbol, symbolTable, namespace),
          );
        }
      }
    }

    return ProtoTypeSymbol.create({
      id: symbol.id,
      name: symbol.name,
      kind: this.convertTypeKind(symbol.kind),
      fqn: symbol.fqn || `${namespace}.${symbol.name}`,
      location: this.convertLocation(symbol.location),
      modifiers: this.convertModifiers(symbol.modifiers),
      superClass: (symbol as TypeSymbol).superClass || '',
      interfaces: (symbol as TypeSymbol).interfaces || [],
      annotations: this.convertAnnotations(symbol.annotations || []),
      methods,
      fields,
      properties,
      innerTypes,
      enumValues,
      fileUri: symbol.fileUri,
      parentId: symbol.parentId || '',
    });
  }

  /**
   * Check if a symbol is a child of the given parent type
   */
  private isChildOf(
    child: ApexSymbol,
    parent: TypeSymbol,
    symbolTable: SymbolTable,
  ): boolean {
    if (!child.parentId) {
      return false;
    }

    // Direct parent match
    if (child.parentId === parent.id) {
      return true;
    }

    // Check if parentId contains the parent's id (for scope blocks)
    // The parentId for methods/fields typically points to the class scope block
    // which has the class's id in its parentId
    // We use string matching since we don't have direct access to the parent symbol
    const allSymbols = symbolTable.getAllSymbols();
    const parentSymbol = allSymbols.find((s) => s.id === child.parentId);
    if (parentSymbol && parentSymbol.kind === 'block') {
      // The block's parent might be our type
      return parentSymbol.parentId === parent.id;
    }

    return false;
  }

  /**
   * Convert a MethodSymbol to protobuf format.
   * Ensures the ID includes parameter signature for proper overload support.
   */
  private convertMethodSymbol(symbol: MethodSymbol): ProtoMethodSymbol {
    const parameters: ProtoParameterSymbol[] = [];

    // Get parameters from the method symbol
    if (symbol.parameters) {
      for (const param of symbol.parameters) {
        parameters.push(this.convertParameterSymbol(param));
      }
    }

    // Generate ID with parameter signature to ensure consistency.
    // This ensures cached symbols have the same ID format as parsed symbols.
    const methodId = this.generateMethodIdWithParams(symbol);

    return ProtoMethodSymbol.create({
      id: methodId,
      name: symbol.name,
      isConstructor: symbol.isConstructor || symbol.kind === 'constructor',
      returnType: this.convertTypeReference(symbol.returnType),
      parameters,
      location: this.convertLocation(symbol.location),
      modifiers: this.convertModifiers(symbol.modifiers),
      annotations: this.convertAnnotations(symbol.annotations || []),
      parentId: symbol.parentId || '',
      hasBody: symbol.hasBody ?? true, // Default true for backward compatibility
    });
  }

  /**
   * Generate a method ID that includes the parameter signature.
   * Format: baseId(paramType1,paramType2,...) or baseId() for no params
   */
  private generateMethodIdWithParams(symbol: MethodSymbol): string {
    const paramSignature = generateParameterSignature(symbol.parameters || []);
    const currentId = symbol.id;

    // Check if ID already has parameter signature (ends with parentheses)
    if (currentId.match(/\([^)]*\)(:?\d+)?$/)) {
      return currentId; // Already has params
    }

    // Find where to insert the parameter signature
    // ID format: fileUri:scope:prefix:name or fileUri:scope:prefix:name:lineNumber
    const parts = currentId.split(':');
    let nameIndex = parts.length - 1;

    // Check if last part is a line number
    if (/^\d+$/.test(parts[parts.length - 1])) {
      nameIndex = parts.length - 2;
    }

    // Add parameter signature to the name part
    parts[nameIndex] = `${parts[nameIndex]}(${paramSignature})`;
    return parts.join(':');
  }

  /**
   * Convert a VariableSymbol to protobuf format
   */
  private convertVariableSymbol(symbol: VariableSymbol): ProtoVariableSymbol {
    return ProtoVariableSymbol.create({
      id: symbol.id,
      name: symbol.name,
      kind: this.convertVariableKind(symbol.kind),
      type: this.convertTypeReference(symbol.type),
      initialValue: symbol.initialValue || '',
      location: this.convertLocation(symbol.location),
      modifiers: this.convertModifiers(symbol.modifiers),
      parentId: symbol.parentId || '',
      initializerType: symbol.initializerType
        ? this.convertTypeReference(symbol.initializerType)
        : undefined,
    });
  }

  /**
   * Convert a parameter to protobuf format
   */
  private convertParameterSymbol(param: VariableSymbol): ProtoParameterSymbol {
    return ProtoParameterSymbol.create({
      id: param.id,
      name: param.name,
      type: this.convertTypeReference(param.type),
      location: this.convertLocation(param.location),
      modifiers: this.convertModifiers(param.modifiers),
      parentId: param.parentId || '',
    });
  }

  /**
   * Convert TypeInfo to protobuf TypeReference
   */
  private convertTypeReference(typeInfo?: TypeInfo): ProtoTypeReference {
    if (!typeInfo) {
      return ProtoTypeReference.create({
        name: 'void',
        originalTypeString: 'void',
        isArray: false,
        isCollection: false,
        isPrimitive: true,
        isBuiltIn: true,
      });
    }

    const typeParameters: ProtoTypeReference[] = [];
    if (typeInfo.typeParameters) {
      for (const tp of typeInfo.typeParameters) {
        typeParameters.push(this.convertTypeReference(tp));
      }
    }

    return ProtoTypeReference.create({
      name: typeInfo.name,
      originalTypeString: typeInfo.originalTypeString,
      isArray: typeInfo.isArray,
      isCollection: typeInfo.isCollection,
      isPrimitive: typeInfo.isPrimitive,
      isBuiltIn: typeInfo.isBuiltIn || false,
      typeParameters,
      keyType: typeInfo.keyType
        ? this.convertTypeReference(typeInfo.keyType)
        : undefined,
      namespace:
        typeInfo.namespace && typeof typeInfo.namespace === 'object'
          ? typeInfo.namespace.toString()
          : '',
    });
  }

  /**
   * Convert modifiers to protobuf format
   */
  private convertModifiers(modifiers: SymbolModifiers): ProtoModifiers {
    return ProtoModifiers.create({
      visibility: this.convertVisibility(modifiers.visibility),
      isStatic: modifiers.isStatic,
      isFinal: modifiers.isFinal,
      isAbstract: modifiers.isAbstract,
      isVirtual: modifiers.isVirtual,
      isOverride: modifiers.isOverride,
      isTransient: modifiers.isTransient,
      isTestMethod: modifiers.isTestMethod,
      isWebService: modifiers.isWebService,
      isBuiltIn: modifiers.isBuiltIn,
    });
  }

  /**
   * Convert visibility to protobuf enum
   */
  private convertVisibility(visibility: string): Visibility {
    switch (visibility) {
      case 'public':
        return Visibility.PUBLIC;
      case 'private':
        return Visibility.PRIVATE;
      case 'protected':
        return Visibility.PROTECTED;
      case 'global':
        return Visibility.GLOBAL;
      case 'default':
      default:
        return Visibility.DEFAULT;
    }
  }

  /**
   * Convert TypeKind string to protobuf enum
   */
  private convertTypeKind(kind: SymbolKind): TypeKind {
    switch (kind) {
      case 'class':
        return TypeKind.CLASS;
      case 'interface':
        return TypeKind.INTERFACE;
      case 'enum':
        return TypeKind.ENUM;
      case 'trigger':
        return TypeKind.TRIGGER;
      default:
        return TypeKind.TYPE_KIND_UNSPECIFIED;
    }
  }

  /**
   * Convert VariableKind string to protobuf enum
   */
  private convertVariableKind(kind: SymbolKind): VariableKind {
    switch (kind) {
      case 'field':
        return VariableKind.FIELD;
      case 'property':
        return VariableKind.PROPERTY;
      case 'parameter':
        return VariableKind.PARAMETER;
      case 'variable':
        return VariableKind.VARIABLE;
      case 'enumValue':
        return VariableKind.ENUM_VALUE;
      default:
        return VariableKind.VARIABLE_KIND_UNSPECIFIED;
    }
  }

  /**
   * Convert annotations to protobuf format
   */
  private convertAnnotations(annotations: Annotation[]): ProtoAnnotation[] {
    return annotations.map((ann) =>
      ProtoAnnotation.create({
        name: ann.name,
        location: this.convertLocation(ann.location),
        parameters: this.convertAnnotationParameters(ann.parameters || []),
      }),
    );
  }

  /**
   * Convert annotation parameters to protobuf format
   */
  private convertAnnotationParameters(
    params: AnnotationParameter[],
  ): ProtoAnnotationParameter[] {
    return params.map((p: AnnotationParameter) =>
      ProtoAnnotationParameter.create({
        name: p.name || '',
        value: p.value,
      }),
    );
  }

  /**
   * Convert location to protobuf format
   */
  private convertLocation(location: SymbolLocation): ProtoSymbolLocation {
    return ProtoSymbolLocation.create({
      symbolRange: this.convertRange(location.symbolRange),
      identifierRange: this.convertRange(location.identifierRange),
    });
  }

  /**
   * Convert range to protobuf format
   */
  private convertRange(range: Range): ProtoRange {
    return ProtoRange.create({
      startLine: range.startLine,
      startColumn: range.startColumn,
      endLine: range.endLine,
      endColumn: range.endColumn,
    });
  }
}
