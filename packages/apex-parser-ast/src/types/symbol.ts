/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { TypeInfo } from './typeInfo';

/**
 * Types of symbols that can be defined in Apex code
 */
export enum SymbolKind {
  Class = 'class',
  Interface = 'interface',
  Trigger = 'trigger',
  Method = 'method',
  Constructor = 'constructor',
  Property = 'property',
  Field = 'field',
  Variable = 'variable',
  Parameter = 'parameter',
  Enum = 'enum',
  EnumValue = 'enumValue',
}

/**
 * Represents the visibility (access modifier) of a symbol
 */
export enum SymbolVisibility {
  Public = 'public',
  Private = 'private',
  Protected = 'protected',
  Global = 'global',
  Default = 'default',
}

/**
 * Modifier bit flags for memory efficiency
 */
export const ModifierFlags = {
  PUBLIC: 1 << 0,
  PRIVATE: 1 << 1,
  PROTECTED: 1 << 2,
  GLOBAL: 1 << 3,
  STATIC: 1 << 4,
  FINAL: 1 << 5,
  ABSTRACT: 1 << 6,
  VIRTUAL: 1 << 7,
  OVERRIDE: 1 << 8,
  TRANSIENT: 1 << 9,
  TEST_METHOD: 1 << 10,
  WEB_SERVICE: 1 << 11,
} as const;

/**
 * Symbol kind enum as numbers for memory efficiency
 */
export const SymbolKindValues = {
  [SymbolKind.Class]: 0,
  [SymbolKind.Interface]: 1,
  [SymbolKind.Trigger]: 2,
  [SymbolKind.Method]: 3,
  [SymbolKind.Constructor]: 4,
  [SymbolKind.Property]: 5,
  [SymbolKind.Field]: 6,
  [SymbolKind.Variable]: 7,
  [SymbolKind.Parameter]: 8,
  [SymbolKind.Enum]: 9,
  [SymbolKind.EnumValue]: 10,
} as const;

/**
 * Factory for creating unified ApexSymbol instances
 */
export class SymbolFactory {
  /**
   * Create a minimal symbol with lazy loading support
   */
  static createMinimalSymbol(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    filePath: string,
    parentId: string | null = null,
    modifierFlags: number = 0,
  ): ApexSymbol {
    const id = this.generateId(name, filePath);
    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [filePath, name],
      unifiedId: id,
      filePath,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      filePath,
      parentId,
      key,
      parentKey: parentId
        ? {
            prefix: kind,
            name: parentId,
            path: [filePath, parentId],
            unifiedId: parentId,
            filePath,
            kind,
          }
        : null,
      _modifierFlags: modifierFlags,
      _isLoaded: false,
      modifiers: this.flagsToModifiers(modifierFlags),
      parent: null,
    };
  }

  /**
   * Create a full symbol with all data loaded
   */
  static createFullSymbol(
    name: string,
    kind: SymbolKind,
    location: SymbolLocation,
    filePath: string,
    modifiers: SymbolModifiers,
    parentId: string | null = null,
    typeData?: any,
    fqn?: string,
    namespace?: string,
    annotations?: Annotation[],
    identifierLocation?: SymbolLocation,
  ): ApexSymbol {
    const id = this.generateId(name, filePath);
    const modifierFlags = this.modifiersToFlags(modifiers);
    const key: SymbolKey = {
      prefix: kind,
      name,
      path: [filePath, name],
      unifiedId: id,
      filePath,
      fqn,
      kind,
    };

    return {
      id,
      name,
      kind,
      location,
      filePath,
      parentId,
      key,
      parentKey: parentId
        ? {
            prefix: kind,
            name: parentId,
            path: [filePath, parentId],
            unifiedId: parentId,
            filePath,
            kind,
          }
        : null,
      fqn,
      namespace,
      annotations,
      identifierLocation,
      _typeData: typeData,
      _modifierFlags: modifierFlags,
      _isLoaded: true,
      modifiers,
      parent: null,
    };
  }

  /**
   * Convert modifiers object to bit flags
   */
  private static modifiersToFlags(modifiers: SymbolModifiers): number {
    let flags = 0;
    if (modifiers.visibility === SymbolVisibility.Public)
      flags |= ModifierFlags.PUBLIC;
    if (modifiers.visibility === SymbolVisibility.Private)
      flags |= ModifierFlags.PRIVATE;
    if (modifiers.visibility === SymbolVisibility.Protected)
      flags |= ModifierFlags.PROTECTED;
    if (modifiers.visibility === SymbolVisibility.Global)
      flags |= ModifierFlags.GLOBAL;
    if (modifiers.isStatic) flags |= ModifierFlags.STATIC;
    if (modifiers.isFinal) flags |= ModifierFlags.FINAL;
    if (modifiers.isAbstract) flags |= ModifierFlags.ABSTRACT;
    if (modifiers.isVirtual) flags |= ModifierFlags.VIRTUAL;
    if (modifiers.isOverride) flags |= ModifierFlags.OVERRIDE;
    if (modifiers.isTransient) flags |= ModifierFlags.TRANSIENT;
    if (modifiers.isTestMethod) flags |= ModifierFlags.TEST_METHOD;
    if (modifiers.isWebService) flags |= ModifierFlags.WEB_SERVICE;
    return flags;
  }

  /**
   * Convert bit flags to modifiers object
   */
  private static flagsToModifiers(flags: number): SymbolModifiers {
    return {
      visibility:
        flags & ModifierFlags.PUBLIC
          ? SymbolVisibility.Public
          : flags & ModifierFlags.PRIVATE
            ? SymbolVisibility.Private
            : flags & ModifierFlags.PROTECTED
              ? SymbolVisibility.Protected
              : flags & ModifierFlags.GLOBAL
                ? SymbolVisibility.Global
                : SymbolVisibility.Default,
      isStatic: !!(flags & ModifierFlags.STATIC),
      isFinal: !!(flags & ModifierFlags.FINAL),
      isAbstract: !!(flags & ModifierFlags.ABSTRACT),
      isVirtual: !!(flags & ModifierFlags.VIRTUAL),
      isOverride: !!(flags & ModifierFlags.OVERRIDE),
      isTransient: !!(flags & ModifierFlags.TRANSIENT),
      isTestMethod: !!(flags & ModifierFlags.TEST_METHOD),
      isWebService: !!(flags & ModifierFlags.WEB_SERVICE),
    };
  }

  /**
   * Generate a unique ID for a symbol
   */
  private static generateId(name: string, filePath: string): string {
    return `${filePath}:${name}`;
  }
}

/**
 * Represents an Apex annotation
 */
export interface Annotation {
  /** The name of the annotation (without @ symbol) */
  name: string;
  /** The source code location of the annotation */
  location: SymbolLocation;
  /** Optional parameters for the annotation */
  parameters?: AnnotationParameter[];
}

/**
 * Represents a parameter for an annotation
 */
export interface AnnotationParameter {
  /** The name of the parameter, null for positional parameters */
  name?: string;
  /** The value of the parameter as a string */
  value: string;
}

/**
 * Modifiers that can be applied to Apex symbols
 */
export interface SymbolModifiers {
  visibility: SymbolVisibility;
  isStatic: boolean;
  isFinal: boolean;
  isAbstract: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  isTransient: boolean;
  isTestMethod: boolean;
  isWebService: boolean;
}

/**
 * Location information for a symbol in the source code
 */
export interface SymbolLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Unified Apex symbol interface with lazy loading support
 * Supports both minimal (lazy) and full (eager) loading modes
 */
export interface ApexSymbol {
  // Core properties (always present)
  id: string;
  name: string;
  kind: SymbolKind;
  location: SymbolLocation;
  filePath: string;
  parentId: string | null;

  // Legacy compatibility - will be removed in Phase 5
  key: SymbolKey;
  parentKey: SymbolKey | null;

  // Optional properties (lazy loaded)
  fqn?: string;
  namespace?: string;
  annotations?: Annotation[];
  identifierLocation?: SymbolLocation;

  // Type-specific data (lazy loaded)
  _typeData?: {
    superClass?: string;
    interfaces?: string[];
    returnType?: TypeInfo;
    parameters?: string[]; // Array of parameter IDs
    type?: TypeInfo;
    initialValue?: string;
    values?: string[]; // Array of enum value IDs
  };

  // Modifiers (stored as bit flags internally, exposed as object)
  _modifierFlags: number;

  // Lazy loading support
  _isLoaded: boolean;
  _loadPromise?: Promise<void>;

  // Legacy compatibility - will be removed in Phase 5
  modifiers: SymbolModifiers;
  parent?: ApexSymbol | null;
}

/**
 * Runtime wrapper for ApexSymbol that maintains direct references
 * while using keys for serialization
 * @deprecated Will be removed in Phase 5 - use unified ApexSymbol directly
 */
export class RuntimeSymbol implements ApexSymbol {
  private _parent: ApexSymbol | null = null;

  constructor(
    public readonly symbol: ApexSymbol,
    private symbolTable: SymbolTable,
  ) {}

  // Core properties
  get id() {
    return this.symbol.id;
  }
  get name() {
    return this.symbol.name;
  }
  get kind() {
    return this.symbol.kind;
  }
  get location() {
    return this.symbol.location;
  }
  get filePath() {
    return this.symbol.filePath;
  }
  get parentId() {
    return this.symbol.parentId;
  }
  get key() {
    return this.symbol.key;
  }
  get parentKey() {
    return this.symbol.parentKey;
  }
  get fqn() {
    return this.symbol.fqn;
  }
  get namespace() {
    return this.symbol.namespace;
  }
  get annotations() {
    return this.symbol.annotations;
  }
  get identifierLocation() {
    return this.symbol.identifierLocation;
  }
  get _typeData() {
    return this.symbol._typeData;
  }
  get _modifierFlags() {
    return this.symbol._modifierFlags;
  }
  get _isLoaded() {
    return this.symbol._isLoaded;
  }
  get _loadPromise() {
    return this.symbol._loadPromise;
  }
  get modifiers() {
    return this.symbol.modifiers;
  }
  get parent(): ApexSymbol | null {
    if (!this._parent && this.symbol.parentKey) {
      const parent = this.symbolTable.lookupByKey(this.symbol.parentKey);
      this._parent = parent || null;
    }
    return this._parent;
  }
}

/**
 * Represents a class, interface, enum, or trigger
 */
export interface TypeSymbol extends ApexSymbol {
  kind:
    | SymbolKind.Class
    | SymbolKind.Interface
    | SymbolKind.Trigger
    | SymbolKind.Enum;
  /**
   * The superclass that this class extends.
   * Only applicable for classes (not interfaces or triggers).
   * For example, in `public class Child extends Parent`, the superClass would be "Parent".
   */
  superClass?: string;
  /**
   * The interfaces that this type implements or extends.
   * - For classes: interfaces implemented by the class (e.g., `class C implements I1, I2`)
   * - For interfaces: interfaces extended by the interface (e.g., `interface I extends I1, I2`)
   * - For triggers: always an empty array
   * - For enums: always an empty array
   */
  interfaces: string[];
  /** Annotations for this type */
  annotations?: Annotation[];
}

/**
 * Represents a method or constructor
 */
export interface MethodSymbol extends ApexSymbol {
  kind: SymbolKind.Method | SymbolKind.Constructor;
  returnType: TypeInfo;
  parameters: VariableSymbol[];
  isConstructor?: boolean;
  /** Annotations for this method */
  annotations?: Annotation[];
}

/**
 * Represents a property, field, variable, parameter, or enum value
 */
export interface VariableSymbol extends ApexSymbol {
  kind:
    | SymbolKind.Property
    | SymbolKind.Field
    | SymbolKind.Variable
    | SymbolKind.Parameter
    | SymbolKind.EnumValue;
  type: TypeInfo;
  initialValue?: string;
}

/**
 * Represents an enum type declaration
 */
export interface EnumSymbol extends TypeSymbol {
  kind: SymbolKind.Enum;
  values: VariableSymbol[];
}

/**
 * Represents a unique key for a symbol or scope in the symbol table
 * Enhanced for Phase 6.5.2: Symbol Key System Unification
 */
export interface SymbolKey {
  /** The type of scope (file, class, method, block) */
  prefix: string;
  /** The name of the symbol/scope */
  name: string;
  /** The hierarchical path to this symbol/scope */
  path: string[];

  // Phase 6.5.2: Unified Key System
  /** The unified symbol ID for graph operations */
  unifiedId?: string;
  /** The file path where this symbol is defined */
  filePath?: string;
  /** The fully qualified name if available */
  fqn?: string;
  /** The symbol kind for enhanced identification */
  kind?: SymbolKind;
}

/**
 * Generate a unified symbol ID from a SymbolKey
 * @param key The symbol key
 * @param filePath Optional file path for uniqueness
 * @returns Unified symbol ID string
 */
export const generateUnifiedId = (
  key: SymbolKey,
  filePath?: string,
): string => {
  // Use FQN if available, otherwise construct from key components
  const baseId =
    key.fqn || `${key.kind || 'unknown'}:${key.name}:${key.path.join('.')}`;
  return filePath ? `${baseId}:${filePath}` : baseId;
};

/**
 * Convert a SymbolKey to a string for use as a map key (legacy compatibility)
 * @param key The symbol key
 * @returns String representation
 */
export const keyToString = (key: SymbolKey): string =>
  `${key.prefix}:${key.path.join('.')}`;

/**
 * Create a SymbolKey from an ApexSymbol with unified ID
 * @param symbol The Apex symbol
 * @param filePath Optional file path
 * @returns Enhanced SymbolKey with unified ID
 */
export const createFromSymbol = (
  symbol: ApexSymbol,
  filePath?: string,
): SymbolKey => {
  const key: SymbolKey = {
    prefix: symbol.key.prefix || symbol.kind,
    name: symbol.key.name || symbol.name,
    path: symbol.key.path || [symbol.filePath, symbol.name],
    kind: symbol.kind,
    fqn: symbol.fqn,
    filePath: filePath || symbol.filePath,
  };

  // Generate unified ID
  key.unifiedId = generateUnifiedId(key, filePath || symbol.filePath);

  return key;
};

/**
 * Create a SymbolKey from a parent symbol (for parentKey relationships)
 * @param parentSymbol The parent Apex symbol
 * @param filePath Optional file path
 * @returns Enhanced SymbolKey for parent relationship
 */
export const createParentKey = (
  parentSymbol: ApexSymbol,
  filePath?: string,
): SymbolKey => createFromSymbol(parentSymbol, filePath);

/**
 * Check if two SymbolKeys are equivalent
 * @param key1 First symbol key
 * @param key2 Second symbol key
 * @returns True if keys are equivalent
 */
export const areEquivalent = (key1: SymbolKey, key2: SymbolKey): boolean => {
  // Compare unified IDs if available
  if (key1.unifiedId && key2.unifiedId) {
    return key1.unifiedId === key2.unifiedId;
  }

  // Fallback to legacy comparison
  return (
    key1.prefix === key2.prefix &&
    key1.name === key2.name &&
    key1.path.join('.') === key2.path.join('.')
  );
};

/**
 * Get the unified ID from a SymbolKey, generating if needed
 * @param key The symbol key
 * @param filePath Optional file path for generation
 * @returns Unified symbol ID
 */
export const getUnifiedId = (key: SymbolKey, filePath?: string): string => {
  if (key.unifiedId) {
    return key.unifiedId;
  }

  // Generate and cache the unified ID
  key.unifiedId = generateUnifiedId(key, filePath);
  return key.unifiedId;
};

/**
 * Lightweight symbol representation for memory optimization
 * Stores only essential data, with lazy loading for optional fields
 */
export interface LightweightSymbol {
  /** Unique identifier for the symbol */
  id: string;
  /** Symbol name */
  name: string;
  /** Symbol kind as number for memory efficiency */
  kind: number; // Index into SymbolKind enum
  /** Basic location info (compressed) */
  location: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  /** Modifiers as bit flags for memory efficiency */
  modifiers: number; // Bit flags for modifiers
  /** Parent symbol ID (null if none) */
  parentId: string | null;
  /** File path where symbol is defined */
  filePath: string;
  /** Fully qualified name (optional) */
  fqn?: string;
  /** Namespace (optional) */
  namespace?: string;
  /** Lazy-loaded data */
  _lazy?: {
    annotations?: Annotation[];
    identifierLocation?: SymbolLocation;
    superClass?: string;
    interfaces?: string[];
    returnType?: TypeInfo;
    parameters?: string[]; // Array of parameter IDs
    type?: TypeInfo;
    initialValue?: string;
    values?: string[]; // Array of enum value IDs
  };
}

/**
 * Convert ApexSymbol to LightweightSymbol for memory optimization
 */
export const toLightweightSymbol = (
  symbol: ApexSymbol,
  filePath: string,
): LightweightSymbol => {
  // Convert modifiers to bit flags
  let modifiers = 0;
  if (symbol.modifiers.visibility === SymbolVisibility.Public)
    modifiers |= ModifierFlags.PUBLIC;
  if (symbol.modifiers.visibility === SymbolVisibility.Private)
    modifiers |= ModifierFlags.PRIVATE;
  if (symbol.modifiers.visibility === SymbolVisibility.Protected)
    modifiers |= ModifierFlags.PROTECTED;
  if (symbol.modifiers.visibility === SymbolVisibility.Global)
    modifiers |= ModifierFlags.GLOBAL;
  if (symbol.modifiers.isStatic) modifiers |= ModifierFlags.STATIC;
  if (symbol.modifiers.isFinal) modifiers |= ModifierFlags.FINAL;
  if (symbol.modifiers.isAbstract) modifiers |= ModifierFlags.ABSTRACT;
  if (symbol.modifiers.isVirtual) modifiers |= ModifierFlags.VIRTUAL;
  if (symbol.modifiers.isOverride) modifiers |= ModifierFlags.OVERRIDE;
  if (symbol.modifiers.isTransient) modifiers |= ModifierFlags.TRANSIENT;
  if (symbol.modifiers.isTestMethod) modifiers |= ModifierFlags.TEST_METHOD;
  if (symbol.modifiers.isWebService) modifiers |= ModifierFlags.WEB_SERVICE;

  // Generate unique ID
  const id = symbol.key.unifiedId || generateUnifiedId(symbol.key, filePath);

  // Generate parent ID if parent exists
  let parentId: string | null = null;
  if (symbol.parentKey) {
    parentId =
      symbol.parentKey.unifiedId ||
      generateUnifiedId(symbol.parentKey, filePath);
  }

  const lightweight: LightweightSymbol = {
    id,
    name: symbol.name,
    kind: SymbolKindValues[symbol.kind],
    location: symbol.location,
    modifiers,
    parentId,
    filePath,
    fqn: symbol.fqn,
    namespace: symbol.namespace,
    _lazy: {},
  };

  // Store expensive data in lazy object
  if (symbol.annotations?.length) {
    lightweight._lazy!.annotations = symbol.annotations;
  }

  if (symbol.identifierLocation) {
    lightweight._lazy!.identifierLocation = symbol.identifierLocation;
  }

  // Type-specific data
  if (
    symbol.kind === SymbolKind.Class ||
    symbol.kind === SymbolKind.Interface
  ) {
    const typeSymbol = symbol as TypeSymbol;
    if (typeSymbol.superClass)
      lightweight._lazy!.superClass = typeSymbol.superClass;
    if (typeSymbol.interfaces?.length)
      lightweight._lazy!.interfaces = typeSymbol.interfaces;
  }

  if (
    symbol.kind === SymbolKind.Method ||
    symbol.kind === SymbolKind.Constructor
  ) {
    const methodSymbol = symbol as MethodSymbol;
    lightweight._lazy!.returnType = methodSymbol.returnType;
    if (methodSymbol.parameters?.length) {
      lightweight._lazy!.parameters = methodSymbol.parameters.map(
        (p) => p.key.unifiedId || p.name,
      );
    }
  }

  if (
    symbol.kind === SymbolKind.Property ||
    symbol.kind === SymbolKind.Field ||
    symbol.kind === SymbolKind.Variable ||
    symbol.kind === SymbolKind.Parameter
  ) {
    const variableSymbol = symbol as VariableSymbol;
    lightweight._lazy!.type = variableSymbol.type;
    if (variableSymbol.initialValue)
      lightweight._lazy!.initialValue = variableSymbol.initialValue;
  }

  if (symbol.kind === SymbolKind.Enum) {
    const enumSymbol = symbol as EnumSymbol;
    if (enumSymbol.values?.length) {
      lightweight._lazy!.values = enumSymbol.values.map(
        (v) => v.key.unifiedId || v.name,
      );
    }
  }

  return lightweight;
};

/**
 * Convert LightweightSymbol back to ApexSymbol (for compatibility)
 */
export const fromLightweightSymbol = (
  lightweight: LightweightSymbol,
  symbolTable: SymbolTable,
): ApexSymbol => {
  // Convert kind back to enum
  const kind = Object.entries(SymbolKindValues).find(
    ([, value]) => value === lightweight.kind,
  )?.[0] as SymbolKind;

  // Convert modifiers back to object
  const modifiers: SymbolModifiers = {
    visibility:
      lightweight.modifiers & ModifierFlags.PUBLIC
        ? SymbolVisibility.Public
        : lightweight.modifiers & ModifierFlags.PRIVATE
          ? SymbolVisibility.Private
          : lightweight.modifiers & ModifierFlags.PROTECTED
            ? SymbolVisibility.Protected
            : lightweight.modifiers & ModifierFlags.GLOBAL
              ? SymbolVisibility.Global
              : SymbolVisibility.Default,
    isStatic: !!(lightweight.modifiers & ModifierFlags.STATIC),
    isFinal: !!(lightweight.modifiers & ModifierFlags.FINAL),
    isAbstract: !!(lightweight.modifiers & ModifierFlags.ABSTRACT),
    isVirtual: !!(lightweight.modifiers & ModifierFlags.VIRTUAL),
    isOverride: !!(lightweight.modifiers & ModifierFlags.OVERRIDE),
    isTransient: !!(lightweight.modifiers & ModifierFlags.TRANSIENT),
    isTestMethod: !!(lightweight.modifiers & ModifierFlags.TEST_METHOD),
    isWebService: !!(lightweight.modifiers & ModifierFlags.WEB_SERVICE),
  };

  // Reconstruct symbol key
  const key: SymbolKey = {
    prefix: 'symbol',
    name: lightweight.name,
    path: [lightweight.filePath, lightweight.name],
    unifiedId: lightweight.id,
    filePath: lightweight.filePath,
    fqn: lightweight.fqn,
    kind,
  };

  // Base symbol
  const symbol: ApexSymbol = {
    id: lightweight.id,
    name: lightweight.name,
    kind,
    location: lightweight.location,
    filePath: lightweight.filePath,
    parentId: lightweight.parentId,
    key,
    parentKey: lightweight.parentId
      ? {
          prefix: 'symbol',
          name: lightweight.parentId,
          path: [lightweight.filePath, lightweight.parentId],
          unifiedId: lightweight.parentId,
          filePath: lightweight.filePath,
          kind,
        }
      : null,
    fqn: lightweight.fqn,
    namespace: lightweight.namespace,
    _modifierFlags: lightweight.modifiers,
    _isLoaded: true,
    modifiers,
    parent: null,
  };

  // Add lazy-loaded data
  if (lightweight._lazy) {
    if (lightweight._lazy.annotations)
      symbol.annotations = lightweight._lazy.annotations;
    if (lightweight._lazy.identifierLocation)
      symbol.identifierLocation = lightweight._lazy.identifierLocation;
  }

  // Reconstruct type-specific data based on kind
  if (
    kind === SymbolKind.Class ||
    kind === SymbolKind.Interface ||
    kind === SymbolKind.Trigger ||
    kind === SymbolKind.Enum
  ) {
    const typeSymbol = symbol as TypeSymbol;
    if (lightweight._lazy?.superClass)
      typeSymbol.superClass = lightweight._lazy.superClass;
    if (lightweight._lazy?.interfaces)
      typeSymbol.interfaces = lightweight._lazy.interfaces;
  }

  if (kind === SymbolKind.Method || kind === SymbolKind.Constructor) {
    const methodSymbol = symbol as MethodSymbol;
    if (lightweight._lazy?.returnType)
      methodSymbol.returnType = lightweight._lazy.returnType;
    if (lightweight._lazy?.parameters) {
      // For now, create empty parameters array - in a real implementation,
      // we would need to resolve the parameter symbols from the symbol table
      methodSymbol.parameters = [];
    }
  }

  if (
    kind === SymbolKind.Property ||
    kind === SymbolKind.Field ||
    kind === SymbolKind.Variable ||
    kind === SymbolKind.Parameter ||
    kind === SymbolKind.EnumValue
  ) {
    const variableSymbol = symbol as VariableSymbol;
    if (lightweight._lazy?.type) variableSymbol.type = lightweight._lazy.type;
    if (lightweight._lazy?.initialValue)
      variableSymbol.initialValue = lightweight._lazy.initialValue;
  }

  if (kind === SymbolKind.Enum) {
    const enumSymbol = symbol as EnumSymbol;
    if (lightweight._lazy?.values) {
      // For now, create empty values array - in a real implementation,
      // we would need to resolve the enum value symbols from the symbol table
      enumSymbol.values = [];
    }
  }

  return symbol;
};

/**
 * Represents a scope in which symbols are defined within a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolScope {
  private symbols: HashMap<string, ApexSymbol> = new HashMap();
  private children: SymbolScope[] = [];
  private readonly key: SymbolKey;

  /**
   * Creates a new symbol scope.
   * @param name The name of the scope
   * @param parent The parent scope, if any
   * @param scopeType The type of scope (file, class, method, block)
   */
  constructor(
    public readonly name: string,
    public readonly parent: SymbolScope | null = null,
    private readonly scopeType: string = 'file',
  ) {
    this.key = this.generateKey();
    if (parent) {
      parent.children.push(this);
    }
  }

  /**
   * Get the unique key for this scope
   */
  getKey(): SymbolKey {
    return this.key;
  }

  /**
   * Generate a unique key for this scope
   */
  private generateKey(): SymbolKey {
    const path = this.getPath();
    return {
      prefix: this.scopeType,
      name: this.name,
      path: path,
    };
  }

  /**
   * Get the hierarchical path to this scope
   */
  private getPath(): string[] {
    const path: string[] = [];
    let current: SymbolScope | null = this;
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    return path;
  }

  /**
   * Add a symbol to this scope.
   * @param symbol The symbol to add
   */
  addSymbol(symbol: ApexSymbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  /**
   * Get a symbol by name from this scope.
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  getSymbol(name: string): ApexSymbol | undefined {
    return this.symbols.get(name);
  }

  /**
   * Get all symbols in this scope.
   * @returns Array of all symbols in this scope
   */
  getAllSymbols(): ApexSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Get child scopes of this scope.
   * @returns Array of child scopes
   */
  getChildren(): SymbolScope[] {
    return [...this.children];
  }

  /**
   * Convert the scope to a JSON-serializable format
   */
  toJSON() {
    return {
      key: this.key,
      symbols: Array.from(this.symbols.entries()).map(([name, symbol]) => ({
        name,
        key: (symbol as any).key,
      })),
      children: this.children.map((child: SymbolScope) => child.key),
    };
  }
}

/**
 * Symbol table representing all symbols in a source file.
 * Maintains a hierarchy of scopes and provides symbol lookup functionality.
 */
export class SymbolTable {
  private root: SymbolScope;
  private current: SymbolScope;
  private symbolMap: HashMap<string, ApexSymbol> = new HashMap();
  private scopeMap: HashMap<string, SymbolScope> = new HashMap();

  /**
   * Creates a new symbol table.
   * Initializes with a root scope named 'file'.
   */
  constructor() {
    // Create root scope for the file
    this.root = new SymbolScope('file', null, 'file');
    this.current = this.root;
    this.scopeMap.set(this.keyToString(this.root.getKey()), this.root);
  }

  /**
   * Convert a SymbolKey to a string for use as a map key
   * Updated for Phase 6.5.2: Symbol Key System Unification
   */
  private keyToString(key: SymbolKey): string {
    return keyToString(key);
  }

  /**
   * Add a symbol to the current scope.
   * @param symbol The symbol to add
   * Updated for Phase 6.5.2: Symbol Key System Unification
   */
  addSymbol(symbol: ApexSymbol): void {
    // Set parent reference if parentKey exists
    if (symbol.parentKey) {
      const parent = this.lookupByKey(symbol.parentKey);
      if (parent) {
        symbol.parent = parent;
      }
    }

    // Ensure symbol key has unified ID for graph operations
    if (!symbol.key.unifiedId) {
      symbol.key = createFromSymbol(symbol);
    }

    this.current.addSymbol(symbol);
    this.symbolMap.set(this.keyToString(symbol.key), symbol);
  }

  /**
   * Enter a new scope.
   * Creates a new scope as a child of the current scope.
   * @param name The name of the new scope
   * @param scopeType The type of scope (file, class, method, block)
   */
  enterScope(name: string, scopeType: string = 'block'): void {
    const newScope = new SymbolScope(name, this.current, scopeType);
    this.current = newScope;
    this.scopeMap.set(this.keyToString(newScope.getKey()), newScope);
  }

  /**
   * Exit the current scope and return to the parent scope.
   * Does nothing if already at the root scope.
   */
  exitScope(): void {
    if (this.current.parent) {
      this.current = this.current.parent;
    }
  }

  /**
   * Get the current scope.
   * @returns The current scope
   */
  getCurrentScope(): SymbolScope {
    return this.current;
  }

  /**
   * Get the parent scope of the current scope.
   * @returns The parent scope, or null if at root
   */
  getParentScope(): SymbolScope | null {
    return this.current.parent;
  }

  /**
   * Find a symbol in the current scope only.
   * @param name The name of the symbol to find
   * @returns The symbol if found in current scope, undefined otherwise
   */
  findSymbolInCurrentScope(name: string): ApexSymbol | undefined {
    return this.current.getSymbol(name);
  }

  /**
   * Find a scope by name, searching through all scopes.
   * @param name The name of the scope to find
   * @returns The scope if found, undefined otherwise
   */
  findScopeByName(name: string): SymbolScope | undefined {
    const search = (scope: SymbolScope): SymbolScope | undefined => {
      if (scope.name === name) {
        return scope;
      }
      for (const child of scope.getChildren()) {
        const found = search(child);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    return search(this.root);
  }

  /**
   * Lookup a symbol by name, searching through nested scopes.
   * Searches from current scope up through parent scopes.
   * @param name The name of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  lookup(name: string): ApexSymbol | undefined {
    let scope: SymbolScope | null = this.current;

    while (scope) {
      const symbol = scope.getSymbol(name);
      if (symbol) {
        return symbol;
      }
      scope = scope.parent;
    }

    return undefined;
  }

  /**
   * Lookup a symbol by key
   * @param key The key of the symbol to find
   * @returns The symbol if found, undefined otherwise
   */
  lookupByKey(key: SymbolKey): ApexSymbol | undefined {
    return this.symbolMap.get(this.keyToString(key));
  }

  /**
   * Convert the symbol table to a JSON-serializable format
   */
  toJSON() {
    type CleanedSymbol = Omit<ApexSymbol, 'parent'> & {
      values?: Array<Omit<VariableSymbol, 'parent'>>;
    };

    const cleanSymbol = (symbol: ApexSymbol): CleanedSymbol => {
      // Create a new object without the parent reference
      const { parent, ...rest } = symbol;
      const cleaned = { ...rest } as CleanedSymbol;

      // Handle enum values
      if (symbol.kind === SymbolKind.Enum) {
        const enumSymbol = symbol as EnumSymbol;
        if (enumSymbol.values) {
          // Create a new array of cleaned values
          cleaned.values = enumSymbol.values.map((value) => {
            // Create a new object without the parent reference
            const { parent: valueParent, ...valueRest } = value;
            return valueRest;
          });
        }
      }

      return cleaned;
    };

    // Convert HashMap entries to plain arrays
    const symbolEntries = Array.from(this.symbolMap.entries());
    const scopeEntries = Array.from(this.scopeMap.entries());

    // Create a new object with cleaned symbols
    const cleanedSymbols = symbolEntries.map(([key, symbol]) => ({
      key,
      symbol: symbol ? cleanSymbol(symbol) : undefined,
    }));

    // Create a new object with cleaned scopes
    const cleanedScopes = scopeEntries.map(([key, scope]) => ({
      key,
      scope: scope
        ? {
            key: scope.getKey(),
            symbols: Array.from(scope.getAllSymbols()).map((symbol) => ({
              name: symbol.name,
              key: symbol.key,
            })),
            children: scope.getChildren().map((child) => child.getKey()),
          }
        : undefined,
    }));

    return {
      symbols: cleanedSymbols,
      scopes: cleanedScopes,
    };
  }

  /**
   * Create a new symbol table from a JSON representation
   * @param json The JSON representation of a symbol table
   * @returns A new symbol table
   */
  static fromJSON(json: any): SymbolTable {
    const table = new SymbolTable();
    // TODO: Implement reconstruction of symbol table from JSON
    return table;
  }
}
